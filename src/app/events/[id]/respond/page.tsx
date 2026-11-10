"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  MapPin,
  Pencil,
  Plus,
  Trash2,
  XCircle,
} from "lucide-react";
import { ResponseTimeSlot, SlotLocationChoice } from "@/types";
import {
  validateTimeSlot,
  updateTimeSlot,
  addTimeSlot,
  removeTimeSlot,
} from "@/lib/response";

// 30分刻みの時刻選択肢（08:00 〜 23:00）
const TIME_OPTIONS: string[] = [];
for (let h = 8; h <= 23; h++) {
  const hh = String(h).padStart(2, "0");
  TIME_OPTIONS.push(`${hh}:00`);
  if (h < 23) TIME_OPTIONS.push(`${hh}:30`);
}

export default function EventRespondPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const eventId = resolvedParams.id;
  const router = useRouter();

  const { currentUser, events, responses, locations, saveResponse, addLocation } =
    useApp();

  const event = events.find((e) => e.id === eventId);
  const existingResponse = responses.find(
    (r) => r.eventId === eventId && r.userId === currentUser?.id
  );

  // フォーム状態
  const [canAttend, setCanAttend] = useState<boolean>(true);
  const [memo, setMemo] = useState<string>("");
  const [timeSlots, setTimeSlots] = useState<ResponseTimeSlot[]>([]);

  // 新規時間帯追加用の入力状態
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [startTime, setStartTime] = useState<string>("13:00");
  const [endTime, setEndTime] = useState<string>("17:00");
  const [selectedLocations, setSelectedLocations] = useState<SlotLocationChoice[]>(
    []
  );

  // 新規練習場所提案の入力状態
  const [isSuggestingLocation, setIsSuggestingLocation] = useState(false);
  const [suggestName, setSuggestName] = useState("");
  const [suggestAddress, setSuggestAddress] = useState("");
  const [suggestMapUrl, setSuggestMapUrl] = useState("");

  // 編集中の時間帯の状態
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState<string>("");
  const [editStartTime, setEditStartTime] = useState<string>("13:00");
  const [editEndTime, setEditEndTime] = useState<string>("17:00");
  const [editLocations, setEditLocations] = useState<SlotLocationChoice[]>([]);
  const [isSuggestingInEdit, setIsSuggestingInEdit] = useState<boolean>(false);
  const [editSuggestName, setEditSuggestName] = useState<string>("");
  const [editSuggestAddress, setEditSuggestAddress] = useState<string>("");
  const [editSuggestMapUrl, setEditSuggestMapUrl] = useState<string>("");

  // 既存回答の読み込み
  useEffect(() => {
    if (existingResponse) {
      setCanAttend(existingResponse.canAttend);
      setMemo(existingResponse.memo || "");
      setTimeSlots(existingResponse.timeSlots || []);
    }
    // デフォルト日付の設定
    if (event) {
      if (event.dateType === "candidate" && event.candidateDates && event.candidateDates.length > 0) {
        setSelectedDate(event.candidateDates[0]);
      } else if (event.startDate) {
        setSelectedDate(event.startDate);
      }
    }
  }, [existingResponse, event]);

  if (!event || !currentUser) {
    return <div className="p-8 text-center text-xs text-slate-500">日程調整が見つかりません。</div>;
  }

  // 回答ができるのは「回答受付中 (open)」のみ！
  if (event.status !== "open") {
    let statusText = "受付終了";
    if (event.status === "aggregated") statusText = "集計完了";
    if (event.status === "voting") statusText = "最終投票中";
    if (event.status === "confirmed") statusText = "確定済み";
    if (event.status === "completed") statusText = "練習終了";

    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mx-auto">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-bold text-slate-800">
          現在は回答を受け付けていません
        </h1>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          この日程調整の現在のステータスは「<strong>{statusText}</strong>」です。回答の提出・変更は回答受付中のみ行えます。
        </p>
        <Link
          href={`/events/${event.id}`}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700"
        >
          <ArrowLeft className="w-4 h-4" />
          日程調整詳細へ戻る
        </Link>
      </div>
    );
  }

  // 練習場所のチェック切り替え（順位付けは廃止し、利用可能場所として選択）
  const handleToggleLocation = (locId: string) => {
    const exists = selectedLocations.find((l) => l.locationId === locId);
    if (exists) {
      setSelectedLocations(selectedLocations.filter((l) => l.locationId !== locId));
    } else {
      setSelectedLocations([...selectedLocations, { locationId: locId }]);
    }
  };

  // 新規時間帯の追加
  const handleAddTimeSlot = () => {
    const validation = validateTimeSlot({
      date: selectedDate,
      startTime,
      endTime,
      locations: selectedLocations,
    });

    if (!validation.valid) {
      alert(validation.error);
      return;
    }

    const newSlot: ResponseTimeSlot = {
      id: `slot-${Date.now()}`,
      date: selectedDate,
      startTime,
      endTime,
      locations: [...selectedLocations],
    };

    setTimeSlots(addTimeSlot(timeSlots, newSlot));
    setSelectedLocations([]);
  };

  // 時間帯の削除
  const handleRemoveTimeSlot = (slotId: string) => {
    setTimeSlots(removeTimeSlot(timeSlots, slotId));
    if (editingSlotId === slotId) {
      setEditingSlotId(null);
      setIsSuggestingInEdit(false);
    }
  };

  // 時間帯の編集開始
  const handleStartEditSlot = (slot: ResponseTimeSlot) => {
    setEditingSlotId(slot.id);
    setEditDate(slot.date);
    setEditStartTime(slot.startTime);
    setEditEndTime(slot.endTime);
    setEditLocations([...slot.locations]);
    setIsSuggestingInEdit(false);
  };

  // 時間帯の編集キャンセル
  const handleCancelEditSlot = () => {
    setEditingSlotId(null);
    setIsSuggestingInEdit(false);
  };

  // 編集中の練習場所トグル
  const handleToggleEditLocation = (locId: string) => {
    const exists = editLocations.find((l) => l.locationId === locId);
    if (exists) {
      setEditLocations(editLocations.filter((l) => l.locationId !== locId));
    } else {
      setEditLocations([...editLocations, { locationId: locId }]);
    }
  };

  // 編集中の新規練習場所提案
  const handleCreateSuggestionInEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editSuggestName.trim()) return;

    const newLoc = addLocation(
      editSuggestName,
      editSuggestAddress,
      undefined,
      editSuggestMapUrl
    );
    setEditLocations([...editLocations, { locationId: newLoc.id }]);
    setEditSuggestName("");
    setEditSuggestAddress("");
    setEditSuggestMapUrl("");
    setIsSuggestingInEdit(false);
  };

  // 編集内容を確定・反映
  const handleSaveEditSlot = (slotId: string) => {
    const validation = validateTimeSlot({
      date: editDate,
      startTime: editStartTime,
      endTime: editEndTime,
      locations: editLocations,
    });

    if (!validation.valid) {
      alert(validation.error);
      return;
    }

    setTimeSlots(
      updateTimeSlot(timeSlots, slotId, {
        date: editDate,
        startTime: editStartTime,
        endTime: editEndTime,
        locations: editLocations,
      })
    );
    setEditingSlotId(null);
    setIsSuggestingInEdit(false);
  };

  // 新しい練習場所のその場提案
  const handleCreateSuggestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!suggestName.trim()) return;

    const newLoc = addLocation(suggestName, suggestAddress, undefined, suggestMapUrl);
    setSelectedLocations([
      ...selectedLocations,
      { locationId: newLoc.id },
    ]);
    setSuggestName("");
    setSuggestAddress("");
    setSuggestMapUrl("");
    setIsSuggestingLocation(false);
  };

  // 回答の保存
  const handleSave = () => {
    let finalSlots = [...timeSlots];

    // もし編集中であれば、その内容を自動検証・反映して保存
    if (editingSlotId) {
      const validation = validateTimeSlot({
        date: editDate,
        startTime: editStartTime,
        endTime: editEndTime,
        locations: editLocations,
      });

      if (!validation.valid) {
        alert(`編集中スロットの入力不備: ${validation.error}`);
        return;
      }

      finalSlots = updateTimeSlot(finalSlots, editingSlotId, {
        date: editDate,
        startTime: editStartTime,
        endTime: editEndTime,
        locations: editLocations,
      });
    }

    if (canAttend && finalSlots.length === 0) {
      alert("「参加可能」を選択した場合、少なくとも1つの参加可能時間帯を登録してください。");
      return;
    }

    saveResponse({
      eventId: event.id,
      userId: currentUser.id,
      canAttend,
      memo,
      timeSlots: canAttend ? finalSlots : [],
    });

    alert("回答を保存しました！");
    router.push(`/events/${event.id}`);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <Link
        href={`/events/${event.id}`}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800"
      >
        <ArrowLeft className="w-4 h-4" />
        {event.title} に戻る
      </Link>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 sm:p-8 space-y-6">
        <div>
          <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full">
            回答フォーム
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-2">
            練習日程・場所の回答
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            回答者: <strong className="text-slate-800 font-bold">{currentUser.nickname}</strong>
          </p>
        </div>

        {/* 1. 参加可否の選択 */}
        <div className="space-y-3">
          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
            1. 参加可否を選択してください
          </label>
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setCanAttend(true)}
              className={`p-4 rounded-2xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                canAttend
                  ? "border-emerald-600 bg-emerald-50/70 text-emerald-900 ring-2 ring-emerald-500 shadow-xs"
                  : "border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              <CheckCircle2
                className={`w-6 h-6 ${canAttend ? "text-emerald-600" : "text-slate-400"}`}
              />
              <span className="font-bold text-sm">参加可能</span>
              <span className="text-[11px] text-slate-500">
                日時・場所を回答する
              </span>
            </button>

            <button
              type="button"
              onClick={() => setCanAttend(false)}
              className={`p-4 rounded-2xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                !canAttend
                  ? "border-slate-600 bg-slate-100 text-slate-900 ring-2 ring-slate-400 shadow-xs"
                  : "border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              <XCircle
                className={`w-6 h-6 ${!canAttend ? "text-slate-700" : "text-slate-400"}`}
              />
              <span className="font-bold text-sm">参加不可</span>
              <span className="text-[11px] text-slate-500">
                この日程は参加できません
              </span>
            </button>
          </div>
        </div>

        {/* 2. 参加可能日時の入力（参加可能の場合のみ） */}
        {canAttend ? (
          <div className="space-y-6 pt-4 border-t border-slate-100">
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                2. 参加可能な日時 & 利用可能な練習場所
              </label>
              <p className="text-xs text-slate-500">
                都合の良い時間帯と、その時間帯に利用できるスタジオ・施設を登録してください（複数登録可）。
              </p>
            </div>

            {/* 時間帯追加カード */}
            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-4">
              <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-indigo-600" />
                参加可能時間帯を追加する
              </h3>

              {/* 日付選択 */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  日付を選択
                </label>
                {event.dateType === "candidate" && event.candidateDates ? (
                  <div className="flex flex-wrap gap-2">
                    {event.candidateDates.map((date) => (
                      <button
                        type="button"
                        key={date}
                        onClick={() => setSelectedDate(date)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                          selectedDate === date
                            ? "bg-indigo-600 text-white shadow-xs"
                            : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        {date}
                      </button>
                    ))}
                  </div>
                ) : (
                  <input
                    type="date"
                    min={event.startDate}
                    max={event.endDate}
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                  />
                )}
              </div>

              {/* 時間範囲選択 (30分刻み) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    開始時刻 (30分刻み)
                  </label>
                  <select
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                  >
                    {TIME_OPTIONS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    終了時刻 (30分刻み)
                  </label>
                  <select
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                  >
                    {TIME_OPTIONS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 練習場所の選択 */}
              <div className="space-y-2 pt-2 border-t border-slate-200/80">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-bold text-slate-700">
                    この時間帯に利用可能な場所を選択（複数可）
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsSuggestingLocation(!isSuggestingLocation)}
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800"
                  >
                    ＋ 新しい場所を提案する
                  </button>
                </div>

                {/* 新規場所提案フォーム */}
                {isSuggestingLocation && (
                  <div className="p-3 bg-white rounded-xl border border-indigo-200 space-y-2">
                    <span className="text-[11px] font-bold text-indigo-900 block">
                      練習場所の新規提案
                    </span>
                    <input
                      type="text"
                      placeholder="施設名・スタジオ名"
                      value={suggestName}
                      onChange={(e) => setSuggestName(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                    />
                    <input
                      type="text"
                      placeholder="住所や最寄駅 (任意)"
                      value={suggestAddress}
                      onChange={(e) => setSuggestAddress(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                    />
                    <input
                      type="url"
                      placeholder="Google Mapのリンク (任意)"
                      value={suggestMapUrl}
                      onChange={(e) => setSuggestMapUrl(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setIsSuggestingLocation(false)}
                        className="px-2.5 py-1 text-xs text-slate-500"
                      >
                        キャンセル
                      </button>
                      <button
                        type="button"
                        onClick={handleCreateSuggestion}
                        className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-xs font-semibold"
                      >
                        登録して選択
                      </button>
                    </div>
                  </div>
                )}

                {/* 場所チェックボックスリスト */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                  {locations.map((loc) => {
                    const choice = selectedLocations.find((l) => l.locationId === loc.id);
                    const isChecked = !!choice;

                    return (
                      <label
                        key={loc.id}
                        className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs cursor-pointer transition-colors ${
                          isChecked
                            ? "bg-indigo-50/70 border-indigo-300 text-indigo-950 font-semibold shadow-2xs"
                            : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleLocation(loc.id)}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="truncate">{loc.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handleAddTimeSlot}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors inline-flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  この時間帯をリストに追加
                </button>
              </div>
            </div>

            {/* 登録済み時間帯リスト */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-700">
                登録済みの参加可能時間帯 ({timeSlots.length}件)
              </label>

              {timeSlots.length === 0 ? (
                <div className="text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400 text-xs">
                  まだ時間帯が登録されていません。上のフォームから追加してください。
                </div>
              ) : (
                <div className="space-y-2">
                  {timeSlots.map((slot) => {
                    const isEditing = editingSlotId === slot.id;

                    if (isEditing) {
                      return (
                        <div
                          key={slot.id}
                          className="p-4 sm:p-5 rounded-2xl border-2 border-indigo-500 bg-indigo-50/25 space-y-4 shadow-sm"
                        >
                          <div className="flex items-center justify-between border-b border-indigo-100 pb-2.5">
                            <div className="flex items-center gap-2 text-xs font-bold text-indigo-950">
                              <Pencil className="w-3.5 h-3.5 text-indigo-600" />
                              <span>参加可能時間帯を編集</span>
                            </div>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700">
                              編集中
                            </span>
                          </div>

                          {/* 日付選択 */}
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                              日付を選択
                            </label>
                            {event.dateType === "candidate" && event.candidateDates ? (
                              <div className="flex flex-wrap gap-1.5">
                                {event.candidateDates.map((date) => (
                                  <button
                                    type="button"
                                    key={date}
                                    onClick={() => setEditDate(date)}
                                    className={`px-3 py-1 rounded-xl text-xs font-semibold transition-colors ${
                                      editDate === date
                                        ? "bg-indigo-600 text-white shadow-xs"
                                        : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                                    }`}
                                  >
                                    {date}
                                  </button>
                                ))}
                              </div>
                            ) : (
                              <input
                                type="date"
                                min={event.startDate}
                                max={event.endDate}
                                value={editDate}
                                onChange={(e) => setEditDate(e.target.value)}
                                className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs bg-white"
                              />
                            )}
                          </div>

                          {/* 時間範囲選択 (30分刻み) */}
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                開始時刻 (30分刻み)
                              </label>
                              <select
                                value={editStartTime}
                                onChange={(e) => setEditStartTime(e.target.value)}
                                className="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-xs bg-white"
                              >
                                {TIME_OPTIONS.map((t) => (
                                  <option key={t} value={t}>
                                    {t}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                終了時刻 (30分刻み)
                              </label>
                              <select
                                value={editEndTime}
                                onChange={(e) => setEditEndTime(e.target.value)}
                                className="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-xs bg-white"
                              >
                                {TIME_OPTIONS.map((t) => (
                                  <option key={t} value={t}>
                                    {t}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          {/* 練習場所選択 */}
                          <div className="space-y-2 pt-1 border-t border-indigo-100/80">
                            <div className="flex items-center justify-between">
                              <label className="block text-[11px] font-bold text-slate-700">
                                利用可能な練習場所を選択（複数可）
                              </label>
                              <button
                                type="button"
                                onClick={() => setIsSuggestingInEdit(!isSuggestingInEdit)}
                                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800"
                              >
                                ＋ 新しい場所を提案する
                              </button>
                            </div>

                            {/* 編集中の新規場所提案フォーム */}
                            {isSuggestingInEdit && (
                              <div className="p-3 bg-white rounded-xl border border-indigo-200 space-y-2">
                                <span className="text-[11px] font-bold text-indigo-900 block">
                                  練習場所の新規提案
                                </span>
                                <input
                                  type="text"
                                  placeholder="施設名・スタジオ名"
                                  value={editSuggestName}
                                  onChange={(e) => setEditSuggestName(e.target.value)}
                                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                                />
                                <input
                                  type="text"
                                  placeholder="住所や最寄駅 (任意)"
                                  value={editSuggestAddress}
                                  onChange={(e) => setEditSuggestAddress(e.target.value)}
                                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                                />
                                <input
                                  type="url"
                                  placeholder="Google Mapのリンク (任意)"
                                  value={editSuggestMapUrl}
                                  onChange={(e) => setEditSuggestMapUrl(e.target.value)}
                                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                                />
                                <div className="flex justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setIsSuggestingInEdit(false)}
                                    className="px-2.5 py-1 text-xs text-slate-500"
                                  >
                                    キャンセル
                                  </button>
                                  <button
                                    type="button"
                                    onClick={handleCreateSuggestionInEdit}
                                    className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-xs font-semibold"
                                  >
                                    登録して選択
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* 場所チェックボックスリスト */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 overflow-y-auto pr-1">
                              {locations.map((loc) => {
                                const isChecked = editLocations.some(
                                  (l) => l.locationId === loc.id
                                );
                                return (
                                  <label
                                    key={loc.id}
                                    className={`flex items-center gap-2 p-2 rounded-xl border text-xs cursor-pointer transition-colors ${
                                      isChecked
                                        ? "bg-indigo-50/70 border-indigo-300 text-indigo-950 font-semibold shadow-2xs"
                                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => handleToggleEditLocation(loc.id)}
                                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <span className="truncate">{loc.name}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>

                          {/* ボタン */}
                          <div className="flex items-center justify-end gap-2 pt-2 border-t border-indigo-100">
                            <button
                              type="button"
                              onClick={handleCancelEditSlot}
                              className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded-xl"
                            >
                              キャンセル
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveEditSlot(slot.id)}
                              className="px-3.5 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors inline-flex items-center gap-1.5"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              変更を保存
                            </button>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={slot.id}
                        className="p-3.5 rounded-xl border border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-2xs hover:border-slate-300 transition-colors"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                            <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                            <span>{slot.date}</span>
                            <span className="text-slate-300">|</span>
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>
                              {slot.startTime} 〜 {slot.endTime}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1.5 text-[11px] text-slate-600">
                            {slot.locations.map((locChoice) => {
                              const locObj = locations.find(
                                (l) => l.id === locChoice.locationId
                              );
                              return (
                                <span
                                  key={locChoice.locationId}
                                  className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200"
                                >
                                  {locObj?.name || "練習場所"}
                                </span>
                              );
                            })}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 self-end sm:self-center shrink-0">
                          <button
                            type="button"
                            onClick={() => handleStartEditSlot(slot)}
                            className="px-2.5 py-1 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition-colors"
                            title="この時間帯を編集"
                          >
                            <Pencil className="w-3.5 h-3.5 text-indigo-600" />
                            <span>編集</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveTimeSlot(slot.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="この時間帯を削除"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : null}

        {/* 3. コメント・メモ */}
        <div className="space-y-2 pt-4 border-t border-slate-100">
          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
            3. コメント・連絡事項 (任意)
          </label>
          <textarea
            rows={2}
            placeholder="遅刻・早退の可能性や希望などがあれば記入してください"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* 保存ボタン */}
        <div className="pt-4 flex items-center justify-between border-t border-slate-100">
          <Link
            href={`/events/${event.id}`}
            className="text-xs font-semibold text-slate-500 hover:text-slate-800"
          >
            キャンセル
          </Link>

          <button
            type="button"
            onClick={handleSave}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-md transition-colors"
          >
            回答を保存する
          </button>
        </div>
      </div>
    </div>
  );
}
