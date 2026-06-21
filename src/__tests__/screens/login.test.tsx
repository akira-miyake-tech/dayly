/**
 * SCR-TEST-001: ログイン画面（正常系）
 * SCR-TEST-002: ログイン画面（未入力バリデーション）
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

// Next.js のルーティングをモック
const mockPush = vi.fn();
const mockReplace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
  usePathname: () => "/login",
}));

// AuthContext をモック
const mockLogin = vi.fn();
let mockUser: { user_id: number; name: string; role: string } | null = null;

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: mockUser,
    isLoading: false,
    login: mockLogin,
    logout: vi.fn(),
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// api モック
vi.mock("@/lib/api", () => ({
  api: {
    post: vi.fn(),
  },
  ApiError: class ApiError extends Error {
    constructor(
      public status: number,
      public code: string,
      message: string
    ) {
      super(message);
    }
  },
}));

// mock-data モック（動的インポート対応）
vi.mock("@/lib/mock-data", () => ({
  MOCK_SALES_USER: {
    user_id: 1,
    name: "山田 太郎",
    email: "yamada@company.com",
    role: "sales",
    department: "東日本営業部",
  },
  MOCK_MANAGER_USER: {
    user_id: 2,
    name: "佐藤 部長",
    email: "sato@company.com",
    role: "manager",
    department: "営業部",
  },
}));

// schemas モック
vi.mock("@/lib/schemas", () => ({
  default: {},
}));

import LoginPage from "@/app/(public)/login/page";

describe("SCR-TEST-001: ログイン画面（正常系）", () => {
  beforeEach(() => {
    mockUser = null;
    mockPush.mockClear();
    mockReplace.mockClear();
    mockLogin.mockClear();
  });

  it("メールアドレスとパスワードを入力してログインボタンをクリックするとloginが呼ばれダッシュボードに遷移する", async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    const emailInput = screen.getByLabelText("メールアドレス");
    const passwordInput = screen.getByLabelText("パスワード");
    const loginButton = screen.getByRole("button", { name: "ログイン" });

    await user.type(emailInput, "yamada@company.com");
    await user.type(passwordInput, "password123");
    await user.click(loginButton);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith(
        "mock-token-12345",
        expect.any(String),
        expect.objectContaining({ role: "sales" })
      );
      expect(mockPush).toHaveBeenCalledWith("/dashboard");
    });
  });

  it("ログイン画面に「ログイン」ボタンが表示される", () => {
    render(<LoginPage />);
    expect(screen.getByRole("button", { name: "ログイン" })).toBeInTheDocument();
  });
});

describe("SCR-TEST-002: ログイン画面（未入力バリデーション）", () => {
  beforeEach(() => {
    mockUser = null;
    mockPush.mockClear();
    mockReplace.mockClear();
    mockLogin.mockClear();
  });

  it("何も入力せずログインボタンをクリックするとバリデーションエラーが表示されページ遷移しない", async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    const loginButton = screen.getByRole("button", { name: "ログイン" });
    await user.click(loginButton);

    await waitFor(() => {
      // email バリデーションエラー
      expect(screen.getByText("メールアドレスを入力してください")).toBeInTheDocument();
    });

    // ページ遷移しない
    expect(mockPush).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("パスワードが8文字未満だとバリデーションエラーが表示される", async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    const emailInput = screen.getByLabelText("メールアドレス");
    const passwordInput = screen.getByLabelText("パスワード");
    const loginButton = screen.getByRole("button", { name: "ログイン" });

    await user.type(emailInput, "yamada@company.com");
    await user.type(passwordInput, "short");
    await user.click(loginButton);

    await waitFor(() => {
      expect(screen.getByText("パスワードは8文字以上で入力してください")).toBeInTheDocument();
    });

    expect(mockPush).not.toHaveBeenCalled();
  });
});
