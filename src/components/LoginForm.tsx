"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { Lock, LogIn, Music, User as UserIcon } from "lucide-react";

export function LoginForm() {
  const router = useRouter();
  const { login } = useApp();
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!id.trim() || !password) {
      setError("IDとパスワードを入力してください。");
      return;
    }

    const result = login(id.trim(), password);
    if (!result.success) {
      setError(result.message || "ログインに失敗しました。");
    } else {
      // ログイン後は必ずダッシュボードへ遷移
      window.location.href = "/";
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-indigo-950 via-slate-900 to-violet-950">
      <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-white/20 space-y-6">
        {/* ロゴ & タイトル */}
        <div className="text-center space-y-2">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 items-center justify-center text-white shadow-lg shadow-indigo-500/30 mb-2">
            <Music className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            Acappella Hub
          </h1>
          <p className="text-xs text-slate-500">
            バンド専用ポータルへようこそ。ログインしてください。
          </p>
        </div>

        {/* エラーメッセージ */}
        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold animate-shake">
            {error}
          </div>
        )}

        {/* ログインフォーム */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              アカウント ID
            </label>
            <div className="relative">
              <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                required
                value={id}
                onChange={(e) => setId(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              パスワード
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="password"
                required
                placeholder="パスワードを入力"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-300 transition-colors inline-flex items-center justify-center gap-2"
          >
            <LogIn className="w-4 h-4" />
            ログイン
          </button>
        </form>
      </div>
    </div>
  );
}
