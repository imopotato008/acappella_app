"use client";

import { useState } from "react";
import Link from "next/link";
import { useApp } from "@/context/AppContext";
import {
  ArrowLeft,
  CheckCircle2,
  KeyRound,
  Lock,
  Plus,
  ShieldAlert,
  ShieldCheck,
  User as UserIcon,
  UserPlus,
  Users,
} from "lucide-react";

export default function AdminUsersPage() {
  const { currentUser, users, createUser, resetUserPassword } = useApp();

  const [id, setId] = useState("");
  const [password, setPassword] = useState("password123");
  const [nickname, setNickname] = useState("");
  const [bio, setBio] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // 管理者権限チェック
  if (!currentUser?.isAdmin) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <h1 className="text-xl font-bold text-slate-800">
          管理者権限が必要です
        </h1>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          メンバーアカウントの追加・管理は、管理者権限（isAdmin）を持つアカウントのみが実行できます。
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700"
        >
          <ArrowLeft className="w-4 h-4" />
          ダッシュボードへ戻る
        </Link>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    const result = createUser({
      id,
      password,
      nickname,
      bio,
      isAdmin,
    });

    if (result.success) {
      setMessage({ type: "success", text: `アカウント「${nickname}（ID: ${id}）」を登録しました！` });
      setId("");
      setPassword("password123");
      setNickname("");
      setBio("");
      setIsAdmin(false);
      setIsAdding(false);

      setTimeout(() => {
        setMessage(null);
      }, 5000);
    } else {
      setMessage({ type: "error", text: result.message || "登録に失敗しました。" });
    }
  };

  const handleResetPassword = (userId: string, userNickname: string) => {
    if (confirm(`「${userNickname}」さんのパスワードを初期値「password123」にリセットしますか？\n（本人がログイン後に再変更できます）`)) {
      const res = resetUserPassword(userId, "password123");
      if (res.success) {
        setMessage({ type: "success", text: `「${userNickname}」さんのパスワードを「password123」にリセットしました。` });
        setTimeout(() => setMessage(null), 5000);
      } else {
        setMessage({ type: "error", text: res.message || "リセットに失敗しました。" });
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800"
      >
        <ArrowLeft className="w-4 h-4" />
        ダッシュボードへ戻る
      </Link>

      {/* ヘッダー */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 mb-2">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
            管理者専用メニュー
          </div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            メンバーアカウント管理
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            バンドメンバーのアカウントを登録・管理します。事前に登録されたアカウントのみがログインできます。
          </p>
        </div>

        <button
          onClick={() => setIsAdding(!isAdding)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs sm:text-sm shadow-xs transition-colors self-start"
        >
          <UserPlus className="w-4 h-4" />
          {isAdding ? "フォームを閉じる" : "新しいメンバーを追加"}
        </button>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-2 animate-fadeIn ${
            message.type === "success"
              ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
              : "bg-rose-50 border border-rose-200 text-rose-700"
          }`}
        >
          {message.type === "success" && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
          {message.text}
        </div>
      )}

      {/* 新規アカウント追加フォーム */}
      {isAdding && (
        <form
          onSubmit={handleSubmit}
          className="bg-white dark:bg-slate-900 rounded-3xl border border-indigo-200 dark:border-indigo-900/60 shadow-sm p-6 sm:p-8 space-y-4"
        >
          <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 text-xs font-bold uppercase tracking-wider border-b border-indigo-100 dark:border-indigo-900/50 pb-2">
            <UserPlus className="w-4 h-4" />
            新しいバンドメンバーアカウントの作成
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                アカウント ID (半角英数) <span className="text-rose-500">*必須</span>
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  placeholder="例: takumi"
                  pattern="^[a-zA-Z0-9_-]+$"
                  title="半角英数字、ハイフン、アンダースコアのみ"
                  value={id}
                  onChange={(e) => setId(e.target.value.toLowerCase())}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-mono focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">※ログイン時に使用するIDです（英小文字推奨）</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                あだ名・表示名 <span className="text-rose-500">*必須</span>
              </label>
              <input
                type="text"
                required
                placeholder="例: たっくん"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">※本名は含めずバンド内の呼び名を設定</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                初期パスワード <span className="text-rose-500">*必須</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-mono focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">※初期値は password123 (ログイン後に変更可)</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                自己紹介・ひとこと (任意)
              </label>
              <input
                type="text"
                placeholder="例: 新曲楽しみです！"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="pt-2">
            <label className="flex items-center gap-2 cursor-pointer bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
              <input
                type="checkbox"
                checked={isAdmin}
                onChange={(e) => setIsAdmin(e.target.checked)}
                className="rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                このアカウントに管理者権限を付与する
              </span>
              <span className="text-[11px] text-slate-400 dark:text-slate-500 ml-1">
                （他のアカウントの追加・管理が可能になります）
              </span>
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs"
            >
              アカウントを登録する
            </button>
          </div>
        </form>
      )}

      {/* 登録済みメンバー一覧 */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs p-6 space-y-4 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 pb-1">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <h2 className="font-bold text-base text-slate-900 dark:text-slate-100">
              登録済みメンバーアカウント ({users.length}名)
            </h2>
          </div>
          <span className="text-[11px] text-slate-400">外部からの新規登録は遮断されています</span>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {users.map((u) => (
            <div key={u.id} className="py-3.5 flex items-center justify-between gap-2">
              <div className="flex items-start sm:items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-bold text-sm text-slate-700 dark:text-slate-200 shrink-0 mt-0.5 sm:mt-0">
                  {u.nickname.slice(0, 1)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-slate-900 dark:text-slate-100 whitespace-nowrap">{u.nickname}</span>
                    <span className="text-xs font-mono text-slate-400 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-100 dark:border-slate-700 whitespace-nowrap">
                      ID: {u.id}
                    </span>
                    {(u.isAdmin || u.id === currentUser.id) && (
                      <div className="flex flex-col sm:flex-row gap-1 items-start sm:items-center shrink-0">
                        {u.isAdmin && (
                          <span className="text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-full inline-flex items-center gap-0.5 whitespace-nowrap">
                            <ShieldCheck className="w-3 h-3 text-amber-700 dark:text-amber-400 shrink-0" />
                            管理者
                          </span>
                        )}
                        {u.id === currentUser.id && (
                          <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full font-bold whitespace-nowrap">
                            あなた
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  {u.bio && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{u.bio}</p>}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {u.password === "password123" && (
                  <span className="hidden sm:inline-block text-[10px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 px-1.5 py-0.5 rounded font-mono">
                    初期PW
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => handleResetPassword(u.id, u.nickname)}
                  title="パスワードを初期値（password123）にリセット"
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-amber-300 dark:hover:border-amber-600 bg-slate-50 dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-slate-600 dark:text-slate-300 hover:text-amber-800 dark:hover:text-amber-200 text-xs font-semibold transition-colors"
                >
                  <KeyRound className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span className="hidden sm:inline">PWリセット</span>
                  <span className="sm:hidden">リセット</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

