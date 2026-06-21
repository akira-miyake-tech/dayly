/**
 * 営業マスタAPIテスト（Issue #43）
 * API-USR-001〜003
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { makeAuthHeaders } from "@/test/helpers";

// Prismaをモック
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      count: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    dailyReport: {
      count: vi.fn(),
    },
    revokedToken: {
      findUnique: vi.fn(),
    },
  },
}));

// bcryptjsをモック
vi.mock("bcryptjs", () => ({
  default: {
    compare: vi.fn(),
    hash: vi.fn().mockResolvedValue("$2b$10$hashed"),
  },
}));

import { prisma } from "@/lib/prisma";
import { POST as usersPOST } from "@/app/api/v1/users/route";
import { DELETE as userDELETE } from "@/app/api/v1/users/[id]/route";

const mockPrisma = prisma as {
  user: {
    count: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  dailyReport: { count: ReturnType<typeof vi.fn> };
  revokedToken: { findUnique: ReturnType<typeof vi.fn> };
};

// 認証ヘッダーショートカット（上長のみ）
const satoHeaders = makeAuthHeaders({ user_id: 3, role: "manager", email: "sato@test.com" });

const now = new Date("2026-06-21T10:00:00Z");
const newUserRecord = {
  userId: 10,
  name: "新人 次郎",
  email: "shinjin@test.com",
  role: "sales" as const,
  department: "西日本営業部",
  createdAt: now,
  updatedAt: now,
};

const existingUserYamada = {
  userId: 1,
  name: "山田 太郎",
  email: "yamada@test.com",
  role: "sales" as const,
  department: "東日本営業部",
  passwordHash: "$2b$10$hashed",
  createdAt: now,
  updatedAt: now,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.revokedToken.findUnique.mockResolvedValue(null);
});

// ===== API-USR-001: ユーザー登録（正常系）=====
describe("API-USR-001: POST /users（上長・正常）", () => {
  it("201 Created, data.user_id が返る", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null); // メール未重複
    mockPrisma.user.create.mockResolvedValue(newUserRecord);

    const req = new NextRequest("http://localhost/api/v1/users", {
      method: "POST",
      body: JSON.stringify({
        name: "新人 次郎",
        email: "shinjin@test.com",
        role: "sales",
        department: "西日本営業部",
        password: "initPass123",
      }),
      headers: { "Content-Type": "application/json", ...satoHeaders },
    });

    const res = await usersPOST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.data.user_id).toBe(10);
    expect(body.data.email).toBe("shinjin@test.com");
  });
});

// ===== API-USR-002: ユーザー登録（メール重複）=====
describe("API-USR-002: POST /users（メール重複）", () => {
  it("409 Conflict, error.code が CONFLICT", async () => {
    // 既存ユーザーと同じメールアドレス
    mockPrisma.user.findUnique.mockResolvedValue(existingUserYamada);

    const req = new NextRequest("http://localhost/api/v1/users", {
      method: "POST",
      body: JSON.stringify({
        name: "別の山田",
        email: "yamada@test.com", // 重複
        role: "sales",
        password: "password123",
      }),
      headers: { "Content-Type": "application/json", ...satoHeaders },
    });

    const res = await usersPOST(req);
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.error.code).toBe("CONFLICT");
  });
});

// ===== API-USR-003: ユーザー削除（日報あり）=====
describe("API-USR-003: DELETE /users/:id（日報あり）", () => {
  it("409 Conflict", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(existingUserYamada);
    mockPrisma.dailyReport.count.mockResolvedValue(5); // 日報あり

    const req = new NextRequest("http://localhost/api/v1/users/1", {
      method: "DELETE",
      headers: satoHeaders,
    });

    const res = await userDELETE(req, { params: Promise.resolve({ id: "1" }) });
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.error.code).toBe("CONFLICT");
  });
});
