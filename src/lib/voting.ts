import { CandidateSlot, FinalVote } from "@/types";

export interface CandidateWithVotes extends CandidateSlot {
  currentVoteCount: number;
}

export interface VotingEvaluationResult {
  candidatesWithVotes: CandidateWithVotes[];
  maxVoteCount: number;
  topVotedCandidates: CandidateWithVotes[];
  isTieVote: boolean;
  scorePriorityWinner: CandidateWithVotes | null;
  finalTieCandidates: CandidateWithVotes[];
  isCompleteTie: boolean;
  winnerCandidate: CandidateWithVotes | null; // 単独1位、またはスコア優先による単独勝者
}

/**
 * 投票結果を評価し、最多得票者・タイブレーク・完全同票を判定する純粋関数
 */
export function evaluateVotingResult(
  candidates: CandidateSlot[],
  votes: FinalVote[]
): VotingEvaluationResult {
  const candidatesWithVotes: CandidateWithVotes[] = candidates.map((c) => ({
    ...c,
    currentVoteCount: votes.filter((v) => v.candidateId === c.id).length,
  }));

  const maxVoteCount = Math.max(0, ...candidatesWithVotes.map((c) => c.currentVoteCount));
  const topVotedCandidates =
    votes.length > 0
      ? candidatesWithVotes.filter((c) => c.currentVoteCount === maxVoteCount)
      : [];

  const isTieVote = topVotedCandidates.length > 1;
  const finalTieCandidates = isTieVote ? topVotedCandidates : [];
  const isCompleteTie = isTieVote; // 場所希望スコアは廃止されたため、同票＝幹事タイブレーク
  const winnerCandidate = topVotedCandidates.length === 1 ? topVotedCandidates[0] : null;

  return {
    candidatesWithVotes,
    maxVoteCount,
    topVotedCandidates,
    isTieVote,
    scorePriorityWinner: null,
    finalTieCandidates,
    isCompleteTie,
    winnerCandidate,
  };
}

/**
 * 投票の登録または取り消し（トグル）を行う純粋関数
 * 既に同じ候補に投票済みなら取り消し、未投票または別候補なら投票を更新
 */
export function toggleVote(
  currentVotes: FinalVote[],
  eventId: string,
  candidateId: string,
  userId: string
): FinalVote[] {
  const existingVote = currentVotes.find(
    (v) => v.eventId === eventId && v.userId === userId && v.candidateId === candidateId
  );

  const filtered = currentVotes.filter(
    (v) => !(v.eventId === eventId && v.userId === userId)
  );

  if (existingVote) {
    // 同じ候補に投票済みなら取り消し！
    return filtered;
  }

  // 新規投票または投票先の変更
  const newVote: FinalVote = {
    id: `vote-${Date.now()}`,
    eventId,
    candidateId,
    userId,
    createdAt: new Date().toISOString(),
  };

  return [...filtered, newVote];
}

