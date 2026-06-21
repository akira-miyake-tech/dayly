"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useAuth } from "@/contexts/AuthContext";
import { ApiError } from "@/lib/api";
import { MOCK_USERS } from "@/lib/mock-data";

// 編集時はパスワード任意
const userEditSchema = z.object({
  name: z.string().min(1, "氏名を入力してください").max(100, "100文字以内で入力してください"),
  email: z
    .string()
    .min(1, "メールアドレスを入力してください")
    .email("メール形式で入力してください")
    .max(255),
  role: z.enum(["sales", "manager"], { error: "役割を選択してください" }),
  department: z.string().max(100, "100文字以内で入力してください").optional(),
  password: z
    .string()
    .min(8, "パスワードは8文字以上で入力してください")
    .optional()
    .or(z.literal("")),
});

type UserEditFormValues = z.infer<typeof userEditSchema>;

export default function UserEditPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<UserEditFormValues>({
    resolver: zodResolver(userEditSchema),
    defaultValues: { role: "sales", password: "" },
  });

  useEffect(() => {
    if (user && user.role !== "manager") {
      router.replace("/dashboard");
      return;
    }
    // モック（実際は GET /api/v1/users/:id）
    const targetUser = MOCK_USERS.find((u) => String(u.user_id) === id);
    if (targetUser) {
      reset({
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role,
        department: targetUser.department ?? "",
        password: "",
      });
    }
  }, [id, user, router, reset]);

  const onSubmit = async (values: UserEditFormValues) => {
    try {
      // 実際は PUT /api/v1/users/:id
      // パスワードが空の場合は送らない
      const payload: Record<string, unknown> = {
        name: values.name,
        email: values.email,
        role: values.role,
        department: values.department || undefined,
      };
      if (values.password) {
        payload.password = values.password;
      }
      // await api.put(`/users/${id}`, payload);
      await new Promise((r) => setTimeout(r, 300));
      router.push("/users");
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError("email", { message: "このメールアドレスはすでに使用されています" });
      } else if (err instanceof ApiError) {
        setError("root", { message: err.message });
      } else {
        setError("root", { message: "エラーが発生しました。しばらく後にもう一度お試しください。" });
      }
    }
  };

  if (user?.role !== "manager") return null;

  return (
    <div className="p-6 max-w-lg mx-auto space-y-6">
      <h1 className="text-2xl font-bold">営業マスタ編集</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="name">
            氏名 <span className="text-destructive">*</span>
          </Label>
          <Input id="name" {...register("name")} placeholder="山田 太郎" />
          {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">
            メールアドレス <span className="text-destructive">*</span>
          </Label>
          <Input id="email" type="email" {...register("email")} />
          {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
        </div>

        <div className="space-y-2">
          <Label>
            役割 <span className="text-destructive">*</span>
          </Label>
          <Controller
            control={control}
            name="role"
            render={({ field }) => (
              <RadioGroup value={field.value} onValueChange={field.onChange} className="flex gap-4">
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="sales" id="edit-role-sales" />
                  <Label htmlFor="edit-role-sales">営業</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="manager" id="edit-role-manager" />
                  <Label htmlFor="edit-role-manager">上長</Label>
                </div>
              </RadioGroup>
            )}
          />
          {errors.role && <p className="text-sm text-destructive">{errors.role.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="department">部署</Label>
          <Input id="department" {...register("department")} />
          {errors.department && (
            <p className="text-sm text-destructive">{errors.department.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">
            パスワード{" "}
            <span className="text-muted-foreground text-xs">（変更する場合のみ入力）</span>
          </Label>
          <Input id="password" type="password" {...register("password")} placeholder="8文字以上" />
          {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
        </div>

        {errors.root && <p className="text-sm text-destructive">{errors.root.message}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={() => router.push("/users")}>
            キャンセル
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                保存中...
              </>
            ) : (
              "保存する"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
