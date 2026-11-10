import { describe, expect, it } from "vitest";
import {
  aggregateResponses,
  minutesToTime,
  timeToMinutes,
} from "../aggregation";
import { Event, EventResponse, Location } from "@/types";

// テスト用ダミーロケーション
const mockLocations: Location[] = [
  {
    id: "loc-1",
    name: "スタジオNOAH 渋谷",
    createdAt: "2026-11-01T00:00:00Z",
  },
  {
    id: "loc-2",
    name: "ペントハウス 新宿",
    createdAt: "2026-11-01T00:00:00Z",
  },
];

// テスト用基本イベント生成ヘルパー
function createBaseEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: "ev-test",
    title: "テスト用日程調整",
    organizerId: "ken",
    dateType: "candidate",
    candidateDates: ["2026-12-05"],
    durationMinutes: 120, // 2時間
    deadline: "2026-11-25T23:59:59Z",
    status: "open",
    createdAt: "2026-11-08T10:00:00Z",
    ...overrides,
  };
}

describe("時刻変換ユーティリティ (timeToMinutes / minutesToTime)", () => {
  it("UT-TIME-01: 午前時刻の分変換", () => {
    expect(timeToMinutes("08:30")).toBe(510);
  });

  it("UT-TIME-02: 境界時刻 (0時)", () => {
    expect(timeToMinutes("00:00")).toBe(0);
  });

  it("UT-TIME-03: 深夜時刻", () => {
    expect(timeToMinutes("23:30")).toBe(1410);
  });

  it("UT-TIME-04: 分から時刻文字列への逆変換", () => {
    expect(minutesToTime(810)).toBe("13:30");
  });

  it("UT-TIME-05: 0分のパディング表示", () => {
    expect(minutesToTime(60)).toBe("01:00");
  });
});

