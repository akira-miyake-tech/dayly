import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { checkTokenRevoked } from "@/lib/checkRevoked";
import {
  forbiddenResponse,
  notFoundResponse,
  internalServerErrorResponse,
} from "@/lib/response";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * DELETE /api/v1/comments/:id — コメント削除（本人のみ）
 * Issue #15
 */
export async function DELETE(req: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const revokedCheck = await checkTokenRevoked(req);
    if (revokedCheck) return revokedCheck;

    const user = getAuthUser(req);
    const { id } = await params;
    const commentId = parseInt(id, 10);

    if (isNaN(commentId)) {
      return notFoundResponse("コメントが見つかりません");
    }

    // コメントの存在チェック
    const comment = await prisma.comment.findUnique({ where: { commentId } });
    if (!comment) {
      return notFoundResponse("コメントが見つかりません");
    }

    // 本人のコメントのみ削除可能
    if (comment.userId !== user.user_id) {
      return forbiddenResponse("他のユーザーのコメントは削除できません");
    }

    await prisma.comment.delete({ where: { commentId } });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("DELETE /comments/:id error:", error);
    return internalServerErrorResponse();
  }
}
