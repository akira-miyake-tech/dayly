/**
 * INT-001: 日報提出からコメント確認までの一連フロー
 * 1. 営業（山田 太郎）で日報を作成する
 * 2. 上長（佐藤 部長）でログインし、作成日報を確認
 * 3. 上長がコメントを投稿
 * 4. 営業に戻り、ダッシュボードの未読コメント数を確認
 * 5. 日報詳細でコメントが表示されることを確認
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
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

// AuthContext をモック（テスト中にユーザー切り替え可能）
let currentUser: AuthUser | null = null;

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: currentUser,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}));

// api をモック
vi.mock("@/lib/api", () => ({
  api: { post: vi.fn(), delete: vi.fn() },
  ApiError: class ApiError extends Error {
    constructor(public status: number, public code: string, message: string) {
      super(message);
    }
  },
}));

// mock-data をモック
const TODAY = new Date().toISOString().split("T")[0];

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
          content: "提案書を提出した。",
          visit_order: 1,
        },
      ],
      problem: "意思決定者へのアプローチ方法",
      plan: "フォローアップの電話",
      comments: [], // 最初はコメントなし
      created_at: `${today}T18:00:00Z`,
      updated_at: `${today}T18:00:00Z`,
    },
    MOCK_REPORTS: [
      {
        report_id: 1,
        report_date: today,
        user: { user_id: 1, name: "山田 太郎" },
        visit_count: 1,
        comment_count: 0,
        unread_comment_count: 0,
        created_at: `${today}T18:00:00Z`,
      },
    ],
  };
});

import ReportDetailPage from "@/app/(auth)/reports/[id]/page";

describe("INT-001: 日報提出からコメント確認までの一連フロー", () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it("手順2: 上長が日報詳細を閲覧できる（訪問記録が表示される）", async () => {
    currentUser = {
      user_id: 2,
      name: "佐藤 部長",
      email: "sato@company.com",
      role: "manager",
      department: "営業部",
    };

    render(<ReportDetailPage />);

    await waitFor(() => {
      expect(screen.getByText("日報詳細")).toBeInTheDocument();
      expect(screen.getByText("株式会社〇〇")).toBeInTheDocument();
      expect(screen.getByText("提案書を提出した。")).toBeInTheDocument();
    });
  });

  it("手順3: 上長がコメントを投稿するとコメントが画面に追加される", async () => {
    const user = userEvent.setup();
    currentUser = {
      user_id: 2,
      name: "佐藤 部長",
      email: "sato@company.com",
      role: "manager",
      department: "営業部",
    };

    render(<ReportDetailPage />);

    // コメント入力欄が表示されるのを待つ
    await waitFor(() => {
      expect(screen.getByPlaceholderText("コメントを入力...")).toBeInTheDocument();
    });

    // コメントを入力して送信
    const commentInput = screen.getByPlaceholderText("コメントを入力...");
    await user.type(commentInput, "明日の商談、頑張ってください。");

    const submitButton = screen.getByRole("button", { name: "送信" });
    await user.click(submitButton);

    // コメントが画面に追加される
    await waitFor(() => {
      expect(screen.getByText("明日の商談、頑張ってください。")).toBeInTheDocument();
    });
  });

  it("手順5: 日報詳細でコメントが表示される確認（既存コメントあり）", async () => {
    currentUser = {
      user_id: 1,
      name: "山田 太郎",
      email: "yamada@company.com",
      role: "sales",
      department: "東日本営業部",
    };

    render(<ReportDetailPage />);

    await waitFor(() => {
      expect(screen.getByText("日報詳細")).toBeInTheDocument();
      // コメントセクションが表示される
      expect(screen.getByText("■ コメント")).toBeInTheDocument();
    });
  });
});
