"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useAuth } from "@/contexts/AuthContext";
import { MOCK_REPORT_DETAIL } from "@/lib/mock-data";

type ReportDetail = typeof MOCK_REPORT_DETAIL;

const commentSchema = z.object({
  content: z
    .string()
    .min(1, "コメントを入力してください")
    .max(2000, "2000文字以内で入力してください"),
});
type CommentFormValues = z.infer<typeof commentSchema>;

const today = new Date().toISOString().split("T")[0];

function formatDateJP(dateStr: string) {
  const d = new Date(dateStr);
  const days = ["日", "月", "火", "水", "木", "金", "土"];
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${days[d.getDay()]}）`;
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function ReportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const [report, setReport] = useState<ReportDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  useEffect(() => {
    // モック（実際は GET /api/v1/reports/:id）
    const fetch = async () => {
      await new Promise((r) => setTimeout(r, 100));
      setReport(MOCK_REPORT_DETAIL);
      setIsLoading(false);
    };
    fetch();
  }, [id]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CommentFormValues>({
    resolver: zodResolver(commentSchema),
  });

  const isOwner = user?.user_id === report?.user.user_id;
  const isToday = report?.report_date === today;
  const canEdit = user?.role === "sales" && isOwner && isToday;
  const canComment = user?.role === "manager";

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      // 実際は DELETE /api/v1/reports/:id
      await new Promise((r) => setTimeout(r, 300));
      router.push("/reports");
    } catch {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const onCommentSubmit = async (values: CommentFormValues) => {
    setCommentError(null);
    setIsSubmittingComment(true);
    try {
      // 実際は POST /api/v1/reports/:id/comments
      await new Promise((r) => setTimeout(r, 300));
      // コメントをローカルに追加（モック）
      if (report) {
        setReport({
          ...report,
          comments: [
            ...report.comments,
            {
              comment_id: Date.now(),
              user: { user_id: user!.user_id, name: user!.name },
              content: values.content,
              created_at: new Date().toISOString(),
            },
          ],
        });
      }
      reset();
    } catch {
      setCommentError("コメントの送信に失敗しました。");
    } finally {
      setIsSubmittingComment(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">日報が見つかりませんでした。</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">日報詳細</h1>
          <p className="text-muted-foreground mt-1">
            {report.user.name}（{report.user.department}） · {formatDateJP(report.report_date)}
          </p>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => router.push(`/reports/${id}/edit`)}>
              <Edit className="mr-2 h-4 w-4" />
              編集
            </Button>
            <Button variant="destructive" size="sm" onClick={() => setDeleteDialogOpen(true)}>
              <Trash2 className="mr-2 h-4 w-4" />
              削除
            </Button>
          </div>
        )}
      </div>

      {/* 訪問記録 */}
      <section>
        <h2 className="text-lg font-semibold mb-3">■ 訪問記録</h2>
        <div className="border rounded-md overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-2 font-medium w-8">#</th>
                <th className="text-left px-4 py-2 font-medium w-1/3">顧客名</th>
                <th className="text-left px-4 py-2 font-medium">訪問内容</th>
              </tr>
            </thead>
            <tbody>
              {[...report.visit_records]
                .sort((a, b) => a.visit_order - b.visit_order)
                .map((vr) => (
                  <tr key={vr.visit_id} className="border-t">
                    <td className="px-4 py-2 text-muted-foreground">{vr.visit_order}</td>
                    <td className="px-4 py-2">
                      <div className="font-medium">{vr.customer.company_name}</div>
                      <div className="text-muted-foreground text-xs">{vr.customer.name}</div>
                    </td>
                    <td className="px-4 py-2 whitespace-pre-wrap">{vr.content}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Problem */}
      <section>
        <h2 className="text-lg font-semibold mb-2">■ Problem（今の課題・相談）</h2>
        <div className="border rounded-md p-4 bg-muted/20 text-sm whitespace-pre-wrap">
          {report.problem || <span className="text-muted-foreground">記入なし</span>}
        </div>
      </section>

      {/* Plan */}
      <section>
        <h2 className="text-lg font-semibold mb-2">■ Plan（明日やること）</h2>
        <div className="border rounded-md p-4 bg-muted/20 text-sm whitespace-pre-wrap">
          {report.plan || <span className="text-muted-foreground">記入なし</span>}
        </div>
      </section>

      {/* コメント */}
      <section>
        <h2 className="text-lg font-semibold mb-3">■ コメント</h2>
        {report.comments.length === 0 ? (
          <p className="text-sm text-muted-foreground">コメントはまだありません。</p>
        ) : (
          <div className="space-y-3">
            {[...report.comments]
              .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
              .map((comment) => (
                <div key={comment.comment_id} className="border rounded-md p-4 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
                    <span className="font-medium text-foreground">{comment.user.name}</span>
                    <span>{formatDateTime(comment.created_at)}</span>
                  </div>
                  <p className="whitespace-pre-wrap">{comment.content}</p>
                </div>
              ))}
          </div>
        )}

        {/* コメント入力（上長のみ） */}
        {canComment && (
          <form onSubmit={handleSubmit(onCommentSubmit)} className="mt-4 space-y-2">
            <Textarea
              placeholder="コメントを入力..."
              className="min-h-[80px]"
              {...register("content")}
            />
            {errors.content && <p className="text-sm text-destructive">{errors.content.message}</p>}
            {commentError && <p className="text-sm text-destructive">{commentError}</p>}
            <div className="flex justify-end">
              <Button type="submit" size="sm" disabled={isSubmittingComment}>
                {isSubmittingComment ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    送信中...
                  </>
                ) : (
                  "送信"
                )}
              </Button>
            </div>
          </form>
        )}
      </section>

      <ConfirmDialog
        open={deleteDialogOpen}
        title="日報を削除しますか？"
        description="この操作は元に戻せません。本当に削除しますか？"
        onConfirm={handleDelete}
        onCancel={() => setDeleteDialogOpen(false)}
        isLoading={isDeleting}
      />
    </div>
  );
}
