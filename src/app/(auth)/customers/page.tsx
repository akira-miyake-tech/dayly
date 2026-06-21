"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Edit, PlusCircle, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pagination } from "@/components/ui/Pagination";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useAuth } from "@/contexts/AuthContext";
import { MOCK_CUSTOMERS } from "@/lib/mock-data";

type Customer = {
  customer_id: number;
  name: string;
  company_name: string;
  phone?: string | null;
  address?: string | null;
};

const PER_PAGE = 20;

export default function CustomersPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [q, setQ] = useState("");
  const [searchQ, setSearchQ] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const isManager = user?.role === "manager";

  const fetchCustomers = useCallback(async () => {
    setIsLoading(true);
    // モック（実際は GET /api/v1/customers?q=...）
    await new Promise((r) => setTimeout(r, 100));
    const filtered = MOCK_CUSTOMERS.filter(
      (c) =>
        !searchQ ||
        c.name.includes(searchQ) ||
        c.company_name.includes(searchQ)
    );
    setTotal(filtered.length);
    setCustomers(filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE));
    setIsLoading(false);
  }, [searchQ, page]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQ(q);
    setPage(1);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      // 実際は DELETE /api/v1/customers/:id
      await new Promise((r) => setTimeout(r, 300));
      setDeleteTarget(null);
      fetchCustomers();
    } catch (err: unknown) {
      const apiErr = err as { status?: number; message?: string };
      if (apiErr?.status === 409) {
        setDeleteError("訪問記録が紐づいているため削除できません");
      } else {
        setDeleteError("削除に失敗しました。");
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">顧客マスタ</h1>
        {isManager && (
          <Button onClick={() => router.push("/customers/new")}>
            <PlusCircle className="mr-2 h-4 w-4" />
            新規登録
          </Button>
        )}
      </div>

      {/* 検索フォーム */}
      <form onSubmit={handleSearch} className="border rounded-md p-4">
        <div className="flex gap-3 items-end">
          <div className="space-y-1 flex-1 max-w-xs">
            <Label htmlFor="q">顧客名 / 会社名</Label>
            <Input
              id="q"
              type="text"
              placeholder="検索..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <Button type="submit">
            <Search className="mr-2 h-4 w-4" />
            検索
          </Button>
        </div>
      </form>

      {/* エラーメッセージ */}
      {deleteError && (
        <p className="text-sm text-destructive">{deleteError}</p>
      )}

      {/* 一覧テーブル */}
      {isLoading ? (
        <p className="text-muted-foreground text-sm">読み込み中...</p>
      ) : customers.length === 0 ? (
        <p className="text-muted-foreground text-sm">顧客が見つかりませんでした。</p>
      ) : (
        <div className="border rounded-md overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-2 font-medium">顧客名</th>
                <th className="text-left px-4 py-2 font-medium">会社名</th>
                {isManager && <th className="text-left px-4 py-2 font-medium w-28">操作</th>}
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr key={customer.customer_id} className="border-t hover:bg-muted/20">
                  <td className="px-4 py-2">{customer.name}</td>
                  <td className="px-4 py-2">{customer.company_name}</td>
                  {isManager && (
                    <td className="px-4 py-2">
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/customers/${customer.customer_id}/edit`)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setDeleteError(null);
                            setDeleteTarget(customer);
                          }}
                        >
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination total={total} page={page} perPage={PER_PAGE} onPageChange={setPage} />

      <ConfirmDialog
        open={!!deleteTarget}
        title="顧客を削除しますか？"
        description={`「${deleteTarget?.company_name} / ${deleteTarget?.name}」を削除します。この操作は元に戻せません。`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        isLoading={isDeleting}
      />
    </div>
  );
}
