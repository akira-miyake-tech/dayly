/**
 * モックデータ — API が未実装の間、フロントエンド開発に使用する。
 * 実際の API が実装されたら src/lib/api.ts 経由の呼び出しに置き換える。
 */

import type { AuthUser } from "./auth";

export const MOCK_SALES_USER: AuthUser = {
  user_id: 1,
  name: "山田 太郎",
  email: "yamada@company.com",
  role: "sales",
  department: "東日本営業部",
};

export const MOCK_MANAGER_USER: AuthUser = {
  user_id: 2,
  name: "佐藤 部長",
  email: "sato@company.com",
  role: "manager",
  department: "営業部",
};

export const MOCK_CUSTOMERS = [
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
  {
    customer_id: 3,
    name: "佐々木 様",
    company_name: "□□工業",
    phone: "06-0000-0003",
    address: "大阪府大阪市□□3-3-3",
  },
];

export const MOCK_REPORTS = [
  {
    report_id: 1,
    report_date: "2026-06-21",
    user: { user_id: 1, name: "山田 太郎" },
    visit_count: 3,
    comment_count: 2,
    unread_comment_count: 1,
    created_at: "2026-06-21T18:00:00Z",
  },
  {
    report_id: 2,
    report_date: "2026-06-20",
    user: { user_id: 1, name: "山田 太郎" },
    visit_count: 2,
    comment_count: 1,
    unread_comment_count: 0,
    created_at: "2026-06-20T18:00:00Z",
  },
  {
    report_id: 3,
    report_date: "2026-06-19",
    user: { user_id: 1, name: "山田 太郎" },
    visit_count: 4,
    comment_count: 0,
    unread_comment_count: 0,
    created_at: "2026-06-19T18:00:00Z",
  },
];

export const MOCK_REPORT_DETAIL = {
  report_id: 1,
  report_date: "2026-06-21",
  user: { user_id: 1, name: "山田 太郎", department: "東日本営業部" },
  visit_records: [
    {
      visit_id: 1,
      customer: { customer_id: 1, name: "鈴木 様", company_name: "株式会社〇〇" },
      content: "提案書を提出し、担当者からおおむね好感触を得た。追加資料の依頼をもらった。",
      visit_order: 1,
    },
    {
      visit_id: 2,
      customer: { customer_id: 2, name: "田中 様", company_name: "△△商事" },
      content: "ヒアリングを実施。課題は予算感のすり合わせ。来週再度訪問予定。",
      visit_order: 2,
    },
    {
      visit_id: 3,
      customer: { customer_id: 3, name: "佐々木 様", company_name: "□□工業" },
      content: "新製品のデモ実施。反応は良好。見積もり依頼をもらった。",
      visit_order: 3,
    },
  ],
  problem: "〇〇社の意思決定者にアプローチできていない。どのように接触すべきか相談したい。",
  plan: "・△△商事にフォローアップの電話\n・提案書の修正\n・□□工業の見積もり作成",
  comments: [
    {
      comment_id: 1,
      user: { user_id: 2, name: "佐藤 部長" },
      content: "〇〇社の件は、まず担当窓口に連絡してみましょう。紹介できる人がいるか確認します。",
      created_at: "2026-06-21T19:30:00Z",
    },
  ],
  created_at: "2026-06-21T18:00:00Z",
  updated_at: "2026-06-21T18:00:00Z",
};

export const MOCK_USERS = [
  {
    user_id: 1,
    name: "山田 太郎",
    email: "yamada@company.com",
    role: "sales" as const,
    department: "東日本営業部",
    created_at: "2026-04-01T09:00:00Z",
    updated_at: "2026-04-01T09:00:00Z",
  },
  {
    user_id: 2,
    name: "佐藤 部長",
    email: "sato@company.com",
    role: "manager" as const,
    department: "営業部",
    created_at: "2026-04-01T09:00:00Z",
    updated_at: "2026-04-01T09:00:00Z",
  },
  {
    user_id: 3,
    name: "鈴木 一郎",
    email: "suzuki@company.com",
    role: "sales" as const,
    department: "西日本営業部",
    created_at: "2026-04-01T09:00:00Z",
    updated_at: "2026-04-01T09:00:00Z",
  },
];
