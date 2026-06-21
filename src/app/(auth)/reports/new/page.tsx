"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, PlusCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { ApiError, api } from "@/lib/api";
import { MOCK_CUSTOMERS } from "@/lib/mock-data";

type Customer = { customer_id: number; name: string; company_name: string };

const visitRecordSchema = z.object({
  customer_id: z.string().min(1, "顧客を選択してください"),
  content: z.string().min(1, "訪問内容を入力してください").max(1000, "1000文字以内で入力してください"),
});

const formSchema = z.object({
  visit_records: z.array(visitRecordSchema).min(1, "訪問記録を1件以上入力してください"),
  problem: z.string().max(2000).optional(),
  plan: z.string().max(2000).optional(),
});

type FormValues = z.infer<typeof formSchema>;

const today = new Date().toISOString().split("T")[0];

function formatDateJP(dateStr: string) {
  const d = new Date(dateStr);
  const days = ["日", "月", "火", "水", "木", "金", "土"];
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${days[d.getDay()]}）`;
}

export default function ReportNewPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [serverError, setServerError] = useState<string | null>(null);

  // sales 以外はリダイレクト
  useEffect(() => {
    if (user && user.role !== "sales") {
      router.replace("/dashboard");
    }
  }, [user, router]);

  // 顧客一覧を取得
  useEffect(() => {
    // モック（実際は GET /api/v1/customers）
    setCustomers(MOCK_CUSTOMERS);
  }, []);

  const {
    control,
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      visit_records: [{ customer_id: "", content: "" }],
      problem: "",
      plan: "",
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "visit_records" });

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    try {
      // モック: 作成成功として日報詳細へ
      await new Promise((r) => setTimeout(r, 300));
      router.push("/reports/1");
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setServerError("本日の日報はすでに提出されています");
      } else {
        setServerError("エラーが発生しました。しばらく後にもう一度お試しください。");
      }
    }
  };

  if (user?.role !== "sales") return null;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">日報作成</h1>
        <p className="text-muted-foreground text-sm mt-1">{formatDateJP(today)}</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* 訪問記録 */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">■ 訪問記録</h2>
          {errors.visit_records?.root && (
            <p className="text-sm text-destructive">{errors.visit_records.root.message}</p>
          )}
          {typeof errors.visit_records?.message === "string" && (
            <p className="text-sm text-destructive">{errors.visit_records.message}</p>
          )}

          <div className="border rounded-md overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-3 py-2 font-medium w-8">#</th>
                  <th className="text-left px-3 py-2 font-medium w-1/3">顧客名</th>
                  <th className="text-left px-3 py-2 font-medium">訪問内容</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {fields.map((field, index) => (
                  <tr key={field.id} className="border-t">
                    <td className="px-3 py-2 text-muted-foreground">{index + 1}</td>
                    <td className="px-3 py-2">
                      <Controller
                        control={control}
                        name={`visit_records.${index}.customer_id`}
                        render={({ field: f }) => (
                          <Select value={f.value} onValueChange={f.onChange}>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="顧客を選択" />
                            </SelectTrigger>
                            <SelectContent>
                              {customers.map((c) => (
                                <SelectItem key={c.customer_id} value={String(c.customer_id)}>
                                  {c.company_name} / {c.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      {errors.visit_records?.[index]?.customer_id && (
                        <p className="text-xs text-destructive mt-1">
                          {errors.visit_records[index]?.customer_id?.message}
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <Textarea
                        placeholder="訪問内容を入力..."
                        className="min-h-[60px]"
                        {...register(`visit_records.${index}.content`)}
                      />
                      {errors.visit_records?.[index]?.content && (
                        <p className="text-xs text-destructive mt-1">
                          {errors.visit_records[index]?.content?.message}
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {fields.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => remove(index)}
                          aria-label="行を削除"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ customer_id: "", content: "" })}
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            行を追加する
          </Button>
        </section>

        {/* Problem */}
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">■ Problem（今の課題・相談）</h2>
          <Textarea
            placeholder="課題や相談を記入してください..."
            className="min-h-[100px]"
            {...register("problem")}
          />
          {errors.problem && <p className="text-sm text-destructive">{errors.problem.message}</p>}
        </section>

        {/* Plan */}
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">■ Plan（明日やること）</h2>
          <Textarea
            placeholder="明日の計画を記入してください..."
            className="min-h-[100px]"
            {...register("plan")}
          />
          {errors.plan && <p className="text-sm text-destructive">{errors.plan.message}</p>}
        </section>

        {serverError && <p className="text-sm text-destructive">{serverError}</p>}

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.push("/reports")}>
            キャンセル
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                提出中...
              </>
            ) : (
              "提出する"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
