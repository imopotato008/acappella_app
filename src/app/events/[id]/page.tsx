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
  LayoutGrid,
  List,
  MapPin,
  RefreshCw,
  Settings,
  Trash2,
  UserCheck,
  Users,
  Vote,
  XCircle,
} from "lucide-react";
import { EventStatus } from "@/types";
import { ScheduleTimeline } from "@/components/ScheduleTimeline";

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
  } = useApp();

  const [viewMode, setViewMode] = useState<"timeline" | "list">("timeline");

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

  // 確定候補
  const eventCandidates = candidateSlots[event.id] || [];
  const confirmedSlot = eventCandidates.find((c) => c.id === event.confirmedCandidateId);
  const confirmedLocation = confirmedSlot
    ? locations.find((l) => l.id === confirmedSlot.locationId)
    : null;

  // 集計実行ハンドラ（幹事用）
  const handleRunAggregation = () => {
    const result = calculateAggregation(event.id);
    if (result.autoConfirmed) {
      alert("集計が完了しました！最大人数の候補が1件のため、自動確定しました。");
    } else if (result.candidates.length > 1) {
      alert(
        `集計が完了しました！最大人数（${result.maxAttendeeCount}名）の候補が${result.candidates.length}件あるため、最終投票を開始します。`
      );
      router.push(`/events/${event.id}/vote`);
    } else {
      alert("参加条件を満たす候補が見つかりませんでした。回答内容をご確認ください。");
    }
  };

  // 削除ハンドラ
  const handleDelete = () => {
    if (confirm("この日程調整を削除しますか？回答データも削除されます。")) {
      deleteEvent(event.id);
      router.push("/events");
    }
  };

  function getStatusLabel(s: EventStatus): string {
    switch (s) {
      case "open":
        return "回答受付中";
      case "aggregated":
        return "集計完了";
      case "voting":
        return "最終投票中";
      case "confirmed":
        return "確定済み";
      case "completed":
        return "練習終了";
      case "cancelled":
        return "中止";
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* 戻るリンク */}
      <Link
        href="/events"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800"
      >
        <ArrowLeft className="w-4 h-4" />
        日程調整一覧へ
      </Link>

      {/* メインヘッダーカード */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 sm:p-8 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              {event.status === "open" && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                  回答受付中
                </span>
              )}
              {event.status === "voting" && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 animate-pulse">
                  <Vote className="w-3.5 h-3.5" />
                  最終投票受付中
                </span>
              )}
              {event.status === "confirmed" && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  確定済み
                </span>
              )}
              {event.status === "completed" && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-200 text-slate-800">
                  <Clock className="w-3.5 h-3.5 text-slate-600" />
                  練習終了
                </span>
              )}
              {event.status === "aggregated" && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                  集計完了
                </span>
              )}

              <span className="text-xs text-slate-500">
                幹事: <strong className="text-slate-700">{organizer?.nickname || organizer?.id}</strong>
                {isOrganizer && (
                  <span className="ml-1 text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.2 rounded font-bold">
                    あなた
                  </span>
                )}
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
              {event.title}
            </h1>

            {event.description && (
              <p className="text-xs sm:text-sm text-slate-600 whitespace-pre-wrap">
                {event.description}
              </p>
            )}
          </div>

          {/* アクションボタン（回答は open の時だけ！） */}
          <div className="flex flex-col sm:items-end gap-2 shrink-0">
            {event.status === "open" ? (
              <Link
                href={`/events/${event.id}/respond`}
                className={`px-5 py-2.5 rounded-xl font-bold text-xs shadow-xs transition-colors inline-flex items-center gap-1.5 ${myResponse
                  ? "bg-slate-100 text-slate-800 hover:bg-slate-200 border border-slate-300"
                  : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200"
                  }`}
              >
                <Edit3 className="w-4 h-4" />
                {myResponse ? "自分の回答を変更する" : "日程・場所を回答する"}
              </Link>
            ) : event.status === "voting" ? (
              <Link
                href={`/events/${event.id}/vote`}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-200 transition-colors inline-flex items-center gap-1.5"
              >
                <Vote className="w-4 h-4" />
                最終投票画面へ進む
              </Link>
            ) : (
              <div className="text-right">
                <span className="px-4 py-2 rounded-xl bg-slate-100 text-slate-500 font-bold text-xs inline-flex items-center gap-1.5 border border-slate-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  {event.status === "completed"
                    ? "練習終了 (受付終了)"
                    : event.status === "confirmed"
                      ? "日程確定済み (回答締切)"
                      : "集計完了 (回答締切)"}
                </span>
                <p className="text-[10px] text-slate-400 mt-1">回答・回答変更は締め切られました</p>
              </div>
            )}

            {event.status === "open" && (
              <span className="text-[11px] text-slate-400">
                {myResponse
                  ? `回答済 (${myResponse.canAttend ? "参加可能" : "不参加"})`
                  : "まだ回答していません"}
              </span>
            )}
          </div>
        </div>

        {/* 条件グリッド */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-100 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl">
            <span className="text-slate-500 block text-[11px]">練習時間</span>
            <span className="font-bold text-slate-800">
              {Math.floor(event.durationMinutes / 60)}時間
              {event.durationMinutes % 60 > 0 && `${event.durationMinutes % 60}分`}
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl">
            <span className="text-slate-500 block text-[11px]">指定方式</span>
            <span className="font-bold text-slate-800">
              {event.dateType === "candidate" ? "候補日指定" : "期間指定"}
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl col-span-2">
            <span className="text-slate-500 block text-[11px]">回答期限</span>
            <span className="font-bold text-amber-700">
              {new Date(event.deadline).toLocaleString("ja-JP", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        </div>

        {/* 確定済み・練習終了の場合のハイライトカード */}
        {(event.status === "confirmed" || event.status === "completed") && confirmedSlot && (
          <div className={`p-5 rounded-2xl border space-y-3 ${event.status === "completed"
            ? "bg-slate-50 border-slate-300"
            : "bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200"
            }`}>
            <div className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider ${event.status === "completed" ? "text-slate-700" : "text-emerald-800"
              }`}>
              <CheckCircle2 className={`w-4 h-4 ${event.status === "completed" ? "text-slate-500" : "text-emerald-600"}`} />
              {event.status === "completed" ? "練習終了 (実施記録)" : "確定した練習日程・場所"}
            </div>
            <div className="text-lg font-bold text-emerald-950">
              {confirmedSlot.date} {confirmedSlot.startTime} 〜 {confirmedSlot.endTime}
            </div>
            <div className="text-xs text-emerald-800 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              場所:{" "}
              {confirmedLocation ? (
                <Link
                  href={`/locations?select=${confirmedLocation.id}`}
                  className="font-bold underline hover:text-emerald-900 inline-flex items-center gap-1"
                  title="クリックしてGoogle Mapで場所を確認"
                >
                  {confirmedLocation.name}
                  <ExternalLink className="w-3 h-3" />
                </Link>
              ) : (
                <strong className="font-bold">未定</strong>
              )}
            </div>

            {/* 参加メンバー一覧（フル参加・途中参加のバッジ） */}
            <div className="pt-2 border-t border-emerald-200/60 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold text-emerald-900 flex-wrap gap-1">
                <span>
                  参加可能メンバー: {confirmedSlot.attendeeCount} 名 / {users.length} 名
                </span>
                <span className="text-emerald-800/80 font-normal">
                  (フル参加: {confirmedSlot.fullAttendeeUserIds?.length ?? confirmedSlot.attendeeCount}名
                  {confirmedSlot.partialAttendeeUserIds && confirmedSlot.partialAttendeeUserIds.length > 0 && (
                    <span className="font-bold text-amber-800 ml-1">
                      / 途中参加: {confirmedSlot.partialAttendeeUserIds.length}名
                    </span>
                  )})
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {confirmedSlot.attendeeUserIds.map((userId) => {
                  const u = users.find((usr) => usr.id === userId);
                  const detail = confirmedSlot.attendeeDetails?.[userId];
                  const isFull = !detail || detail.type === "full";
                  const isLate = detail?.type === "late";
                  const isEarly = detail?.type === "early";
                  const isPartial = detail?.type === "partial";

                  return (
                    <span
                      key={userId}
                      className={`text-xs px-2.5 py-0.5 rounded-lg font-medium inline-flex items-center gap-1.5 border shadow-2xs ${isFull
                        ? "bg-white/90 border-emerald-200 text-emerald-950"
                        : isLate
                          ? "bg-amber-50 border-amber-300 text-amber-950"
                          : isEarly
                            ? "bg-sky-50 border-sky-300 text-sky-950"
                            : "bg-purple-50 border-purple-300 text-purple-950"
                        }`}
                    >
                      <span>{u?.nickname || userId}</span>
                      {userId === currentUser?.id && (
                        <span className="text-emerald-700 text-[10px] font-bold">
                          (あなた)
                        </span>
                      )}
                      {!isFull && detail && (
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${isLate
                            ? "bg-amber-200/70 text-amber-900"
                            : isEarly
                              ? "bg-sky-200/70 text-sky-900"
                              : "bg-purple-200/70 text-purple-900"
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
        )}
      </div>

      {/* 幹事用管理パネル（幹事のみ表示） */}
      {isOrganizer && (
        <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
              <Settings className="w-4 h-4 text-amber-600" />
              幹事用管理メニュー
            </div>
            <span className="text-[11px] text-amber-700">あなたはこの日程調整の幹事です</span>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            {/* 回答受付中の幹事アクション */}
            {event.status === "open" && (
              <button
                onClick={handleRunAggregation}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
              >
                回答受付を終了し、集計を実行する
              </button>
            )}

            {/* 集計完了・最終投票中・確定済みの幹事アクション: 回答受付中に戻す */}
            {(event.status === "aggregated" || event.status === "voting" || event.status === "confirmed") && (
              <button
                onClick={() => {
                  if (confirm("ステータスを「回答受付中」に戻しますか？\n（確定や投票データがリセットされ、メンバーが再び回答できるようになります）")) {
                    updateEventStatus(event.id, "open");
                  }
                }}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors inline-flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                回答受付中に戻す (再調整)
              </button>
            )}

            {(event.status === "voting" || event.status === "aggregated") && (
              <Link
                href={`/events/${event.id}/vote`}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
              >
                最終投票の状況を確認
              </Link>
            )}

            <button
              onClick={handleDelete}
              className="px-3.5 py-2 bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 rounded-xl text-xs font-semibold transition-colors inline-flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              この日程調整を削除
            </button>
          </div>
        </div>
      )}

      {/* メンバー回答状況セクション (全員公開) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            <div>
              <h2 className="font-bold text-base text-slate-900">
                メンバー回答状況 ({eventResponses.length} / {users.length} 名)
              </h2>
              <span className="text-xs text-slate-400">全員にリアルタイムで公開されています</span>
            </div>
          </div>

          {/* ビュー切り替えタブ（Outlook風タイムライン ⇄ リスト） */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl self-start sm:self-auto border border-slate-200">
            <button
              type="button"
              onClick={() => setViewMode("timeline")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1.5 ${viewMode === "timeline"
                ? "bg-white text-indigo-700 shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
                }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              タイムライン並列
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1.5 ${viewMode === "list"
                ? "bg-white text-indigo-700 shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
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
          <div className="divide-y divide-slate-100">
            {users.map((member) => {
              const res = eventResponses.find((r) => r.userId === member.id);

              return (
                <div key={member.id} className="py-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-700">
                        {member.nickname.slice(0, 1)}
                      </div>
                      <span className="text-xs font-bold text-slate-900">
                        {member.nickname}
                      </span>
                      {member.id === currentUser?.id && (
                        <span className="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.2 rounded font-bold">
                          あなた
                        </span>
                      )}
                    </div>

                    <div>
                      {!res ? (
                        <span className="text-xs font-medium text-slate-400 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-200">
                          未回答
                        </span>
                      ) : res.canAttend ? (
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          参加可能
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200 inline-flex items-center gap-1">
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
                          className="text-xs bg-slate-50/80 p-2.5 rounded-xl border border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5"
                        >
                          <div className="flex items-center gap-2 font-medium text-slate-800">
                            <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                            <span>{slot.date}</span>
                            <Clock className="w-3.5 h-3.5 text-slate-400 ml-1" />
                            <span>
                              {slot.startTime} 〜 {slot.endTime}
                            </span>
                          </div>

                          {/* 利用可能場所（クリックで練習場所一覧の該当マップへジャンプ！） */}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                            {slot.locations.map((loc) => {
                              const locationObj = locations.find((l) => l.id === loc.locationId);
                              return (
                                <Link
                                  key={loc.locationId}
                                  href={`/locations?select=${loc.locationId}`}
                                  className="text-[11px] bg-white border border-slate-200 hover:border-indigo-400 px-2 py-0.5 rounded text-slate-700 hover:text-indigo-600 transition-colors inline-flex items-center gap-1"
                                  title="クリックして場所とGoogle Mapを確認"
                                >
                                  {locationObj?.name || "練習場所"}
                                  {loc.priorityRank && (
                                    <span className="text-indigo-600 font-bold ml-0.5">
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
                    <div className="pl-9 text-xs text-slate-500 italic">
                      コメント: 「{res.memo}」
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
