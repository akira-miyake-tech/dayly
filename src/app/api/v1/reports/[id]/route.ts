import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { checkTokenRevoked } from "@/lib/checkRevoked";
import { UpdateReportRequestSchema } from "@/lib/schemas/reports.schema";
import {
  successResponse,
  forbiddenResponse,
  notFoundResponse,
  validationErrorResponse,
  internalServerErrorResponse,
} from "@/lib/response";
import { formatReportDetail, type FullReportData } from "../route";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * 日報詳細をDBから取得するヘルパー
 */
async function fetchReportDetail(reportId: number): Promise<FullReportData | null> {
  return prisma.dailyReport.findUnique({
    where: { reportId },
    include: {
      user: { select: { userId: true, name: true, department: true } },
      visitRecords: {
        include: {
          customer: {
            select: { customerId: true, name: true, companyName: true },
          },
        },
        orderBy: { visitOrder: "asc" },
      },
      comments: {
        include: {
          user: { select: { userId: true, name: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

/**
 * JST（日本標準時）での今日の日付を YYYY-MM-DD 形式で返す
 */
function getTodayJST(): string {
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return jst.toISOString().split("T")[0];
}

/**
 * GET /api/v1/reports/:id — 日報詳細取得
 * Issue #11
 */
export async function GET(req: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const revokedCheck = await checkTokenRevoked(req);
    if (revokedCheck) return revokedCheck;

    const user = getAuthUser(req);
    const { id } = await params;
    const reportId = parseInt(id, 10);

    if (isNaN(reportId)) {
      return notFoundResponse("日報が見つかりません");
    }

    const report = await fetchReportDetail(reportId);
    if (!report) {
      return notFoundResponse("日報が見つかりません");
    }

    // 営業は自分の日報のみ閲覧可能
    if (user.role === "sales" && report.user.userId !== user.user_id) {
      return forbiddenResponse("他ユーザーの日報を閲覧する権限がありません");
    }

    return successResponse(formatReportDetail(report));
  } catch (error) {
    console.error("GET /reports/:id error:", error);
    return internalServerErrorResponse();
  }
}

/**
 * PUT /api/v1/reports/:id — 日報更新
 * Issue #12
 */
export async function PUT(req: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const revokedCheck = await checkTokenRevoked(req);
    if (revokedCheck) return revokedCheck;

    const user = getAuthUser(req);
    const { id } = await params;
    const reportId = parseInt(id, 10);

    if (isNaN(reportId)) {
      return notFoundResponse("日報が見つかりません");
    }

    const report = await fetchReportDetail(reportId);
    if (!report) {
      return notFoundResponse("日報が見つかりません");
    }

    // 上長は更新不可
    if (user.role === "manager") {
      return forbiddenResponse("上長は日報を更新できません");
    }

    // 本人以外は更新不可
    if (report.user.userId !== user.user_id) {
      return forbiddenResponse("他ユーザーの日報を更新する権限がありません");
    }

    // 当日以外は更新不可
    const reportDateStr = report.reportDate.toISOString().split("T")[0];
    const todayStr = getTodayJST();
    if (reportDateStr !== todayStr) {
      return forbiddenResponse("当日の日報のみ更新できます");
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return validationErrorResponse([{ field: "body", message: "リクエストボディが必要です" }]);
    }

    const parseResult = UpdateReportRequestSchema.safeParse(body);
    if (!parseResult.success) {
      const details = parseResult.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));
      return validationErrorResponse(details);
    }

    const { visit_records, problem, plan } = parseResult.data;

    // トランザクションで更新
    await prisma.$transaction(async (tx) => {
      // 既存の訪問記録を削除して再作成
      await tx.visitRecord.deleteMany({ where: { reportId } });

      await tx.visitRecord.createMany({
        data: visit_records.map((vr) => ({
          reportId,
          customerId: vr.customer_id,
          content: vr.content,
          visitOrder: vr.visit_order,
        })),
      });

      await tx.dailyReport.update({
        where: { reportId },
        data: {
          problem: problem !== undefined ? (problem ?? null) : undefined,
          plan: plan !== undefined ? (plan ?? null) : undefined,
        },
      });
    });

    // 更新後の詳細を取得
    const updatedReport = await fetchReportDetail(reportId);
    return successResponse(formatReportDetail(updatedReport!));
  } catch (error) {
    console.error("PUT /reports/:id error:", error);
    return internalServerErrorResponse();
  }
}

/**
 * DELETE /api/v1/reports/:id — 日報削除
 * Issue #13
 */
export async function DELETE(req: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const revokedCheck = await checkTokenRevoked(req);
    if (revokedCheck) return revokedCheck;

    const user = getAuthUser(req);
    const { id } = await params;
    const reportId = parseInt(id, 10);

    if (isNaN(reportId)) {
      return notFoundResponse("日報が見つかりません");
    }

    const report = await prisma.dailyReport.findUnique({
      where: { reportId },
      include: { user: { select: { userId: true } } },
    });

    if (!report) {
      return notFoundResponse("日報が見つかりません");
    }

    // 上長は削除不可
    if (user.role === "manager") {
      return forbiddenResponse("上長は日報を削除できません");
    }

    // 本人以外は削除不可
    if (report.user.userId !== user.user_id) {
      return forbiddenResponse("他ユーザーの日報を削除する権限がありません");
    }

    // 当日以外は削除不可
    const reportDateStr = report.reportDate.toISOString().split("T")[0];
    const todayStr = getTodayJST();
    if (reportDateStr !== todayStr) {
      return forbiddenResponse("当日の日報のみ削除できます");
    }

    // トランザクションで削除（訪問記録・コメントも削除）
    await prisma.$transaction(async (tx) => {
      await tx.visitRecord.deleteMany({ where: { reportId } });
      await tx.comment.deleteMany({ where: { reportId } });
      await tx.dailyReport.delete({ where: { reportId } });
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("DELETE /reports/:id error:", error);
    return internalServerErrorResponse();
  }
}
