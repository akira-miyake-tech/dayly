import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { unauthorizedResponse } from "@/lib/response";
import { NextResponse } from "next/server";

/**
 * リクエストのトークンがrevoked（無効化）されていないか確認する
 * middlewareではEdge Runtimeの制限でDBアクセスできないため、
 * Route Handlerの冒頭でこの関数を呼び出す
 *
 * @returns null なら正常、NextResponse ならエラーレスポンス
 */
export async function checkTokenRevoked(req: NextRequest): Promise<NextResponse | null> {
  const jti = req.headers.get("x-auth-token-jti");
  if (!jti) return null;

  const revoked = await prisma.revokedToken.findUnique({ where: { jti } });
  if (revoked) {
    return unauthorizedResponse("トークンは無効化されています");
  }

  return null;
}
