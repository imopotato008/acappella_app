import { describe, it, expect } from "vitest";
import { evaluateEventReminders } from "../reminders";
import { Event } from "@/types";

describe("Event Reminders Evaluation (evaluateEventReminders)", () => {
  const baseNow = new Date("2026-12-01T10:00:00.000Z");

  const sampleEvents: Event[] = [
    {
      id: "ev-remind-3d",
      title: "回答期限残り3日のイベント",
      organizerId: "u1",
      dateType: "candidate",
      durationMinutes: 120,
      deadline: "2026-12-03T18:00:00.000Z", // 約56時間後 (残り3日ゾーン)
      status: "open",
      createdAt: "2026-11-20",
    },
    {
      id: "ev-remind-1d",
      title: "回答期限残り1日のイベント",
      organizerId: "u1",
      dateType: "candidate",
      durationMinutes: 120,
      deadline: "2026-12-02T08:00:00.000Z", // 22時間後 (残り1日ゾーン)
      status: "open",
      createdAt: "2026-11-20",
    },
    {
      id: "ev-voting-1d",
      title: "投票期限残り1日のイベント",
      organizerId: "u1",
      dateType: "candidate",
      durationMinutes: 120,
      deadline: "2026-11-30",
      votingDeadline: "2026-12-02T06:00:00.000Z", // 20時間後 (残り1日ゾーン)
      status: "voting",
      createdAt: "2026-11-20",
    },
    {
      id: "ev-far",
      title: "期限がまだ先のイベント",
      organizerId: "u1",
      dateType: "candidate",
      durationMinutes: 120,
      deadline: "2026-12-10T00:00:00.000Z", // 9日後
      status: "open",
      createdAt: "2026-11-20",
    },
    {
      id: "ev-expired",
      title: "すでに期限切れのイベント",
      organizerId: "u1",
      dateType: "candidate",
      durationMinutes: 120,
      deadline: "2026-11-30T00:00:00.000Z", // 過去
      status: "open",
      createdAt: "2026-11-20",
    },
  ];

  it("未送信の場合、残り3日・残り1日・投票残り1日のリマインド対象を抽出する", () => {
    const sentKeys = new Set<string>();
    const items = evaluateEventReminders(sampleEvents, baseNow, sentKeys);

    expect(items.length).toBe(3);

    const item3d = items.find((i) => i.eventId === "ev-remind-3d");
    expect(item3d?.type).toBe("deadline_reminder_3d");

    const item1d = items.find((i) => i.eventId === "ev-remind-1d");
    expect(item1d?.type).toBe("deadline_reminder_1d");

    const itemVote1d = items.find((i) => i.eventId === "ev-voting-1d");
    expect(itemVote1d?.type).toBe("voting_deadline_reminder_1d");
  });

  it("既に送信済みキーがある場合、重複して抽出されない", () => {
    const sentKeys = new Set<string>(["ev-remind-3d_deadline_3d", "ev-remind-1d_deadline_1d"]);
    const items = evaluateEventReminders(sampleEvents, baseNow, sentKeys);

    // 既に送信済みの2件は除外され、投票残り1日のみ抽出される
    expect(items.length).toBe(1);
    expect(items[0].eventId).toBe("ev-voting-1d");
  });
});

