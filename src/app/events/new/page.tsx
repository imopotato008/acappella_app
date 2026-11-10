"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useApp } from "@/context/AppContext";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Info,
  Plus,
  Trash2,
} from "lucide-react";
import { DateType } from "@/types";

export default function NewEventPage() {
  const router = useRouter();
  const { currentUser, users, createEvent } = useApp();

  // フォーム状態
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [organizerId, setOrganizerId] = useState(currentUser?.id || "ken");
  const [dateType, setDateType] = useState<DateType>("candidate");
  
  // 候補日指定用
  const [candidateDates, setCandidateDates] = useState<string[]>([
    "2026-12-19",
    "2026-12-20",
  ]);
  const [newDateInput, setNewDateInput] = useState("");

  // 期間指定用
  const [startDate, setStartDate] = useState("2026-12-15");
  const [endDate, setEndDate] = useState("2026-12-25");

  // 練習時間（30分刻み）
  const [durationMinutes, setDurationMinutes] = useState(120); // 初期値2時間

  // 回答期限
  const [deadline, setDeadline] = useState("2026-12-10T23:59");

  // 確認画面フラグ
  const [isPreview, setIsPreview] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // 候補日の追加
  const handleAddCandidateDate = () => {
    if (!newDateInput) return;
    if (candidateDates.includes(newDateInput)) {
      setErrorMessage("すでに登録されている日付です");
      return;
    }
    setCandidateDates([...candidateDates, newDateInput].sort());
    setNewDateInput("");
    setErrorMessage("");
  };

  // 候補日の削除
  const handleRemoveCandidateDate = (targetDate: string) => {
    setCandidateDates(candidateDates.filter((d) => d !== targetDate));
  };

  // 確認へ進むバリデーション
  const handleProceedToPreview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMessage("日程調整タイトルを入力してください。");
      return;
    }
    if (dateType === "candidate" && candidateDates.length === 0) {
      setErrorMessage("候補日を少なくとも1日以上追加してください。");
      return;
    }
    if (dateType === "range" && (!startDate || !endDate)) {
      setErrorMessage("期間の開始日と終了日を正しく設定してください。");
      return;
    }
    if (!deadline) {
      setErrorMessage("回答期限を設定してください。");
      return;
    }
    setErrorMessage("");
    setIsPreview(true);
  };

  // 公開保存
  const handlePublish = () => {
    const newEvent = createEvent({
      title,
      description,
      organizerId,
      dateType,
      candidateDates: dateType === "candidate" ? candidateDates : undefined,
      startDate: dateType === "range" ? startDate : undefined,
      endDate: dateType === "range" ? endDate : undefined,
      durationMinutes,
      deadline: new Date(deadline).toISOString(),
    });

    router.push(`/events/${newEvent.id}`);
  };

  const selectedOrganizer = users.find((u) => u.id === organizerId);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* 戻るリンク */}
      <Link
        href="/events"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800"
      >
        <ArrowLeft className="w-4 h-4" />
        日程調整一覧へ戻る
      </Link>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 sm:p-8 space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
            {isPreview ? "作成内容の確認" : "新規日程調整の作成"}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {isPreview
              ? "以下の内容で日程調整を公開します。間違いがないかご確認ください。"
              : "練習の条件を設定して、メンバーに回答を募りましょう。"}
          </p>
        </div>

        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
            {errorMessage}
          </div>
        )}

        {!isPreview ? (
          /* 入力フォーム */
          <form onSubmit={handleProceedToPreview} className="space-y-6">
            {/* 1. 基本情報 */}
            <div className="space-y-4">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider text-indigo-600 border-b border-indigo-100 pb-1">
                1. 基本情報
              </h2>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  日程調整タイトル <span className="text-rose-500">*必須</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="例: 12月度 本番前集中練習"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  幹事 <span className="text-rose-500">*必須</span>
                </label>
                <select
                  value={organizerId}
                  onChange={(e) => setOrganizerId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nickname} (@{u.id}) {u.id === currentUser?.id ? "— あなた" : ""}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  ※作成者が初期幹事となりますが、別メンバーを指定することも可能です。
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  備考・連絡事項 (任意)
                </label>
                <textarea
                  rows={2}
                  placeholder="練習の目的や希望曲などがあれば記入してください"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* 2. 日程設定 */}
            <div className="space-y-4">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider text-indigo-600 border-b border-indigo-100 pb-1">
                2. 日程設定
              </h2>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  日程指定方式 <span className="text-rose-500">*必須</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setDateType("candidate")}
                    className={`py-3 px-4 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                      dateType === "candidate"
                        ? "border-indigo-600 bg-indigo-50/70 text-indigo-900 ring-2 ring-indigo-500"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <span>候補日指定方式</span>
                    <span className="text-[10px] font-normal text-slate-500">
                      指定した複数の候補日から回答
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDateType("range")}
                    className={`py-3 px-4 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                      dateType === "range"
                        ? "border-indigo-600 bg-indigo-50/70 text-indigo-900 ring-2 ring-indigo-500"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <span>期間指定方式</span>
                    <span className="text-[10px] font-normal text-slate-500">
                      開始日〜終了日の範囲内で回答
                    </span>
                  </button>
                </div>
              </div>

              {/* 候補日指定の場合 */}
              {dateType === "candidate" ? (
                <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/80 space-y-3">
                  <label className="block text-xs font-bold text-slate-700">
                    候補日リスト (複数追加可能)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={newDateInput}
                      onChange={(e) => setNewDateInput(e.target.value)}
                      className="px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                    />
                    <button
                      type="button"
                      onClick={handleAddCandidateDate}
                      className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      追加
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2">
                    {candidateDates.map((d) => (
                      <span
                        key={d}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-800 shadow-2xs"
                      >
                        <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                        {d}
                        <button
                          type="button"
                          onClick={() => handleRemoveCandidateDate(d)}
                          className="text-slate-400 hover:text-rose-600 ml-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                /* 期間指定の場合 */
                <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/80 space-y-3">
                  <label className="block text-xs font-bold text-slate-700">
                    調整対象期間
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-[11px] text-slate-500 block mb-1">開始日</span>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                      />
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 block mb-1">終了日</span>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 3. 回答設定 */}
            <div className="space-y-4">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider text-indigo-600 border-b border-indigo-100 pb-1">
                3. 回答 & 条件設定
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    必要な練習時間 <span className="text-rose-500">*必須 (30分刻み)</span>
                  </label>
                  <select
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value={60}>1 時間 (60分)</option>
                    <option value={90}>1 時間 30 分 (90分)</option>
                    <option value={120}>2 時間 (120分)</option>
                    <option value={150}>2 時間 30 分 (150分)</option>
                    <option value={180}>3 時間 (180分)</option>
                    <option value={240}>4 時間 (240分)</option>
                  </select>
                  <p className="text-[11px] text-slate-400 mt-1">
                    集計時にこの時間を満たすスロットのみが候補として抽出されます。
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    回答期限 <span className="text-rose-500">*必須</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-md shadow-indigo-200 transition-colors"
              >
                確認画面へ進む &rarr;
              </button>
            </div>
          </form>
        ) : (
          /* 確認画面 */
          <div className="space-y-6">
            <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs flex items-center gap-2">
              <Info className="w-4 h-4 shrink-0 text-indigo-600" />
              以下の内容で公開します。バンドメンバー全員に回答が依頼されます。
            </div>

            <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-2 pb-3 border-b border-slate-200">
                <span className="text-slate-500">タイトル</span>
                <span className="col-span-2 font-bold text-slate-900 text-sm">{title}</span>
              </div>

              <div className="grid grid-cols-3 gap-2 pb-3 border-b border-slate-200">
                <span className="text-slate-500">幹事</span>
                <span className="col-span-2 font-bold text-slate-900">
                  {selectedOrganizer?.nickname} (@{selectedOrganizer?.id})
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 pb-3 border-b border-slate-200">
                <span className="text-slate-500">日程指定方式</span>
                <span className="col-span-2 font-bold text-slate-900">
                  {dateType === "candidate" ? "候補日指定方式" : "期間指定方式"}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 pb-3 border-b border-slate-200">
                <span className="text-slate-500">対象日程</span>
                <div className="col-span-2 font-medium text-slate-900">
                  {dateType === "candidate" ? (
                    <div className="flex flex-wrap gap-1.5">
                      {candidateDates.map((d) => (
                        <span key={d} className="bg-white px-2 py-0.5 rounded border border-slate-200">
                          {d}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span>
                      {startDate} 〜 {endDate}
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 pb-3 border-b border-slate-200">
                <span className="text-slate-500">必要な練習時間</span>
                <span className="col-span-2 font-bold text-slate-900">
                  {Math.floor(durationMinutes / 60)} 時間 {durationMinutes % 60 > 0 && `${durationMinutes % 60} 分`}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <span className="text-slate-500">回答期限</span>
                <span className="col-span-2 font-bold text-amber-700">
                  {new Date(deadline).toLocaleString("ja-JP")}
                </span>
              </div>

              {description && (
                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-200">
                  <span className="text-slate-500">備考</span>
                  <span className="col-span-2 text-slate-700 whitespace-pre-wrap">{description}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setIsPreview(false)}
                className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                &larr; 修正する
              </button>

              <button
                type="button"
                onClick={handlePublish}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-md transition-colors"
              >
                この内容で公開する
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

