import { CandidateSlot } from "@/types";

/**
 * 現在の候補が予約不可だった場合の次点候補枠を取得する
 * 候補スロット一覧（candidateSlots）から、現在の候補の次のインデックスを取得
 */
export function getNextCandidateSlot(
  candidates: CandidateSlot[],
  currentCandidateId?: string
): CandidateSlot | null {
  if (!candidates || candidates.length === 0) return null;

  const currentIdx = candidates.findIndex((c) => c.id === currentCandidateId);
  if (currentIdx === -1) {
    // 現在のIDが見つからない場合は先頭を返す
    return candidates[0] || null;
  }

  const nextIdx = currentIdx + 1;
  if (nextIdx < candidates.length) {
    return candidates[nextIdx];
  }

  // これ以上の次点候補がない
  return null;
}

