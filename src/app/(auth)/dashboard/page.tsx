"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FilePlus, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { MOCK_REPORTS } from "@/lib/mock-data";

type ReportSummary = {
  report_id: number;
  report_date: string;
  user: { user_id: number; name: string };
  visit_count: number;
  comment_count: number;
  unread_comment_count: number;
  created_at: string;
};

const today = new Date().toISOString().split("T")[0];

export default function DashboardPage() {
  const { user } = useAuth();
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // モックデータで代替（実際は GET /api/v1/reports?per_page=10）
    const fetchReports = async () => {
      await new Promise((r) => setTimeout(r, 100));
      setReports(MOCK_REPORTS);
      setIsLoading(false);
    };
    fetchReports();
  }, []);

  const todayReport = reports.find(
    (r) => r.report_date === today && r.user.user_id === user?.user_id
  );
  const totalUnread = reports.reduce((sum, r) => sum + r.unread_comment_count, 0);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">ダッシュボード</h1>

      {/* 営業のみ表示するステータスカード */}
      {user?.role === "sales" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                本日の日報
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-muted-foreground text-sm">読み込み中...</p>
              ) : todayReport ? (
                <div>
                  <p className="text-lg font-semibold text-green-600">提出済</p>
                  <Link href={`/reports/${todayReport.report_id}`}>
                    <Button variant="outline" size="sm" className="mt-2">
                      日報を確認する
                    </Button>
                  </Link>
                </div>
              ) : (
                <div>
                  <p className="text-lg font-semibold text-orange-500">未提出</p>
                  <Link href="/reports/new">
                    <Button size="sm" className="mt-2">
                      <FilePlus className="mr-2 h-4 w-4" />
                      日報を作成する
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                未読コメント
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-muted-foreground text-sm">読み込み中...</p>
              ) : (
                <div>
                  <p className="text-lg font-semibold">
                    <MessageSquare className="inline h-5 w-5 mr-1 text-blue-500" />
                    {totalUnread}件
                  </p>
                  <Link href="/reports">
                    <Button variant="outline" size="sm" className="mt-2">
                      確認する
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* 最新の日報フィード */}
      <div>
        <h2 className="text-lg font-semibold mb-3">
          {user?.role === "manager" ? "最新の日報（チーム全員）" : "最新の日報"}
        </h2>
        {isLoading ? (
          <p className="text-muted-foreground text-sm">読み込み中...</p>
        ) : reports.length === 0 ? (
          <p className="text-muted-foreground text-sm">日報がありません。</p>
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
                    onClick={() => (window.location.href = `/reports/${report.report_id}`)}
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
      </div>
    </div>
  );
}
