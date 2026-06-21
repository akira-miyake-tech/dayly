/**
 * 日報APIテスト（Issue #40）
 * API-RPT-001〜011
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { makeAuthHeaders } from "@/test/helpers";

// Prismaをモック
vi.mock("@/lib/prisma", () => ({
  prisma: {
    dailyReport: {
      count: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    visitRecord: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    comment: {
      deleteMany: vi.fn(),
    },
    revokedToken: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import { prisma } from "@/lib/prisma";
import {
  GET as reportsGET,
  POST as reportsPOST,
} from "@/app/api/v1/reports/route";
import {
  GET as reportDetailGET,
  PUT as reportPUT,
  DELETE as reportDELETE,
} from "@/app/api/v1/reports/[id]/route";

const mockPrisma = prisma as {
  dailyReport: {
    count: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    findUniqueOrThrow: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  visitRecord: {
    deleteMany: ReturnType<typeof vi.fn>;
    createMany: ReturnType<typeof vi.fn>;
  };
  comment: { deleteMany: ReturnType<typeof vi.fn> };
  revokedToken: { findUnique: ReturnType<typeof vi.fn> };
  $transaction: ReturnType<typeof vi.fn>;
};

// 認証ヘッダーショートカット
const yamadaHeaders = makeAuthHeaders({ user_id: 1, role: "sales", email: "yamada@test.com" });
const satoHeaders = makeAuthHeaders({ user_id: 3, role: "manager", email: "sato@test.com" });

// getTodayJST()は UTC+9 基準。テストはvi.setSystemTimeで制御する

// 日報の詳細データ雛形
function makeFullReport(overrides: {
  reportId?: number;
  userId?: number;
  reportDate?: Date;
  userName?: string;
}) {
  const {
    reportId = 1,
    userId = 1,
    reportDate = new Date("2026-06-21T00:00:00Z"),
    userName = "山田 太郎",
  } = overrides;
  return {
    reportId,
    reportDate,
    problem: "課題テキスト",
    plan: "プランテキスト",
    createdAt: new Date("2026-06-21T10:00:00Z"),
    updatedAt: new Date("2026-06-21T10:00:00Z"),
    user: { userId, name: userName, department: "東日本営業部" },
    visitRecords: [
      {
        visitId: 10,
        visitOrder: 1,
        content: "提案書を提出した。",
        customer: { customerId: 1, name: "田中 様", companyName: "株式会社アルファ" },
      },
    ],
    comments: [],
  };
}

// 日報サマリーデータ雛形
function makeReportSummary(overrides: { reportId?: number; userId?: number; userName?: string }) {
  const { reportId = 1, userId = 1, userName = "山田 太郎" } = overrides;
  return {
    reportId,
    reportDate: new Date("2026-06-21T00:00:00Z"),
    createdAt: new Date("2026-06-21T10:00:00Z"),
    user: { userId, name: userName },
    _count: { visitRecords: 1, comments: 0 },
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  // デフォルト: トークン未失効
  mockPrisma.revokedToken.findUnique.mockResolvedValue(null);
  // $transactionはコールバックを実行する
  mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
    return fn(mockPrisma);
  });
  // 今日は 2026-06-21 (JST) として固定
  vi.setSystemTime(new Date("2026-06-21T01:00:00Z")); // UTC 01:00 = JST 10:00
});

afterEach(() => {
  vi.useRealTimers();
});

// ===== API-RPT-001: 日報作成（正常系）=====
describe("API-RPT-001: POST /reports（正常系）", () => {
  it("201 Created, data.report_id が返り, data.visit_records に入力内容が含まれる", async () => {
    mockPrisma.dailyReport.findFirst.mockResolvedValue(null); // 重複なし
    const createdReport = {
      reportId: 10,
      reportDate: new Date("2026-06-21T00:00:00Z"),
      user: { userId: 1, name: "山田 太郎" },
    };
    // $transaction 内の create
    mockPrisma.dailyReport.create.mockResolvedValue(createdReport);
    mockPrisma.visitRecord.createMany.mockResolvedValue({ count: 1 });

    // findUniqueOrThrow: 作成後の詳細取得
    mockPrisma.dailyReport.findUniqueOrThrow.mockResolvedValue(makeFullReport({ reportId: 10 }));

    const req = new NextRequest("http://localhost/api/v1/reports", {
      method: "POST",
      body: JSON.stringify({
        report_date: "2026-06-21",
        visit_records: [{ customer_id: 1, content: "提案書を提出した。", visit_order: 1 }],
        problem: "意思決定者へのアプローチ方法を相談したい。",
        plan: "明日はフォローアップの電話をする。",
      }),
      headers: { "Content-Type": "application/json", ...yamadaHeaders },
    });

    const res = await reportsPOST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.data.report_id).toBe(10);
    expect(body.data.visit_records).toHaveLength(1);
    expect(body.data.visit_records[0].content).toBe("提案書を提出した。");
  });
});

// ===== API-RPT-002: 日報作成（訪問記録0件）=====
describe("API-RPT-002: POST /reports（visit_records 空）", () => {
  it("400 Bad Request, error.code が VALIDATION_ERROR", async () => {
    const req = new NextRequest("http://localhost/api/v1/reports", {
      method: "POST",
      body: JSON.stringify({
        report_date: "2026-06-21",
        visit_records: [],
      }),
      headers: { "Content-Type": "application/json", ...yamadaHeaders },
    });

    const res = await reportsPOST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });
});

// ===== API-RPT-003: 日報作成（重複）=====
describe("API-RPT-003: POST /reports（同日重複）", () => {
  it("409 Conflict, error.code が CONFLICT", async () => {
    mockPrisma.dailyReport.findFirst.mockResolvedValue({ reportId: 1 }); // 既存あり

    const req = new NextRequest("http://localhost/api/v1/reports", {
      method: "POST",
      body: JSON.stringify({
        report_date: "2026-06-21",
        visit_records: [{ customer_id: 1, content: "訪問した", visit_order: 1 }],
      }),
      headers: { "Content-Type": "application/json", ...yamadaHeaders },
    });

    const res = await reportsPOST(req);
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.error.code).toBe("CONFLICT");
  });
});

// ===== API-RPT-004: 日報作成（上長による実行）=====
describe("API-RPT-004: POST /reports（上長が実行）", () => {
  it("403 Forbidden", async () => {
    const req = new NextRequest("http://localhost/api/v1/reports", {
      method: "POST",
      body: JSON.stringify({
        report_date: "2026-06-21",
        visit_records: [{ customer_id: 1, content: "訪問した", visit_order: 1 }],
      }),
      headers: { "Content-Type": "application/json", ...satoHeaders },
    });

    const res = await reportsPOST(req);
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error.code).toBe("FORBIDDEN");
  });
});

// ===== API-RPT-005: 日報一覧取得（営業）=====
describe("API-RPT-005: GET /reports（営業）", () => {
  it("200 OK, 自分（user_id: 1）の日報のみ返る", async () => {
    mockPrisma.dailyReport.count.mockResolvedValue(1);
    mockPrisma.dailyReport.findMany.mockResolvedValue([
      makeReportSummary({ reportId: 1, userId: 1, userName: "山田 太郎" }),
    ]);

    const req = new NextRequest("http://localhost/api/v1/reports", {
      method: "GET",
      headers: yamadaHeaders,
    });

    const res = await reportsGET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.reports).toHaveLength(1);
    expect(body.data.reports[0].user.user_id).toBe(1);

    // Prisma クエリに userId: 1 の where 条件が渡された確認
    expect(mockPrisma.dailyReport.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: 1 }),
      })
    );
  });
});

// ===== API-RPT-006: 日報一覧取得（上長）=====
describe("API-RPT-006: GET /reports（上長）", () => {
  it("200 OK, 全ユーザーの日報が返る（where に userId フィルタなし）", async () => {
    mockPrisma.dailyReport.count.mockResolvedValue(2);
    mockPrisma.dailyReport.findMany.mockResolvedValue([
      makeReportSummary({ reportId: 1, userId: 1, userName: "山田 太郎" }),
      makeReportSummary({ reportId: 2, userId: 2, userName: "鈴木 一郎" }),
    ]);

    const req = new NextRequest("http://localhost/api/v1/reports", {
      method: "GET",
      headers: satoHeaders,
    });

    const res = await reportsGET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.reports).toHaveLength(2);
    // 上長の場合 userId フィルタが where に含まれない
    expect(mockPrisma.dailyReport.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.not.objectContaining({ userId: expect.anything() }),
      })
    );
  });
});

// ===== API-RPT-007: 日報詳細取得（他人の日報）=====
describe("API-RPT-007: GET /reports/:id（他人の日報）", () => {
  it("403 Forbidden（営業が他者の日報を取得しようとした）", async () => {
    // report_id: 2 は鈴木（user_id: 2）の日報
    mockPrisma.dailyReport.findUnique.mockResolvedValue(
      makeFullReport({ reportId: 2, userId: 2, userName: "鈴木 一郎" })
    );

    const req = new NextRequest("http://localhost/api/v1/reports/2", {
      method: "GET",
      headers: yamadaHeaders, // 山田（user_id: 1）でアクセス
    });

    const res = await reportDetailGET(req, { params: Promise.resolve({ id: "2" }) });
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error.code).toBe("FORBIDDEN");
  });
});

// ===== API-RPT-008: 日報更新（正常系）=====
describe("API-RPT-008: PUT /reports/:id（当日・正常）", () => {
  it("200 OK, レスポンスに更新後の内容が反映されている", async () => {
    // 当日の山田の日報
    const reportDate = new Date("2026-06-21T00:00:00Z"); // UTC = JST 2026-06-21
    mockPrisma.dailyReport.findUnique.mockResolvedValueOnce(
      makeFullReport({ reportId: 1, userId: 1, reportDate })
    );

    // $transaction 内の操作
    mockPrisma.visitRecord.deleteMany.mockResolvedValue({ count: 1 });
    mockPrisma.visitRecord.createMany.mockResolvedValue({ count: 1 });
    mockPrisma.dailyReport.update.mockResolvedValue({});

    // 更新後の詳細取得
    const updatedReport = {
      ...makeFullReport({ reportId: 1, userId: 1, reportDate }),
      visitRecords: [
        {
          visitId: 10,
          visitOrder: 1,
          content: "提案書を提出し、追加資料の依頼をもらった。",
          customer: { customerId: 1, name: "田中 様", companyName: "株式会社アルファ" },
        },
      ],
    };
    mockPrisma.dailyReport.findUnique.mockResolvedValueOnce(updatedReport);

    const req = new NextRequest("http://localhost/api/v1/reports/1", {
      method: "PUT",
      body: JSON.stringify({
        visit_records: [
          {
            customer_id: 1,
            content: "提案書を提出し、追加資料の依頼をもらった。",
            visit_order: 1,
          },
        ],
        problem: "更新後の課題テキスト",
        plan: "更新後のプランテキスト",
      }),
      headers: { "Content-Type": "application/json", ...yamadaHeaders },
    });

    const res = await reportPUT(req, { params: Promise.resolve({ id: "1" }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.visit_records[0].content).toBe("提案書を提出し、追加資料の依頼をもらった。");
  });
});

// ===== API-RPT-009: 日報更新（過去日報）=====
describe("API-RPT-009: PUT /reports/:id（過去日報）", () => {
  it("403 Forbidden（当日以外の日報を更新しようとした）", async () => {
    // 過去の日報（2026-05-20）
    const pastDate = new Date("2026-05-20T00:00:00Z");
    mockPrisma.dailyReport.findUnique.mockResolvedValue(
      makeFullReport({ reportId: 1, userId: 1, reportDate: pastDate })
    );

    const req = new NextRequest("http://localhost/api/v1/reports/1", {
      method: "PUT",
      body: JSON.stringify({
        visit_records: [{ customer_id: 1, content: "更新内容", visit_order: 1 }],
      }),
      headers: { "Content-Type": "application/json", ...yamadaHeaders },
    });

    const res = await reportPUT(req, { params: Promise.resolve({ id: "1" }) });
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error.code).toBe("FORBIDDEN");
  });
});

// ===== API-RPT-010: 日報削除（当日）=====
describe("API-RPT-010: DELETE /reports/:id（当日）", () => {
  it("204 No Content, 後続 GET は 404", async () => {
    const reportDate = new Date("2026-06-21T00:00:00Z");
    // DELETE 用の findUnique
    mockPrisma.dailyReport.findUnique.mockResolvedValueOnce({
      reportId: 1,
      reportDate,
      user: { userId: 1 },
    });

    mockPrisma.visitRecord.deleteMany.mockResolvedValue({ count: 1 });
    mockPrisma.comment.deleteMany.mockResolvedValue({ count: 0 });
    mockPrisma.dailyReport.delete.mockResolvedValue({});

    const delReq = new NextRequest("http://localhost/api/v1/reports/1", {
      method: "DELETE",
      headers: yamadaHeaders,
    });

    const delRes = await reportDELETE(delReq, { params: Promise.resolve({ id: "1" }) });
    expect(delRes.status).toBe(204);

    // 後続 GET: 日報は存在しない
    mockPrisma.dailyReport.findUnique.mockResolvedValueOnce(null);

    const getReq = new NextRequest("http://localhost/api/v1/reports/1", {
      method: "GET",
      headers: yamadaHeaders,
    });

    const getRes = await reportDetailGET(getReq, { params: Promise.resolve({ id: "1" }) });
    const getBody = await getRes.json();

    expect(getRes.status).toBe(404);
    expect(getBody.error.code).toBe("NOT_FOUND");
  });
});

// ===== API-RPT-011: 日報削除（過去日報）=====
describe("API-RPT-011: DELETE /reports/:id（過去日報）", () => {
  it("403 Forbidden（当日以外の日報を削除しようとした）", async () => {
    const pastDate = new Date("2026-05-20T00:00:00Z");
    mockPrisma.dailyReport.findUnique.mockResolvedValue({
      reportId: 1,
      reportDate: pastDate,
      user: { userId: 1 },
    });

    const req = new NextRequest("http://localhost/api/v1/reports/1", {
      method: "DELETE",
      headers: yamadaHeaders,
    });

    const res = await reportDELETE(req, { params: Promise.resolve({ id: "1" }) });
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error.code).toBe("FORBIDDEN");
  });
});
