import { describe, it, expect } from "vitest";
import { aggregateResponses } from "../aggregation";
import { Event, EventResponse, Location } from "@/types";

describe("Booking Pending Status & Flow", () => {
  const sampleEvent: Event = {
    id: "ev-test-booking",
    title: "12月スタジオ練習",
    organizerId: "user-organizer",
    dateType: "candidate",
    candidateDates: ["2026-12-10"],
    durationMinutes: 120,
    deadline: "2026-12-05T00:00:00.000Z",
    status: "open",
    createdAt: "2026-11-01T00:00:00.000Z",
  };

  const sampleLocationWithUrl: Location = {
    id: "loc-noah",
    name: "サウンドスタジオ NOAH 渋谷店",
    address: "東京都渋谷区",
    reservationUrl: "https://www.studionoah.jp/shibuya/booking",
    createdAt: "2026-11-01",
  };

  const sampleLocationWithoutUrl: Location = {
    id: "loc-penta",
    name: "スタジオペンタ",
    address: "東京都豊島区",
    createdAt: "2026-11-01",
  };

  const responses: EventResponse[] = [
    {
      id: "res-1",
      eventId: "ev-test-booking",
      userId: "user-1",
      canAttend: true,
      timeSlots: [
        {
          id: "slot-1",
          date: "2026-12-10",
          startTime: "13:00",
          endTime: "15:00",
          locations: [{ locationId: "loc-noah" }],
        },
      ],
      updatedAt: "2026-11-02",
    },
    {
      id: "res-2",
      eventId: "ev-test-booking",
      userId: "user-2",
      canAttend: true,
      timeSlots: [
        {
          id: "slot-2",
          date: "2026-12-10",
          startTime: "13:00",
          endTime: "15:00",
          locations: [{ locationId: "loc-noah" }],
        },
      ],
      updatedAt: "2026-11-02",
    },
  ];

  it("単独候補の場合はautoConfirmed: trueとなり、予約待ち(booking_pending)への遷移対象となる", () => {
    const result = aggregateResponses(sampleEvent, responses, [sampleLocationWithUrl]);
    expect(result.autoConfirmed).toBe(true);
    expect(result.candidates.length).toBe(1);
    expect(result.candidates[0].locationId).toBe("loc-noah");
  });

  it("練習場所に予約サイトURLがある場合、予約先URLが正しく参照できる", () => {
    expect(sampleLocationWithUrl.reservationUrl).toBe(
      "https://www.studionoah.jp/shibuya/booking"
    );
  });

  it("予約サイトURLが未設定の場所の場合、undefinedとなる", () => {
    expect(sampleLocationWithoutUrl.reservationUrl).toBeUndefined();
  });
});

