/**
 * 認証APIテスト（Issue #39）
 * API-AUTH-001〜004
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { makeAuthHeaders } from "@/test/helpers";

// Prismaをモック
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    revokedToken: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    dailyReport: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

// bcryptjsをモック（テストでは実際のハッシュ比較をしない）
vi.mock("bcryptjs", () => ({
  default: {
    compare: vi.fn(),
    hash: vi.fn(),
  },
}));

// jose の signToken をモック（JWT_SECRETが不要になる）
vi.mock("@/lib/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth")>();
  return {
    ...actual,
    signToken: vi.fn().mockResolvedValue({
      token: "mock-jwt-token",
      expiresAt: new Date("2026-06-22T09:00:00Z"),
    }),
  };
});

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { POST as loginPOST } from "@/app/api/v1/auth/login/route";
import { POST as logoutPOST } from "@/app/api/v1/auth/logout/route";
import { GET as reportsGET } from "@/app/api/v1/reports/route";

const mockPrisma = prisma as {
  user: { findUnique: ReturnType<typeof vi.fn> };
  revokedToken: {
    findUnique: ReturnType<typeof vi.fn>;
    upsert: ReturnType<typeof vi.fn>;
  };
  dailyReport: {
    count: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
};

const mockBcrypt = bcrypt as { compare: ReturnType<typeof vi.fn> };

beforeEach(() => {
  vi.clearAllMocks();
  // デフォルト: トークン未失効
  mockPrisma.revokedToken.findUnique.mockResolvedValue(null);
});

// テスト用DBユーザーレコード
const dbUserYamada = {
  userId: 1,
  name: "山田 太郎",
  email: "yamada@test.com",
  role: "sales" as const,
  department: "東日本営業部",
  passwordHash: "$2b$10$hashed",
};

// ===== API-AUTH-001: 正常ログイン =====
describe("API-AUTH-001: POST /auth/login（正常系）", () => {
  it("200 OK, data.token が返り, data.user.role が sales である", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(dbUserYamada);
    mockBcrypt.compare.mockResolvedValue(true);

    const req = new NextRequest("http://localhost/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "yamada@test.com", password: "password123" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await loginPOST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.token).toBe("mock-jwt-token");
    expect(body.data.user.role).toBe("sales");
    expect(body.data.user.email).toBe("yamada@test.com");
  });
});

// ===== API-AUTH-002: パスワード不一致 =====
describe("API-AUTH-002: POST /auth/login（パスワード不一致）", () => {
  it("401 Unauthorized, error.code が UNAUTHORIZED", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(dbUserYamada);
    mockBcrypt.compare.mockResolvedValue(false);

    const req = new NextRequest("http://localhost/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "yamada@test.com", password: "wrongpassword" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await loginPOST(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });
});

// ===== API-AUTH-003: 未入力ログイン =====
describe("API-AUTH-003: POST /auth/login（未入力）", () => {
  it("400 Bad Request, error.code が VALIDATION_ERROR", async () => {
    const req = new NextRequest("http://localhost/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "", password: "" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await loginPOST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });
});

// ===== API-AUTH-004: ログアウト後のトークン無効化 =====
describe("API-AUTH-004: POST /auth/logout → 同トークンで GET /reports", () => {
  it("logout が 204 を返し、その後のリクエストは 401 になる", async () => {
    // ログアウトリクエスト: Authorization ヘッダー付き（JWT_SECRET なしでもログアウト扱い）
    // logout route は jwtVerify に失敗しても 204 を返す設計
    mockPrisma.revokedToken.upsert.mockResolvedValue({});

    const logoutReq = new NextRequest("http://localhost/api/v1/auth/logout", {
      method: "POST",
      headers: { Authorization: "Bearer some-valid-token" },
    });

    const logoutRes = await logoutPOST(logoutReq);
    expect(logoutRes.status).toBe(204);

    // 次のリクエスト: x-auth-token-jti を付け、revokedToken が返るようモック
    mockPrisma.revokedToken.findUnique.mockResolvedValue({ jti: "revoked-jti" });

    const reportsReq = new NextRequest("http://localhost/api/v1/reports", {
      method: "GET",
      headers: {
        ...makeAuthHeaders({ user_id: 1, role: "sales", email: "yamada@test.com" }),
        "x-auth-token-jti": "revoked-jti",
      },
    });

    const reportsRes = await reportsGET(reportsReq);
    const reportsBody = await reportsRes.json();

    expect(reportsRes.status).toBe(401);
    expect(reportsBody.error.code).toBe("UNAUTHORIZED");
  });
});
