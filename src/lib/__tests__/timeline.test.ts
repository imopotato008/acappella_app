import { describe, it, expect } from "vitest";
import {
  getAvailableDates,
  getLocationsForDate,
  isSlotMatchingDateAndLocation,
  calculateTimelineRange,
  calculateTimelineOverlap,
} from "../timeline";
import { Event, EventResponse, Location } from "@/types";

describe("Timeline helpers with Date + Location selection", () => {
  const sampleEvent: Event = {
    id: "ev-1",
    title: "12月練習",
    organizerId: "user-1",
    dateType: "candidate",
    candidateDates: ["2026-12-05", "2026-12-06"],
    durationMinutes: 120,
    deadline: "2026-12-01T00:00:00.000Z",
    status: "open",
    createdAt: "2026-11-01T00:00:00.000Z",
  };

  const sampleLocations: Location[] = [
    { id: "loc-noah", name: "スタジオNOAH", createdAt: "2026-11-01" },
    { id: "loc-penta", name: "スタジオペンタ", createdAt: "2026-11-01" },
  ];

  const sampleResponses: EventResponse[] = [
    {
      id: "res-1",
      eventId: "ev-1",
      userId: "user-ken",
      canAttend: true,
      timeSlots: [
        {
          id: "slot-1",
          date: "2026-12-05",
          startTime: "13:00",
          endTime: "17:00",
          locations: [{ locationId: "loc-noah" }],
        },
      ],
      updatedAt: "2026-11-02",
    },
    {
      id: "res-2",
      eventId: "ev-1",
      userId: "user-misaki",
      canAttend: true,
      timeSlots: [
        {
          id: "slot-2",
          date: "2026-12-05",
          startTime: "14:00",
          endTime: "18:00",
          locations: [{ locationId: "loc-noah" }, { locationId: "loc-penta" }],
        },
      ],
      updatedAt: "2026-11-02",
    },
    {
      id: "res-3",
      eventId: "ev-1",
      userId: "user-shota",
      canAttend: true,
      timeSlots: [
        {
          id: "slot-3",
          date: "2026-12-05",
          startTime: "15:00",
          endTime: "19:00",
          locations: [{ locationId: "loc-penta" }], // NOAHは参加不可
        },
      ],
      updatedAt: "2026-11-02",
    },
  ];

  it("getAvailableDates: イベント候補日と回答日を合わせて昇順で取得する", () => {
    const dates = getAvailableDates(sampleEvent, sampleResponses);
    expect(dates).toEqual(["2026-12-05", "2026-12-06"]);
  });

  it("getLocationsForDate: 指定日の練習場所ごとの参加可能人数を集計する", () => {
    const options = getLocationsForDate("2026-12-05", sampleResponses, sampleLocations);

    // すべての場所: 3名
    const allOption = options.find((o) => o.id === "all");
    expect(allOption?.attendCount).toBe(3);

    // スタジオNOAH: user-ken (slot-1) + user-misaki (slot-2) = 2名
    const noahOption = options.find((o) => o.id === "loc-noah");
    expect(noahOption?.attendCount).toBe(2);

    // スタジオペンタ: user-misaki (slot-2) + user-shota (slot-3) = 2名
    const pentaOption = options.find((o) => o.id === "loc-penta");
    expect(pentaOption?.attendCount).toBe(2);
  });

  it("isSlotMatchingDateAndLocation: 日付および場所条件によるフィルタ判定", () => {
    const slot = sampleResponses[0].timeSlots[0]; // 2026-12-05, loc-noahのみ

    expect(isSlotMatchingDateAndLocation(slot, "2026-12-05", "all")).toBe(true);
    expect(isSlotMatchingDateAndLocation(slot, "2026-12-05", "loc-noah")).toBe(true);
    expect(isSlotMatchingDateAndLocation(slot, "2026-12-05", "loc-penta")).toBe(false);
    expect(isSlotMatchingDateAndLocation(slot, "2026-12-06", "loc-noah")).toBe(false);
  });

  it("calculateTimelineOverlap: 全場所選択時は3名重なる時間帯がある", () => {
    // 15:00〜17:00 は user-ken (13-17), user-misaki (14-18), user-shota (15-19) の3名が重なる
    const summary = calculateTimelineOverlap(
      "2026-12-05",
      "all",
      sampleResponses,
      9,
      22
    );
    expect(summary.maxCount).toBe(3);
    const slot1530 = summary.slots.find((s) => s.timeStr === "15:30");
    expect(slot1530?.count).toBe(3);
  });

  it("calculateTimelineOverlap: 「スタジオNOAH」を選択した場合、NOAH希望の2名のみで重なりが集計される", () => {
    const summary = calculateTimelineOverlap(
      "2026-12-05",
      "loc-noah",
      sampleResponses,
      9,
      22
    );
    // user-shota は NOAH に回答していないため除外され、最大は2名になる
    expect(summary.maxCount).toBe(2);
    const slot1530 = summary.slots.find((s) => s.timeStr === "15:30");
    expect(slot1530?.count).toBe(2);

    // 17:30 (user-kenは終了、user-misakiのみNOAH)
    const slot1730 = summary.slots.find((s) => s.timeStr === "17:30");
    expect(slot1730?.count).toBe(1);
  });
});
