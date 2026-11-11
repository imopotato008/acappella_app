import { Event, EventResponse, Location, ResponseTimeSlot } from "@/types";
import { minutesToTime, timeToMinutes } from "./aggregation";

export interface TimelineLocationOption {
  id: string; // "all" または Location.id
  name: string;
  attendCount: number; // その日その場所に参加可能な人数
}

export interface CandidateLocationCombination {
  date: string;
  locationId: string;
  locationName: string;
  attendCount: number;
}

export interface TimelineSlotOverlap {
  timeStr: string;
  startM: number;
  count: number;
}

export interface TimelineOverlapSummary {
  slots: TimelineSlotOverlap[];
  maxCount: number;
}

/**
 * 候補日の一覧をソートして取得
 */
export function getAvailableDates(event: Event, responses: EventResponse[]): string[] {
  const dates = new Set<string>();
  if (event.candidateDates && event.candidateDates.length > 0) {
    event.candidateDates.forEach((d) => dates.add(d));
  }
  responses.forEach((r) => {
    r.timeSlots?.forEach((s) => dates.add(s.date));
  });
  const sorted = Array.from(dates).sort();
  return sorted.length > 0 ? sorted : [new Date().toISOString().slice(0, 10)];
}

/**
 * 選択された日付において、各練習場所で参加可能な人数を集計したリストを取得
 */
export function getLocationsForDate(
  selectedDate: string,
  responses: EventResponse[],
  locations: Location[]
): TimelineLocationOption[] {
  const locCounts = new Map<string, number>();

  responses.forEach((r) => {
    if (!r.canAttend) return;
    const matchingLocations = new Set<string>();
    r.timeSlots
      ?.filter((s) => s.date === selectedDate)
      .forEach((s) => {
        s.locations?.forEach((locChoice) => {
          matchingLocations.add(locChoice.locationId);
        });
      });

    matchingLocations.forEach((locId) => {
      locCounts.set(locId, (locCounts.get(locId) || 0) + 1);
    });
  });

  const options: TimelineLocationOption[] = [
    {
      id: "all",
      name: "すべての場所",
      attendCount: responses.filter(
        (r) => r.canAttend && r.timeSlots?.some((s) => s.date === selectedDate)
      ).length,
    },
  ];

  locations.forEach((loc) => {
    options.push({
      id: loc.id,
      name: loc.name,
      attendCount: locCounts.get(loc.id) || 0,
    });
  });

  return options;
}

/**
 * スロットが指定した日付および場所に合致しているか判定
 */
export function isSlotMatchingDateAndLocation(
  slot: ResponseTimeSlot,
  selectedDate: string,
  selectedLocationId: string
): boolean {
  if (slot.date !== selectedDate) return false;
  if (selectedLocationId === "all") return true;
  return slot.locations?.some((l) => l.locationId === selectedLocationId) ?? false;
}

/**
 * タイムライン表示の時間範囲（開始時・終了時・合計分数）を計算
 */
export function calculateTimelineRange(
  selectedDate: string,
  responses: EventResponse[],
  selectedLocationId: string = "all"
): { startHour: number; endHour: number; totalMinutes: number } {
  let minM = 9 * 60; // 09:00
  let maxM = 22 * 60; // 22:00

  responses.forEach((r) => {
    if (!r.canAttend) return;
    r.timeSlots
      ?.filter((s) => isSlotMatchingDateAndLocation(s, selectedDate, selectedLocationId))
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
}

/**
 * 30分刻みでの重なり人数サマリーを計算
 */
export function calculateTimelineOverlap(
  selectedDate: string,
  selectedLocationId: string,
  responses: EventResponse[],
  startHour: number,
  endHour: number
): TimelineOverlapSummary {
  const step = 30;
  const slots: TimelineSlotOverlap[] = [];
  let maxCount = 0;

  for (let m = startHour * 60; m < endHour * 60; m += step) {
    const slotStart = m;
    const slotEnd = m + step;
    let count = 0;

    responses.forEach((r) => {
      if (!r.canAttend) return;
      const matches = r.timeSlots?.some((s) => {
        if (!isSlotMatchingDateAndLocation(s, selectedDate, selectedLocationId)) {
          return false;
        }
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
}
