import { describe, it, expect } from "vitest";
import { getNextCandidateSlot } from "../booking";
import { CandidateSlot } from "@/types";

describe("Booking Next Candidate Selection (getNextCandidateSlot)", () => {
  const candidates: CandidateSlot[] = [
    {
      id: "cand-1",
      eventId: "ev-1",
      date: "2026-12-10",
      startTime: "13:00",
      endTime: "15:00",
      locationId: "loc-noah",
      attendeeCount: 5,
      attendeeUserIds: ["u1", "u2", "u3", "u4", "u5"],
      fullAttendeeUserIds: ["u1", "u2", "u3", "u4", "u5"],
      partialAttendeeUserIds: [],
      attendeeDetails: {},
      bandPracticeMinutes: 120,
    },
    {
      id: "cand-2",
      eventId: "ev-1",
      date: "2026-12-10",
      startTime: "15:00",
      endTime: "17:00",
      locationId: "loc-penta",
      attendeeCount: 5,
      attendeeUserIds: ["u1", "u2", "u3", "u4", "u5"],
      fullAttendeeUserIds: ["u1", "u2", "u3", "u4", "u5"],
      partialAttendeeUserIds: [],
      attendeeDetails: {},
      bandPracticeMinutes: 120,
    },
    {
      id: "cand-3",
      eventId: "ev-1",
      date: "2026-12-11",
      startTime: "14:00",
      endTime: "16:00",
      locationId: "loc-noah",
      attendeeCount: 4,
      attendeeUserIds: ["u1", "u2", "u3", "u4"],
      fullAttendeeUserIds: ["u1", "u2", "u3", "u4"],
      partialAttendeeUserIds: [],
      attendeeDetails: {},
      bandPracticeMinutes: 120,
    },
  ];

  it("現在の候補の次のインデックスの候補を返す", () => {
    // cand-1 の次は cand-2
    const next1 = getNextCandidateSlot(candidates, "cand-1");
    expect(next1?.id).toBe("cand-2");

    // cand-2 の次は cand-3
    const next2 = getNextCandidateSlot(candidates, "cand-2");
    expect(next2?.id).toBe("cand-3");

    // cand-3 の次は存在しないため null
    const next3 = getNextCandidateSlot(candidates, "cand-3");
    expect(next3).toBeNull();
  });

  it("候補が見つからない場合は先頭候補を返す", () => {
    const next = getNextCandidateSlot(candidates, "unknown-id");
    expect(next?.id).toBe("cand-1");
  });

  it("候補リストが空の場合は null を返す", () => {
    expect(getNextCandidateSlot([], "cand-1")).toBeNull();
  });
});
