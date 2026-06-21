"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  BookOpen,
  FilePlus,
  LogOut,
  Users,
  UserCog,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";

type NavItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
  roles?: ("sales" | "manager")[];
};

const NAV_ITEMS: NavItem[] = [
  { label: "ダッシュボード", href: "/dashboard", icon: <BarChart3 className="h-4 w-4" /> },
  { label: "日報一覧", href: "/reports", icon: <BookOpen className="h-4 w-4" /> },
  { label: "日報作成", href: "/reports/new", icon: <FilePlus className="h-4 w-4" />, roles: ["sales"] },
  { label: "顧客マスタ", href: "/customers", icon: <Users className="h-4 w-4" /> },
  { label: "営業マスタ", href: "/users", icon: <UserCog className="h-4 w-4" />, roles: ["manager"] },
];

export function SideNav() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout", {});
    } catch {
      // ログアウトAPIが失敗してもローカルの認証情報は削除する
    } finally {
      logout();
      router.push("/login");
    }
  };

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (!item.roles) return true;
    return user ? item.roles.includes(user.role) : false;
  });

  return (
    <nav className="flex flex-col h-full bg-secondary/30 border-r">
      <div className="p-4 border-b">
        <p className="text-sm font-semibold text-foreground">営業日報システム</p>
      </div>

      <div className="flex-1 py-2">
        {visibleItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
                isActive ? "bg-accent text-accent-foreground font-medium" : "text-muted-foreground"
              )}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </div>

      <div className="border-t p-4">
        {user && (
          <p className="text-xs text-muted-foreground mb-3 truncate">
            {user.name}（{user.role === "sales" ? "営業" : "上長"}）
          </p>
        )}
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full"
        >
          <LogOut className="h-4 w-4" />
          ログアウト
        </button>
      </div>
    </nav>
  );
}
