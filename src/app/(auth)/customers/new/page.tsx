"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { ApiError } from "@/lib/api";

const customerSchema = z.object({
  company_name: z.string().min(1, "会社名を入力してください").max(255, "255文字以内で入力してください"),
  name: z.string().min(1, "顧客名を入力してください").max(255, "255文字以内で入力してください"),
  phone: z.string().max(20, "20文字以内で入力してください").optional(),
  address: z.string().max(500, "500文字以内で入力してください").optional(),
});

type CustomerFormValues = z.infer<typeof customerSchema>;

export default function CustomerNewPage() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user && user.role !== "manager") {
      router.replace("/customers");
    }
  }, [user, router]);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CustomerFormValues>({ resolver: zodResolver(customerSchema) });

  const onSubmit = async (values: CustomerFormValues) => {
    try {
      // 実際は POST /api/v1/customers
      await new Promise((r) => setTimeout(r, 300));
      router.push("/customers");
    } catch (err) {
      if (err instanceof ApiError) {
        setError("root", { message: err.message });
      } else {
        setError("root", { message: "エラーが発生しました。しばらく後にもう一度お試しください。" });
      }
    }
  };

  if (user?.role !== "manager") return null;

  return (
    <div className="p-6 max-w-lg mx-auto space-y-6">
      <h1 className="text-2xl font-bold">顧客マスタ登録</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="company_name">会社名 <span className="text-destructive">*</span></Label>
          <Input id="company_name" {...register("company_name")} placeholder="株式会社〇〇" />
          {errors.company_name && <p className="text-sm text-destructive">{errors.company_name.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="name">顧客名（担当者名） <span className="text-destructive">*</span></Label>
          <Input id="name" {...register("name")} placeholder="鈴木 様" />
          {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="phone">電話番号</Label>
          <Input id="phone" {...register("phone")} placeholder="03-0000-0000" />
          {errors.phone && <p className="text-sm text-destructive">{errors.phone.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="address">住所</Label>
          <Input id="address" {...register("address")} placeholder="東京都〇〇区..." />
          {errors.address && <p className="text-sm text-destructive">{errors.address.message}</p>}
        </div>

        {errors.root && <p className="text-sm text-destructive">{errors.root.message}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={() => router.push("/customers")}>
            キャンセル
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />保存中...</>
            ) : (
              "保存する"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
