"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { ApiError } from "@/lib/api";

const loginSchema = z.object({
  email: z
    .string()
    .min(1, "メールアドレスを入力してください")
    .email("メール形式で入力してください")
    .max(255),
  password: z.string().min(8, "パスワードは8文字以上で入力してください"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { login, user } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  // 認証済みならダッシュボードへ
  if (user) {
    router.replace("/dashboard");
    return null;
  }

  const onSubmit = async (values: LoginFormValues) => {
    setServerError(null);
    try {
      // 本番環境では実際の API を呼び出す
      // const res = await api.post<LoginResponse>("/auth/login", values);
      // login(res.data.token, res.data.expires_at, res.data.user);

      // モック: メール/パスワードで仮ログイン
      const { MOCK_SALES_USER, MOCK_MANAGER_USER } = await import("@/lib/mock-data");
      const mockUser = values.email.includes("sato") ? MOCK_MANAGER_USER : MOCK_SALES_USER;
      login("mock-token-12345", new Date(Date.now() + 86400000).toISOString(), mockUser);
      router.push("/dashboard");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setServerError("メールアドレスまたはパスワードが正しくありません");
      } else {
        setServerError("エラーが発生しました。しばらく後にもう一度お試しください。");
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">営業日報システム</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">メールアドレス</Label>
              <Input
                id="email"
                type="email"
                placeholder="example@company.com"
                autoComplete="email"
                {...register("email")}
              />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">パスワード</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                {...register("password")}
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>

            {serverError && <p className="text-sm text-destructive text-center">{serverError}</p>}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ログイン中...
                </>
              ) : (
                "ログイン"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
