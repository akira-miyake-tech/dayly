import { NextResponse } from "next/server";

export function successResponse<T>(data: T, status: number = 200): NextResponse {
  return NextResponse.json({ data }, { status });
}

export function errorResponse(
  code: string,
  message: string,
  status: number,
  details?: { field: string; message: string }[]
): NextResponse {
  return NextResponse.json(
    {
      error: {
        code,
        message,
        ...(details ? { details } : {}),
      },
    },
    { status }
  );
}

export function unauthorizedResponse(message: string = "認証が必要です"): NextResponse {
  return errorResponse("UNAUTHORIZED", message, 401);
}

export function forbiddenResponse(message: string = "権限がありません"): NextResponse {
  return errorResponse("FORBIDDEN", message, 403);
}

export function notFoundResponse(message: string = "リソースが見つかりません"): NextResponse {
  return errorResponse("NOT_FOUND", message, 404);
}

export function conflictResponse(message: string): NextResponse {
  return errorResponse("CONFLICT", message, 409);
}

export function validationErrorResponse(
  details: { field: string; message: string }[]
): NextResponse {
  return errorResponse("VALIDATION_ERROR", "入力内容に誤りがあります", 400, details);
}

export function internalServerErrorResponse(
  message: string = "サーバーエラーが発生しました"
): NextResponse {
  return errorResponse("INTERNAL_SERVER_ERROR", message, 500);
}
