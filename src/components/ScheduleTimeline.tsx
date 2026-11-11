"use client";

import React, { useMemo, useState } from "react";
import { Event, EventResponse, Location, User } from "@/types";
import { Calendar, Clock, MapPin, Sparkles } from "lucide-react";
import { timeToMinutes } from "@/lib/aggregation";
import {
  getAvailableDates,
  getLocationsForDate,
  calculateTimelineRange,
  calculateTimelineOverlap,
  isSlotMatchingDateAndLocation,
} from "@/lib/timeline";

interface ScheduleTimelineProps {
  event: Event;
  responses: EventResponse[];
  users: User[];
  locations: Location[];
}

export function ScheduleTimeline({
  event,
  responses,
  users,
  locations,
}: ScheduleTimelineProps) {
  // 候補日の一覧を取得
  const availableDates = useMemo(() => {
    return getAvailableDates(event, responses);
  }, [event, responses]);

  const [selectedDate, setSelectedDate] = useState<string>(availableDates[0]);
  const [selectedLocationId, setSelectedLocationId] = useState<string>("all");

  // 選択日における場所一覧と参加可能人数
  const locationOptions = useMemo(() => {
    return getLocationsForDate(selectedDate, responses, locations);
  }, [selectedDate, responses, locations]);

  // 選択中の練習場所名
  const selectedLocationName = useMemo(() => {
    if (selectedLocationId === "all") return "すべての場所";
    return locations.find((l) => l.id === selectedLocationId)?.name || "指定なし";
  }, [selectedLocationId, locations]);

  // 表示する時間範囲の計算
  const { startHour, endHour, totalMinutes } = useMemo(() => {
    return calculateTimelineRange(selectedDate, responses, selectedLocationId);
  }, [selectedDate, responses, selectedLocationId]);

  // 時間ヘッダーの配列 [9, 10, 11, ... 22]
  const hours = useMemo(() => {
    const list: number[] = [];
    for (let h = startHour; h <= endHour; h++) {
      list.push(h);
    }
    return list;
  }, [startHour, endHour]);

  // 重なり人数（Overlap）サマリー
  const overlapSummary = useMemo(() => {
    return calculateTimelineOverlap(
      selectedDate,
      selectedLocationId,
      responses,
      startHour,
      endHour
    );
  }, [selectedDate, selectedLocationId, responses, startHour, endHour]);

  return (
    <div className="space-y-4">
      {/* 候補日 ＆ 練習場所 選択エリア */}
      <div className="bg-slate-50/70 dark:bg-slate-900/60 p-3.5 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
        {/* 1. 候補日タブ一覧 */}
        <div className="space-y-1.5">
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>1. 候補日を選択:</span>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {availableDates.map((dateStr) => {
              const isSelected = dateStr === selectedDate;
              const dateObj = new Date(dateStr);
              const dayName = ["日", "月", "火", "水", "木", "金", "土"][dateObj.getDay()];

              const attendCount = responses.filter(
                (r) => r.canAttend && r.timeSlots?.some((s) => s.date === dateStr)
              ).length;

              return (
                <button
                  key={dateStr}
                  type="button"
                  onClick={() => setSelectedDate(dateStr)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 inline-flex items-center gap-1.5 ${
                    isSelected
                      ? "bg-indigo-600 text-white shadow-xs shadow-indigo-200"
                      : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
                  }`}
                >
                  <span>{dateStr} ({dayName})</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      isSelected ? "bg-white/20 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {attendCount}名可
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. 練習場所ピル一覧 */}
        <div className="space-y-1.5 pt-2 border-t border-slate-200/60 dark:border-slate-800/80">
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
            <span>2. 練習場所を選択（候補日＋場所）:</span>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {locationOptions.map((opt) => {
              const isSelected = opt.id === selectedLocationId;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSelectedLocationId(opt.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 inline-flex items-center gap-1.5 ${
                    isSelected
                      ? "bg-gradient-to-r from-rose-500 to-indigo-600 text-white shadow-xs"
                      : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
                  }`}
                >
                  <span>{opt.name}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      isSelected ? "bg-white/20 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {opt.attendCount}名
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* タイムラインコンテナ */}
      <div className="bg-slate-50/60 dark:bg-slate-900/80 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-3 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-1.5">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-slate-900 dark:text-slate-100">
                {selectedDate}
              </span>
              <span className="text-slate-400">×</span>
              <span className="font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-800">
                {selectedLocationName}
              </span>
              <span className="text-slate-500 dark:text-slate-400">
                の空き時間・重なり状況
              </span>
            </div>
          </div>
          <span className="text-[11px] text-slate-400 dark:text-slate-500">
            横スクロールで時間帯を確認できます
          </span>
        </div>

        {/* スクロール可能なグリッドエリア */}
        <div className="overflow-x-auto pb-3">
          <div className="min-w-[700px] space-y-2">
            {/* 時間軸ヘッダー */}
            <div className="flex items-center text-[10px] font-bold text-slate-400 dark:text-slate-500 pl-28 pr-4 border-b border-slate-200 dark:border-slate-800 pb-1">
              {hours.map((h, idx) => (
                <div
                  key={h}
                  className="flex-1 text-left relative"
                  style={{ minWidth: "40px" }}
                >
                  <span>{String(h).padStart(2, "0")}:00</span>
                  {idx > 0 && (
                    <div className="absolute top-4 bottom-0 left-0 w-px bg-slate-200 dark:bg-slate-800 h-2" />
                  )}
                </div>
              ))}
            </div>

            {/* 重なり（Overlap）サマリーバー */}
            <div className="flex items-center py-1.5 pl-28 pr-4 bg-indigo-50/50 dark:bg-indigo-950/40 rounded-xl border border-indigo-100/80 dark:border-indigo-900/50">
              <div className="w-28 -ml-28 pr-2 flex items-center gap-1 text-[11px] font-bold text-indigo-900 dark:text-indigo-200 shrink-0">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>重なりサマリー</span>
              </div>
              <div className="flex-1 flex h-6 relative bg-white/80 dark:bg-slate-800/80 rounded-lg overflow-hidden border border-indigo-100 dark:border-indigo-900/50">
                {overlapSummary.slots.map((slot, idx) => {
                  const isTop =
                    slot.count > 0 && slot.count === overlapSummary.maxCount;
                  const ratio =
                    overlapSummary.maxCount > 0
                      ? slot.count / overlapSummary.maxCount
                      : 0;

                  return (
                    <div
                      key={idx}
                      className={`flex-1 flex items-center justify-center text-[9px] font-bold border-r border-indigo-50/50 dark:border-indigo-900/50 transition-colors ${
                        isTop
                          ? "bg-indigo-600 text-white"
                          : ratio > 0.6
                          ? "bg-indigo-300 dark:bg-indigo-500 text-indigo-950 dark:text-white"
                          : ratio > 0
                          ? "bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-200"
                          : "bg-transparent text-slate-300 dark:text-slate-600"
                      }`}
                      title={`${slot.timeStr}: ${slot.count}名 参加可能`}
                    >
                      {slot.count > 0 ? `${slot.count}名` : ""}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 各メンバーの行 */}
            <div className="space-y-1.5 pt-1">
              {users.map((member) => {
                const res = responses.find((r) => r.userId === member.id);
                const isNoResponse = !res;
                const isCannotAttend = res && !res.canAttend;
                const memberSlots = res
                  ? res.timeSlots?.filter((s) => s.date === selectedDate) || []
                  : [];

                // 選択された場所に合致するスロット
                const matchingSlots = memberSlots.filter((s) =>
                  isSlotMatchingDateAndLocation(s, selectedDate, selectedLocationId)
                );

                return (
                  <div
                    key={member.id}
                    className="flex items-center h-10 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 px-2 relative group hover:border-indigo-300 dark:hover:border-indigo-500 transition-colors"
                  >
                    {/* 左側：メンバー情報 */}
                    <div className="w-24 shrink-0 flex items-center gap-1.5 pr-2">
                      <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center text-[10px] font-bold text-slate-700 dark:text-slate-300 shrink-0">
                        {member.nickname.slice(0, 1)}
                      </div>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate" title={member.nickname}>
                        {member.nickname}
                      </span>
                    </div>

                    {/* 右側：タイムラインバー表示エリア */}
                    <div className="flex-1 h-7 relative bg-slate-50/80 dark:bg-slate-900/80 rounded-lg overflow-hidden border border-slate-100 dark:border-slate-800">
                      {/* 背景グリッド縦線 */}
                      {hours.map((h, idx) => {
                        if (idx === 0) return null;
                        const leftPct = ((h - startHour) / (endHour - startHour)) * 100;
                        return (
                          <div
                            key={h}
                            className="absolute top-0 bottom-0 w-px bg-slate-100 dark:bg-slate-800 pointer-events-none"
                            style={{ left: `${leftPct}%` }}
                          />
                        );
                      })}

                      {/* 状態ラベル (未回答 / 不参加) */}
                      {isNoResponse ? (
                        <div className="absolute inset-0 flex items-center justify-center text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                          未回答
                        </div>
                      ) : isCannotAttend ? (
                        <div className="absolute inset-0 flex items-center justify-center text-[11px] text-slate-400 dark:text-slate-500 font-medium bg-slate-100/50 dark:bg-slate-800/50">
                          不参加
                        </div>
                      ) : memberSlots.length === 0 ? (
                        <div className="absolute inset-0 flex items-center justify-center text-[10px] text-slate-400 dark:text-slate-500">
                          この日の希望なし
                        </div>
                      ) : matchingSlots.length === 0 ? (
                        <div className="absolute inset-0 flex items-center justify-center text-[10px] text-amber-500/80 dark:text-amber-400/80 font-medium bg-amber-50/30 dark:bg-amber-950/20">
                          この場所は参加不可
                        </div>
                      ) : (
                        // 回答された時間帯バーを描画
                        matchingSlots.map((slot) => {
                          const sM = timeToMinutes(slot.startTime);
                          const eM = timeToMinutes(slot.endTime);
                          const leftPct = Math.max(
                            0,
                            ((sM - startHour * 60) / totalMinutes) * 100
                          );
                          const widthPct = Math.min(
                            100 - leftPct,
                            ((eM - sM) / totalMinutes) * 100
                          );

                          // 利用可能場所の名称リスト
                          const locNames = slot.locations
                            ?.map((l) => locations.find((loc) => loc.id === l.locationId)?.name)
                            .filter(Boolean)
                            .join(", ");

                          return (
                            <div
                              key={slot.id}
                              className="absolute top-1 bottom-1 rounded-md bg-gradient-to-r from-indigo-500 to-indigo-600 text-white text-[10px] font-bold flex items-center px-2 shadow-2xs overflow-hidden truncate cursor-pointer hover:brightness-105"
                              style={{
                                left: `${leftPct}%`,
                                width: `${widthPct}%`,
                              }}
                              title={`${member.nickname}: ${slot.startTime}〜${slot.endTime} [場所: ${locNames || "未指定"}]`}
                            >
                              <span className="truncate">
                                {slot.startTime}〜{slot.endTime}
                                {locNames && ` (${locNames})`}
                              </span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
