/**
 * SCR-TEST-008 ケースB: 過去日の日報 - 編集・削除ボタンが表示されない
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

// AuthContext をモック（本人・営業）
const mockSalesUser: AuthUser = {
  user_id: 1,
  name: "山田 太郎",
  email: "yamada@company.com",
  role: "sales",
  department: "東日本営業部",
};

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: mockSalesUser,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}));

// api をモック
vi.mock("@/lib/api", () => ({
  api: { post: vi.fn(), delete: vi.fn() },
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

// mock-data をモック（過去日の日報 - report_date が today ではない）
vi.mock("@/lib/mock-data", () => ({
  MOCK_REPORT_DETAIL: {
    report_id: 1,
    report_date: "2026-05-20", // 過去日
    user: { user_id: 1, name: "山田 太郎", department: "東日本営業部" },
    visit_records: [
      {
        visit_id: 1,
        customer: { customer_id: 1, name: "鈴木 様", company_name: "株式会社〇〇" },
        content: "過去の訪問内容",
        visit_order: 1,
      },
    ],
    problem: "課題テキスト",
    plan: "プランテキスト",
    comments: [],
    created_at: "2026-05-20T18:00:00Z",
    updated_at: "2026-05-20T18:00:00Z",
  },
}));

import ReportDetailPage from "@/app/(auth)/reports/[id]/page";

describe("SCR-TEST-008 ケースB: 過去日の日報（本人・営業）- 編集・削除ボタンが表示されない", () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it("編集ボタンが表示されない", async () => {
    render(<ReportDetailPage />);
    await waitFor(() => {
      expect(screen.getByText("日報詳細")).toBeInTheDocument();
    });
    expect(screen.queryByRole("button", { name: /編集/ })).not.toBeInTheDocument();
  });

  it("削除ボタン（ヘッダーエリア）が表示されない", async () => {
    render(<ReportDetailPage />);
    await waitFor(() => {
      expect(screen.getByText("日報詳細")).toBeInTheDocument();
    });
    // トップエリアの削除ボタンが表示されない
    const deleteButtons = screen.queryAllByRole("button", { name: /^削除$/ });
    expect(deleteButtons).toHaveLength(0);
  });
});
