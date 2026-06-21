"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
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

const userSchema = z.object({
  name: z.string().min(1, "氏名を入力してください").max(100, "100文字以内で入力してください"),
  email: z
    .string()
    .min(1, "メールアドレスを入力してください")
    .email("メール形式で入力してください")
    .max(255),
  role: z.enum(["sales", "manager"], { error: "役割を選択してください" }),
  department: z.string().max(100, "100文字以内で入力してください").optional(),
  password: z.string().min(8, "パスワードは8文字以上で入力してください"),
});

type UserFormValues = z.infer<typeof userSchema>;

export default function UserNewPage() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user && user.role !== "manager") {
      router.replace("/dashboard");
    }
  }, [user, router]);

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: { role: "sales" },
  });

  const onSubmit = async (_values: UserFormValues) => {
    try {
      // 実際は POST /api/v1/users
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
      <h1 className="text-2xl font-bold">営業マスタ登録</h1>

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
          <Input id="email" type="email" {...register("email")} placeholder="yamada@company.com" />
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
                  <RadioGroupItem value="sales" id="role-sales" />
                  <Label htmlFor="role-sales">営業</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="manager" id="role-manager" />
                  <Label htmlFor="role-manager">上長</Label>
                </div>
              </RadioGroup>
            )}
          />
          {errors.role && <p className="text-sm text-destructive">{errors.role.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="department">部署</Label>
          <Input id="department" {...register("department")} placeholder="東日本営業部" />
          {errors.department && (
            <p className="text-sm text-destructive">{errors.department.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">
            初期パスワード <span className="text-destructive">*</span>
          </Label>
          <Input id="password" type="password" {...register("password")} />
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
