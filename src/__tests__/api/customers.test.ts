/**
 * 顧客マスタAPIテスト（Issue #42）
 * API-CST-001〜005
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { makeAuthHeaders } from "@/test/helpers";

// Prismaをモック
vi.mock("@/lib/prisma", () => ({
  prisma: {
    customer: {
      count: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    visitRecord: {
      count: vi.fn(),
    },
    revokedToken: {
      findUnique: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import { GET as customersGET, POST as customersPOST } from "@/app/api/v1/customers/route";
import { DELETE as customerDELETE } from "@/app/api/v1/customers/[id]/route";

const mockPrisma = prisma as {
  customer: {
    count: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  visitRecord: { count: ReturnType<typeof vi.fn> };
  revokedToken: { findUnique: ReturnType<typeof vi.fn> };
};

// 認証ヘッダーショートカット
const yamadaHeaders = makeAuthHeaders({ user_id: 1, role: "sales", email: "yamada@test.com" });
const satoHeaders = makeAuthHeaders({ user_id: 3, role: "manager", email: "sato@test.com" });

// テスト用顧客データ
const now = new Date("2026-06-21T10:00:00Z");
const customerAlpha = {
  customerId: 1,
  name: "田中 様",
  companyName: "株式会社アルファ",
  phone: "03-0000-0001",
  address: "東京都〇〇区",
  createdAt: now,
  updatedAt: now,
};
const customerBeta = {
  customerId: 2,
  name: "伊藤 様",
  companyName: "ベータ商事",
  phone: null,
  address: null,
  createdAt: now,
  updatedAt: now,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.revokedToken.findUnique.mockResolvedValue(null);
});

// ===== API-CST-001: 顧客一覧取得 =====
describe("API-CST-001: GET /customers（正常）", () => {
  it("200 OK, data.customers に顧客一覧が返る", async () => {
    mockPrisma.customer.count.mockResolvedValue(2);
    mockPrisma.customer.findMany.mockResolvedValue([customerAlpha, customerBeta]);

    const req = new NextRequest("http://localhost/api/v1/customers", {
      method: "GET",
      headers: yamadaHeaders,
    });

    const res = await customersGET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.customers).toHaveLength(2);
    expect(body.data.customers[0].company_name).toBe("株式会社アルファ");
  });
});

// ===== API-CST-002: 顧客検索 =====
describe("API-CST-002: GET /customers?q=アルファ", () => {
  it("200 OK, アルファを含む顧客のみ返る", async () => {
    mockPrisma.customer.count.mockResolvedValue(1);
    mockPrisma.customer.findMany.mockResolvedValue([customerAlpha]);

    const req = new NextRequest("http://localhost/api/v1/customers?q=%E3%82%A2%E3%83%AB%E3%83%95%E3%82%A1", {
      method: "GET",
      headers: yamadaHeaders,
    });

    const res = await customersGET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.customers).toHaveLength(1);
    expect(body.data.customers[0].company_name).toBe("株式会社アルファ");

    // OR 条件で name/companyName の contains が渡された確認
    expect(mockPrisma.customer.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ OR: expect.any(Array) }),
      })
    );
  });
});

// ===== API-CST-003: 顧客登録（正常系）=====
describe("API-CST-003: POST /customers（上長・正常）", () => {
  it("201 Created, data.customer_id が返る", async () => {
    const newCustomer = {
      ...customerAlpha,
      customerId: 10,
      name: "高橋 様",
      companyName: "テスト株式会社",
    };
    mockPrisma.customer.create.mockResolvedValue(newCustomer);

    const req = new NextRequest("http://localhost/api/v1/customers", {
      method: "POST",
      body: JSON.stringify({
        name: "高橋 様",
        company_name: "テスト株式会社",
        phone: "03-9999-0001",
        address: "大阪府〇〇市",
      }),
      headers: { "Content-Type": "application/json", ...satoHeaders },
    });

    const res = await customersPOST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.data.customer_id).toBe(10);
  });
});

// ===== API-CST-004: 顧客登録（営業による実行）=====
describe("API-CST-004: POST /customers（営業が実行）", () => {
  it("403 Forbidden", async () => {
    const req = new NextRequest("http://localhost/api/v1/customers", {
      method: "POST",
      body: JSON.stringify({ name: "田中 様", company_name: "テスト株式会社" }),
      headers: { "Content-Type": "application/json", ...yamadaHeaders },
    });

    const res = await customersPOST(req);
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error.code).toBe("FORBIDDEN");
  });
});

// ===== API-CST-005: 顧客削除（訪問記録あり）=====
describe("API-CST-005: DELETE /customers/:id（訪問記録あり）", () => {
  it("409 Conflict, error.code が CONFLICT", async () => {
    mockPrisma.customer.findUnique.mockResolvedValue(customerAlpha);
    mockPrisma.visitRecord.count.mockResolvedValue(3); // 訪問記録あり

    const req = new NextRequest("http://localhost/api/v1/customers/1", {
      method: "DELETE",
      headers: satoHeaders,
    });

    const res = await customerDELETE(req, { params: Promise.resolve({ id: "1" }) });
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.error.code).toBe("CONFLICT");
  });
});
