import { describe, it, expect } from "vitest";
import {
  validateTimeSlot,
  updateTimeSlot,
  addTimeSlot,
  removeTimeSlot,
} from "../response";
import { ResponseTimeSlot } from "@/types";

describe("Response time slot operations", () => {
  describe("validateTimeSlot", () => {
    it("日付が未指定の場合はエラーを返す", () => {
      const res = validateTimeSlot({
        date: "",
        startTime: "13:00",
        endTime: "17:00",
        locations: [{ locationId: "loc-1" }],
      });
      expect(res.valid).toBe(false);
      expect(res.error).toContain("日付");
    });

    it("終了時刻が開始時刻と同じ、または前の場合はエラーを返す", () => {
      const sameTime = validateTimeSlot({
        date: "2026-11-20",
        startTime: "15:00",
        endTime: "15:00",
        locations: [{ locationId: "loc-1" }],
      });
      expect(sameTime.valid).toBe(false);
      expect(sameTime.error).toContain("終了時刻");

      const earlierEnd = validateTimeSlot({
        date: "2026-11-20",
        startTime: "16:00",
        endTime: "14:00",
        locations: [{ locationId: "loc-1" }],
      });
      expect(earlierEnd.valid).toBe(false);
      expect(earlierEnd.error).toContain("終了時刻");
    });

    it("練習場所が未選択（0件）の場合はエラーを返す", () => {
      const res = validateTimeSlot({
        date: "2026-11-20",
        startTime: "13:00",
        endTime: "17:00",
        locations: [],
      });
      expect(res.valid).toBe(false);
      expect(res.error).toContain("練習場所");
    });

    it("すべての条件を満たす場合はvalid: trueを返す", () => {
      const res = validateTimeSlot({
        date: "2026-11-20",
        startTime: "13:00",
        endTime: "17:00",
        locations: [{ locationId: "loc-1" }, { locationId: "loc-2" }],
      });
      expect(res.valid).toBe(true);
      expect(res.error).toBeUndefined();
    });
  });

  describe("updateTimeSlot", () => {
    const initialSlots: ResponseTimeSlot[] = [
      {
        id: "slot-1",
        date: "2026-11-20",
        startTime: "13:00",
        endTime: "17:00",
        locations: [{ locationId: "loc-1" }],
      },
      {
        id: "slot-2",
        date: "2026-11-21",
        startTime: "10:00",
        endTime: "14:00",
        locations: [{ locationId: "loc-2" }],
      },
    ];

    it("対象IDのスロットの日付、時間帯、練習場所を更新できる", () => {
      const updated = updateTimeSlot(initialSlots, "slot-1", {
        date: "2026-11-22",
        startTime: "14:00",
        endTime: "18:00",
        locations: [{ locationId: "loc-1" }, { locationId: "loc-3" }],
      });

      expect(updated[0]).toEqual({
        id: "slot-1",
        date: "2026-11-22",
        startTime: "14:00",
        endTime: "18:00",
        locations: [{ locationId: "loc-1" }, { locationId: "loc-3" }],
      });
      // slot-2は変更されないこと
      expect(updated[1]).toEqual(initialSlots[1]);
    });

    it("存在しないIDの場合はスロット配列をそのまま保持する", () => {
      const updated = updateTimeSlot(initialSlots, "non-existent", {
        startTime: "10:00",
      });
      expect(updated).toEqual(initialSlots);
    });
  });

  describe("addTimeSlot & removeTimeSlot", () => {
    it("新しいスロットを末尾に追加できる", () => {
      const slots: ResponseTimeSlot[] = [
        {
          id: "slot-1",
          date: "2026-11-20",
          startTime: "13:00",
          endTime: "17:00",
          locations: [{ locationId: "loc-1" }],
        },
      ];
      const newSlot: ResponseTimeSlot = {
        id: "slot-2",
        date: "2026-11-21",
        startTime: "15:00",
        endTime: "18:00",
        locations: [{ locationId: "loc-2" }],
      };

      const result = addTimeSlot(slots, newSlot);
      expect(result.length).toBe(2);
      expect(result[1]).toEqual(newSlot);
    });

    it("指定したIDのスロットを削除できる", () => {
      const slots: ResponseTimeSlot[] = [
        {
          id: "slot-1",
          date: "2026-11-20",
          startTime: "13:00",
          endTime: "17:00",
          locations: [{ locationId: "loc-1" }],
        },
        {
          id: "slot-2",
          date: "2026-11-21",
          startTime: "15:00",
          endTime: "18:00",
          locations: [{ locationId: "loc-2" }],
        },
      ];

      const result = removeTimeSlot(slots, "slot-1");
      expect(result.length).toBe(1);
      expect(result[0].id).toBe("slot-2");
    });
  });
});

