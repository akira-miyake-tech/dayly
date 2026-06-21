/**
 * SCR-TEST-003/004 補完: ナビゲーション権限制御テスト
 * 営業: 「日報作成」あり、「営業マスタ」なし
 * 上長: 「営業マスタ」あり、「日報作成」なし
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
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

// api をモック
vi.mock("@/lib/api", () => ({
  api: {
    post: vi.fn(),
  },
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

import { SideNav } from "@/components/layout/SideNav";

describe("SideNav 権限制御（SCR-TEST-003）: 営業ユーザーのナビゲーション", () => {
  beforeEach(() => {
    mockUser = {
      user_id: 1,
      name: "山田 太郎",
      email: "yamada@company.com",
      role: "sales",
      department: "東日本営業部",
    };
  });

  it("「日報作成」が表示される", () => {
    render(<SideNav />);
    expect(screen.getByText("日報作成")).toBeInTheDocument();
  });

  it("「営業マスタ」が表示されない", () => {
    render(<SideNav />);
    expect(screen.queryByText("営業マスタ")).not.toBeInTheDocument();
  });

  it("ユーザー名が表示される", () => {
    render(<SideNav />);
    expect(screen.getByText(/山田 太郎/)).toBeInTheDocument();
  });
});

describe("SideNav 権限制御（SCR-TEST-004）: 上長ユーザーのナビゲーション", () => {
  beforeEach(() => {
    mockUser = {
      user_id: 2,
      name: "佐藤 部長",
      email: "sato@company.com",
      role: "manager",
      department: "営業部",
    };
  });

  it("「営業マスタ」が表示される", () => {
    render(<SideNav />);
    expect(screen.getByText("営業マスタ")).toBeInTheDocument();
  });

  it("「日報作成」が表示されない", () => {
    render(<SideNav />);
    expect(screen.queryByText("日報作成")).not.toBeInTheDocument();
  });

  it("ユーザー名が表示される", () => {
    render(<SideNav />);
    expect(screen.getByText(/佐藤 部長/)).toBeInTheDocument();
  });
});
