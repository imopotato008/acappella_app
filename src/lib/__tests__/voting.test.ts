import { describe, expect, it } from "vitest";
import { evaluateVotingResult, toggleVote } from "../voting";
import { CandidateSlot, FinalVote } from "@/types";

function createDummyCandidate(
  id: string
): CandidateSlot {
  return {
    id,
    eventId: "ev-test",
    date: "2026-12-05",
    startTime: "13:00",
    endTime: "15:00",
    locationId: "loc-1",
    attendeeUserIds: ["ken", "misaki"],
    attendeeCount: 2,
    bandPracticeMinutes: 120,
    totalAttendanceMinutes: 120,
    fullAttendeeUserIds: ["ken", "misaki"],
    partialAttendeeUserIds: [],
    attendeeDetails: {},
    voteCount: 0,
  };
}

describe("最終投票・タイブレーク判定ロジック (evaluateVotingResult)", () => {
  it("UT-VOTE-01: 最多得票の単独1位判定（自動確定）", () => {
    const candA = createDummyCandidate("cand-A");
    const candB = createDummyCandidate("cand-B");

    // 候補Aに3票、候補Bに1票
    const votes: FinalVote[] = [
      { id: "v1", eventId: "ev-test", candidateId: "cand-A", userId: "ken", createdAt: "" },
      { id: "v2", eventId: "ev-test", candidateId: "cand-A", userId: "misaki", createdAt: "" },
      { id: "v3", eventId: "ev-test", candidateId: "cand-A", userId: "shota", createdAt: "" },
      { id: "v4", eventId: "ev-test", candidateId: "cand-B", userId: "aya", createdAt: "" },
    ];

    const result = evaluateVotingResult([candA, candB], votes);

    expect(result.maxVoteCount).toBe(3);
    expect(result.isTieVote).toBe(false);
    expect(result.isCompleteTie).toBe(false);
    expect(result.winnerCandidate?.id).toBe("cand-A");
  });

  it("UT-VOTE-02: 同票発生時の幹事決定（タイブレーク）移行判定", () => {
    const candA = createDummyCandidate("cand-A");
    const candB = createDummyCandidate("cand-B");

    // 各2票ずつの同票
    const votes: FinalVote[] = [
      { id: "v1", eventId: "ev-test", candidateId: "cand-A", userId: "ken", createdAt: "" },
      { id: "v2", eventId: "ev-test", candidateId: "cand-A", userId: "misaki", createdAt: "" },
      { id: "v3", eventId: "ev-test", candidateId: "cand-B", userId: "shota", createdAt: "" },
      { id: "v4", eventId: "ev-test", candidateId: "cand-B", userId: "aya", createdAt: "" },
    ];

    const result = evaluateVotingResult([candA, candB], votes);

    // 場所スコアは廃止されたため、同票＝幹事の最終決定に委ねられる
    expect(result.maxVoteCount).toBe(2);
    expect(result.isTieVote).toBe(true);
    expect(result.isCompleteTie).toBe(true);
    expect(result.winnerCandidate).toBeNull(); // 自動決定はされず幹事決定が必要
    expect(result.finalTieCandidates).toHaveLength(2);
  });

  it("UT-VOTE-03: 投票のトグル（同じ候補をもう一度クリックして取り消し）", () => {
    let votes: FinalVote[] = [];

    // 1回目クリック: 候補Aに投票
    votes = toggleVote(votes, "ev-test", "cand-A", "ken");
    expect(votes).toHaveLength(1);
    expect(votes[0].candidateId).toBe("cand-A");

    // 2回目クリック（同じ候補A）: 投票取り消し！
    votes = toggleVote(votes, "ev-test", "cand-A", "ken");
    expect(votes).toHaveLength(0);

    // 別の候補Bをクリック: 候補Bに投票
    votes = toggleVote(votes, "ev-test", "cand-B", "ken");
    expect(votes).toHaveLength(1);
    expect(votes[0].candidateId).toBe("cand-B");

    // 候補Aをクリック: 候補Bから候補Aへ変更
    votes = toggleVote(votes, "ev-test", "cand-A", "ken");
    expect(votes).toHaveLength(1);
    expect(votes[0].candidateId).toBe("cand-A");
  });
});

