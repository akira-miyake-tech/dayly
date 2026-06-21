import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";
import { unauthorizedResponse, internalServerErrorResponse } from "@/lib/response";

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET ?? "";
  return new TextEncoder().encode(secret);
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return unauthorizedResponse("認証が必要です");
    }

    const token = authHeader.slice(7);

    try {
      const secret = getJwtSecret();
      const { payload } = await jwtVerify(token, secret);
      const jti = payload["jti"] as string | undefined;
      const exp = payload["exp"] as number | undefined;

      if (jti) {
        // トークンをブラックリストに追加（revoked_tokens テーブル）
        const expiresAt = exp ? new Date(exp * 1000) : new Date(Date.now() + 24 * 60 * 60 * 1000);

        await prisma.revokedToken.upsert({
          where: { jti },
          update: {},
          create: { jti, expiresAt },
        });
      }
    } catch {
      // トークンが既に無効でもログアウト扱いにする
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Logout error:", error);
    return internalServerErrorResponse();
  }
}
