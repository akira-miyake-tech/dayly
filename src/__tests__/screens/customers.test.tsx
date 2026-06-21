/**
 * SCR-TEST-010: 顧客マスタの操作権限
 * 営業: 「新規登録」ボタン、編集・削除ボタンが表示されない
 * 上長: 「新規登録」ボタン、編集・削除ボタンが表示される
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import React from "react";
import type { AuthUser } from "@/lib/auth";

// Next.js ルーティングをモック
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
  usePathname: () => "/customers",
}));

// AuthContext をモック
let mockUser: AuthUser | null = null;

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: mockUser,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}));

// mock-data をモック
vi.mock("@/lib/mock-data", () => ({
  MOCK_CUSTOMERS: [
    {
      customer_id: 1,
      name: "鈴木 様",
      company_name: "株式会社〇〇",
      phone: "03-0000-0001",
      address: "東京都千代田区〇〇1-1-1",
    },
    {
      customer_id: 2,
      name: "田中 様",
      company_name: "△△商事",
      phone: "03-0000-0002",
      address: "東京都新宿区△△2-2-2",
    },
  ],
}));

import CustomersPage from "@/app/(auth)/customers/page";

describe("SCR-TEST-010: 顧客マスタ - 営業ユーザーの権限", () => {
  beforeEach(() => {
    mockUser = {
      user_id: 1,
      name: "山田 太郎",
      email: "yamada@company.com",
      role: "sales",
      department: "東日本営業部",
    };
  });

  it("顧客一覧が表示される", async () => {
    render(<CustomersPage />);
    await waitFor(() => {
      expect(screen.getByText("鈴木 様")).toBeInTheDocument();
      expect(screen.getByText("田中 様")).toBeInTheDocument();
    });
  });

  it("「新規登録」ボタンが表示されない", async () => {
    render(<CustomersPage />);
    await waitFor(() => {
      expect(screen.getByText("鈴木 様")).toBeInTheDocument();
    });
    expect(screen.queryByRole("button", { name: /新規登録/ })).not.toBeInTheDocument();
  });

  it("「操作」列（編集・削除ボタン）が表示されない", async () => {
    render(<CustomersPage />);
    await waitFor(() => {
      expect(screen.getByText("鈴木 様")).toBeInTheDocument();
    });
    // 操作列のヘッダーが表示されない
    expect(screen.queryByText("操作")).not.toBeInTheDocument();
  });
});

describe("SCR-TEST-010: 顧客マスタ - 上長ユーザーの権限", () => {
  beforeEach(() => {
    mockUser = {
      user_id: 2,
      name: "佐藤 部長",
      email: "sato@company.com",
      role: "manager",
      department: "営業部",
    };
  });

  it("「新規登録」ボタンが表示される", async () => {
    render(<CustomersPage />);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /新規登録/ })).toBeInTheDocument();
    });
  });

  it("「操作」列（編集・削除ボタン）が表示される", async () => {
    render(<CustomersPage />);
    await waitFor(() => {
      expect(screen.getByText("鈴木 様")).toBeInTheDocument();
    });
    // 操作列のヘッダーが表示される
    expect(screen.getByText("操作")).toBeInTheDocument();
  });
});
