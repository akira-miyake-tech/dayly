"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FilePlus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pagination } from "@/components/ui/Pagination";
import { useAuth } from "@/contexts/AuthContext";
import { MOCK_REPORTS, MOCK_USERS } from "@/lib/mock-data";

type ReportSummary = {
  report_id: number;
  report_date: string;
  user: { user_id: number; name: string };
  visit_count: number;
  comment_count: number;
  unread_comment_count: number;
  created_at: string;
};

function getDefaultFrom() {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().split("T")[0];
}

function getDefaultTo() {
  return new Date().toISOString().split("T")[0];
}

const PER_PAGE = 20;

export default function ReportsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  const [from, setFrom] = useState(getDefaultFrom());
  const [to, setTo] = useState(getDefaultTo());
  const [userId, setUserId] = useState<string>("all");

  const fetchReports = useCallback(async () => {
    setIsLoading(true);
    // モックデータで代替（実際は GET /api/v1/reports?from=...&to=...&user_id=...）
    await new Promise((r) => setTimeout(r, 100));
    let filtered = MOCK_REPORTS;
    if (user?.role === "sales") {
      filtered = filtered.filter((r) => r.user.user_id === user.user_id);
    } else if (userId !== "all") {
      filtered = filtered.filter((r) => String(r.user.user_id) === userId);
    }
    filtered = filtered.filter((r) => {
      const date = r.report_date;
      return date >= from && date <= to;
    });
    setTotal(filtered.length);
    setReports(filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE));
    setIsLoading(false);
  }, [user, from, to, userId, page]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchReports();
  };

  const formatDate = (d: string) => {
    const dt = new Date(d);
    return `${dt.getFullYear()}/${String(dt.getMonth() + 1).padStart(2, "0")}/${String(dt.getDate()).padStart(2, "0")}`;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">日報一覧</h1>
        {user?.role === "sales" && (
          <Button onClick={() => router.push("/reports/new")}>
            <FilePlus className="mr-2 h-4 w-4" />
            新規作成
          </Button>
        )}
      </div>

      {/* 検索フォーム */}
      <form onSubmit={handleSearch} className="border rounded-md p-4 space-y-3">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="space-y-1">
            <Label htmlFor="from">期間（開始）</Label>
            <Input
              id="from"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-40"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="to">期間（終了）</Label>
            <Input
              id="to"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-40"
            />
          </div>
          {user?.role === "manager" && (
            <div className="space-y-1">
              <Label>担当者</Label>
              <Select value={userId} onValueChange={setUserId}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="全員" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全員</SelectItem>
                  {MOCK_USERS.map((u) => (
                    <SelectItem key={u.user_id} value={String(u.user_id)}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <Button type="submit">
            <Search className="mr-2 h-4 w-4" />
            検索
          </Button>
        </div>
      </form>

      {/* 一覧テーブル */}
      {isLoading ? (
        <p className="text-muted-foreground text-sm">読み込み中...</p>
      ) : reports.length === 0 ? (
        <p className="text-muted-foreground text-sm">日報が見つかりませんでした。</p>
      ) : (
        <div className="border rounded-md overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-2 font-medium">日付</th>
                {user?.role === "manager" && (
                  <th className="text-left px-4 py-2 font-medium">担当者</th>
                )}
                <th className="text-left px-4 py-2 font-medium">訪問件数</th>
                <th className="text-left px-4 py-2 font-medium">コメント</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => (
                <tr
                  key={report.report_id}
                  className="border-t hover:bg-muted/30 cursor-pointer"
                  onClick={() => router.push(`/reports/${report.report_id}`)}
                >
                  <td className="px-4 py-2">{formatDate(report.report_date)}</td>
                  {user?.role === "manager" && <td className="px-4 py-2">{report.user.name}</td>}
                  <td className="px-4 py-2">{report.visit_count}件</td>
                  <td className="px-4 py-2">
                    {report.comment_count}件
                    {report.unread_comment_count > 0 && (
                      <span className="ml-1 text-xs text-blue-600 font-medium">
                        （未読{report.unread_comment_count}）
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination total={total} page={page} perPage={PER_PAGE} onPageChange={setPage} />
    </div>
  );
}
