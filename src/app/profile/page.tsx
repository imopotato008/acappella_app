"use client";

import { useState } from "react";
import { useApp } from "@/context/AppContext";
import {
  ArrowLeft,
  CheckCircle2,
  KeyRound,
  Lock,
  Save,
  Smile,
  User as UserIcon,
} from "lucide-react";
import Link from "next/link";

export default function ProfilePage() {
  const { currentUser, updateProfile } = useApp();

  const [nickname, setNickname] = useState(currentUser?.nickname || "");
  const [bio, setBio] = useState(currentUser?.bio || "");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  if (!currentUser) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!nickname.trim()) {
      setMessage({ type: "error", text: "あだ名を入力してください。" });
      return;
    }

    if (newPassword) {
      if (newPassword !== confirmPassword) {
        setMessage({ type: "error", text: "新しいパスワード（確認用）が一致しません。" });
        return;
      }
    }

    updateProfile(nickname.trim(), bio.trim(), newPassword || undefined);
    setNewPassword("");
    setConfirmPassword("");
    setMessage({ type: "success", text: "アカウント設定を更新しました！" });

    setTimeout(() => {
      setMessage(null);
    }, 4000);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
      >
        <ArrowLeft className="w-4 h-4" />
        ダッシュボードへ戻る
      </Link>

      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs p-6 sm:p-8 space-y-6">
        <div>
          <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-0.5 rounded-full border border-indigo-100 dark:border-indigo-900/50">
            アカウント設定
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 mt-2">
            プロフィール設定
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            バンドメンバーに表示されるあだ名や自己紹介、ログインパスワードを変更できます。
          </p>
        </div>

        {message && (
          <div
            className={`p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2 ${
              message.type === "success"
                ? "bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
                : "bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300"
            }`}
          >
            {message.type === "success" && <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* 1. アカウントID (変更不可) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              アカウント ID (変更不可)
            </label>
            <div className="relative">
              <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                disabled
                value={currentUser.id}
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-not-allowed"
              />
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
              ※ログイン時に使用するメンバー固有のIDです。
            </p>
          </div>

          {/* 2. あだ名・表示名 */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              あだ名・表示名 <span className="text-rose-500">*必須</span>
            </label>
            <div className="relative">
              <Smile className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                required
                placeholder="例: けんちゃん"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
              ※本名などの個人情報は含めず、バンド内での呼び名を設定してください。
            </p>
          </div>

          {/* 3. 自己紹介 */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              自己紹介・ひとこと (任意)
            </label>
            <textarea
              rows={3}
              placeholder="例: リードボーカルメインです。高い音は任せてください！"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* 4. パスワード変更 */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
            <h2 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <KeyRound className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              パスワード変更 (変更する場合のみ入力)
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  新しいパスワード
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    placeholder="新しいパスワード"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  確認用再入力
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    placeholder="もう一度入力"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md shadow-indigo-200 transition-colors inline-flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              設定を保存する
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

