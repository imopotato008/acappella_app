import { describe, it, expect } from "vitest";
import { evaluateEventReminders } from "../reminders";
import { Event } from "@/types";

describe("Event Reminders Evaluation (evaluateEventReminders)", () => {
  // 2026-12-01 10:00:00 JST (01:00 UTC)
  const baseNow10AM = new Date("2026-12-01T01:00:00.000Z");
  // 2026-12-01 15:00:00 JST (06:00 UTC) - 午前10時以外
  const baseNow3PM = new Date("2026-12-01T06:00:00.000Z");

  const sampleEvents: Event[] = [
    {
      id: "ev-remind-3d",
      title: "回答期限残り3日のイベント",
      organizerId: "u1",
      dateType: "candidate",
      durationMinutes: 120,
      deadline: "2026-12-04T14:59:00.000Z", // JST 2026-12-04 23:59 (3日後)
      status: "open",
      createdAt: "2026-11-20",
    },
    {
      id: "ev-remind-1d",
      title: "回答期限残り1日のイベント",
      organizerId: "u1",
      dateType: "candidate",
      durationMinutes: 120,
      deadline: "2026-12-02T14:59:00.000Z", // JST 2026-12-02 23:59 (1日後＝明日)
      status: "open",
      createdAt: "2026-11-20",
    },
    {
      id: "ev-far",
      title: "期限がまだ先のイベント",
      organizerId: "u1",
      dateType: "candidate",
      durationMinutes: 120,
      deadline: "2026-12-10T14:59:00.000Z", // 9日後
      status: "open",
      createdAt: "2026-11-20",
    },
    {
      id: "ev-expired",
      title: "すでに期限切れのイベント",
      organizerId: "u1",
      dateType: "candidate",
      durationMinutes: 120,
      deadline: "2026-11-30T14:59:00.000Z", // 過去
      status: "open",
      createdAt: "2026-11-20",
    },
  ];

  it("午前10時（JST）の場合、未送信の残り3日および残り1日のリマインド対象を抽出する", () => {
    const sentKeys = new Set<string>();
    const items = evaluateEventReminders(sampleEvents, baseNow10AM, sentKeys);

    expect(items.length).toBe(2);

    const item3d = items.find((i) => i.eventId === "ev-remind-3d");
    expect(item3d?.type).toBe("deadline_reminder_3d");

    const item1d = items.find((i) => i.eventId === "ev-remind-1d");
    expect(item1d?.type).toBe("deadline_reminder_1d");
  });

  it("午前10時（JST）以外の場合は、たとえ期限間近でもリマインド対象を抽出しない", () => {
    const sentKeys = new Set<string>();
    const items = evaluateEventReminders(sampleEvents, baseNow3PM, sentKeys);

    expect(items.length).toBe(0);
  });

  it("既にその日の送信済みキーがある場合、重複して抽出されない", () => {
    const sentKeys = new Set<string>([
      "ev-remind-3d_deadline_3d_2026-12-01",
    ]);
    const items = evaluateEventReminders(sampleEvents, baseNow10AM, sentKeys);

    // 既に送信済みの3日前は除外され、1日前の1件のみ抽出される
    expect(items.length).toBe(1);
    expect(items[0].eventId).toBe("ev-remind-1d");
  });
});

