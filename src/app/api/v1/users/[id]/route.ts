import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { checkTokenRevoked } from "@/lib/checkRevoked";
import { UpdateUserRequestSchema } from "@/lib/schemas/users.schema";
import {
  successResponse,
  forbiddenResponse,
  notFoundResponse,
  conflictResponse,
  validationErrorResponse,
  internalServerErrorResponse,
} from "@/lib/response";
import { formatUser } from "../route";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * GET /api/v1/users/:id — ユーザー詳細取得（上長のみ）
 * Issue #23
 */
export async function GET(req: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const revokedCheck = await checkTokenRevoked(req);
    if (revokedCheck) return revokedCheck;

    const user = getAuthUser(req);

    // 上長のみ閲覧可能
    if (user.role !== "manager") {
      return forbiddenResponse("ユーザー情報は上長のみ閲覧できます");
    }

    const { id } = await params;
    const userId = parseInt(id, 10);

    if (isNaN(userId)) {
      return notFoundResponse("ユーザーが見つかりません");
    }

    const targetUser = await prisma.user.findUnique({
      where: { userId },
      select: {
        userId: true,
        name: true,
        email: true,
        role: true,
        department: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!targetUser) {
      return notFoundResponse("ユーザーが見つかりません");
    }

    return successResponse(formatUser(targetUser));
  } catch (error) {
    console.error("GET /users/:id error:", error);
    return internalServerErrorResponse();
  }
}

/**
 * PUT /api/v1/users/:id — ユーザー更新（上長のみ）
 * Issue #24
 */
export async function PUT(req: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const revokedCheck = await checkTokenRevoked(req);
    if (revokedCheck) return revokedCheck;

    const user = getAuthUser(req);

    // 上長のみ更新可能
    if (user.role !== "manager") {
      return forbiddenResponse("ユーザーの更新は上長のみ可能です");
    }

    const { id } = await params;
    const userId = parseInt(id, 10);

    if (isNaN(userId)) {
      return notFoundResponse("ユーザーが見つかりません");
    }

    const existing = await prisma.user.findUnique({ where: { userId } });
    if (!existing) {
      return notFoundResponse("ユーザーが見つかりません");
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return validationErrorResponse([{ field: "body", message: "リクエストボディが必要です" }]);
    }

    const parseResult = UpdateUserRequestSchema.safeParse(body);
    if (!parseResult.success) {
      const details = parseResult.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));
      return validationErrorResponse(details);
    }

    const { name, email, role, department, password } = parseResult.data;

    // メールアドレス重複チェック（自分以外）
    if (email !== existing.email) {
      const emailConflict = await prisma.user.findUnique({ where: { email } });
      if (emailConflict && emailConflict.userId !== userId) {
        return conflictResponse("このメールアドレスは既に他のユーザーに使用されています");
      }
    }

    // パスワードが指定された場合のみハッシュ化
    let passwordHash: string | undefined;
    if (password) {
      passwordHash = await bcrypt.hash(password, 10);
    }

    const updated = await prisma.user.update({
      where: { userId },
      data: {
        name,
        email,
        role,
        department: department ?? null,
        ...(passwordHash ? { passwordHash } : {}),
      },
      select: {
        userId: true,
        name: true,
        email: true,
        role: true,
        department: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return successResponse(formatUser(updated));
  } catch (error) {
    console.error("PUT /users/:id error:", error);
    return internalServerErrorResponse();
  }
}

/**
 * DELETE /api/v1/users/:id — ユーザー削除（上長のみ、日報ありは409）
 * Issue #25
 */
export async function DELETE(req: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const revokedCheck = await checkTokenRevoked(req);
    if (revokedCheck) return revokedCheck;

    const user = getAuthUser(req);

    // 上長のみ削除可能
    if (user.role !== "manager") {
      return forbiddenResponse("ユーザーの削除は上長のみ可能です");
    }

    const { id } = await params;
    const userId = parseInt(id, 10);

    if (isNaN(userId)) {
      return notFoundResponse("ユーザーが見つかりません");
    }

    const existing = await prisma.user.findUnique({ where: { userId } });
    if (!existing) {
      return notFoundResponse("ユーザーが見つかりません");
    }

    // 日報が紐づいている場合は409
    const reportCount = await prisma.dailyReport.count({ where: { userId } });
    if (reportCount > 0) {
      return conflictResponse("このユーザーには日報が紐づいているため削除できません");
    }

    await prisma.user.delete({ where: { userId } });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("DELETE /users/:id error:", error);
    return internalServerErrorResponse();
  }
}
