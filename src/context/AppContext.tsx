"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  CandidateSlot,
  Event,
  EventResponse,
  EventStatus,
  FinalVote,
  Location,
  User,
} from "@/types";
import {
  INITIAL_EVENTS,
  INITIAL_LOCATIONS,
  INITIAL_RESPONSES,
  INITIAL_USERS,
} from "@/lib/mockData";
import { aggregateResponses } from "@/lib/aggregation";
import { authenticateUser, validateAndCreateUser } from "@/lib/auth";
import { canManageLocation, validateLocation } from "@/lib/location";
import { toggleVote } from "@/lib/voting";

interface AppContextType {
  currentUser: User | null;
  users: User[];
  events: Event[];
  locations: Location[];
  responses: EventResponse[];
  finalVotes: FinalVote[];
  candidateSlots: Record<string, CandidateSlot[]>;
  
  login: (id: string, password: string) => { success: boolean; message?: string };
  logout: () => void;
  updateProfile: (nickname: string, bio: string, password?: string) => void;
  createUser: (newUser: { id: string; password: string; nickname: string; bio?: string; isAdmin?: boolean }) => { success: boolean; message?: string };
  
  createEvent: (event: Omit<Event, "id" | "createdAt" | "status">) => Event;
  updateEventStatus: (eventId: string, status: EventStatus, confirmedCandidateId?: string) => void;
  updateVotingDeadline: (eventId: string, newDeadline: string) => void;
  deleteEvent: (eventId: string) => void;
  
  saveResponse: (response: Omit<EventResponse, "id" | "updatedAt">) => void;
  addLocation: (name: string, address?: string, memo?: string, mapUrl?: string) => Location;
  updateLocation: (
    locationId: string,
    data: { name: string; address?: string; memo?: string; mapUrl?: string }
  ) => { success: boolean; message?: string };
  deleteLocation: (locationId: string) => { success: boolean; message?: string };
  
  calculateAggregation: (eventId: string) => { maxAttendeeCount: number; candidates: CandidateSlot[]; autoConfirmed: boolean };
  castVote: (eventId: string, candidateId: string) => void;
  
  resetToInitialData: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEY = "acappella_app_data_v3";
const LEGACY_STORAGE_KEYS = ["acapella_app_data_v3", "acapella_app_data_v2"];

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [events, setEvents] = useState<Event[]>(INITIAL_EVENTS);
  const [locations, setLocations] = useState<Location[]>(INITIAL_LOCATIONS);
  const [responses, setResponses] = useState<EventResponse[]>(INITIAL_RESPONSES);
  const [finalVotes, setFinalVotes] = useState<FinalVote[]>([]);
  const [candidateSlots, setCandidateSlots] = useState<Record<string, CandidateSlot[]>>({
    "ev-past": [
      {
        id: "cand-past-1",
        eventId: "ev-past",
        date: "2026-10-15",
        startTime: "18:00",
        endTime: "20:00",
        locationId: "loc-1",
        attendeeUserIds: ["ken", "misaki", "shota", "aya", "daisuke", "tsubasa"],
        attendeeCount: 6,
        bandPracticeMinutes: 120,
        totalAttendanceMinutes: 120,
        fullAttendeeUserIds: ["ken", "misaki", "shota", "aya", "daisuke", "tsubasa"],
        partialAttendeeUserIds: [],
        attendeeDetails: {
          ken: { userId: "ken", type: "full", overlapMinutes: 120, overlapStart: "18:00", overlapEnd: "20:00" },
          misaki: { userId: "misaki", type: "full", overlapMinutes: 120, overlapStart: "18:00", overlapEnd: "20:00" },
          shota: { userId: "shota", type: "full", overlapMinutes: 120, overlapStart: "18:00", overlapEnd: "20:00" },
          aya: { userId: "aya", type: "full", overlapMinutes: 120, overlapStart: "18:00", overlapEnd: "20:00" },
          daisuke: { userId: "daisuke", type: "full", overlapMinutes: 120, overlapStart: "18:00", overlapEnd: "20:00" },
          tsubasa: { userId: "tsubasa", type: "full", overlapMinutes: 120, overlapStart: "18:00", overlapEnd: "20:00" },
        },
        priorityScore: 18,
        voteCount: 6,
      },
    ],
  });

