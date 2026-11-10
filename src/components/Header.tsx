"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "@/context/AppContext";
import {
  Calendar,
  LogOut,
  MapPin,
  Music,
  RotateCcw,
  Settings,
  ShieldCheck,
  UserCheck,
  Users,
} from "lucide-react";

export function Header() {
  const pathname = usePathname();
  const { currentUser, logout, resetToInitialData } = useApp();

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

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* ロゴ */}
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                <Music className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-lg bg-gradient-to-r from-indigo-700 to-violet-600 bg-clip-text text-transparent">
                  Acappella Hub
                </span>
                <span className="hidden sm:inline-block text-xs text-slate-500 ml-2">
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
                        ? "bg-indigo-50 text-indigo-700 font-semibold"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
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
                      ? "bg-amber-50 text-amber-800 font-semibold border border-amber-200"
                      : "text-amber-700 hover:bg-amber-50/60"
                    }`}
                >
                  <ShieldCheck className="w-4 h-4 text-amber-600" />
                  メンバー管理
                </Link>
              )}
            </nav>
          </div>

          {/* 右側：アカウント設定 & アカウント切替 */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => {
                if (confirm("データを初期状態にリセットしますか？")) {
                  resetToInitialData();
                  window.location.href = "/";
                }
              }}
              title="データを初期状態にリセット"
              className="hidden sm:flex items-center gap-1 px-2 py-1.5 text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              リセット
            </button>

            {currentUser && (
              <>
                {/* プロフィール設定リンク */}
                <Link
                  href="/profile"
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors ${pathname === "/profile"
                      ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                      : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                    }`}
                >
                  <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{currentUser.nickname}</span>
                  {currentUser.isAdmin && (
                    <span className="text-[10px] bg-amber-100 text-amber-800 px-1 rounded font-bold">
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
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition-colors"
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
      <div className="md:hidden flex items-center justify-around border-t border-slate-200 bg-white py-2 px-2">
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
              className={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg text-xs font-medium ${isActive ? "text-indigo-600" : "text-slate-500"
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
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg text-xs font-medium ${pathname.startsWith("/admin") ? "text-amber-700 font-bold" : "text-slate-500"
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
