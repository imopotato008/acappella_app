// バンドメンバー・ユーザー型
// 個人情報は含めず、id, password, nickname, bio, isAdmin に厳選
export interface User {
  id: string; // ログインID (例: "ken", "misaki", "shota" など)
  password: string; // ログイン用パスワード
  nickname: string; // あだ名・表示名
  bio?: string; // 自己紹介
  isAdmin?: boolean; // 管理者権限フラグ（アカウント作成・追加権限）
}

// 練習場所型
export interface Location {
  id: string;
  name: string;
  address?: string;
  memo?: string;
  mapUrl?: string; // Google Mapの共有URLまたは検索リンク
  reservationUrl?: string; // 予約サイトURL (Web予約ページなど)
  createdBy?: string; // 登録者ID
  createdAt: string;
}

// 日程調整イベントのステータス
// "open": 回答受付中, "aggregated": 集計完了, "voting": 最終投票中, "confirmed": 確定済み, "completed": 練習終了, "cancelled": 中止
export type EventStatus = "open" | "aggregated" | "voting" | "confirmed" | "completed" | "cancelled";

// 日程指定方式
export type DateType = "candidate" | "range";

// 日程調整イベント型
export interface Event {
  id: string;
  title: string;
  description?: string;
  organizerId: string; // 幹事のUser.id
  dateType: DateType;
  candidateDates?: string[]; // "YYYY-MM-DD" の配列 (candidate方式)
  startDate?: string; // "YYYY-MM-DD" (range方式)
  endDate?: string; // "YYYY-MM-DD" (range方式)
  durationMinutes: number; // 練習時間（30分単位: 60, 90, 120, 180など）
  deadline: string; // ISO string (回答期限)
  votingDeadline?: string; // ISO string (最終投票期限)
  status: EventStatus;
  confirmedCandidateId?: string;
  createdAt: string;
}

// 時間帯ごとの利用可能練習場所（順位付けは廃止し、利用可能な場所を指定）
export interface SlotLocationChoice {
  locationId: string;
  priorityRank?: number; // 互換性のためのオプショナル（集計・確定ロジックでは不使用）
}

// 参加可能時間帯 (30分単位)
export interface ResponseTimeSlot {
  id: string;
  date: string; // "YYYY-MM-DD"
  startTime: string; // "13:00"
  endTime: string; // "17:30"
  locations: SlotLocationChoice[];
}

// メンバー回答型
export interface EventResponse {
  id: string;
  eventId: string;
  userId: string;
  canAttend: boolean; // true: 参加可能, false: 参加不可
  memo?: string;
  timeSlots: ResponseTimeSlot[];
  updatedAt: string;
}

// 参加タイプ（フル参加、遅刻参加、早退、途中参加・途中退出）
export type AttendanceType = "full" | "late" | "early" | "partial";

// 候補枠における各メンバーの参加詳細
export interface AttendeeDetail {
  userId: string;
  type: AttendanceType;
  overlapMinutes: number; // 参加可能な分数
  overlapStart: string; // 参加可能開始 "13:30"
  overlapEnd: string;   // 参加可能終了 "15:00"
}

// 集計された候補枠型
export interface CandidateSlot {
  id: string;
  eventId: string;
  date: string; // "YYYY-MM-DD"
  startTime: string; // "13:00"
  endTime: string; // "15:00"
  locationId: string;
  attendeeUserIds: string[]; // 参加可能メンバーID (フル + 途中参加の合計)
  attendeeCount: number; // 参加可能人数 (総人数)
  bandPracticeMinutes: number; // バンドとして練習可能な時間（全員が揃う共通時間、分。参加人数は乗算しない）
  totalAttendanceMinutes?: number; // 旧互換用
  fullAttendeeUserIds: string[]; // フル参加可能なメンバーID
  partialAttendeeUserIds: string[]; // 途中参加・途中退出のメンバーID
  attendeeDetails: Record<string, AttendeeDetail>; // メンバーID -> 参加詳細
  priorityScore?: number; // 旧互換用（廃止）
  voteCount: number; // 最終投票の得票数
}

// 最終投票型
export interface FinalVote {
  id: string;
  eventId: string;
  candidateId: string;
  userId: string;
  createdAt: string;
}
