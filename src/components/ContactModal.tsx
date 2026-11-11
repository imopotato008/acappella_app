"use client";

import { useState } from "react";
import { useApp } from "@/context/AppContext";
import { X, Send, MessageSquare, AlertCircle, CheckCircle2, Shield, User as UserIcon } from "lucide-react";

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ContactModal({ isOpen, onClose }: ContactModalProps) {
  const { currentUser } = useApp();
  const [message, setMessage] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setStatus("idle");
    setErrorMessage("");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: message.trim(),
          isAnonymous,
          userId: currentUser?.id,
          userNickname: currentUser?.nickname,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "メッセージの送信に失敗しました。");
      }

      setStatus("success");
      setMessage("");
      setTimeout(() => {
        setStatus("idle");
        onClose();
      }, 2500);
    } catch (err: unknown) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "予期せぬエラーが発生しました。");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isSubmitting) return;
    setStatus("idle");
    setErrorMessage("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* モーダルヘッダー */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-slate-100">
                お問い合わせ・ご要望
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                管理者のDiscordへ直接メッセージが届きます
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* モーダル本文 */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {status === "success" ? (
            <div className="p-6 text-center space-y-3 bg-emerald-50/70 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 animate-in zoom-in-95 duration-200">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
              <div>
                <p className="font-bold text-sm sm:text-base">送信が完了しました！</p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                  管理者のDiscordへメッセージが送信されました。ご意見ありがとうございます。
                </p>
              </div>
            </div>
          ) : (
            <>
              {status === "error" && (
                <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold">送信できませんでした</p>
                    <p>{errorMessage}</p>
                  </div>
                </div>
              )}

              {/* 送信者表示 & 匿名チェック */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5">
                    {isAnonymous ? (
                      <Shield className="w-3.5 h-3.5 text-amber-500" />
                    ) : (
                      <UserIcon className="w-3.5 h-3.5 text-indigo-500" />
                    )}
                    送信者情報:
                  </span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {isAnonymous
                      ? "🔒 匿名ユーザー（非公開）"
                      : `${currentUser?.nickname || "ゲスト"} (ID: ${currentUser?.id || "未設定"})`}
                  </span>
                </div>

                <label className="flex items-center gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-700/60 cursor-pointer text-xs select-none">
                  <input
                    type="checkbox"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded-md border-slate-300 dark:border-slate-600 focus:ring-indigo-500"
                  />
                  <span className="text-slate-700 dark:text-slate-300">
                    ユーザーIDを表示せず匿名でメッセージを送る
                  </span>
                </label>
              </div>

              {/* メッセージ入力エリア */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  お問い合わせ・ご要望内容 <span className="text-rose-500">*</span>
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="不具合の報告や、「こんな機能があったら便利」などのご要望を自由にご記入ください。"
                  rows={5}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
                />
              </div>

              {/* ボタン */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 disabled:opacity-50"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={!message.trim() || isSubmitting}
                  className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-indigo-500/20 disabled:opacity-50 inline-flex items-center gap-1.5 transition-all"
                >
                  {isSubmitting ? (
                    <span>送信中...</span>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>送信する</span>
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
