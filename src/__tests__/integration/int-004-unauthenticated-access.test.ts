/**
 * INT-004: 未認証アクセスの排除
 * 1. トークンなしで GET /reports → 401
 * 2. 期限切れトークンで GET /reports → 401
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// fetch をモック
const mockFetch = vi.fn();
global.fetch = mockFetch;

// js-cookie をモック
vi.mock("js-cookie", () => ({
  default: {
    get: vi.fn(),
    set: vi.fn(),
    remove: vi.fn(),
  },
}));

import Cookies from "js-cookie";
import { api, ApiError } from "@/lib/api";

describe("INT-004: 未認証アクセスの排除", () => {
  beforeEach(() => {
    mockFetch.mockClear();
    vi.mocked(Cookies.get).mockReturnValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("手順1: トークンなしで GET /reports にリクエストを送ると 401 ApiError が発生する", async () => {
    // トークンなし（Cookieに何もない）
    vi.mocked(Cookies.get).mockReturnValue(undefined);

    // サーバーが 401 を返す
    const mockResponse = {
      status: 401,
      ok: false,
      json: async () => ({
        error: {
          code: "UNAUTHORIZED",
          message: "認証が必要です",
        },
      }),
    };
    mockFetch.mockResolvedValueOnce(mockResponse);

    let caughtError: unknown;
    try {
      await api.get("/reports");
    } catch (err) {
      caughtError = err;
    }

    expect(caughtError).toBeInstanceOf(ApiError);
    expect((caughtError as ApiError).status).toBe(401);
    expect((caughtError as ApiError).code).toBe("UNAUTHORIZED");
  });

  it("手順2: 期限切れトークンで GET /reports にリクエストを送ると 401 ApiError が発生する", async () => {
    // 期限切れトークンがセットされている
    vi.mocked(Cookies.get).mockImplementation((key: string) => {
      if (key === "auth_token") return "expired-token-xyz";
      return undefined;
    });

    // サーバーが 401 を返す
    mockFetch.mockResolvedValueOnce({
      status: 401,
      ok: false,
      json: async () => ({
        error: {
          code: "UNAUTHORIZED",
          message: "トークンの有効期限が切れています",
        },
      }),
    });

    try {
      await api.get("/reports");
      expect.fail("ApiError が発生するはずです");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).status).toBe(401);
      expect((err as ApiError).code).toBe("UNAUTHORIZED");
    }
  });

  it("トークンなしのリクエストには Authorization ヘッダーが含まれない", async () => {
    vi.mocked(Cookies.get).mockReturnValue(undefined);

    mockFetch.mockResolvedValueOnce({
      status: 401,
      ok: false,
      json: async () => ({
        error: { code: "UNAUTHORIZED", message: "未認証" },
      }),
    });

    try {
      await api.get("/reports");
    } catch {
      // エラーは想定内
    }

    const callArgs = mockFetch.mock.calls[0];
    const options = callArgs[1] as RequestInit;
    const headers = options.headers as Record<string, string>;
    expect(headers["Authorization"]).toBeUndefined();
  });

  it("有効なトークンがある場合は Authorization ヘッダーが含まれる", async () => {
    vi.mocked(Cookies.get).mockImplementation((key: string) => {
      if (key === "auth_token") return "valid-token-abc";
      return undefined;
    });

    mockFetch.mockResolvedValueOnce({
      status: 200,
      ok: true,
      json: async () => ({ data: { reports: [] } }),
    });

    await api.get("/reports");

    const callArgs = mockFetch.mock.calls[0];
    const options = callArgs[1] as RequestInit;
    const headers = options.headers as Record<string, string>;
    expect(headers["Authorization"]).toBe("Bearer valid-token-abc");
  });
});
