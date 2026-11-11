"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { useTheme } from "@/context/ThemeContext";
import { ContactModal } from "@/components/ContactModal";
import {
  Calendar,
  LogOut,
  MapPin,
  Menu,
  MessageSquare,
  Moon,
  Music,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Sun,
  UserCheck,
  X,
} from "lucide-react";

export function Header() {
  const pathname = usePathname();
  const { currentUser, logout } = useApp();
  const { theme, toggleTheme } = useTheme();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isContactOpen, setIsContactOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // 外側クリックでメニューを閉じる
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

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
    <>
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200 dark:border-slate-800 shadow-xs transition-colors">
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

            {/* 右側：アカウント表示 & ハンバーガーメニュー */}
            <div className="flex items-center gap-2">
              {currentUser && (
                /* プロフィール設定リンク */
                <Link
                  href="/profile"
                  className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl border text-xs font-semibold transition-colors ${pathname === "/profile"
                    ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800"
                    : "bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700"
                    }`}
                >
                  <UserCheck className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <div className="flex flex-col sm:flex-row sm:items-center sm:gap-1.5 leading-tight text-left">
                    <span className="whitespace-nowrap">{currentUser.nickname}</span>
                    {currentUser.isAdmin && (
                      <span className="text-[9px] sm:text-[10px] bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 px-1 rounded font-bold self-start sm:self-auto leading-none py-0.5 mt-0.5 sm:mt-0 whitespace-nowrap">
                        管理者
                      </span>
                    )}
                  </div>
                </Link>
              )}

              {/* ハンバーガーメニュー */}
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  title="メニュー"
                  aria-label="メニューを開く"
                  className="p-2 rounded-xl text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors"
                >
                  {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>

                {/* ドロップダウンメニュー */}
                {isMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                    {/* お問い合わせ・ご要望 */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        setIsContactOpen(true);
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors text-left"
                    >
                      <MessageSquare className="w-4 h-4 text-indigo-500" />
                      <span>問い合わせ・ご要望</span>
                    </button>

                    {/* ライト / ダークモード切り替え */}
                    <button
                      type="button"
                      onClick={() => {
                        toggleTheme();
                      }}
                      className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
                    >
                      <div className="flex items-center gap-2.5">
                        {theme === "dark" ? (
                          <Sun className="w-4 h-4 text-amber-400" />
                        ) : (
                          <Moon className="w-4 h-4 text-indigo-600" />
                        )}
                        <span>{theme === "dark" ? "ライトモードに切り替え" : "ダークモードに切り替え"}</span>
                      </div>
                    </button>

                    {/* プロフィール設定（ログイン時） */}
                    {currentUser && (
                      <Link
                        href="/profile"
                        onClick={() => setIsMenuOpen(false)}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      >
                        <Settings className="w-4 h-4 text-slate-400" />
                        <span>登録情報・パスワード変更</span>
                      </Link>
                    )}

                    {/* ログアウト / アカウント切替（ログイン時） */}
                    {currentUser && (
                      <div className="pt-1 mt-1 border-t border-slate-100 dark:border-slate-800">
                        <button
                          type="button"
                          onClick={() => {
                            setIsMenuOpen(false);
                            handleLogout();
                          }}
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors text-left"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>ログアウト (アカウント切替)</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
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

      {/* お問い合わせ・ご要望モーダル */}
      <ContactModal isOpen={isContactOpen} onClose={() => setIsContactOpen(false)} />
    </>
  );
}