  // ローカルストレージからの読み込み（過去キーからの自動移行にも対応）
  useEffect(() => {
    try {
      let stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        for (const legacyKey of LEGACY_STORAGE_KEYS) {
          const legacyData = localStorage.getItem(legacyKey);
          if (legacyData) {
            stored = legacyData;
            break;
          }
        }
      }
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.users) setUsers(parsed.users);
        if (parsed.events) setEvents(parsed.events);
        if (parsed.locations) setLocations(parsed.locations);
        if (parsed.responses) setResponses(parsed.responses);
        if (parsed.finalVotes) setFinalVotes(parsed.finalVotes);
        if (parsed.candidateSlots) setCandidateSlots(parsed.candidateSlots);
        if (parsed.currentUserId) {
          const userList = parsed.users || INITIAL_USERS;
          const u = userList.find((usr: User) => usr.id === parsed.currentUserId);
          if (u) setCurrentUser(u);
        }
      }
    } catch (e) {
      console.error("Failed to load local state", e);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // 確定した練習日程を過ぎた場合に「練習終了 (completed)」へ、
  // または投票期限を過ぎた場合に「確定 (confirmed)」へ自動遷移させるチェック
  useEffect(() => {
    if (!isLoaded) return;
    const now = new Date();

    setEvents((prev) => {
      let hasChanged = false;
      const updated = prev.map((ev) => {
        // 1. 練習終了の自動判定
        if (ev.status === "confirmed" && ev.confirmedCandidateId) {
          const cands = candidateSlots[ev.id] || [];
          const slot = cands.find((c) => c.id === ev.confirmedCandidateId);
          if (slot) {
            const endDateTime = new Date(`${slot.date}T${slot.endTime}:00`);
            if (endDateTime < now) {
              hasChanged = true;
              return { ...ev, status: "completed" as EventStatus };
            }
          }
        }

        // 2. 投票期限切れの自動確定判定
        if (ev.status === "voting" && ev.votingDeadline) {
          const deadlineDate = new Date(ev.votingDeadline);
          if (now >= deadlineDate) {
            // 得票数を集計
            const cands = candidateSlots[ev.id] || [];
            if (cands.length > 0) {
              const eventVotes = finalVotes.filter((v) => v.eventId === ev.id);
              const scoredCands = cands.map((c) => ({
                ...c,
                votes: eventVotes.filter((v) => v.candidateId === c.id).length,
              }));

              const maxVotes = Math.max(0, ...scoredCands.map((c) => c.votes));
              const topCands = scoredCands.filter((c) => c.votes === maxVotes);

              if (topCands.length === 1) {
                // 単独1位なら自動確定！
                hasChanged = true;
                return {
                  ...ev,
                  status: "confirmed" as EventStatus,
                  confirmedCandidateId: topCands[0].id,
                };
              }
              // 同票の場合は自動確定せず、同票候補の中から幹事が最終決定を行う
            }
          }
        }

        return ev;
      });
      return hasChanged ? updated : prev;
    });
  }, [isLoaded, candidateSlots, finalVotes]);

  // ローカルストレージへの自動保存
  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          users,
          events,
          locations,
          responses,
          finalVotes,
          candidateSlots,
          currentUserId: currentUser ? currentUser.id : null,
        })
      );
    } catch (e) {
      console.error("Failed to save local state", e);
    }
  }, [users, events, locations, responses, finalVotes, candidateSlots, currentUser, isLoaded]);

  // ログイン処理
  const login = (id: string, password: string): { success: boolean; message?: string } => {
    const res = authenticateUser(users, id, password);
    if (!res.success || !res.user) {
      return { success: false, message: res.message };
    }
    setCurrentUser(res.user);
    return { success: true };
  };

  // ログアウト処理
  const logout = () => {
    setCurrentUser(null);
  };

  // プロフィール更新
  const updateProfile = (nickname: string, bio: string, password?: string) => {
    if (!currentUser) return;
    const updatedUser: User = {
      ...currentUser,
      nickname,
      bio,
      password: password && password.trim() !== "" ? password : currentUser.password,
    };

    setCurrentUser(updatedUser);
    setUsers((prev) =>
      prev.map((u) => (u.id === currentUser.id ? updatedUser : u))
    );
  };

  // 管理者によるアカウント追加
  const createUser = (newUser: {
    id: string;
    password: string;
    nickname: string;
    bio?: string;
    isAdmin?: boolean;
  }): { success: boolean; message?: string } => {
    const res = validateAndCreateUser(currentUser, users, newUser);
    if (!res.success || !res.createdUser) {
      return { success: false, message: res.message };
    }

    setUsers((prev) => [...prev, res.createdUser!]);
    return { success: true };
  };

  // 新規イベント作成
  const createEvent = (eventData: Omit<Event, "id" | "createdAt" | "status">): Event => {
    const newEvent: Event = {
      ...eventData,
      id: `ev-${Date.now()}`,
      status: "open",
      createdAt: new Date().toISOString(),
    };
    setEvents((prev) => [newEvent, ...prev]);
    return newEvent;
  };

  // イベントステータス更新
  const updateEventStatus = (
    eventId: string,
    status: EventStatus,
    confirmedCandidateId?: string
  ) => {
    setEvents((prev) =>
      prev.map((ev) =>
        ev.id === eventId
          ? {
              ...ev,
              status,
              confirmedCandidateId:
                status === "confirmed" || status === "completed"
                  ? confirmedCandidateId || ev.confirmedCandidateId
                  : status === "open"
                  ? undefined
                  : ev.confirmedCandidateId,
            }
          : ev
      )
    );
  };

  // 最終投票期限の更新
  const updateVotingDeadline = (eventId: string, newDeadline: string) => {
    setEvents((prev) =>
      prev.map((ev) =>
        ev.id === eventId ? { ...ev, votingDeadline: newDeadline } : ev
      )
    );
  };

  // イベント削除
  const deleteEvent = (eventId: string) => {
    setEvents((prev) => prev.filter((ev) => ev.id !== eventId));
    setResponses((prev) => prev.filter((r) => r.eventId !== eventId));
  };

  // 回答の保存
  const saveResponse = (responseData: Omit<EventResponse, "id" | "updatedAt">) => {
    setResponses((prev) => {
      const existingIdx = prev.findIndex(
        (r) => r.eventId === responseData.eventId && r.userId === responseData.userId
      );
      const updated: EventResponse = {
        ...responseData,
        id: existingIdx >= 0 ? prev[existingIdx].id : `res-${Date.now()}`,
        updatedAt: new Date().toISOString(),
      };
      if (existingIdx >= 0) {
        const copy = [...prev];
        copy[existingIdx] = updated;
        return copy;
      }
      return [...prev, updated];
    });
  };

  // 練習場所の新規追加
  const addLocation = (
    name: string,
    address?: string,
    memo?: string,
    mapUrl?: string
  ): Location => {
    const newLoc: Location = {
      id: `loc-${Date.now()}`,
      name,
      address,
      memo,
      mapUrl: mapUrl || (address ? `https://maps.google.com/?q=${encodeURIComponent(name + " " + address)}` : undefined),
      createdBy: currentUser ? currentUser.id : undefined,
      createdAt: new Date().toISOString(),
    };
    setLocations((prev) => [...prev, newLoc]);
    return newLoc;
  };

  // 練習場所の更新（自分が投稿した場所、または管理者のみ編集可能）
  const updateLocation = (
    locationId: string,
    data: {
      name: string;
      address?: string;
      memo?: string;
      mapUrl?: string;
    }
  ): { success: boolean; message?: string } => {
    if (!currentUser) {
      return { success: false, message: "ログインが必要です。" };
    }
    const target = locations.find((l) => l.id === locationId);
    if (!target) {
      return { success: false, message: "対象の練習場所が見つかりません。" };
    }
    if (!canManageLocation(target, currentUser)) {
      return { success: false, message: "自分が登録した練習場所のみ編集できます。" };
    }
    const validation = validateLocation({ name: data.name });
    if (!validation.valid) {
      return { success: false, message: validation.error };
    }

    setLocations((prev) =>
      prev.map((l) =>
        l.id === locationId
          ? {
              ...l,
              name: data.name.trim(),
              address: data.address?.trim() || undefined,
              memo: data.memo?.trim() || undefined,
              mapUrl:
                data.mapUrl?.trim() ||
                (data.address?.trim()
                  ? `https://maps.google.com/?q=${encodeURIComponent(
                      data.name.trim() + " " + data.address.trim()
                    )}`
                  : l.mapUrl),
            }
          : l
      )
    );
    return { success: true };
  };

  // 練習場所の削除（自分が投稿した場所、または管理者のみ削除可能）
  const deleteLocation = (locationId: string): { success: boolean; message?: string } => {
    if (!currentUser) {
      return { success: false, message: "ログインが必要です。" };
    }
    const target = locations.find((l) => l.id === locationId);
    if (!target) {
      return { success: false, message: "対象の練習場所が見つかりません。" };
    }
    if (!canManageLocation(target, currentUser)) {
      return { success: false, message: "自分が登録した練習場所のみ削除できます。" };
    }

    setLocations((prev) => prev.filter((l) => l.id !== locationId));
    return { success: true };
  };

  // 集計の実行
  const calculateAggregation = (eventId: string) => {
    const targetEvent = events.find((e) => e.id === eventId);
    if (!targetEvent) return { maxAttendeeCount: 0, candidates: [], autoConfirmed: false };

    const eventResponses = responses.filter((r) => r.eventId === eventId);
    const result = aggregateResponses(targetEvent, eventResponses, locations);

    setCandidateSlots((prev) => ({
      ...prev,
      [eventId]: result.candidates,
    }));

    if (result.autoConfirmed && result.candidates.length === 1) {
      updateEventStatus(eventId, "confirmed", result.candidates[0].id);
    } else if (result.candidates.length > 1) {
      // 48時間後をデフォルトの投票期限に設定
      const defaultVotingDeadline = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
      setEvents((prev) =>
        prev.map((ev) =>
          ev.id === eventId
            ? { ...ev, status: "voting", votingDeadline: defaultVotingDeadline }
            : ev
        )
      );
    } else {
      updateEventStatus(eventId, "aggregated");
    }

    return result;
  };

  // 最終投票（同じ候補を再度クリックした場合は投票を取り消す）
  const castVote = (eventId: string, candidateId: string) => {
    if (!currentUser) return;
    setFinalVotes((prev) => toggleVote(prev, eventId, candidateId, currentUser.id));
  };

  // 初期化
  const resetToInitialData = () => {
    localStorage.removeItem(STORAGE_KEY);
    setUsers(INITIAL_USERS);
    setEvents(INITIAL_EVENTS);
    setLocations(INITIAL_LOCATIONS);
    setResponses(INITIAL_RESPONSES);
    setFinalVotes([]);
    setCandidateSlots({});
    setCurrentUser(null);
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        users,
        events,
        locations,
        responses,
        finalVotes,
        candidateSlots,
        login,
        logout,
        updateProfile,
        createUser,
        createEvent,
        updateEventStatus,
        updateVotingDeadline,
        deleteEvent,
        saveResponse,
        addLocation,
        updateLocation,
        deleteLocation,
        calculateAggregation,
        castVote,
        resetToInitialData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}
