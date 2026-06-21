/**
 * SCR-TEST-008: 日報詳細（編集・削除ボタンの表示制御）
 * SCR-TEST-009: コメント入力欄の表示制御
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
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

// api をモック
vi.mock("@/lib/api", () => ({
  api: { post: vi.fn(), delete: vi.fn() },
  ApiError: class ApiError extends Error {
    constructor(public status: number, public code: string, message: string) {
      super(message);
    }
  },
}));

// 今日の日付
const TODAY = new Date().toISOString().split("T")[0];

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
          content: "提案書を提出した。",
          visit_order: 1,
        },
      ],
      problem: "課題テキスト",
      plan: "プランテキスト",
      comments: [
        {
          comment_id: 1,
          user: { user_id: 2, name: "佐藤 部長" },
          content: "コメントテキスト",
          created_at: `${today}T19:30:00Z`,
        },
      ],
      created_at: `${today}T18:00:00Z`,
      updated_at: `${today}T18:00:00Z`,
    },
  };
});

import ReportDetailPage from "@/app/(auth)/reports/[id]/page";

describe("SCR-TEST-008 ケースA: 当日・本人（営業）- 編集・削除ボタンが表示される", () => {
  beforeEach(() => {
    mockUser = {
      user_id: 1,
      name: "山田 太郎",
      email: "yamada@company.com",
      role: "sales",
      department: "東日本営業部",
    };
    mockPush.mockClear();
  });

  it("編集ボタンが表示される", async () => {
    render(<ReportDetailPage />);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /編集/ })).toBeInTheDocument();
    });
  });

  it("削除ボタンが表示される", async () => {
    render(<ReportDetailPage />);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /削除/ })).toBeInTheDocument();
    });
  });
});

describe("SCR-TEST-008 ケースC: 上長 - 編集・削除ボタンが表示されない", () => {
  beforeEach(() => {
    mockUser = {
      user_id: 2,
      name: "佐藤 部長",
      email: "sato@company.com",
      role: "manager",
      department: "営業部",
    };
    mockPush.mockClear();
  });

  it("編集ボタンが表示されない", async () => {
    render(<ReportDetailPage />);
    await waitFor(() => {
      expect(screen.getByText("日報詳細")).toBeInTheDocument();
    });
    expect(screen.queryByRole("button", { name: /編集/ })).not.toBeInTheDocument();
  });

  it("削除ボタンが表示されない", async () => {
    render(<ReportDetailPage />);
    await waitFor(() => {
      expect(screen.getByText("日報詳細")).toBeInTheDocument();
    });
    // 削除ボタン（テキスト「削除」）が表示されないことを確認
    // コンファームダイアログ内のボタンは除外
    const deleteButtons = screen.queryAllByRole("button", { name: /^削除$/ });
    expect(deleteButtons).toHaveLength(0);
  });
});

describe("SCR-TEST-009: コメント入力欄の表示制御", () => {
  it("営業アカウントではコメント入力欄が表示されない", async () => {
    mockUser = {
      user_id: 1,
      name: "山田 太郎",
      email: "yamada@company.com",
      role: "sales",
      department: "東日本営業部",
    };

    render(<ReportDetailPage />);
    await waitFor(() => {
      expect(screen.getByText("日報詳細")).toBeInTheDocument();
    });

    // コメント投稿ボタンが存在しないことを確認
    expect(screen.queryByRole("button", { name: "送信" })).not.toBeInTheDocument();
  });

  it("上長アカウントではコメント入力欄が表示される", async () => {
    mockUser = {
      user_id: 2,
      name: "佐藤 部長",
      email: "sato@company.com",
      role: "manager",
      department: "営業部",
    };

    render(<ReportDetailPage />);
    await waitFor(() => {
      expect(screen.getByText("日報詳細")).toBeInTheDocument();
    });

    // コメント入力テキストエリアと送信ボタンが表示される
    expect(screen.getByPlaceholderText("コメントを入力...")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "送信" })).toBeInTheDocument();
  });
});
