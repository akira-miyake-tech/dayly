/**
 * SCR-TEST-003: ダッシュボード表示（営業）
 * SCR-TEST-004: ダッシュボード表示（上長）
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import React from "react";
import type { AuthUser } from "@/lib/auth";

// Next.js のルーティングをモック
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
  usePathname: () => "/dashboard",
}));

// next/link をモック
vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
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

vi.mock("@/lib/mock-data", () => {
  const today = new Date().toISOString().split("T")[0];
  return {
    MOCK_REPORTS: [
      {
        report_id: 1,
        report_date: today,
        user: { user_id: 1, name: "山田 太郎" },
        visit_count: 3,
        comment_count: 2,
        unread_comment_count: 1,
        created_at: `${today}T18:00:00Z`,
      },
    ],
  };
});

import DashboardPage from "@/app/(auth)/dashboard/page";

describe("SCR-TEST-003: ダッシュボード表示（営業）", () => {
  beforeEach(() => {
    mockUser = {
      user_id: 1,
      name: "山田 太郎",
      email: "yamada@company.com",
      role: "sales",
      department: "東日本営業部",
    };
  });

  it("「本日の日報」ステータスエリアが表示される", async () => {
    render(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getByText("本日の日報")).toBeInTheDocument();
    });
  });

  it("「未読コメント」エリアが表示される", async () => {
    render(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getByText("未読コメント")).toBeInTheDocument();
    });
  });
});

describe("SCR-TEST-004: ダッシュボード表示（上長）", () => {
  beforeEach(() => {
    mockUser = {
      user_id: 2,
      name: "佐藤 部長",
      email: "sato@company.com",
      role: "manager",
      department: "営業部",
    };
  });

  it("「本日の日報」ステータスエリアが表示されない", async () => {
    render(<DashboardPage />);
    await waitFor(() => {
      // ローディングが終わるのを待つ
      expect(screen.queryByText("読み込み中...")).not.toBeInTheDocument();
    });
    expect(screen.queryByText("本日の日報")).not.toBeInTheDocument();
  });

  it("「最新の日報（チーム全員）」見出しが表示される", async () => {
    render(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getByText("最新の日報（チーム全員）")).toBeInTheDocument();
    });
  });
});
