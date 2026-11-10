"use client";

import Link from "next/link";
import { useApp } from "@/context/AppContext";
import {
  Calendar,
  CheckCircle2,
  Clock,
  MapPin,
  Plus,
  Sparkles,
  Users,
  Vote,
} from "lucide-react";

export default function DashboardPage() {
  const { currentUser, events, responses, users, locations } = useApp();

  if (!currentUser) return null;

  // 進行中の日程調整
  const activeEvents = events.filter(
    (e) => e.status === "open" || e.status === "voting" || e.status === "aggregated"
  );

  // 確定した練習
  const confirmedEvents = events.filter((e) => e.status === "confirmed");

  // 終了した練習 (過去の記録)
  const completedEvents = events.filter((e) => e.status === "completed");

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* ヒーローセクション */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-900 via-indigo-800 to-violet-900 text-white p-6 sm:p-8 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-white/10 backdrop-blur border border-white/20 text-indigo-200">
              <Sparkles className="w-3.5 h-3.5" />
              アカペラバンド運営ポータル
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              こんにちは、{currentUser.nickname} さん
            </h1>
            <p className="text-sm text-indigo-200 max-w-xl">
              {currentUser.bio || "練習日程の回答や投票、練習場所の管理を一元化しましょう。"}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/events/new"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-indigo-900 font-semibold text-sm hover:bg-indigo-50 shadow-md transition-all hover:scale-[1.02]"
            >
              <Plus className="w-4 h-4" />
              新しい日程調整を作る
            </Link>
            <Link
              href="/locations"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/15 text-white font-medium text-sm hover:bg-white/20 border border-white/20 backdrop-blur transition-colors"
            >
              <MapPin className="w-4 h-4" />
              練習場所・Map一覧
            </Link>
          </div>
        </div>
      </div>

      {/* メイングリッド */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 左側2カラム：日程調整セクション */}
        <div className="lg:col-span-2 space-y-8">
          {/* 進行中の日程調整 */}
          <section className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-bold text-lg text-slate-900">
                    進行中の日程調整
                  </h2>
                  <p className="text-xs text-slate-500">回答の提出・集計・最終投票</p>
                </div>
              </div>
              <Link
                href="/events"
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
              >
                すべて見る &rarr;
              </Link>
            </div>

            {activeEvents.length === 0 ? (
              <div className="text-center py-10 bg-slate-50/70 rounded-xl border border-dashed border-slate-200">
                <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-600">
                  現在進行中の日程調整はありません
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  新しい練習日程の調整を作成してみましょう
                </p>
                <Link
                  href="/events/new"
                  className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700"
                >
                  <Plus className="w-3.5 h-3.5" />
                  新規作成
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {activeEvents.map((event) => {
                  const eventResponses = responses.filter((r) => r.eventId === event.id);
                  const myResponse = eventResponses.find((r) => r.userId === currentUser.id);
                  const organizer = users.find((u) => u.id === event.organizerId);

                  return (
                    <div
                      key={event.id}
                      className="group border border-slate-200 hover:border-indigo-300 rounded-xl p-5 hover:shadow-md transition-all bg-white relative"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            {event.status === "open" && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                                回答受付中
                              </span>
                            )}
                            {event.status === "voting" && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 animate-pulse">
                                <Vote className="w-3 h-3" />
                                最終投票受付中
                              </span>
                            )}
                            {event.status === "aggregated" && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                集計完了
                              </span>
                            )}
                            <span className="text-xs text-slate-500">
                              幹事: {organizer?.nickname || event.organizerId}
                            </span>
                            <span className="text-xs text-slate-400">•</span>
                            <span className="text-xs text-slate-500">
                              練習時間: {Math.floor(event.durationMinutes / 60)}時間
                              {event.durationMinutes % 60 > 0 && `${event.durationMinutes % 60}分`}
                            </span>
                          </div>

                          <h3 className="font-bold text-base text-slate-900 group-hover:text-indigo-600 transition-colors">
                            <Link href={`/events/${event.id}`}>{event.title}</Link>
                          </h3>

                          {event.description && (
                            <p className="text-xs text-slate-600 line-clamp-1">
                              {event.description}
                            </p>
                          )}
                        </div>

                        {/* 回答状況 & アクションボタン */}
                        <div className="flex items-center gap-3 self-end sm:self-center">
                          <div className="text-right">
                            <div className="text-xs text-slate-500">回答状況</div>
                            <div className="text-sm font-bold text-slate-800">
                              {eventResponses.length} / {users.length} 名
                            </div>
                          </div>

                          <Link
                            href={
                              event.status === "voting"
                                ? `/events/${event.id}/vote`
                                : `/events/${event.id}/respond`
                            }
                            className={`px-4 py-2 rounded-xl text-xs font-semibold shadow-xs transition-colors whitespace-nowrap ${
                              myResponse
                                ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
                                : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200"
                            }`}
                          >
                            {event.status === "voting"
                              ? "投票へ進む"
                              : myResponse
                              ? "回答を変更"
                              : "回答する"}
                          </Link>
                        </div>
                      </div>

                      {/* メンバー回答プログレスバー */}
                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                        <span>
                          {myResponse ? (
                            <span className="text-emerald-600 font-medium inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              あなたの回答: {myResponse.canAttend ? "参加可能" : "参加不可"}
                            </span>
                          ) : (
                            <span className="text-amber-600 font-medium">
                              ⚠️ まだ回答していません
                            </span>
                          )}
                        </span>
                        <Link
                          href={`/events/${event.id}`}
                          className="font-medium text-indigo-600 hover:underline"
                        >
                          詳細・集計を見る &rarr;
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* 確定した練習予定 */}
          <section className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-bold text-lg text-slate-900">確定した練習</h2>
                <p className="text-xs text-slate-500">これから実施予定の決定練習</p>
              </div>
            </div>

            {confirmedEvents.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">
                確定済みの練習予定はありません
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {confirmedEvents.map((ev) => (
                  <div
                    key={ev.id}
                    className="p-4 rounded-xl border border-emerald-100 bg-emerald-50/40 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                        確定済み
                      </span>
                      <span className="text-xs text-slate-500">
                        {Math.floor(ev.durationMinutes / 60)}時間練習
                      </span>
                    </div>
                    <h3 className="font-bold text-slate-900 text-sm">{ev.title}</h3>
                    <p className="text-xs text-slate-600 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      日程調整完了
                    </p>
                    <Link
                      href={`/events/${ev.id}`}
                      className="block text-xs font-semibold text-indigo-600 hover:underline pt-1"
                    >
                      詳細・回答内容を確認 &rarr;
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* 終了した練習（過去の記録・振り返り用） */}
          {completedEvents.length > 0 && (
            <section className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-slate-100 text-slate-600 rounded-xl">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-bold text-lg text-slate-900">終了した練習 (過去の記録)</h2>
                    <p className="text-xs text-slate-500">今後の振り返りチャットや音源共有に備えたアーカイブ</p>
                  </div>
                </div>
                <span className="text-xs text-slate-400 font-mono">{completedEvents.length}件</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {completedEvents.map((ev) => (
                  <div
                    key={ev.id}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-600 bg-slate-200 px-2 py-0.5 rounded-full">
                        練習終了
                      </span>
                      <span className="text-xs text-slate-400">
                        {Math.floor(ev.durationMinutes / 60)}時間
                      </span>
                    </div>
                    <h3 className="font-bold text-slate-800 text-sm">{ev.title}</h3>
                    <Link
                      href={`/events/${ev.id}`}
                      className="block text-xs font-semibold text-indigo-600 hover:underline pt-1"
                    >
                      実施記録を確認 &rarr;
                    </Link>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* 右側1カラム：バンドメンバー情報 & 場所 */}
        <div className="space-y-6">
          {/* バンドメンバー一覧 */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-violet-50 text-violet-600 rounded-xl">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-bold text-base text-slate-900">
                    バンドメンバー
                  </h2>
                  <p className="text-xs text-slate-500">{users.length}名 登録中</p>
                </div>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {users.map((user) => (
                <div key={user.id} className="py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-xs text-slate-700">
                      {user.nickname.slice(0, 1)}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        {user.nickname}
                        {user.id === currentUser.id && (
                          <span className="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.2 rounded font-normal">
                            あなた
                          </span>
                        )}
                      </div>
                      {user.bio && (
                        <div className="text-[11px] text-slate-500 line-clamp-1">
                          {user.bio}
                        </div>
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-50 px-2 py-0.5 rounded">
                    @{user.id}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 登録済み練習場所 */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-bold text-base text-slate-900">練習場所</h2>
                  <p className="text-xs text-slate-500">{locations.length} 件 登録</p>
                </div>
              </div>
              <Link
                href="/locations"
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
              >
                Mapで見る &rarr;
              </Link>
            </div>

            <div className="space-y-2">
              {locations.slice(0, 3).map((loc) => (
                <Link
                  key={loc.id}
                  href={`/locations?select=${loc.id}`}
                  className="block p-3 rounded-xl bg-slate-50 hover:bg-indigo-50/50 hover:border-indigo-200 transition-colors border border-slate-100 space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 line-clamp-1">
                      {loc.name}
                    </span>
                  </div>
                  {loc.address && (
                    <p className="text-[11px] text-slate-500 line-clamp-1">
                      {loc.address}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
