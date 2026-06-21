import { SignJWT } from "jose";

const TEST_JWT_SECRET = process.env.JWT_SECRET ?? "test-jwt-secret-for-testing-only";

function getSecret(): Uint8Array {
  return new TextEncoder().encode(TEST_JWT_SECRET);
}

export type TestUserPayload = {
  user_id: number;
  role: "sales" | "manager";
  email: string;
};

/**
 * テスト用JWTトークンを生成する
 */
export async function generateTestToken(
  payload: TestUserPayload,
  expiresIn: string = "24h"
): Promise<string> {
  return new SignJWT({
    user_id: payload.user_id,
    role: payload.role,
    email: payload.email,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .setJti(crypto.randomUUID())
    .sign(getSecret());
}

/**
 * 期限切れのテスト用JWTトークンを生成する
 */
export async function generateExpiredToken(payload: TestUserPayload): Promise<string> {
  return generateTestToken(payload, "-1s");
}

/**
 * 定義済みテストユーザーの認証ヘッダーを生成する
 */
export async function authHeader(
  user: "yamada" | "suzuki" | "sato"
): Promise<{ Authorization: string }> {
  const payloads: Record<string, TestUserPayload> = {
    yamada: { user_id: 1, role: "sales", email: "yamada@test.com" },
    suzuki: { user_id: 2, role: "sales", email: "suzuki@test.com" },
    sato: { user_id: 3, role: "manager", email: "sato@test.com" },
  };

  const token = await generateTestToken(payloads[user]);
  return { Authorization: `Bearer ${token}` };
}

/**
 * テスト用ユーザーデータ
 */
export const TEST_USERS = {
  yamada: {
    user_id: 1,
    name: "山田 太郎",
    email: "yamada@test.com",
    role: "sales" as const,
    department: "東日本営業部",
  },
  suzuki: {
    user_id: 2,
    name: "鈴木 一郎",
    email: "suzuki@test.com",
    role: "sales" as const,
    department: "西日本営業部",
  },
  sato: {
    user_id: 3,
    name: "佐藤 部長",
    email: "sato@test.com",
    role: "manager" as const,
    department: "営業本部",
  },
};

/**
 * テスト用顧客データ
 */
export const TEST_CUSTOMERS = {
  alpha: { customer_id: 1, name: "田中 様", company_name: "株式会社アルファ" },
  beta: { customer_id: 2, name: "伊藤 様", company_name: "ベータ商事" },
};

/**
 * テスト用日報データ
 */
export const TEST_REPORTS = {
  report1: { report_id: 1, user_id: 1, report_date: "2026-05-20" }, // 山田の過去日報
  report2: { report_id: 2, user_id: 2, report_date: "2026-05-20" }, // 鈴木の過去日報
};

/**
 * 認証済みNextRequestを作るためのヘルパー
 * Route Handlerはmiddlewareが設定するカスタムヘッダーを読む
 */
export function makeAuthHeaders(user: {
  user_id: number;
  role: "sales" | "manager";
  email: string;
}): Record<string, string> {
  return {
    "x-auth-user-id": String(user.user_id),
    "x-auth-user-role": user.role,
    "x-auth-user-email": user.email,
  };
}

/**
 * NextRequest相当のRequestオブジェクトを生成する
 */
export function makeRequest(
  url: string,
  options: {
    method?: string;
    body?: unknown;
    headers?: Record<string, string>;
  } = {}
): Request {
  const { method = "GET", body, headers = {} } = options;
  const reqHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...headers,
  };

  return new Request(url, {
    method,
    headers: reqHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}
