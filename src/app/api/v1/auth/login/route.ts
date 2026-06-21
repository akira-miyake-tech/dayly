import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signToken } from "@/lib/auth";
import { LoginRequestSchema } from "@/lib/schemas/auth.schema";
import {
  successResponse,
  unauthorizedResponse,
  validationErrorResponse,
  internalServerErrorResponse,
} from "@/lib/response";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return validationErrorResponse([{ field: "body", message: "リクエストボディが必要です" }]);
    }

    const parseResult = LoginRequestSchema.safeParse(body);
    if (!parseResult.success) {
      const details = parseResult.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));
      return validationErrorResponse(details);
    }

    const { email, password } = parseResult.data;

    // メールアドレスでユーザーを検索
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return unauthorizedResponse("メールアドレスまたはパスワードが正しくありません");
    }

    // パスワード検証
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return unauthorizedResponse("メールアドレスまたはパスワードが正しくありません");
    }

    // JWTトークン発行
    const { token, expiresAt } = await signToken({
      user_id: user.userId,
      role: user.role,
      email: user.email,
    });

    return successResponse({
      token,
      expires_at: expiresAt.toISOString(),
      user: {
        user_id: user.userId,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department ?? "",
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return internalServerErrorResponse();
  }
}
