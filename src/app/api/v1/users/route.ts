import type { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { checkTokenRevoked } from "@/lib/checkRevoked";
import { GetUsersQuerySchema, CreateUserRequestSchema } from "@/lib/schemas/users.schema";
import {
  successResponse,
  forbiddenResponse,
  conflictResponse,
  validationErrorResponse,
  internalServerErrorResponse,
} from "@/lib/response";

/**
 * GET /api/v1/users — ユーザー一覧取得（上長のみ）
 * Issue #21
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const revokedCheck = await checkTokenRevoked(req);
    if (revokedCheck) return revokedCheck;

    const user = getAuthUser(req);

    // 上長のみ閲覧可能
    if (user.role !== "manager") {
      return forbiddenResponse("ユーザー一覧は上長のみ閲覧できます");
    }

    const searchParams = req.nextUrl.searchParams;
    const rawQuery = {
      role: searchParams.get("role") ?? undefined,
      page: searchParams.get("page") ?? undefined,
      per_page: searchParams.get("per_page") ?? undefined,
    };

    const queryResult = GetUsersQuerySchema.safeParse(rawQuery);
    if (!queryResult.success) {
      const details = queryResult.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));
      return validationErrorResponse(details);
    }

    const { role, page, per_page } = queryResult.data;

    const where = role ? { role } : {};

    const total = await prisma.user.count({ where });
    const totalPages = Math.ceil(total / per_page);

    const users = await prisma.user.findMany({
      where,
      select: {
        userId: true,
        name: true,
        email: true,
        role: true,
        department: true,
        createdAt: true,
        updatedAt: true,
        // passwordHash は含めない
      },
      orderBy: { userId: "asc" },
      skip: (page - 1) * per_page,
      take: per_page,
    });

    return successResponse({
      users: users.map(formatUser),
      pagination: {
        total,
        page,
        per_page,
        total_pages: totalPages,
      },
    });
  } catch (error) {
    console.error("GET /users error:", error);
    return internalServerErrorResponse();
  }
}

/**
 * POST /api/v1/users — ユーザー登録（上長のみ）
 * Issue #22
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const revokedCheck = await checkTokenRevoked(req);
    if (revokedCheck) return revokedCheck;

    const user = getAuthUser(req);

    // 上長のみ登録可能
    if (user.role !== "manager") {
      return forbiddenResponse("ユーザーの登録は上長のみ可能です");
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return validationErrorResponse([{ field: "body", message: "リクエストボディが必要です" }]);
    }

    const parseResult = CreateUserRequestSchema.safeParse(body);
    if (!parseResult.success) {
      const details = parseResult.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));
      return validationErrorResponse(details);
    }

    const { name, email, role, department, password } = parseResult.data;

    // メールアドレス重複チェック
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return conflictResponse("このメールアドレスは既に使用されています");
    }

    // パスワードハッシュ化
    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        role,
        department: department ?? null,
        passwordHash,
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

    return successResponse(formatUser(newUser), 201);
  } catch (error) {
    console.error("POST /users error:", error);
    return internalServerErrorResponse();
  }
}

export function formatUser(u: {
  userId: number;
  name: string;
  email: string;
  role: "sales" | "manager";
  department: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    user_id: u.userId,
    name: u.name,
    email: u.email,
    role: u.role,
    department: u.department ?? null,
    created_at: u.createdAt.toISOString(),
    updated_at: u.updatedAt.toISOString(),
  };
}
