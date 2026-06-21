"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Edit, PlusCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/Pagination";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useAuth } from "@/contexts/AuthContext";
import { MOCK_USERS } from "@/lib/mock-data";

type UserSummary = {
  user_id: number;
  name: string;
  email: string;
  role: "sales" | "manager";
  department?: string | null;
};

const PER_PAGE = 20;

export default function UsersPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<UserSummary | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // manager のみアクセス可
  useEffect(() => {
    if (user && user.role !== "manager") {
      router.replace("/dashboard");
    }
  }, [user, router]);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    // モック（実際は GET /api/v1/users）
    await new Promise((r) => setTimeout(r, 100));
    setTotal(MOCK_USERS.length);
    setUsers(MOCK_USERS.slice((page - 1) * PER_PAGE, page * PER_PAGE));
    setIsLoading(false);
  }, [page]);

  useEffect(() => {
    if (user?.role === "manager") fetchUsers();
  }, [user, fetchUsers]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      // 実際は DELETE /api/v1/users/:id
      await new Promise((r) => setTimeout(r, 300));
      setDeleteTarget(null);
      fetchUsers();
    } catch (err: unknown) {
      const apiErr = err as { status?: number; message?: string };
      if (apiErr?.status === 409) {
        setDeleteError("日報が紐づいているため削除できません");
      } else {
        setDeleteError("削除に失敗しました。");
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const roleLabel = (role: "sales" | "manager") => (role === "sales" ? "営業" : "上長");

  if (user?.role !== "manager") return null;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">営業マスタ</h1>
        <Button onClick={() => router.push("/users/new")}>
          <PlusCircle className="mr-2 h-4 w-4" />
          新規登録
        </Button>
      </div>

      {deleteError && <p className="text-sm text-destructive">{deleteError}</p>}

      {isLoading ? (
        <p className="text-muted-foreground text-sm">読み込み中...</p>
      ) : users.length === 0 ? (
        <p className="text-muted-foreground text-sm">ユーザーが見つかりませんでした。</p>
      ) : (
        <div className="border rounded-md overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-2 font-medium">氏名</th>
                <th className="text-left px-4 py-2 font-medium">メール</th>
                <th className="text-left px-4 py-2 font-medium">役割</th>
                <th className="text-left px-4 py-2 font-medium w-28">操作</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.user_id} className="border-t hover:bg-muted/20">
                  <td className="px-4 py-2">{u.name}</td>
                  <td className="px-4 py-2 text-muted-foreground">{u.email}</td>
                  <td className="px-4 py-2">{roleLabel(u.role)}</td>
                  <td className="px-4 py-2">
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/users/${u.user_id}/edit`)}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setDeleteError(null);
                          setDeleteTarget(u);
                        }}
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination total={total} page={page} perPage={PER_PAGE} onPageChange={setPage} />

      <ConfirmDialog
        open={!!deleteTarget}
        title="ユーザーを削除しますか？"
        description={`「${deleteTarget?.name}」を削除します。この操作は元に戻せません。`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        isLoading={isDeleting}
      />
    </div>
  );
}
