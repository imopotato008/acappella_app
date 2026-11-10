import { ResponseTimeSlot, SlotLocationChoice } from "@/types";

export interface TimeSlotInput {
  date: string;
  startTime: string;
  endTime: string;
  locations: SlotLocationChoice[];
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * 参加可能時間帯の入力内容バリデーション
 */
export function validateTimeSlot(slot: TimeSlotInput): ValidationResult {
  if (!slot.date || !slot.date.trim()) {
    return { valid: false, error: "日付を選択してください。" };
  }
  if (!slot.startTime || !slot.endTime || slot.startTime >= slot.endTime) {
    return { valid: false, error: "終了時刻は開始時刻より後に設定してください。" };
  }
  if (!slot.locations || slot.locations.length === 0) {
    return { valid: false, error: "この時間帯に利用可能な練習場所を1箇所以上選択してください。" };
  }
  return { valid: true };
}

/**
 * 既存の時間帯リスト内の特定スロットを更新
 */
export function updateTimeSlot(
  slots: ResponseTimeSlot[],
  slotId: string,
  updatedData: Partial<Omit<ResponseTimeSlot, "id">>
): ResponseTimeSlot[] {
  return slots.map((s) => (s.id === slotId ? { ...s, ...updatedData } : s));
}

/**
 * 新しい時間帯をリストに追加
 */
export function addTimeSlot(
  slots: ResponseTimeSlot[],
  newSlot: ResponseTimeSlot
): ResponseTimeSlot[] {
  return [...slots, newSlot];
}

/**
 * 指定したIDの時間帯を削除
 */
export function removeTimeSlot(
  slots: ResponseTimeSlot[],
  slotId: string
): ResponseTimeSlot[] {
  return slots.filter((s) => s.id !== slotId);
}

