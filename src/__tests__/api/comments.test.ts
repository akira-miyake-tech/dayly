/**
 * コメントAPIテスト（Issue #41）
 * API-CMT-001〜005
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { makeAuthHeaders } from "@/test/helpers";

// Prismaをモック
vi.mock("@/lib/prisma", () => ({
  prisma: {
    dailyReport: {
      findUnique: vi.fn(),
    },
    comment: {
      create: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
    revokedToken: {
      findUnique: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import { POST as commentsPOST } from "@/app/api/v1/reports/[id]/comments/route";
import { DELETE as commentDELETE } from "@/app/api/v1/comments/[id]/route";

const mockPrisma = prisma as {
  dailyReport: { findUnique: ReturnType<typeof vi.fn> };
  comment: {
    create: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  revokedToken: { findUnique: ReturnType<typeof vi.fn> };
};

// 認証ヘッダーショートカット
const yamadaHeaders = makeAuthHeaders({ user_id: 1, role: "sales", email: "yamada@test.com" });
const satoHeaders = makeAuthHeaders({ user_id: 3, role: "manager", email: "sato@test.com" });

beforeEach(() => {
  vi.clearAllMocks();
  // デフォルト: トークン未失効
  mockPrisma.revokedToken.findUnique.mockResolvedValue(null);
  // デフォルト: 日報は存在する
  mockPrisma.dailyReport.findUnique.mockResolvedValue({ reportId: 1 });
});

// ===== API-CMT-001: コメント投稿（正常系）=====
describe("API-CMT-001: POST /reports/:id/comments（正常系）", () => {
  it("201 Created, data.comment_id が返り, data.user.name が 佐藤 部長 である", async () => {
    const createdComment = {
      commentId: 3,
      reportId: 1,
      userId: 3,
      content: "明日の商談、頑張ってください。",
      createdAt: new Date("2026-06-21T10:00:00Z"),
      user: { userId: 3, name: "佐藤 部長" },
    };
    mockPrisma.comment.create.mockResolvedValue(createdComment);

    const req = new NextRequest("http://localhost/api/v1/reports/1/comments", {
      method: "POST",
      body: JSON.stringify({ content: "明日の商談、頑張ってください。" }),
      headers: { "Content-Type": "application/json", ...satoHeaders },
    });

    const res = await commentsPOST(req, { params: Promise.resolve({ id: "1" }) });
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.data.comment_id).toBe(3);
    expect(body.data.user.name).toBe("佐藤 部長");
  });
});

// ===== API-CMT-002: コメント投稿（営業による実行）=====
describe("API-CMT-002: POST /reports/:id/comments（営業が実行）", () => {
  it("403 Forbidden", async () => {
    const req = new NextRequest("http://localhost/api/v1/reports/1/comments", {
      method: "POST",
      body: JSON.stringify({ content: "コメント" }),
      headers: { "Content-Type": "application/json", ...yamadaHeaders },
    });

    const res = await commentsPOST(req, { params: Promise.resolve({ id: "1" }) });
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error.code).toBe("FORBIDDEN");
  });
});

// ===== API-CMT-003: コメント投稿（内容空）=====
describe("API-CMT-003: POST /reports/:id/comments（content 空）", () => {
  it("400 Bad Request, error.code が VALIDATION_ERROR", async () => {
    const req = new NextRequest("http://localhost/api/v1/reports/1/comments", {
      method: "POST",
      body: JSON.stringify({ content: "" }),
      headers: { "Content-Type": "application/json", ...satoHeaders },
    });

    const res = await commentsPOST(req, { params: Promise.resolve({ id: "1" }) });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });
});

// ===== API-CMT-004: コメント削除（正常系）=====
describe("API-CMT-004: DELETE /comments/:id（自分のコメント）", () => {
  it("204 No Content", async () => {
    // 佐藤部長（user_id: 3）のコメント
    mockPrisma.comment.findUnique.mockResolvedValue({
      commentId: 3,
      userId: 3,
      content: "明日の商談、頑張ってください。",
    });
    mockPrisma.comment.delete.mockResolvedValue({});

    const req = new NextRequest("http://localhost/api/v1/comments/3", {
      method: "DELETE",
      headers: satoHeaders,
    });

    const res = await commentDELETE(req, { params: Promise.resolve({ id: "3" }) });

    expect(res.status).toBe(204);
  });
});

// ===== API-CMT-005: コメント削除（他者のコメント）=====
describe("API-CMT-005: DELETE /comments/:id（他者のコメント）", () => {
  it("403 Forbidden", async () => {
    // 別の上長（user_id: 4）のコメントを佐藤部長（user_id: 3）が削除しようとする
    mockPrisma.comment.findUnique.mockResolvedValue({
      commentId: 5,
      userId: 4, // 別の上長
      content: "別の上長のコメント",
    });

    const req = new NextRequest("http://localhost/api/v1/comments/5", {
      method: "DELETE",
      headers: satoHeaders, // 佐藤部長（user_id: 3）
    });

    const res = await commentDELETE(req, { params: Promise.resolve({ id: "5" }) });
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error.code).toBe("FORBIDDEN");
  });
});
