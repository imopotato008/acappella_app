import {
  AttendeeDetail,
  CandidateSlot,
  Event,
  EventResponse,
  Location,
} from "@/types";

// "HH:mm" を 0:00 からの経過分数に変換
export function timeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
}

// 分数を "HH:mm" 形式に変換
export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export interface AggregationResult {
  maxAttendeeCount: number;
  candidates: CandidateSlot[];
  autoConfirmed: boolean; // 候補が1件のみで自動確定か
}

/**
 * 日程調整の回答を集計し、最大参加可能人数となる練習日時・場所の候補を算出する
 * （途中参加・途中退出のメンバーも参加可能として集計し、内訳やフル参加人数を評価する）
 */
export function aggregateResponses(
  event: Event,
  responses: EventResponse[],
  locations: Location[]
): AggregationResult {
  // 参加可能と回答したメンバーのみ対象
  const attendableResponses = responses.filter((r) => r.canAttend);
  if (attendableResponses.length === 0) {
    return {
      maxAttendeeCount: 0,
      candidates: [],
      autoConfirmed: false,
    };
  }

  const duration = event.durationMinutes; // 例: 120分
  const slotStep = 30; // 30分刻み

  // 全回答の中から登場する「日付」の一覧を取得
  const allDates = new Set<string>();
  attendableResponses.forEach((res) => {
    res.timeSlots.forEach((slot) => {
      allDates.add(slot.date);
    });
  });

  // 全登録・提案場所のID一覧
  const locationIds = locations.map((loc) => loc.id);

  const potentialCandidates: Omit<CandidateSlot, "id" | "voteCount">[] = [];

  // 各日付ごとに走査
  for (const date of Array.from(allDates)) {
    // この日に回答のある時間枠から、最早開始時刻と最遅終了時刻を求める
    let minTime = 24 * 60;
    let maxTime = 0;

    attendableResponses.forEach((res) => {
      res.timeSlots
        .filter((slot) => slot.date === date)
        .forEach((slot) => {
          const s = timeToMinutes(slot.startTime);
          const e = timeToMinutes(slot.endTime);
          if (s < minTime) minTime = s;
          if (e > maxTime) maxTime = e;
        });
    });

    if (maxTime - minTime < duration) continue;

    // 最早開始から30分刻みで、duration 分間の枠をスライド探索
    for (let startM = minTime; startM + duration <= maxTime; startM += slotStep) {
      const endM = startM + duration;
      const startTimeStr = minutesToTime(startM);
      const endTimeStr = minutesToTime(endM);

      // 各場所について集計
      for (const locId of locationIds) {
        const attendeeIds: string[] = [];
        const fullAttendeeIds: string[] = [];
        const partialAttendeeIds: string[] = [];
        const attendeeDetails: Record<string, AttendeeDetail> = {};

        for (const res of attendableResponses) {
          // このメンバーが指定場所 locId を含み、かつ候補枠 [startM, endM] と重なりがあるスロットを探す
          // （同一日内に複数スロットがある場合は、最も重なりが大きいものを優先）
          let bestOverlapMinutes = 0;
          let bestDetail: AttendeeDetail | null = null;

          const candidateSlotsForUser = res.timeSlots.filter(
            (slot) => slot.date === date && slot.locations.some((l) => l.locationId === locId)
          );

          for (const slot of candidateSlotsForUser) {
            const slotStart = timeToMinutes(slot.startTime);
            const slotEnd = timeToMinutes(slot.endTime);

            // 重なり計算
            const overlapStartM = Math.max(startM, slotStart);
            const overlapEndM = Math.min(endM, slotEnd);
            const overlapM = overlapEndM - overlapStartM;

            // 30分以上の重なりが必要
            if (overlapM >= 30) {
              const isFull = slotStart <= startM && slotEnd >= endM;
              const isLate = slotStart > startM && slotEnd >= endM;
              const isEarly = slotStart <= startM && slotEnd < endM;
              const type = isFull ? "full" : isLate ? "late" : isEarly ? "early" : "partial";

              // より長い重なり、あるいはフル参加のスロットを採用
              if (
                overlapM > bestOverlapMinutes ||
                (overlapM === bestOverlapMinutes && isFull)
              ) {
                bestOverlapMinutes = overlapM;
                bestDetail = {
                  userId: res.userId,
                  type,
                  overlapMinutes: overlapM,
                  overlapStart: minutesToTime(overlapStartM),
                  overlapEnd: minutesToTime(overlapEndM),
                };
              }
            }
          }

          if (bestDetail) {
            attendeeIds.push(res.userId);
            attendeeDetails[res.userId] = bestDetail;

            if (bestDetail.type === "full") {
              fullAttendeeIds.push(res.userId);
            } else {
              partialAttendeeIds.push(res.userId);
            }
          }
        }

        if (attendeeIds.length > 0) {
          // バンドとして全員が揃って練習できる時間（分、参加人数は乗算しない）
          const commonStartM = Math.max(
            startM,
            ...Object.values(attendeeDetails).map((d) => timeToMinutes(d.overlapStart))
          );
          const commonEndM = Math.min(
            endM,
            ...Object.values(attendeeDetails).map((d) => timeToMinutes(d.overlapEnd))
          );
          const bandPracticeMinutes = Math.max(0, commonEndM - commonStartM);

          potentialCandidates.push({
            eventId: event.id,
            date,
            startTime: startTimeStr,
            endTime: endTimeStr,
            locationId: locId,
            attendeeUserIds: attendeeIds,
            attendeeCount: attendeeIds.length,
            bandPracticeMinutes,
            totalAttendanceMinutes: bandPracticeMinutes, // 互換用
            fullAttendeeUserIds: fullAttendeeIds,
            partialAttendeeUserIds: partialAttendeeIds,
            attendeeDetails,
            priorityScore: 0, // 場所希望スコアは廃止
          });
        }
      }
    }
  }

  if (potentialCandidates.length === 0) {
    return {
      maxAttendeeCount: 0,
      candidates: [],
      autoConfirmed: false,
    };
  }

  // 1. 最も多くの人が参加可能な候補を抽出
  const maxAttendeeCount = Math.max(...potentialCandidates.map((c) => c.attendeeCount));
  const step1Candidates = potentialCandidates.filter((c) => c.attendeeCount === maxAttendeeCount);

  // 2. 最も多くの時間練習が可能な候補を抽出（バンド練習可能時間が最大、参加人数で乗算しない）
  const maxPracticeMinutes = Math.max(...step1Candidates.map((c) => c.bandPracticeMinutes));
  const step2Candidates = step1Candidates.filter(
    (c) => c.bandPracticeMinutes === maxPracticeMinutes
  );

  // 3. 複数ある場合は「フル参加可能なメンバーが最も多い候補」を抽出
  const maxFullAttendees = Math.max(...step2Candidates.map((c) => c.fullAttendeeUserIds.length));
  const bestCandidates = step2Candidates.filter(
    (c) => c.fullAttendeeUserIds.length === maxFullAttendees
  );

  // 日付順・開始時刻順にソート
  bestCandidates.sort((a, b) => {
    if (a.date !== b.date) {
      return a.date.localeCompare(b.date);
    }
    return timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
  });

  const candidatesWithId: CandidateSlot[] = bestCandidates.map((c, idx) => ({
    ...c,
    id: `cand-${event.id}-${idx + 1}`,
    voteCount: 0,
  }));

  // 単独1件なら即座に自動確定！複数ある場合のみ最終投票へ進む
  return {
    maxAttendeeCount,
    candidates: candidatesWithId,
    autoConfirmed: candidatesWithId.length === 1,
  };
}