describe("集計アルゴリズム (aggregateResponses)", () => {
  it("UT-AGG-01: 基本的な最大人数枠の抽出", () => {
    const event = createBaseEvent({ durationMinutes: 120 });
    const responses: EventResponse[] = [
      {
        id: "res-1",
        eventId: event.id,
        userId: "ken",
        canAttend: true,
        timeSlots: [
          {
            id: "s1",
            date: "2026-12-05",
            startTime: "13:00",
            endTime: "17:00",
            locations: [{ locationId: "loc-1", priorityRank: 1 }],
          },
        ],
        updatedAt: "2026-11-08T10:00:00Z",
      },
      {
        id: "res-2",
        eventId: event.id,
        userId: "misaki",
        canAttend: true,
        timeSlots: [
          {
            id: "s2",
            date: "2026-12-05",
            startTime: "13:00",
            endTime: "17:00",
            locations: [{ locationId: "loc-1", priorityRank: 1 }],
          },
        ],
        updatedAt: "2026-11-08T10:00:00Z",
      },
      {
        id: "res-3",
        eventId: event.id,
        userId: "shota",
        canAttend: true,
        timeSlots: [
          {
            id: "s3",
            date: "2026-12-05",
            startTime: "13:00",
            endTime: "17:00",
            locations: [{ locationId: "loc-1", priorityRank: 1 }],
          },
        ],
        updatedAt: "2026-11-08T10:00:00Z",
      },
    ];

    const result = aggregateResponses(event, responses, mockLocations);

    expect(result.maxAttendeeCount).toBe(3);
    expect(result.candidates.length).toBeGreaterThan(0);
    expect(result.candidates[0].attendeeCount).toBe(3);
    expect(result.candidates[0].fullAttendeeUserIds).toHaveLength(3);
  });

  it("UT-AGG-02: 練習時間不足メンバーの途中参加（早退）判定", () => {
    const event = createBaseEvent({ durationMinutes: 120 }); // 2時間練習 (13:00〜15:00)
    const responses: EventResponse[] = [
      {
        id: "res-1",
        eventId: event.id,
        userId: "ken",
        canAttend: true,
        timeSlots: [
          {
            id: "s1",
            date: "2026-12-05",
            startTime: "13:00",
            endTime: "15:00", // 120分フル参加
            locations: [{ locationId: "loc-1", priorityRank: 1 }],
          },
        ],
        updatedAt: "2026-11-08T10:00:00Z",
      },
      {
        id: "res-2",
        eventId: event.id,
        userId: "misaki",
        canAttend: true,
        timeSlots: [
          {
            id: "s2",
            date: "2026-12-05",
            startTime: "13:00",
            endTime: "14:30", // 90分のみ (早退)
            locations: [{ locationId: "loc-1", priorityRank: 1 }],
          },
        ],
        updatedAt: "2026-11-08T10:00:00Z",
      },
    ];

    const result = aggregateResponses(event, responses, mockLocations);

    // 13:00〜15:00の候補枠が抽出される
    expect(result.maxAttendeeCount).toBe(2);
    const candidate = result.candidates[0];
    expect(candidate.attendeeCount).toBe(2);
    expect(candidate.fullAttendeeUserIds).toEqual(["ken"]);
    expect(candidate.partialAttendeeUserIds).toEqual(["misaki"]);
    expect(candidate.attendeeDetails["misaki"].type).toBe("early");
    expect(candidate.attendeeDetails["misaki"].overlapMinutes).toBe(90);
    expect(candidate.attendeeDetails["misaki"].overlapEnd).toBe("14:30");
  });

  it("UT-AGG-03: 利用可能場所不一致メンバーの除外", () => {
    const event = createBaseEvent({ durationMinutes: 120 });
    const responses: EventResponse[] = [
      {
        id: "res-1",
        eventId: event.id,
        userId: "ken",
        canAttend: true,
        timeSlots: [
          {
            id: "s1",
            date: "2026-12-05",
            startTime: "13:00",
            endTime: "15:00",
            locations: [{ locationId: "loc-1", priorityRank: 1 }],
          },
        ],
        updatedAt: "2026-11-08T10:00:00Z",
      },
      {
        id: "res-2",
        eventId: event.id,
        userId: "misaki",
        canAttend: true,
        timeSlots: [
          {
            id: "s2",
            date: "2026-12-05",
            startTime: "13:00",
            endTime: "15:00",
            locations: [{ locationId: "loc-2", priorityRank: 1 }], // loc-1ではなくloc-2のみ
          },
        ],
        updatedAt: "2026-11-08T10:00:00Z",
      },
    ];

    const result = aggregateResponses(event, responses, mockLocations);

    // loc-1の枠にもloc-2の枠にも1名ずつしか参加できない
    expect(result.maxAttendeeCount).toBe(1);
    const candLoc1 = result.candidates.find((c) => c.locationId === "loc-1");
    expect(candLoc1?.attendeeUserIds).toEqual(["ken"]);
  });

  it("UT-AGG-04: 最も多くの時間練習が可能な候補の優先抽出（バンド練習可能時間最大・人数乗算なし）", () => {
    const event = createBaseEvent({
      candidateDates: ["2026-12-05", "2026-12-06"],
      durationMinutes: 120, // 2時間練習
    });
    const responses: EventResponse[] = [
      // ken: 12/5(フル120分), 12/6(フル120分)
      {
        id: "res-1",
        eventId: event.id,
        userId: "ken",
        canAttend: true,
        timeSlots: [
          {
            id: "s1",
            date: "2026-12-05",
            startTime: "13:00",
            endTime: "15:00",
            locations: [{ locationId: "loc-1" }],
          },
          {
            id: "s2",
            date: "2026-12-06",
            startTime: "13:00",
            endTime: "15:00",
            locations: [{ locationId: "loc-1" }],
          },
        ],
        updatedAt: "2026-11-08T10:00:00Z",
      },
      // misaki: 12/5(フル120分 ➜ バンド練習120分), 12/6(遅刻90分 ➜ バンド練習90分)
      {
        id: "res-2",
        eventId: event.id,
        userId: "misaki",
        canAttend: true,
        timeSlots: [
          {
            id: "s3",
            date: "2026-12-05",
            startTime: "13:00",
            endTime: "15:00",
            locations: [{ locationId: "loc-1" }],
          },
          {
            id: "s4",
            date: "2026-12-06",
            startTime: "13:30",
            endTime: "15:00",
            locations: [{ locationId: "loc-1" }],
          },
        ],
        updatedAt: "2026-11-08T10:00:00Z",
      },
    ];

    const result = aggregateResponses(event, responses, mockLocations);

    // 両日とも2名参加可能だが、バンド練習可能時間が多い12/5（120分、人数乗算なし）が選ばれ、単独なので自動確定！
    expect(result.maxAttendeeCount).toBe(2);
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0].date).toBe("2026-12-05");
    expect(result.candidates[0].bandPracticeMinutes).toBe(120);
    expect(result.autoConfirmed).toBe(true);
  });

  it("UT-AGG-05: 最大参加人数以外の候補の除外", () => {
    const event = createBaseEvent({
      candidateDates: ["2026-12-05", "2026-12-06"],
      durationMinutes: 120,
    });
    const responses: EventResponse[] = [
      {
        id: "res-1",
        eventId: event.id,
        userId: "ken",
        canAttend: true,
        timeSlots: [
          {
            id: "s1",
            date: "2026-12-05",
            startTime: "13:00",
            endTime: "15:00",
            locations: [{ locationId: "loc-1", priorityRank: 1 }],
          },
          {
            id: "s2",
            date: "2026-12-06",
            startTime: "13:00",
            endTime: "15:00",
            locations: [{ locationId: "loc-1", priorityRank: 1 }],
          },
        ],
        updatedAt: "2026-11-08T10:00:00Z",
      },
      {
        id: "res-2",
        eventId: event.id,
        userId: "misaki",
        canAttend: true,
        timeSlots: [
          {
            id: "s3",
            date: "2026-12-05",
            startTime: "13:00",
            endTime: "15:00",
            locations: [{ locationId: "loc-1", priorityRank: 1 }],
          },
        ],
        updatedAt: "2026-11-08T10:00:00Z",
      },
    ];

    const result = aggregateResponses(event, responses, mockLocations);

    // 12月5日は2名、12月6日は1名
    expect(result.maxAttendeeCount).toBe(2);
    // 候補リストには2名集まれる12月5日のみが含まれ、1名の12月6日は除外される
    expect(result.candidates.every((c) => c.date === "2026-12-05")).toBe(true);
  });

  it("UT-AGG-06: 候補が1件のみの自動確定フラグ", () => {
    const event = createBaseEvent({ durationMinutes: 120 });
    const responses: EventResponse[] = [
      {
        id: "res-1",
        eventId: event.id,
        userId: "ken",
        canAttend: true,
        timeSlots: [
          {
            id: "s1",
            date: "2026-12-05",
            startTime: "13:00",
            endTime: "15:00", // 1枠のみ
            locations: [{ locationId: "loc-1", priorityRank: 1 }],
          },
        ],
        updatedAt: "2026-11-08T10:00:00Z",
      },
    ];

    const result = aggregateResponses(event, responses, [mockLocations[0]]);

    expect(result.candidates).toHaveLength(1);
    expect(result.autoConfirmed).toBe(true);
  });

  it("UT-AGG-07: 候補が複数の場合の投票移行フラグ", () => {
    const event = createBaseEvent({ durationMinutes: 120 });
    const responses: EventResponse[] = [
      {
        id: "res-1",
        eventId: event.id,
        userId: "ken",
        canAttend: true,
        timeSlots: [
          {
            id: "s1",
            date: "2026-12-05",
            startTime: "13:00",
            endTime: "16:00", // 13:00〜15:00, 13:30〜15:30, 14:00〜16:00 と複数候補可能
            locations: [{ locationId: "loc-1", priorityRank: 1 }],
          },
        ],
        updatedAt: "2026-11-08T10:00:00Z",
      },
    ];

    const result = aggregateResponses(event, responses, [mockLocations[0]]);

    expect(result.candidates.length).toBeGreaterThan(1);
    expect(result.autoConfirmed).toBe(false);
  });

  it("UT-AGG-08: 時間枠の境界値テスト (ピッタリ120分)", () => {
    const event = createBaseEvent({ durationMinutes: 120 });
    const responses: EventResponse[] = [
      {
        id: "res-1",
        eventId: event.id,
        userId: "ken",
        canAttend: true,
        timeSlots: [
          {
            id: "s1",
            date: "2026-12-05",
            startTime: "14:00",
            endTime: "16:00", // ピッタリ120分
            locations: [{ locationId: "loc-1", priorityRank: 1 }],
          },
        ],
        updatedAt: "2026-11-08T10:00:00Z",
      },
    ];

    const result = aggregateResponses(event, responses, [mockLocations[0]]);

    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0].startTime).toBe("14:00");
    expect(result.candidates[0].endTime).toBe("16:00");
    expect(result.candidates[0].fullAttendeeUserIds).toContain("ken");
  });

  it("UT-AGG-09: 全員不参加・回答ゼロのハンドリング", () => {
    const event = createBaseEvent({ durationMinutes: 120 });
    const responses: EventResponse[] = [
      {
        id: "res-1",
        eventId: event.id,
        userId: "ken",
        canAttend: false,
        timeSlots: [],
        updatedAt: "2026-11-08T10:00:00Z",
      },
    ];

    const result = aggregateResponses(event, responses, mockLocations);

    expect(result.maxAttendeeCount).toBe(0);
    expect(result.candidates).toEqual([]);
    expect(result.autoConfirmed).toBe(false);
  });

  it("UT-AGG-10: フル参加人数による単独確定と、それでも複数残る場合の最終投票移行", () => {
    const event = createBaseEvent({
      candidateDates: ["2026-12-05", "2026-12-06"],
      durationMinutes: 120, // 13:00〜15:00
    });

    const responses: EventResponse[] = [
      // ken: 12/5, 12/6 ともにフル参加 (13:00〜15:00)
      {
        id: "res-1",
        eventId: event.id,
        userId: "ken",
        canAttend: true,
        timeSlots: [
          {
            id: "s1",
            date: "2026-12-05",
            startTime: "13:00",
            endTime: "15:00",
            locations: [{ locationId: "loc-1" }],
          },
          {
            id: "s2",
            date: "2026-12-06",
            startTime: "13:00",
            endTime: "15:00",
            locations: [{ locationId: "loc-1" }],
          },
        ],
        updatedAt: "2026-11-08T10:00:00Z",
      },
      // misaki: 12/5 はフル参加、12/6 は早退 (13:00〜14:30)
      {
        id: "res-2",
        eventId: event.id,
        userId: "misaki",
        canAttend: true,
        timeSlots: [
          {
            id: "s3",
            date: "2026-12-05",
            startTime: "13:00",
            endTime: "15:00",
            locations: [{ locationId: "loc-1" }],
          },
          {
            id: "s4",
            date: "2026-12-06",
            startTime: "13:00",
            endTime: "14:30",
            locations: [{ locationId: "loc-1" }],
          },
        ],
        updatedAt: "2026-11-08T10:00:00Z",
      },
    ];

    const result = aggregateResponses(event, responses, [mockLocations[0]]);

    // どちらの日も総人数2名だが、フル参加人数が多い12/5のみが確定日程として選出される
    expect(result.maxAttendeeCount).toBe(2);
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0].date).toBe("2026-12-05");
    expect(result.candidates[0].fullAttendeeUserIds).toHaveLength(2);
    expect(result.autoConfirmed).toBe(true); // 単独1件なので自動確定！

    // もし12/6のmisakiもフル参加（両日完全同条件）なら、2件とも残って最終投票へ進むこと
    const responsesTied: EventResponse[] = [
      responses[0],
      {
        ...responses[1],
        timeSlots: [
          responses[1].timeSlots[0],
          { ...responses[1].timeSlots[1], endTime: "15:00" }, // 12/6もフル参加
        ],
      },
    ];
    const resultTied = aggregateResponses(event, responsesTied, [mockLocations[0]]);
    expect(resultTied.candidates).toHaveLength(2);
    expect(resultTied.autoConfirmed).toBe(false); // 複数あるので最終投票へ進む！
  });

  it("UT-AGG-11: 各種参加タイプ（遅刻・早退・途中参加）の正確な判定", () => {
    const event = createBaseEvent({ durationMinutes: 120 }); // 13:00〜15:00
    const responses: EventResponse[] = [
      // フル参加
      {
        id: "res-1",
        eventId: event.id,
        userId: "u-full",
        canAttend: true,
        timeSlots: [
          {
            id: "s1",
            date: "2026-12-05",
            startTime: "13:00",
            endTime: "15:00",
            locations: [{ locationId: "loc-1", priorityRank: 1 }],
          },
        ],
        updatedAt: "2026-11-08T10:00:00Z",
      },
      // 遅刻 (13:30〜15:30)
      {
        id: "res-2",
        eventId: event.id,
        userId: "u-late",
        canAttend: true,
        timeSlots: [
          {
            id: "s2",
            date: "2026-12-05",
            startTime: "13:30",
            endTime: "15:30",
            locations: [{ locationId: "loc-1", priorityRank: 1 }],
          },
        ],
        updatedAt: "2026-11-08T10:00:00Z",
      },
      // 早退 (12:30〜14:30)
      {
        id: "res-3",
        eventId: event.id,
        userId: "u-early",
        canAttend: true,
        timeSlots: [
          {
            id: "s3",
            date: "2026-12-05",
            startTime: "12:30",
            endTime: "14:30",
            locations: [{ locationId: "loc-1", priorityRank: 1 }],
          },
        ],
        updatedAt: "2026-11-08T10:00:00Z",
      },
      // 途中参加かつ途中退出 (13:30〜14:30)
      {
        id: "res-4",
        eventId: event.id,
        userId: "u-partial",
        canAttend: true,
        timeSlots: [
          {
            id: "s4",
            date: "2026-12-05",
            startTime: "13:30",
            endTime: "14:30",
            locations: [{ locationId: "loc-1", priorityRank: 1 }],
          },
        ],
        updatedAt: "2026-11-08T10:00:00Z",
      },
    ];

    const result = aggregateResponses(event, responses, [mockLocations[0]]);

    // 13:00〜15:00の枠を探す
    const targetSlot = result.candidates.find(
      (c) => c.startTime === "13:00" && c.endTime === "15:00"
    );
    expect(targetSlot).toBeDefined();
    if (!targetSlot) return;

    expect(targetSlot.attendeeCount).toBe(4);
    expect(targetSlot.attendeeDetails["u-full"].type).toBe("full");
    expect(targetSlot.attendeeDetails["u-late"].type).toBe("late");
    expect(targetSlot.attendeeDetails["u-late"].overlapStart).toBe("13:30");
    expect(targetSlot.attendeeDetails["u-early"].type).toBe("early");
    expect(targetSlot.attendeeDetails["u-early"].overlapEnd).toBe("14:30");
    expect(targetSlot.attendeeDetails["u-partial"].type).toBe("partial");
    expect(targetSlot.attendeeDetails["u-partial"].overlapMinutes).toBe(60);
  });
});

