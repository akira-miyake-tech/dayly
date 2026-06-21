import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { checkTokenRevoked } from "@/lib/checkRevoked";
import { CreateCommentRequestSchema } from "@/lib/schemas/comments.schema";
import {
  successResponse,
  forbiddenResponse,
  notFoundResponse,
  validationErrorResponse,
  internalServerErrorResponse,
} from "@/lib/response";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * POST /api/v1/reports/:id/comments — コメント投稿（上長のみ）
 * Issue #14
 */
export async function POST(req: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const revokedCheck = await checkTokenRevoked(req);
    if (revokedCheck) return revokedCheck;

    const user = getAuthUser(req);

    // 上長のみコメント投稿可能
    if (user.role !== "manager") {
      return forbiddenResponse("コメントは上長のみ投稿できます");
    }

    const { id } = await params;
    const reportId = parseInt(id, 10);

    if (isNaN(reportId)) {
      return notFoundResponse("日報が見つかりません");
    }

    // 日報の存在チェック
    const report = await prisma.dailyReport.findUnique({ where: { reportId } });
    if (!report) {
      return notFoundResponse("日報が見つかりません");
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return validationErrorResponse([{ field: "body", message: "リクエストボディが必要です" }]);
    }

    const parseResult = CreateCommentRequestSchema.safeParse(body);
    if (!parseResult.success) {
      const details = parseResult.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));
      return validationErrorResponse(details);
    }

    const { content } = parseResult.data;

    // コメント作成
    const comment = await prisma.comment.create({
      data: {
        reportId,
        userId: user.user_id,
        content,
      },
      include: {
        user: { select: { userId: true, name: true } },
      },
    });

    return successResponse(
      {
        comment_id: comment.commentId,
        report_id: comment.reportId,
        user: { user_id: comment.user.userId, name: comment.user.name },
        content: comment.content,
        created_at: comment.createdAt.toISOString(),
      },
      201
    );
  } catch (error) {
    console.error("POST /reports/:id/comments error:", error);
    return internalServerErrorResponse();
  }
}
