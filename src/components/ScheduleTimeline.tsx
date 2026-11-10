"use client";

import React, { useMemo, useState } from "react";
import { Event, EventResponse, Location, User } from "@/types";
import { Calendar, Clock, MapPin, Sparkles, Users } from "lucide-react";
import { minutesToTime, timeToMinutes } from "@/lib/aggregation";

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
    const dates = new Set<string>();
    if (event.candidateDates && event.candidateDates.length > 0) {
      event.candidateDates.forEach((d) => dates.add(d));
    }
    responses.forEach((r) => {
      r.timeSlots.forEach((s) => dates.add(s.date));
    });
    const sorted = Array.from(dates).sort();
    return sorted.length > 0 ? sorted : ["2026-12-05"];
  }, [event.candidateDates, responses]);

  const [selectedDate, setSelectedDate] = useState<string>(availableDates[0]);

  // 表示する時間範囲の計算 (デフォルト 09:00 〜 22:00)
  const { startHour, endHour, totalMinutes } = useMemo(() => {
    let minM = 9 * 60; // 09:00
    let maxM = 22 * 60; // 22:00

    responses.forEach((r) => {
      r.timeSlots
        .filter((s) => s.date === selectedDate)
        .forEach((s) => {
          const sM = timeToMinutes(s.startTime);
          const eM = timeToMinutes(s.endTime);
          if (sM < minM) minM = Math.floor(sM / 60) * 60;
          if (eM > maxM) maxM = Math.ceil(eM / 60) * 60;
        });
    });

    const sH = minM / 60;
    const eH = maxM / 60;
    return {
      startHour: sH,
      endHour: eH,
      totalMinutes: (eH - sH) * 60,
    };
  }, [responses, selectedDate]);

  // 時間ヘッダーの配列 [9, 10, 11, ... 22]
  const hours = useMemo(() => {
    const list: number[] = [];
    for (let h = startHour; h <= endHour; h++) {
      list.push(h);
    }
    return list;
  }, [startHour, endHour]);

  // 30分刻みの重なり人数（Overlap）サマリーの計算
  const overlapSummary = useMemo(() => {
    const step = 30;
    const slots: { timeStr: string; startM: number; count: number }[] = [];
    let maxCount = 0;

    for (let m = startHour * 60; m < endHour * 60; m += step) {
      const slotStart = m;
      const slotEnd = m + step;
      let count = 0;

      responses.forEach((r) => {
        if (!r.canAttend) return;
        const matches = r.timeSlots.some((s) => {
          if (s.date !== selectedDate) return false;
          const sStart = timeToMinutes(s.startTime);
          const sEnd = timeToMinutes(s.endTime);
          return sStart < slotEnd && sEnd > slotStart;
        });
        if (matches) count++;
      });

      if (count > maxCount) maxCount = count;
      slots.push({
        timeStr: minutesToTime(slotStart),
        startM: slotStart,
        count,
      });
    }

    return { slots, maxCount };
  }, [responses, selectedDate, startHour, endHour]);

  return (
    <div className="space-y-4">
      {/* 候補日タブ一覧 */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-slate-100 dark:border-slate-800 scrollbar-none">
        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 shrink-0 mr-1 flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          候補日を選択:
        </span>
        {availableDates.map((dateStr) => {
          const isSelected = dateStr === selectedDate;
          const dateObj = new Date(dateStr);
          const dayName = ["日", "月", "火", "水", "木", "金", "土"][dateObj.getDay()];

          // この日に参加可能と答えている人数
          const attendCount = responses.filter(
            (r) => r.canAttend && r.timeSlots.some((s) => s.date === dateStr)
          ).length;

          return (
            <button
              key={dateStr}
              type="button"
              onClick={() => setSelectedDate(dateStr)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 inline-flex items-center gap-1.5 ${
                isSelected
                  ? "bg-indigo-600 text-white shadow-xs shadow-indigo-200"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
              }`}
            >
              <span>{dateStr} ({dayName})</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  isSelected ? "bg-white/20 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                }`}
              >
                {attendCount}名可
              </span>
            </button>
          );
        })}
      </div>

      {/* タイムラインコンテナ */}
      <div className="bg-slate-50/60 dark:bg-slate-900/80 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-3 overflow-hidden">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span className="font-bold text-slate-800 dark:text-slate-200">
              {selectedDate} の空き時間・重なり状況
            </span>
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
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

            {/* 重なり（Overlap）サマリーバー：何人重なっているかのヒートマップ */}
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
                  ? res.timeSlots.filter((s) => s.date === selectedDate)
                  : [];

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
                      ) : (
                        // 回答された時間帯バーを描画
                        memberSlots.map((slot) => {
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
                            .map((l) => locations.find((loc) => loc.id === l.locationId)?.name)
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

        {/* タイムライン凡例 */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-200/60 dark:border-slate-800 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-indigo-600 inline-block" />
              最多重なり（練習おすすめ枠）
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-indigo-500 inline-block" />
              参加可能時間帯
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 inline-block" />
              未回答 / 不参加
            </span>
          </div>
          <span className="text-[10px] text-slate-400 dark:text-slate-500">
            ※バーの上にカーソルを合わせると利用可能な練習場所の詳細が表示されます
          </span>
        </div>
      </div>
    </div>
  );
}

