"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { useTheme } from "@/context/ThemeContext";
import {
  Calendar,
  LogOut,
  MapPin,
  Moon,
  Music,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Sun,
  UserCheck,
} from "lucide-react";

export function Header() {
  const pathname = usePathname();
  const { currentUser, logout } = useApp();
  const { theme, toggleTheme } = useTheme();

  const navLinks = [
    { href: "/", label: "ダッシュボード", icon: Music },
    { href: "/events", label: "日程調整", icon: Calendar },
    { href: "/locations", label: "練習場所", icon: MapPin },
  ];

  const handleLogout = () => {
    if (confirm("アカウントを切り替えますか？（ダッシュボードに戻りログイン画面を表示します）")) {
      logout();
      window.location.href = "/";
    }
  };

  const isDefaultPassword = currentUser && currentUser.password === "password123";

  return (
    <header className="sticky top-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200 dark:border-slate-800 shadow-xs transition-colors">
      {/* 初期パスワード変更を促す警告バナー */}
      {isDefaultPassword && pathname !== "/profile" && (
        <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-orange-500 text-white px-4 py-2 text-xs font-bold border-b border-amber-600/30 shadow-xs">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 text-white animate-pulse" />
              <span>
                現在、初期パスワード（<code>password123</code>）のままです。セキュリティのため変更してください。
              </span>
            </div>
            <Link
              href="/profile"
              className="underline hover:opacity-90 shrink-0 ml-2 inline-flex items-center gap-1 bg-white/20 hover:bg-white/30 px-2.5 py-1 rounded-lg transition-colors text-[11px]"
            >
              今すぐ変更する →
            </Link>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* ロゴ */}
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                <Music className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-lg bg-gradient-to-r from-indigo-700 via-violet-600 to-indigo-500 bg-clip-text text-transparent dark:from-indigo-400 dark:to-violet-400">
                  Acappella Hub
                </span>
                <span className="hidden sm:inline-block text-xs text-slate-500 dark:text-slate-400 ml-2">
                  うたいい専用
                </span>
              </div>
            </Link>

            {/* デスクトップ用ナビゲーション */}
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive =
                  link.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${isActive
                      ? "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-semibold"
                      : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800"
                      }`}
                  >
                    <Icon className="w-4 h-4" />
                    {link.label}
                  </Link>
                );
              })}

              {/* 管理者用メンバー管理リンク */}
              {currentUser?.isAdmin && (
                <Link
                  href="/admin/users"
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${pathname.startsWith("/admin")
                    ? "bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 font-semibold border border-amber-200 dark:border-amber-800/60"
                    : "text-amber-700 dark:text-amber-400 hover:bg-amber-50/60 dark:hover:bg-amber-950/30"
                    }`}
                >
                  <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  メンバー管理
                </Link>
              )}
            </nav>
          </div>

          {/* 右側：ダークモード切り替え & アカウント設定 & アカウント切替 */}
          <div className="flex items-center gap-2">
            {/* ダークモード切り替えトグル */}
            <button
              type="button"
              onClick={toggleTheme}
              title={theme === "dark" ? "ライトモードに切り替え" : "ダークモードに切り替え"}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors"
            >
              {theme === "dark" ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-indigo-600" />
              )}
            </button>

            {currentUser && (
              <>
                {/* プロフィール設定リンク */}
                <Link
                  href="/profile"
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors ${pathname === "/profile"
                    ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800"
                    : "bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700"
                    }`}
                >
                  <UserCheck className="flex-col sm:flex-row w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>{currentUser.nickname}</span>
                  {currentUser.isAdmin && (
                    <span className="text-[10px] bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 px-1 rounded font-bold">
                      管理者
                    </span>
                  )}
                  <Settings className="w-3 h-3 text-slate-400 ml-0.5" />
                </Link>

                {/* アカウント切り替え（ログアウトしてダッシュボード/へ遷移） */}
                <button
                  type="button"
                  onClick={handleLogout}
                  title="別のアカウントでログイン"
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-slate-200 dark:border-slate-700 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">アカウント切替</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* モバイル用ボトムバー */}
      <div className="md:hidden flex items-center justify-around border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-2 px-2 transition-colors">
        {navLinks.map((link) => {
          const Icon = link.icon;
          const isActive =
            link.href === "/"
              ? pathname === "/"
              : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg text-xs font-medium transition-colors ${isActive
                ? "text-indigo-600 dark:text-indigo-400"
                : "text-slate-500 dark:text-slate-400"
                }`}
            >
              <Icon className="w-5 h-5" />
              {link.label}
            </Link>
          );
        })}
        {currentUser?.isAdmin && (
          <Link
            href="/admin/users"
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg text-xs font-medium transition-colors ${pathname.startsWith("/admin")
              ? "text-amber-700 dark:text-amber-400 font-bold"
              : "text-slate-500 dark:text-slate-400"
              }`}
          >
            <ShieldCheck className="w-5 h-5" />
            メンバー
          </Link>
        )}
      </div>
    </header>
  );
}
