"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Edit3,
  ExternalLink,
  Globe,
  Hourglass,
  LayoutGrid,
  List,
  MapPin,
  RefreshCw,
  Settings,
  Sparkles,
  Trash2,
  Users,
  X,
  XCircle,
} from "lucide-react";
import { CandidateSlot, EventStatus } from "@/types";
import { ScheduleTimeline } from "@/components/ScheduleTimeline";
import { formatWebUrl } from "@/lib/location";

export default function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const eventId = resolvedParams.id;
  const router = useRouter();

  const {
    currentUser,
    events,
    users,
    responses,
    locations,
    candidateSlots,
    calculateAggregation,
    deleteEvent,
    updateEventStatus,
    updateEventDeadline,
  } = useApp();

  const [viewMode, setViewMode] = useState<"timeline" | "list">("timeline");

  // 回答期限変更モーダル状態
  const [isDeadlineModalOpen, setIsDeadlineModalOpen] = useState(false);
  const [editDeadlineInput, setEditDeadlineInput] = useState("");

  // 複数日程確定モーダル状態
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [targetDaysCount, setTargetDaysCount] = useState<number>(1);
  const [selectedSlotIds, setSelectedSlotIds] = useState<string[]>([]);

  const event = events.find((e) => e.id === eventId);

  if (!event) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-4">
        <h1 className="text-xl font-bold text-slate-800">日程調整が見つかりません</h1>
        <Link href="/events" className="text-xs text-indigo-600 hover:underline">
          &larr; 日程調整一覧に戻る
        </Link>
      </div>
    );
  }

  const organizer = users.find((u) => u.id === event.organizerId);
  const isOrganizer = currentUser?.id === event.organizerId;
  const eventResponses = responses.filter((r) => r.eventId === event.id);
  const myResponse = currentUser
    ? eventResponses.find((r) => r.userId === currentUser.id)
    : undefined;

  // 候補スロット一覧
  const eventCandidates = candidateSlots[event.id] || [];

  // 確定対象スロット一覧（複数日程対応）
  const confirmedSlots: CandidateSlot[] = eventCandidates.filter((c) =>
    event.confirmedCandidateIds && event.confirmedCandidateIds.length > 0
      ? event.confirmedCandidateIds.includes(c.id)
      : c.id === event.confirmedCandidateId
  );

  // 回答期限モーダルを開く
  const handleOpenDeadlineModal = () => {
    try {
      const d = new Date(event.deadline);
      const offset = d.getTimezoneOffset() * 60000;
      const localTime = new Date(d.getTime() - offset).toISOString().slice(0, 16);
      setEditDeadlineInput(localTime);
    } catch {
      setEditDeadlineInput("");
    }
    setIsDeadlineModalOpen(true);
  };

  // 回答期限を保存
  const handleSaveDeadline = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editDeadlineInput) return;
    const iso = new Date(editDeadlineInput).toISOString();
    updateEventDeadline(event.id, iso);
    setIsDeadlineModalOpen(false);
    alert("回答期限を更新しました！");
  };

  // 複数日程確定モーダルを開く（最新の集計を実行して候補をセット）
  const handleOpenConfirmModal = () => {
    const result = calculateAggregation(event.id);
    const cands = result.candidates;
    const initialCount = Math.min(Math.max(1, targetDaysCount), Math.max(1, cands.length));
    setTargetDaysCount(initialCount);
    setSelectedSlotIds(cands.slice(0, initialCount).map((c) => c.id));
    setIsConfirmModalOpen(true);
  };

  // 確定日数変更時に上位N件を自動選択
  const handleChangeDaysCount = (newCount: number) => {
    const validCount = Math.max(1, newCount);
    setTargetDaysCount(validCount);
    setSelectedSlotIds(eventCandidates.slice(0, validCount).map((c) => c.id));
  };

  // スロットのチェックボックス切り替え
  const handleToggleSlotSelection = (slotId: string) => {
    if (selectedSlotIds.includes(slotId)) {
      setSelectedSlotIds(selectedSlotIds.filter((id) => id !== slotId));
    } else {
      setSelectedSlotIds([...selectedSlotIds, slotId]);
    }
  };

  // 選択した日程・場所を確定（予約待ちへ進める）
  const handleConfirmSelectedSlots = () => {
    if (selectedSlotIds.length === 0) {
      alert("確定する練習候補枠を1つ以上選択してください。");
      return;
    }
    if (
      confirm(
        `選択した ${selectedSlotIds.length} 日分の練習日程を確定（予約待ちへ遷移）しますか？\n決定後、スタジオの予約手続きに進みます。`
      )
    ) {
      updateEventStatus(event.id, "booking_pending", selectedSlotIds);
      setIsConfirmModalOpen(false);
      alert(
        `練習日程（${selectedSlotIds.length}日分）を決定し、「予約待ち」に移行しました！スタジオの予約を行ってください。`
      );
    }
  };

  // 予約確定ハンドラ（全日程予約完了 -> 確定済み）
  const handleConfirmBooking = () => {
    if (confirmedSlots.length === 0) return;
    if (
      confirm(
        `練習場所の予約が完了しましたか？\n決定した全 ${confirmedSlots.length} 日分の日程を「確定済み」に更新し、メンバー全員に確定案内を共有します。`
      )
    ) {
      updateEventStatus(
        event.id,
        "confirmed",
        confirmedSlots.map((s) => s.id)
      );
      alert("練習日程・場所が「確定済み」になりました！メンバーに共有されました。");
    }
  };

  // 特定スロットの予約不可ハンドラ（次点候補へ繰り上げ）
  const handleMarkSlotBookingFailed = (failedSlotId: string) => {
    const failedSlot = eventCandidates.find((c) => c.id === failedSlotId);
    const otherConfirmedIds = (event.confirmedCandidateIds || []).filter(
      (id) => id !== failedSlotId
    );

    // 未選択の候補枠の中から次点を探す
    const unusedCandidates = eventCandidates.filter(
      (c) => !otherConfirmedIds.includes(c.id) && c.id !== failedSlotId
    );

    if (unusedCandidates.length > 0) {
      const nextSlot = unusedCandidates[0];
      const nextLoc = locations.find((l) => l.id === nextSlot.locationId);
      const locName = nextLoc ? nextLoc.name : "未定";
      if (
        confirm(
          `【${failedSlot?.date}の練習枠】の予約が取れなかったため、次点候補へ繰り上げますか？\n\n【次の練習候補】\n日時: ${nextSlot.date} ${nextSlot.startTime}〜${nextSlot.endTime}\n場所: ${locName} (${nextSlot.attendeeCount}名参加可能)\n\n他の確定日は維持したまま、「予約待ち」を継続します。`
        )
      ) {
        const newConfirmedIds = [...otherConfirmedIds, nextSlot.id];
        updateEventStatus(event.id, "booking_pending", newConfirmedIds);
        alert(
          `次点候補（${nextSlot.date} ${nextSlot.startTime}〜 ${locName}）に切り替えました！新しい場所の予約を行ってください。`
        );
      }
    } else {
      if (
        confirm(
          "これ以上の代替候補がありません。\nステータスを「回答受付中」に戻して、候補日の追加やメンバーの再回答を受け付けますか？"
        )
      ) {
        updateEventStatus(event.id, "open");
        alert("ステータスを「回答受付中」に戻しました。メンバーに再調整を呼びかけてください。");
      }
    }
  };

  // 削除ハンドラ
  const handleDelete = () => {
    if (confirm("この日程調整を削除しますか？回答データも削除されます。")) {
      deleteEvent(event.id);
      router.push("/events");
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* 戻るリンク */}
      <Link
        href="/events"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
      >
        <ArrowLeft className="w-4 h-4" />
        日程調整一覧へ
      </Link>

      {/* メインヘッダーカード */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs p-6 sm:p-8 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              {event.status === "open" && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300">
                  回答受付中
                </span>
              )}
              {event.status === "aggregated" && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-950/70 text-blue-800 dark:text-blue-300">
                  集計完了
                </span>
              )}
              {event.status === "booking_pending" && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 animate-pulse">
                  <Hourglass className="w-3.5 h-3.5" />
                  予約待ち
                </span>
              )}
              {event.status === "confirmed" && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  確定済み
                </span>
              )}
              {event.status === "completed" && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                  <Clock className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                  練習終了
                </span>
              )}

              <span className="text-xs text-slate-500 dark:text-slate-400">
                幹事: <strong className="text-slate-700 dark:text-slate-300">{organizer?.nickname || organizer?.id}</strong>
                {isOrganizer && (
                  <span className="ml-1 text-[10px] bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.2 rounded font-bold">
                    あなた
                  </span>
                )}
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
              {event.title}
            </h1>

            {event.description && (
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap">
                {event.description}
              </p>
            )}
          </div>

          {/* アクションボタン */}
          <div className="flex flex-col sm:items-end gap-2 shrink-0">
            {event.status === "open" ? (
              <Link
                href={`/events/${event.id}/respond`}
                className={`px-5 py-2.5 rounded-xl font-bold text-xs shadow-xs transition-colors inline-flex items-center gap-1.5 ${
                  myResponse
                    ? "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700"
                    : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200"
                }`}
              >
                <Edit3 className="w-4 h-4" />
                {myResponse ? "自分の回答を変更する" : "日程・場所を回答する"}
              </Link>
            ) : event.status === "booking_pending" ? (
              <div className="flex flex-col sm:items-end gap-1.5">
                <span className="px-3.5 py-1.5 rounded-xl bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 font-bold text-xs inline-flex items-center gap-1.5 border border-amber-300 dark:border-amber-800">
                  <Hourglass className="w-3.5 h-3.5" />
                  練習場所予約待ち
                </span>
                {isOrganizer && confirmedSlots.length > 0 && (
                  <button
                    type="button"
                    onClick={handleConfirmBooking}
                    className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all inline-flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    予約確定 (全日程を確定済みにする)
                  </button>
                )}
              </div>
            ) : event.status === "aggregated" ? (
              <div className="flex flex-col sm:items-end gap-1.5">
                {isOrganizer ? (
                  <button
                    type="button"
                    onClick={handleOpenConfirmModal}
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-200 transition-colors inline-flex items-center gap-1.5"
                  >
                    <Sparkles className="w-4 h-4" />
                    確定日程を決定する (複数日程対応)
                  </button>
                ) : (
                  <span className="px-4 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold text-xs inline-flex items-center gap-1.5 border border-blue-200 dark:border-blue-800">
                    <Hourglass className="w-4 h-4" />
                    幹事の日程確定待ち
                  </span>
                )}
              </div>
            ) : (
              <div className="text-right">
                <span className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold text-xs inline-flex items-center gap-1.5 border border-slate-200 dark:border-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  {event.status === "completed"
                    ? "練習終了 (受付終了)"
                    : "日程確定済み (回答締切)"}
                </span>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">回答・回答変更は締め切られました</p>
              </div>
            )}

            {event.status === "open" && (
              <span className="text-[11px] text-slate-400 dark:text-slate-500">
                {myResponse
                  ? `回答済 (${myResponse.canAttend ? "参加可能" : "不参加"})`
                  : "まだ回答していません"}
              </span>
            )}
          </div>
        </div>

        {/* 条件グリッド */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
            <span className="text-slate-500 dark:text-slate-400 block text-[11px]">練習時間</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">
              {Math.floor(event.durationMinutes / 60)}時間
              {event.durationMinutes % 60 > 0 && `${event.durationMinutes % 60}分`}
            </span>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
            <span className="text-slate-500 dark:text-slate-400 block text-[11px]">指定方式</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">
              {event.dateType === "candidate" ? "候補日指定" : "期間指定"}
            </span>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl col-span-2 flex items-center justify-between">
            <div>
              <span className="text-slate-500 dark:text-slate-400 block text-[11px]">回答期限</span>
              <span className="font-bold text-amber-700 dark:text-amber-400">
                {new Date(event.deadline).toLocaleString("ja-JP", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            {isOrganizer && event.status === "open" && (
              <button
                type="button"
                onClick={handleOpenDeadlineModal}
                className="text-[11px] px-2.5 py-1 bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 hover:bg-amber-200 rounded-lg font-bold transition-colors inline-flex items-center gap-1"
              >
                <Clock className="w-3 h-3" />
                期限変更
              </button>
            )}
          </div>
        </div>

        {/* 確定済み・予約待ち・練習終了の場合のハイライトカード（複数日程対応） */}
        {(event.status === "confirmed" || event.status === "completed" || event.status === "booking_pending") &&
          confirmedSlots.length > 0 && (
            <div
              className={`p-5 rounded-2xl border space-y-4 ${
                event.status === "completed"
                  ? "bg-slate-50 dark:bg-slate-800/80 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                  : event.status === "booking_pending"
                  ? "bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/50 dark:to-orange-950/50 border-amber-300 dark:border-amber-800 text-amber-950 dark:text-amber-200"
                  : "bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/50 dark:to-teal-950/50 border-emerald-200 dark:border-emerald-800 text-emerald-950 dark:text-emerald-200"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div
                  className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider ${
                    event.status === "completed"
                      ? "text-slate-700 dark:text-slate-300"
                      : event.status === "booking_pending"
                      ? "text-amber-800 dark:text-amber-300"
                      : "text-emerald-800 dark:text-emerald-300"
                  }`}
                >
                  {event.status === "completed" ? (
                    <CheckCircle2 className="w-4 h-4 text-slate-500" />
                  ) : event.status === "booking_pending" ? (
                    <Hourglass className="w-4 h-4 text-amber-600 dark:text-amber-400 animate-pulse" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  )}
                  {event.status === "completed"
                    ? `練習終了 (実施記録 - 全${confirmedSlots.length}日程)`
                    : event.status === "booking_pending"
                    ? `予約待ちの練習日程・場所 (全${confirmedSlots.length}日程)`
                    : `確定した練習日程・場所 (全${confirmedSlots.length}日程)`}
                </div>

                {/* 予約待ち状態で幹事の場合の全体予約確定ボタン */}
                {event.status === "booking_pending" && isOrganizer && (
                  <button
                    type="button"
                    onClick={handleConfirmBooking}
                    className="px-4 py-1.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all inline-flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    全日程の予約確定 (確定済みにする)
                  </button>
                )}
              </div>

              {/* 確定スロット一覧 */}
              <div className="space-y-3">
                {confirmedSlots.map((slot, idx) => {
                  const loc = locations.find((l) => l.id === slot.locationId);
                  return (
                    <div
                      key={slot.id}
                      className="bg-white/90 dark:bg-slate-900/90 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                            第{idx + 1}練習日
                          </span>
                          <span className="text-base font-bold text-slate-900 dark:text-slate-100">
                            {slot.date} {slot.startTime} 〜 {slot.endTime}
                          </span>
                        </div>

                        {/* 個別予約アクション (予約待ち & 幹事) */}
                        {event.status === "booking_pending" && isOrganizer && (
                          <div className="flex items-center gap-2">
                            {loc?.reservationUrl && (
                              <a
                                href={formatWebUrl(loc.reservationUrl)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1"
                              >
                                <Globe className="w-3.5 h-3.5" />
                                予約サイトを開く
                              </a>
                            )}
                            <button
                              type="button"
                              onClick={() => handleMarkSlotBookingFailed(slot.id)}
                              className="px-3 py-1 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1"
                              title="この練習枠の予約が取れなかった場合、次点候補へ繰り上げます"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              予約不可 (次点へ繰上)
                            </button>
                          </div>
                        )}
                      </div>

                      {/* 場所表示 */}
                      <div className="text-xs flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                        <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        場所:{" "}
                        {loc ? (
                          <span className="inline-flex items-center gap-2">
                            <Link
                              href={`/locations?select=${loc.id}`}
                              className="font-bold underline hover:text-indigo-600 dark:hover:text-indigo-400 inline-flex items-center gap-1"
                              title="クリックしてGoogle Mapで場所を確認"
                            >
                              {loc.name}
                              <ExternalLink className="w-3 h-3" />
                            </Link>
                            {loc.reservationUrl && (
                              <a
                                href={formatWebUrl(loc.reservationUrl)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-emerald-600 dark:text-emerald-400 hover:underline font-bold inline-flex items-center gap-0.5 text-[11px]"
                              >
                                <Globe className="w-3 h-3" />
                                予約サイト
                              </a>
                            )}
                          </span>
                        ) : (
                          <strong className="font-bold">未定</strong>
                        )}
                      </div>

                      {/* 参加メンバー一覧 */}
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-slate-300 flex-wrap gap-1">
                          <span>
                            参加可能メンバー: {slot.attendeeCount} 名 / {users.length} 名
                          </span>
                          <span className="text-slate-500 dark:text-slate-400 font-normal">
                            (フル参加: {slot.fullAttendeeUserIds?.length ?? slot.attendeeCount}名
                            {slot.partialAttendeeUserIds && slot.partialAttendeeUserIds.length > 0 && (
                              <span className="font-bold text-amber-700 dark:text-amber-300 ml-1">
                                / 途中参加: {slot.partialAttendeeUserIds.length}名
                              </span>
                            )})
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                          {slot.attendeeUserIds.map((userId) => {
                            const u = users.find((usr) => usr.id === userId);
                            const detail = slot.attendeeDetails?.[userId];
                            const isFull = !detail || detail.type === "full";
                            const isLate = detail?.type === "late";
                            const isEarly = detail?.type === "early";
                            const isPartial = detail?.type === "partial";

                            return (
                              <span
                                key={userId}
                                className={`text-xs px-2.5 py-0.5 rounded-lg font-medium inline-flex items-center gap-1.5 border shadow-2xs ${
                                  isFull
                                    ? "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                                    : isLate
                                    ? "bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800 text-amber-950 dark:text-amber-200"
                                    : isEarly
                                    ? "bg-sky-50 dark:bg-sky-950/60 border-sky-300 dark:border-sky-800 text-sky-950 dark:text-sky-200"
                                    : "bg-purple-50 dark:bg-purple-950/60 border-purple-300 dark:border-purple-800 text-purple-950 dark:text-purple-200"
                                }`}
                              >
                                <span>{u?.nickname || userId}</span>
                                {userId === currentUser?.id && (
                                  <span className="text-indigo-600 dark:text-indigo-400 text-[10px] font-bold">
                                    (あなた)
                                  </span>
                                )}
                                {!isFull && detail && (
                                  <span
                                    className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                                      isLate
                                        ? "bg-amber-200/70 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200"
                                        : isEarly
                                        ? "bg-sky-200/70 dark:bg-sky-900/60 text-sky-900 dark:text-sky-200"
                                        : "bg-purple-200/70 dark:bg-purple-900/60 text-purple-900 dark:text-purple-200"
                                    }`}
                                  >
                                    {isLate && `${detail.overlapStart}〜遅刻`}
                                    {isEarly && `〜${detail.overlapEnd}早退`}
                                    {isPartial && `${detail.overlapStart}〜${detail.overlapEnd}`}
                                  </span>
                                )}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
      </div>

      {/* 幹事用管理パネル（幹事のみ表示） */}
      {isOrganizer && (
        <div className="bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-900 dark:text-amber-200">
              <Settings className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              幹事用管理メニュー
            </div>
            <span className="text-[11px] text-amber-700 dark:text-amber-400">あなたはこの日程調整の幹事です</span>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            {/* 回答期限変更ボタン */}
            <button
              type="button"
              onClick={handleOpenDeadlineModal}
              className="px-4 py-2 bg-white dark:bg-slate-800 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5"
            >
              <Clock className="w-3.5 h-3.5" />
              回答期限を変更する
            </button>

            {/* 回答受付中の幹事アクション */}
            {event.status === "open" && (
              <button
                type="button"
                onClick={handleOpenConfirmModal}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors inline-flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                回答受付を終了し、候補枠を集計・日程確定へ
              </button>
            )}

            {/* 集計完了時の幹事アクション */}
            {event.status === "aggregated" && (
              <button
                type="button"
                onClick={handleOpenConfirmModal}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors inline-flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                確定日程を決定する (複数日程対応)
              </button>
            )}

            {/* 回答受付中に戻すアクション */}
            {(event.status === "aggregated" ||
              event.status === "booking_pending" ||
              event.status === "confirmed") && (
              <button
                type="button"
                onClick={() => {
                  if (
                    confirm(
                      "ステータスを「回答受付中」に戻しますか？\n（確定日程がリセットされ、メンバーが再び回答できるようになります）"
                    )
                  ) {
                    updateEventStatus(event.id, "open");
                  }
                }}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors inline-flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                回答受付中に戻す (再調整)
              </button>
            )}

            <button
              type="button"
              onClick={handleDelete}
              className="px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900 rounded-xl text-xs font-semibold transition-colors inline-flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              この日程調整を削除
            </button>
          </div>
        </div>
      )}

      {/* メンバー回答状況セクション (全員公開) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <div>
              <h2 className="font-bold text-base text-slate-900 dark:text-slate-100">
                メンバー回答状況 ({eventResponses.length} / {users.length} 名)
              </h2>
              <span className="text-xs text-slate-400 dark:text-slate-500">全員にリアルタイムで公開されています</span>
            </div>
          </div>

          {/* ビュー切り替えタブ（タイムライン ⇄ リスト） */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl self-start sm:self-auto border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setViewMode("timeline")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1.5 ${
                viewMode === "timeline"
                  ? "bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-2xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              タイムライン並列
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1.5 ${
                viewMode === "list"
                  ? "bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-2xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              <List className="w-3.5 h-3.5" />
              一覧リスト
            </button>
          </div>
        </div>

        {/* タイムライン並列ビュー */}
        {viewMode === "timeline" ? (
          <ScheduleTimeline
            event={event}
            responses={eventResponses}
            users={users}
            locations={locations}
          />
        ) : (
          /* 従来のリスト表示 */
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {users.map((member) => {
              const res = eventResponses.find((r) => r.userId === member.id);

              return (
                <div key={member.id} className="py-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-xs font-bold text-slate-700 dark:text-slate-300">
                        {member.nickname.slice(0, 1)}
                      </div>
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        {member.nickname}
                      </span>
                      {member.id === currentUser?.id && (
                        <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.2 rounded font-bold">
                          あなた
                        </span>
                      )}
                    </div>

                    <div>
                      {!res ? (
                        <span className="text-xs font-medium text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700">
                          未回答
                        </span>
                      ) : res.canAttend ? (
                        <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800 inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          参加可能
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700 inline-flex items-center gap-1">
                          <XCircle className="w-3.5 h-3.5 text-slate-400" />
                          不参加
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 回答詳細（参加可能の場合の時間帯・場所リンク） */}
                  {res && res.canAttend && res.timeSlots.length > 0 && (
                    <div className="pl-9 space-y-1.5">
                      {res.timeSlots.map((slot) => (
                        <div
                          key={slot.id}
                          className="text-xs bg-slate-50/80 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-700/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5"
                        >
                          <div className="flex items-center gap-2 font-medium text-slate-800 dark:text-slate-200">
                            <Calendar className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                            <span>{slot.date}</span>
                            <Clock className="w-3.5 h-3.5 text-slate-400 ml-1" />
                            <span>
                              {slot.startTime} 〜 {slot.endTime}
                            </span>
                          </div>

                          {/* 利用可能場所 */}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                            {slot.locations.map((loc) => {
                              const locationObj = locations.find((l) => l.id === loc.locationId);
                              return (
                                <Link
                                  key={loc.locationId}
                                  href={`/locations?select=${loc.locationId}`}
                                  className="text-[11px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 px-2 py-0.5 rounded text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors inline-flex items-center gap-1"
                                  title="クリックして場所とGoogle Mapを確認"
                                >
                                  {locationObj?.name || "練習場所"}
                                  {loc.priorityRank && (
                                    <span className="text-indigo-600 dark:text-indigo-400 font-bold ml-0.5">
                                      (第{loc.priorityRank}希望)
                                    </span>
                                  )}
                                </Link>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* メモ */}
                  {res && res.memo && (
                    <div className="pl-9 text-xs text-slate-500 dark:text-slate-400 italic">
                      コメント: 「{res.memo}」
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 回答期限変更モーダル */}
      {isDeadlineModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 space-y-5 border border-slate-200 dark:border-slate-800 shadow-xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  回答期限の変更
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsDeadlineModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDeadline} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  新しい回答期限（日時）
                </label>
                <input
                  type="datetime-local"
                  required
                  value={editDeadlineInput}
                  onChange={(e) => setEditDeadlineInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  期限を変更すると、Discordのリマインド通知予定日も新しい期限に合わせて更新されます。
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDeadlineModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors"
                >
                  回答期限を保存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 複数日程確定モーダル */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full p-6 space-y-5 border border-slate-200 dark:border-slate-800 shadow-xl my-8 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    確定日程を決定する（複数日程対応）
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    確定したい練習日数を選び、候補枠から決定する日程を選択してください。
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 確定日数セレクター */}
            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  確定する練習日数
                </label>
                <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                  選択中: {selectedSlotIds.length} 日 / 目標: {targetDaysCount} 日
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {[1, 2, 3, 4, 5].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handleChangeDaysCount(num)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      targetDaysCount === num
                        ? "bg-indigo-600 text-white shadow-xs shadow-indigo-200"
                        : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-indigo-400"
                    }`}
                  >
                    {num}日分
                  </button>
                ))}
              </div>
            </div>

            {/* 候補スロット一覧 */}
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                候補枠一覧（参加可能人数の多い順）
              </label>
              {eventCandidates.length === 0 ? (
                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl text-center text-xs text-slate-500">
                  集計された候補枠がまだありません。
                </div>
              ) : (
                eventCandidates.map((slot, index) => {
                  const loc = locations.find((l) => l.id === slot.locationId);
                  const isChecked = selectedSlotIds.includes(slot.id);

                  return (
                    <div
                      key={slot.id}
                      onClick={() => handleToggleSlotSelection(slot.id)}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                        isChecked
                          ? "bg-indigo-50/80 dark:bg-indigo-950/60 border-indigo-500 dark:border-indigo-500 shadow-2xs"
                          : "bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}} // onClick on parent handles toggle
                        className="mt-1 h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-600 cursor-pointer"
                      />
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                            <span className="text-[10px] px-1.5 py-0.2 rounded font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                              第{index + 1}候補
                            </span>
                            {slot.date} {slot.startTime} 〜 {slot.endTime}
                          </span>
                          <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                            {slot.attendeeCount} 名 参加可能
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-600 dark:text-slate-400 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
                          <span>{loc?.name || "未定"}</span>
                          {slot.partialAttendeeUserIds && slot.partialAttendeeUserIds.length > 0 && (
                            <span className="text-amber-700 dark:text-amber-400 ml-2">
                              (フル: {slot.fullAttendeeUserIds?.length ?? slot.attendeeCount}名 / 途中: {slot.partialAttendeeUserIds.length}名)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* モーダル下部アクション */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {selectedSlotIds.length} 日分の日程を選択中
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsConfirmModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  キャンセル
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSelectedSlots}
                  disabled={selectedSlotIds.length === 0}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white shadow-xs transition-colors"
                >
                  選択した {selectedSlotIds.length} 日分で決定 (予約待ちへ)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
