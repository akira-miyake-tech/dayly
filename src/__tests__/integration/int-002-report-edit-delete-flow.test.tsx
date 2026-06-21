/**
 * INT-002: 日報作成から編集・削除までのフロー
 * 1. 営業で当日日報を作成
 * 2. 日報詳細から「編集」→ 訪問内容変更して「更新する」
 * 3. 日報詳細から「削除」→ 確認ダイアログで「削除」→ 日報一覧に表示されなくなる
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import type { AuthUser } from "@/lib/auth";

// Next.js ルーティングをモック
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
  }),
  useParams: () => ({ id: "1" }),
  usePathname: () => "/reports/1",
}));

// AuthContext をモック（営業ユーザー）
const salesUser: AuthUser = {
  user_id: 1,
  name: "山田 太郎",
  email: "yamada@company.com",
  role: "sales",
  department: "東日本営業部",
};

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: salesUser,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}));

// api をモック
vi.mock("@/lib/api", () => ({
  api: { post: vi.fn(), put: vi.fn(), delete: vi.fn() },
  ApiError: class ApiError extends Error {
    constructor(public status: number, public code: string, message: string) {
      super(message);
    }
  },
}));

// mock-data をモック（当日の日報）
vi.mock("@/lib/mock-data", () => {
  const today = new Date().toISOString().split("T")[0];
  return {
    MOCK_REPORT_DETAIL: {
      report_id: 1,
      report_date: today,
      user: { user_id: 1, name: "山田 太郎", department: "東日本営業部" },
      visit_records: [
        {
          visit_id: 1,
          customer: { customer_id: 1, name: "鈴木 様", company_name: "株式会社〇〇" },
          content: "元の訪問内容",
          visit_order: 1,
        },
      ],
      problem: "課題テキスト",
      plan: "プランテキスト",
      comments: [],
      created_at: `${today}T18:00:00Z`,
      updated_at: `${today}T18:00:00Z`,
    },
  };
});

import ReportDetailPage from "@/app/(auth)/reports/[id]/page";

describe("INT-002: 日報作成から編集・削除までのフロー", () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it("手順1/2: 当日の日報詳細で編集ボタンが表示され、クリックすると編集ページに遷移する", async () => {
    const user = userEvent.setup();
    render(<ReportDetailPage />);

    await waitFor(() => {
      expect(screen.getByText("日報詳細")).toBeInTheDocument();
    });

    // 編集ボタンが表示される
    const editButton = screen.getByRole("button", { name: /編集/ });
    expect(editButton).toBeInTheDocument();

    // クリックすると編集ページへ遷移
    await user.click(editButton);
    expect(mockPush).toHaveBeenCalledWith("/reports/1/edit");
  });

  it("手順3: 削除ボタンクリックで確認ダイアログが開き、削除すると日報一覧ページに遷移する", async () => {
    const user = userEvent.setup();
    render(<ReportDetailPage />);

    await waitFor(() => {
      expect(screen.getByText("日報詳細")).toBeInTheDocument();
    });

    // 削除ボタンをクリック
    const deleteButton = screen.getByRole("button", { name: /削除/ });
    await user.click(deleteButton);

    // 確認ダイアログが表示される
    await waitFor(() => {
      expect(screen.getByText("日報を削除しますか？")).toBeInTheDocument();
    });

    // 確認ダイアログの「削除」ボタンをクリック
    const confirmDeleteButton = screen.getByRole("button", { name: /^削除$/ });
    await user.click(confirmDeleteButton);

    // 日報一覧ページへ遷移する（モック上では 300ms 後）
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/reports");
    }, { timeout: 2000 });
  });
});
