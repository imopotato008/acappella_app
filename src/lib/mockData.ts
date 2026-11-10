import { Event, EventResponse, Location, User } from "@/types";

export const INITIAL_USERS: User[] = [
  { id: "ken", password: "password123", nickname: "けんちゃん", bio: "リードボーカルメインで歌ってます！", isAdmin: true },
  { id: "misaki", password: "password123", nickname: "みーちゃん", bio: "高音ハモリとコーラス担当です。", isAdmin: false },
  { id: "shota", password: "password123", nickname: "しょーた", bio: "中音域コーラスです。よろしくお願いします！", isAdmin: false },
  { id: "aya", password: "password123", nickname: "あや", bio: "サードコーラス担当。リズム感重視。", isAdmin: false },
  { id: "daisuke", password: "password123", nickname: "なべさん", bio: "ベース担当。低音でバンドを支えます。", isAdmin: false },
  { id: "tsubasa", password: "password123", nickname: "つばさ", bio: "ボイパ（ビートボックス）やってます！", isAdmin: false },
];

export const INITIAL_LOCATIONS: Location[] = [
  {
    id: "loc-1",
    name: "サウンドスタジオ NOAH 渋谷店",
    address: "東京都渋谷区宇田川町36-6",
    memo: "ボーカルマイク6本無料レンタル可能。駅徒歩5分。",
    mapUrl: "https://maps.google.com/?q=サウンドスタジオNOAH+渋谷店",
    createdAt: "2026-11-01T00:00:00Z",
  },
  {
    id: "loc-2",
    name: "スタジオ ペントハウス 新宿",
    address: "東京都新宿区西新宿7-10-17",
    memo: "アコースティック向けの響きが良いスタジオ。キーボード常設。",
    mapUrl: "https://maps.google.com/?q=東京都新宿区西新宿7-10-17",
    createdAt: "2026-11-01T00:00:00Z",
  },
  {
    id: "loc-3",
    name: "中野区民センター 音楽練習室",
    address: "東京都中野区中野4-11-19",
    memo: "公営施設のため格安。要事前予約。",
    mapUrl: "https://maps.google.com/?q=東京都中野区中野4-11-19",
    createdAt: "2026-11-01T00:00:00Z",
  },
];

export const INITIAL_EVENTS: Event[] = [
  {
    id: "ev-1",
    title: "12月度 本番前集中練習",
    description: "クリスマスライブに向けた通し練習を行います。最低2時間は確保したいです！",
    organizerId: "ken",
    dateType: "candidate",
    candidateDates: ["2026-12-05", "2026-12-06", "2026-12-12", "2026-12-13"],
    durationMinutes: 120, // 2時間
    deadline: "2026-11-25T23:59:59Z",
    status: "open",
    createdAt: "2026-11-08T10:00:00Z",
  },
  {
    id: "ev-2",
    title: "新曲レパートリー音合わせ",
    description: "新しく決まったバラード曲のパート練習とハモリ確認。",
    organizerId: "misaki",
    dateType: "range",
    startDate: "2026-11-20",
    endDate: "2026-11-24",
    durationMinutes: 90, // 1時間30分
    deadline: "2026-11-15T23:59:59Z",
    status: "confirmed",
    confirmedCandidateId: "cand-ev-2-1",
    createdAt: "2026-11-02T12:00:00Z",
  },
  {
    id: "ev-past",
    title: "秋の定期ライブ振り返り練習",
    description: "ライブ本番の録音確認と次回に向けた課題の洗い出し。",
    organizerId: "ken",
    dateType: "candidate",
    candidateDates: ["2026-10-15"],
    durationMinutes: 120,
    deadline: "2026-10-10T23:59:59Z",
    status: "completed",
    confirmedCandidateId: "cand-past-1",
    createdAt: "2026-10-01T10:00:00Z",
  },
];

export const INITIAL_RESPONSES: EventResponse[] = [
  {
    id: "res-1",
    eventId: "ev-1",
    userId: "ken",
    canAttend: true,
    memo: "土日は終日空いてます！",
    timeSlots: [
      {
        id: "slot-1-1",
        date: "2026-12-05",
        startTime: "13:00",
        endTime: "19:00",
        locations: [
          { locationId: "loc-1", priorityRank: 1 },
          { locationId: "loc-2", priorityRank: 2 },
        ],
      },
      {
        id: "slot-1-2",
        date: "2026-12-06",
        startTime: "13:00",
        endTime: "18:00",
        locations: [
          { locationId: "loc-1", priorityRank: 1 },
          { locationId: "loc-3", priorityRank: 2 },
        ],
      },
    ],
    updatedAt: "2026-11-08T12:30:00Z",
  },
  {
    id: "res-2",
    eventId: "ev-1",
    userId: "misaki",
    canAttend: true,
    timeSlots: [
      {
        id: "slot-2-1",
        date: "2026-12-05",
        startTime: "14:00",
        endTime: "20:00",
        locations: [
          { locationId: "loc-1", priorityRank: 1 },
          { locationId: "loc-2", priorityRank: 2 },
        ],
      },
    ],
    updatedAt: "2026-11-08T14:10:00Z",
  },
  {
    id: "res-3",
    eventId: "ev-1",
    userId: "shota",
    canAttend: true,
    timeSlots: [
      {
        id: "slot-3-1",
        date: "2026-12-05",
        startTime: "13:30",
        endTime: "17:30",
        locations: [
          { locationId: "loc-1", priorityRank: 1 },
        ],
      },
    ],
    updatedAt: "2026-11-09T09:20:00Z",
  },
  {
    id: "res-4",
    eventId: "ev-1",
    userId: "aya",
    canAttend: false,
    memo: "この週末は実家に帰省のため不参加です、すみません！",
    timeSlots: [],
    updatedAt: "2026-11-08T18:00:00Z",
  },
];
