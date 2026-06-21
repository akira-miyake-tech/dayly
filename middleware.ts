import { type NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

// JWT_SECRET を環境変数から取得するヘルパー
function getJwtSecret(): Uint8Array | null {
  const secret = process.env.JWT_SECRET;
  if (!secret) return null;
  return new TextEncoder().encode(secret);
}

/**
 * ミドルウェアが保護するパスのパターン
 * /api/v1 配下のすべてのエンドポイントを対象にする
 * ただし /api/v1/auth/login は除外する
 */
export const config = {
  matcher: ["/api/v1/:path*"],
};

export async function middleware(req: NextRequest): Promise<NextResponse> {
  const pathname = req.nextUrl.pathname;

  // ログインエンドポイントは認証不要
  if (pathname === "/api/v1/auth/login") {
    return NextResponse.next();
  }

  // Authorization ヘッダーからトークンを取得
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "認証が必要です" } },
      { status: 401 }
    );
  }

  const token = authHeader.slice(7);

  const secret = getJwtSecret();
  if (!secret) {
    return NextResponse.json(
      { error: { code: "INTERNAL_SERVER_ERROR", message: "JWT_SECRET が設定されていません" } },
      { status: 500 }
    );
  }

  try {
    const { payload } = await jwtVerify(token, secret);

    const userId = payload["user_id"] as number;
    const role = payload["role"] as string;
    const email = payload["email"] as string;
    const jti = payload["jti"] as string | undefined;

    if (!userId || !role || !email) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "無効なトークンです" } },
        { status: 401 }
      );
    }

    // トークン無効化（ブラックリスト）チェック
    // Note: Edge Runtime ではPrismaが使えないため、DB チェックはRoute Handler側で行う
    // ここではヘッダーにjtiをセットして渡す
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("x-auth-user-id", String(userId));
    requestHeaders.set("x-auth-user-role", role);
    requestHeaders.set("x-auth-user-email", email);
    if (jti) {
      requestHeaders.set("x-auth-token-jti", jti);
    }

    return NextResponse.next({ request: { headers: requestHeaders } });
  } catch {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "トークンが無効または期限切れです" } },
      { status: 401 }
    );
  }
}
