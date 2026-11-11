import { describe, it, expect } from "vitest";
import { getNextCandidateSlot } from "../booking";
import { CandidateSlot, FinalVote } from "@/types";

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
      voteCount: 0,
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
      voteCount: 0,
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
      voteCount: 0,
    },
  ];

  it("投票データがない場合、現在の候補の次のインデックスの候補を返す", () => {
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

  it("投票データがある場合、得票順（および評価順）で次点候補を返す", () => {
    // cand-2 が最多得票(2票)、cand-1 が1票、cand-3 が0票
    const votes: FinalVote[] = [
      { id: "v1", eventId: "ev-1", userId: "u1", candidateId: "cand-2", createdAt: "" },
      { id: "v2", eventId: "ev-1", userId: "u2", candidateId: "cand-2", createdAt: "" },
      { id: "v3", eventId: "ev-1", userId: "u3", candidateId: "cand-1", createdAt: "" },
    ];

    // 1位の cand-2 が予約不可だった場合、2位の cand-1 が次点となる
    const next = getNextCandidateSlot(candidates, "cand-2", votes);
    expect(next?.id).toBe("cand-1");

    // 2位の cand-1 も予約不可だった場合、3位の cand-3 が次点となる
    const nextFromSecond = getNextCandidateSlot(candidates, "cand-1", votes);
    expect(nextFromSecond?.id).toBe("cand-3");
  });

  it("候補リストが空の場合は null を返す", () => {
    expect(getNextCandidateSlot([], "cand-1")).toBeNull();
  });
});
