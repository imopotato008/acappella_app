import { CandidateSlot, FinalVote } from "@/types";
import { evaluateVotingResult } from "./voting";

/**
 * 現在の候補が予約不可だった場合の次点候補枠を取得する
 * 1. 投票データが存在する場合は、得票順・タイブレーク順（evaluateVotingResult）に並べた順序から次点候補を取得
 * 2. 投票データがない場合は、集計スロット一覧（candidateSlots）の次のインデックスを取得
 */
export function getNextCandidateSlot(
  candidates: CandidateSlot[],
  currentCandidateId?: string,
  votes: FinalVote[] = []
): CandidateSlot | null {
  if (!candidates || candidates.length === 0) return null;

  let sortedCandidates: CandidateSlot[] = [];

  if (votes.length > 0) {
    // 投票結果による順位付け（得票数が多い順、同票は元の候補順を維持）
    const evalResult = evaluateVotingResult(candidates, votes);
    sortedCandidates = [...evalResult.candidatesWithVotes].sort(
      (a, b) => b.currentVoteCount - a.currentVoteCount
    );
  } else {
    sortedCandidates = [...candidates];
  }

  const currentIdx = sortedCandidates.findIndex((c) => c.id === currentCandidateId);
  if (currentIdx === -1) {
    // 現在のIDが見つからない場合は先頭を返す
    return sortedCandidates[0] || null;
  }

  const nextIdx = currentIdx + 1;
  if (nextIdx < sortedCandidates.length) {
    return sortedCandidates[nextIdx];
  }

  // これ以上の次点候補がない
  return null;
}
