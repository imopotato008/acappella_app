"use client";

import { useState } from "react";
import Link from "next/link";
import { useApp } from "@/context/AppContext";
import {
  Calendar,
  CheckCircle2,
  Clock,
  Filter,
  Plus,
  Users,
  Vote,
} from "lucide-react";
import { EventStatus } from "@/types";

export default function EventsListPage() {
  const { events, users, responses, currentUser } = useApp();
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const filteredEvents = events.filter((ev) => {
    if (filterStatus === "all") return true;
    if (filterStatus === "open") return ev.status === "open";
    if (filterStatus === "voting") return ev.status === "voting";
    if (filterStatus === "confirmed") return ev.status === "confirmed";
    if (filterStatus === "completed") return ev.status === "completed";
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* ページタイトル & 新規作成ボタン */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Calendar className="w-6 h-6 text-indigo-600" />
            日程調整一覧
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            バンドメンバー全員で参加できる練習日程と場所を調整・決定します。
          </p>
        </div>

        <Link
          href="/events/new"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          新しい日程調整を作成
        </Link>
      </div>

      {/* フィルタタブ */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 overflow-x-auto">
        <Filter className="w-4 h-4 text-slate-400 mr-1 shrink-0" />
        {[
          { id: "all", label: "すべて" },
          { id: "open", label: "回答受付中" },
          { id: "voting", label: "最終投票中" },
          { id: "confirmed", label: "確定済み" },
          { id: "completed", label: "練習終了" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilterStatus(tab.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              filterStatus === tab.id
                ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* イベントカード一覧 */}
      {filteredEvents.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
          <Calendar className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="font-bold text-slate-700 text-base">該当する日程調整はありません</h3>
          <p className="text-xs text-slate-500">条件を変えて試すか、新しい日程調整を作成してください。</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredEvents.map((event) => {
            const organizer = users.find((u) => u.id === event.organizerId);
            const eventResponses = responses.filter((r) => r.eventId === event.id);
            const myResponse = currentUser
              ? eventResponses.find((r) => r.userId === currentUser.id)
              : undefined;

            return (
              <div
                key={event.id}
                className="bg-white rounded-2xl border border-slate-200/90 hover:border-indigo-300 p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    {/* ステータスバッジ */}
                    {event.status === "open" && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                        回答受付中
                      </span>
                    )}
                    {event.status === "voting" && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800">
                        <Vote className="w-3 h-3" />
                        最終投票中
                      </span>
                    )}
                    {event.status === "confirmed" && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                        <CheckCircle2 className="w-3 h-3" />
                        確定済み
                      </span>
                    )}
                    {event.status === "completed" && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-200 text-slate-800">
                        <Clock className="w-3 h-3 text-slate-600" />
                        練習終了
                      </span>
                    )}
                    {event.status === "aggregated" && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                        集計完了
                      </span>
                    )}

                    <span className="text-xs text-slate-400">
                      幹事: <strong className="text-slate-600 font-medium">{organizer?.nickname || event.organizerId}</strong>
                    </span>
                  </div>

                  <h2 className="text-lg font-bold text-slate-900 hover:text-indigo-600 transition-colors">
                    <Link href={`/events/${event.id}`}>{event.title}</Link>
                  </h2>

                  {event.description && (
                    <p className="text-xs text-slate-600 line-clamp-2">
                      {event.description}
                    </p>
                  )}

                  {/* 条件メタ情報 */}
                  <div className="grid grid-cols-2 gap-2 pt-2 text-xs text-slate-600 border-t border-slate-100">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      練習時間: {Math.floor(event.durationMinutes / 60)}時間
                      {event.durationMinutes % 60 > 0 && `${event.durationMinutes % 60}分`}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      方式: {event.dateType === "candidate" ? "候補日指定" : "期間指定"}
                    </div>
                    <div className="col-span-2 flex items-center gap-1.5 text-amber-700 bg-amber-50/70 p-2 rounded-lg">
                      <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      回答期限: {new Date(event.deadline).toLocaleDateString("ja-JP", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                </div>

                {/* フッター：回答状況 & リンク */}
                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-slate-400" />
                    <span className="text-xs font-medium text-slate-700">
                      回答: {eventResponses.length} / {users.length} 名
                    </span>
                    {myResponse ? (
                      <span className="text-[11px] text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded-full">
                        回答済 ({myResponse.canAttend ? "参加可能" : "不参加"})
                      </span>
                    ) : (
                      <span className="text-[11px] text-amber-600 font-medium bg-amber-50 px-2 py-0.5 rounded-full">
                        未回答
                      </span>
                    )}
                  </div>

                  <Link
                    href={`/events/${event.id}`}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
                  >
                    詳細へ &rarr;
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

