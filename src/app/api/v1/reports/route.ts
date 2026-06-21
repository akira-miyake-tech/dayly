import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, RoleError } from "@/lib/auth";
import { checkTokenRevoked } from "@/lib/checkRevoked";
import { GetReportsQuerySchema, CreateReportRequestSchema } from "@/lib/schemas/reports.schema";
import {
  successResponse,
  forbiddenResponse,
  conflictResponse,
  validationErrorResponse,
  internalServerErrorResponse,
} from "@/lib/response";

/**
 * GET /api/v1/reports — 日報一覧取得
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const revokedCheck = await checkTokenRevoked(req);
    if (revokedCheck) return revokedCheck;

    const user = getAuthUser(req);

    // クエリパラメータのパース
    const searchParams = req.nextUrl.searchParams;
    const rawQuery = {
      from: searchParams.get("from") ?? undefined,
      to: searchParams.get("to") ?? undefined,
      user_id: searchParams.get("user_id") ?? undefined,
      page: searchParams.get("page") ?? undefined,
      per_page: searchParams.get("per_page") ?? undefined,
    };

    const queryResult = GetReportsQuerySchema.safeParse(rawQuery);
    if (!queryResult.success) {
      const details = queryResult.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));
      return validationErrorResponse(details);
    }

    const { from, to, user_id, page, per_page } = queryResult.data;

    // 営業は自分の日報のみ、上長は全員分
    const targetUserId = user.role === "sales" ? user.user_id : user_id;

    const where: {
      userId?: number;
      reportDate?: { gte?: Date; lte?: Date };
    } = {};

    if (targetUserId) {
      where.userId = targetUserId;
    }

    if (from || to) {
      where.reportDate = {};
      if (from) where.reportDate.gte = new Date(from);
      if (to) where.reportDate.lte = new Date(to);
    }

    const total = await prisma.dailyReport.count({ where });
    const totalPages = Math.ceil(total / per_page);

    const reports = await prisma.dailyReport.findMany({
      where,
      include: {
        user: { select: { userId: true, name: true } },
        _count: {
          select: {
            visitRecords: true,
            comments: true,
          },
        },
      },
      orderBy: { reportDate: "desc" },
      skip: (page - 1) * per_page,
      take: per_page,
    });

    return successResponse({
      reports: reports.map((r) => ({
        report_id: r.reportId,
        report_date: r.reportDate.toISOString().split("T")[0],
        user: { user_id: r.user.userId, name: r.user.name },
        visit_count: r._count.visitRecords,
        comment_count: r._count.comments,
        unread_comment_count: 0,
        created_at: r.createdAt.toISOString(),
      })),
      pagination: {
        total,
        page,
        per_page,
        total_pages: totalPages,
      },
    });
  } catch (error) {
    if (error instanceof RoleError) {
      return forbiddenResponse(error.message);
    }
    console.error("GET /reports error:", error);
    return internalServerErrorResponse();
  }
}

/**
 * POST /api/v1/reports — 日報作成
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const revokedCheck = await checkTokenRevoked(req);
    if (revokedCheck) return revokedCheck;

    const user = getAuthUser(req);

    // 上長は日報を作成できない
    if (user.role === "manager") {
      return forbiddenResponse("上長は日報を作成できません");
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return validationErrorResponse([{ field: "body", message: "リクエストボディが必要です" }]);
    }

    const parseResult = CreateReportRequestSchema.safeParse(body);
    if (!parseResult.success) {
      const details = parseResult.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));
      return validationErrorResponse(details);
    }

    const { report_date, visit_records, problem, plan } = parseResult.data;

    // 同日の日報が既に存在するかチェック
    const existingReport = await prisma.dailyReport.findFirst({
      where: {
        userId: user.user_id,
        reportDate: new Date(report_date),
      },
    });

    if (existingReport) {
      return conflictResponse("同日の日報が既に存在します");
    }

    // トランザクションで日報と訪問記録を作成
    const report = await prisma.$transaction(async (tx) => {
      const newReport = await tx.dailyReport.create({
        data: {
          userId: user.user_id,
          reportDate: new Date(report_date),
          problem: problem ?? null,
          plan: plan ?? null,
        },
        include: {
          user: { select: { userId: true, name: true } },
        },
      });

      await tx.visitRecord.createMany({
        data: visit_records.map((vr) => ({
          reportId: newReport.reportId,
          customerId: vr.customer_id,
          content: vr.content,
          visitOrder: vr.visit_order,
        })),
      });

      return newReport;
    });

    // 作成した日報の詳細を取得
    const fullReport = await prisma.dailyReport.findUniqueOrThrow({
      where: { reportId: report.reportId },
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

    return successResponse(formatReportDetail(fullReport), 201);
  } catch (error) {
    if (error instanceof RoleError) {
      return forbiddenResponse(error.message);
    }
    console.error("POST /reports error:", error);
    return internalServerErrorResponse();
  }
}

// 日報詳細フォーマットヘルパー
export type FullReportData = {
  reportId: number;
  reportDate: Date;
  problem: string | null;
  plan: string | null;
  createdAt: Date;
  updatedAt: Date;
  user: { userId: number; name: string; department: string | null };
  visitRecords: Array<{
    visitId: number;
    visitOrder: number;
    content: string;
    customer: { customerId: number; name: string; companyName: string };
  }>;
  comments: Array<{
    commentId: number;
    content: string;
    createdAt: Date;
    user: { userId: number; name: string };
  }>;
};

export function formatReportDetail(r: FullReportData) {
  return {
    report_id: r.reportId,
    report_date: r.reportDate.toISOString().split("T")[0],
    user: {
      user_id: r.user.userId,
      name: r.user.name,
      department: r.user.department ?? "",
    },
    visit_records: r.visitRecords.map((vr) => ({
      visit_id: vr.visitId,
      customer: {
        customer_id: vr.customer.customerId,
        name: vr.customer.name,
        company_name: vr.customer.companyName,
      },
      content: vr.content,
      visit_order: vr.visitOrder,
    })),
    problem: r.problem,
    plan: r.plan,
    comments: r.comments.map((c) => ({
      comment_id: c.commentId,
      user: { user_id: c.user.userId, name: c.user.name },
      content: c.content,
      created_at: c.createdAt.toISOString(),
    })),
    created_at: r.createdAt.toISOString(),
    updated_at: r.updatedAt.toISOString(),
  };
}
