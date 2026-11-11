"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  CandidateSlot,
  DateType,
  Event,
  EventResponse,
  EventStatus,
  FinalVote,
  Location,
  User,
} from "@/types";
import { aggregateResponses } from "@/lib/aggregation";
import { authenticateUser, validateAndCreateUser, resetUserPasswordHelper, DEFAULT_INITIAL_PASSWORD } from "@/lib/auth";
import { canManageLocation, validateLocation } from "@/lib/location";
import { toggleVote } from "@/lib/voting";
import { supabase } from "@/lib/supabase";
import { triggerDiscordNotification } from "@/lib/notifyClient";
import { evaluateEventReminders } from "@/lib/reminders";

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
  createUser: (newUser: {
    id: string;
    password: string;
    nickname: string;
    bio?: string;
    isAdmin?: boolean;
  }) => { success: boolean; message?: string };
  resetUserPassword: (targetUserId: string, newPassword?: string) => { success: boolean; message?: string };

  createEvent: (event: Omit<Event, "id" | "createdAt" | "status">) => Event;
  updateEventStatus: (
    eventId: string,
    status: EventStatus,
    confirmedCandidateId?: string
  ) => void;
  updateVotingDeadline: (eventId: string, newDeadline: string) => void;
  deleteEvent: (eventId: string) => void;

  saveResponse: (response: Omit<EventResponse, "id" | "updatedAt">) => void;
  addLocation: (
    name: string,
    address?: string,
    memo?: string,
    mapUrl?: string,
    reservationUrl?: string
  ) => Location;
  updateLocation: (
    locationId: string,
    data: {
      name: string;
      address?: string;
      memo?: string;
      mapUrl?: string;
      reservationUrl?: string;
    }
  ) => { success: boolean; message?: string };
  deleteLocation: (locationId: string) => { success: boolean; message?: string };

  calculateAggregation: (eventId: string) => {
    maxAttendeeCount: number;
    candidates: CandidateSlot[];
    autoConfirmed: boolean;
  };
  castVote: (eventId: string, candidateId: string) => void;

  resetToInitialData: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const SESSION_USER_ID_KEY = "acappella_session_user_id";

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [responses, setResponses] = useState<EventResponse[]>([]);
  const [finalVotes, setFinalVotes] = useState<FinalVote[]>([]);
  const [candidateSlots, setCandidateSlots] = useState<Record<string, CandidateSlot[]>>({});

  // Supabase からの初期データ読み込み
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const [
          usersRes,
          eventsRes,
          locsRes,
          respsRes,
          votesRes,
          candsRes,
        ] = await Promise.all([
          supabase.from("users").select("*"),
          supabase.from("events").select("*").order("created_at", { ascending: false }),
          supabase.from("locations").select("*").order("created_at", { ascending: true }),
          supabase.from("event_responses").select("*"),
          supabase.from("final_votes").select("*"),
          supabase.from("candidate_slots").select("*"),
        ]);

        if (!isMounted) return;

        let loadedUsers: User[] = [];
        if (usersRes.data && !usersRes.error) {
          loadedUsers = usersRes.data.map((u: any) => ({
            id: u.id,
            password: u.password,
            nickname: u.nickname,
            bio: u.bio || "",
            isAdmin: Boolean(u.is_admin),
          }));
          setUsers(loadedUsers);
        }

        if (eventsRes.data && !eventsRes.error) {
          setEvents(
            eventsRes.data.map((ev: any) => ({
              id: ev.id,
              title: ev.title,
              description: ev.description || "",
              organizerId: ev.organizer_id,
              dateType: (ev.date_type as DateType) || "candidate",
              candidateDates: ev.candidate_dates || undefined,
              startDate: ev.start_date || undefined,
              endDate: ev.end_date || undefined,
              durationMinutes: Number(ev.duration_minutes) || 120,
              deadline: ev.deadline,
              votingDeadline: ev.voting_deadline || undefined,
              status: (ev.status as EventStatus) || "open",
              confirmedCandidateId: ev.confirmed_candidate_id || undefined,
              createdAt: ev.created_at,
            }))
          );
        }

        if (locsRes.data && !locsRes.error) {
          setLocations(
            locsRes.data.map((l: any) => ({
              id: l.id,
              name: l.name,
              address: l.address || undefined,
              memo: l.memo || undefined,
              mapUrl: l.map_url || undefined,
              reservationUrl: l.reservation_url || undefined,
              createdBy: l.created_by || undefined,
              createdAt: l.created_at,
            }))
          );
        }

        if (respsRes.data && !respsRes.error) {
          setResponses(
            respsRes.data.map((r: any) => ({
              id: r.id,
              eventId: r.event_id,
              userId: r.user_id,
              canAttend: Boolean(r.can_attend),
              memo: r.memo || undefined,
              timeSlots: r.time_slots || [],
              updatedAt: r.updated_at,
            }))
          );
        }

        if (votesRes.data && !votesRes.error) {
          setFinalVotes(
            votesRes.data.map((v: any) => ({
              id: v.id,
              eventId: v.event_id,
              candidateId: v.candidate_id,
              userId: v.user_id,
              createdAt: v.created_at,
            }))
          );
        }

        if (candsRes.data && !candsRes.error) {
          const map: Record<string, CandidateSlot[]> = {};
          for (const item of candsRes.data) {
            map[item.event_id] = item.slots || [];
          }
          setCandidateSlots(map);
        }

        // ログインセッションの復元
        try {
          const savedUserId = localStorage.getItem(SESSION_USER_ID_KEY);
          if (savedUserId && loadedUsers.length > 0) {
            const matched = loadedUsers.find((u) => u.id === savedUserId);
            if (matched) {
              setCurrentUser(matched);
            }
          }
        } catch {}
      } catch (err) {
        console.error("Failed to load data from Supabase:", err);
      } finally {
        if (isMounted) {
          setIsLoaded(true);
        }
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
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
              supabase
                .from("events")
                .update({ status: "completed" })
                .eq("id", ev.id)
                .then();
              return { ...ev, status: "completed" as EventStatus };
            }
          }
        }

        // 2. 投票期限切れの自動確定判定
        if (ev.status === "voting" && ev.votingDeadline) {
          const deadlineDate = new Date(ev.votingDeadline);
          if (now >= deadlineDate) {
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
                hasChanged = true;
                const winCandId = topCands[0].id;
                supabase
                  .from("events")
                  .update({
                    status: "booking_pending",
                    confirmed_candidate_id: winCandId,
                  })
                  .eq("id", ev.id)
                  .then();
                return {
                  ...ev,
                  status: "booking_pending" as EventStatus,
                  confirmedCandidateId: winCandId,
                };
              }
            }
          }
        }

        return ev;
      });
      return hasChanged ? updated : prev;
    });
  }, [isLoaded, candidateSlots, finalVotes]);

  // 回答期限・投票期限の自動リマインダー通知 (残り3日、残り1日)
  useEffect(() => {
    if (!isLoaded || events.length === 0) return;
    try {
      const NOTIFIED_KEY = "acappella_sent_reminders";
      const stored = localStorage.getItem(NOTIFIED_KEY);
      const sentKeys = new Set<string>(stored ? JSON.parse(stored) : []);

      const reminders = evaluateEventReminders(events, new Date(), sentKeys);
      if (reminders.length > 0) {
        reminders.forEach((item) => {
          triggerDiscordNotification({
            type: item.type,
            eventId: item.eventId,
            eventTitle: item.eventTitle,
            deadline: item.deadline,
            votingDeadline: item.votingDeadline,
          });
          sentKeys.add(item.reminderKey);
        });
        localStorage.setItem(NOTIFIED_KEY, JSON.stringify(Array.from(sentKeys)));
      }
    } catch (e) {
      console.warn("Reminder check error:", e);
    }
  }, [isLoaded, events]);

  // ログイン処理
  const login = (id: string, password: string): { success: boolean; message?: string } => {
    const res = authenticateUser(users, id, password);
    if (!res.success || !res.user) {
      return { success: false, message: res.message };
    }
    setCurrentUser(res.user);
    try {
      localStorage.setItem(SESSION_USER_ID_KEY, res.user.id);
    } catch {}
    return { success: true };
  };

  // ログアウト処理
  const logout = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem(SESSION_USER_ID_KEY);
    } catch {}
  };

  // プロフィール更新
  const updateProfile = (nickname: string, bio: string, password?: string) => {
    if (!currentUser) return;
    const newPassword = password && password.trim() !== "" ? password : currentUser.password;
    const updatedUser: User = {
      ...currentUser,
      nickname,
      bio,
      password: newPassword,
    };

    setCurrentUser(updatedUser);
    setUsers((prev) => prev.map((u) => (u.id === currentUser.id ? updatedUser : u)));

    // Supabase に非同期保存
    supabase
      .from("users")
      .update({
        nickname,
        bio,
        password: newPassword,
      })
      .eq("id", currentUser.id)
      .then();
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

    const created = res.createdUser;
    setUsers((prev) => [...prev, created]);

    // Supabase に非同期保存
    supabase
      .from("users")
      .insert({
        id: created.id,
        password: created.password,
        nickname: created.nickname,
        bio: created.bio || "",
        is_admin: created.isAdmin ?? false,
      })
      .then();

    return { success: true };
  };

  // 管理者によるパスワードリセット
  const resetUserPassword = (
    targetUserId: string,
    newPassword = DEFAULT_INITIAL_PASSWORD
  ): { success: boolean; message?: string } => {
    const res = resetUserPasswordHelper(currentUser, users, targetUserId, newPassword);
    if (!res.success || !res.updatedUsers) {
      return { success: false, message: res.message };
    }

    setUsers(res.updatedUsers);

    // Supabase に非同期保存
    supabase
      .from("users")
      .update({ password: newPassword.trim() })
      .eq("id", targetUserId)
      .then();

    return { success: true, message: `パスワードを「${newPassword}」にリセットしました。` };
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

    // Supabase に非同期保存
    supabase
      .from("events")
      .insert({
        id: newEvent.id,
        title: newEvent.title,
        description: newEvent.description || "",
        organizer_id: newEvent.organizerId,
        date_type: newEvent.dateType,
        candidate_dates: newEvent.candidateDates || null,
        start_date: newEvent.startDate || null,
        end_date: newEvent.endDate || null,
        duration_minutes: newEvent.durationMinutes,
        deadline: newEvent.deadline,
        status: newEvent.status,
        created_at: newEvent.createdAt,
      })
      .then();

    // Discord 日程連絡チャンネルへ通知
    triggerDiscordNotification({
      type: "event_created",
      eventId: newEvent.id,
      eventTitle: newEvent.title,
      organizerNickname: currentUser?.nickname,
      durationMinutes: newEvent.durationMinutes,
      deadline: newEvent.deadline,
    });

    return newEvent;
  };

  // イベントステータス更新
  const updateEventStatus = (
    eventId: string,
    status: EventStatus,
    confirmedCandidateId?: string
  ) => {
    const targetCandidateId =
      status === "confirmed" || status === "booking_pending" || status === "completed"
        ? confirmedCandidateId
        : undefined;

    setEvents((prev) =>
      prev.map((ev) =>
        ev.id === eventId
          ? {
              ...ev,
              status,
              confirmedCandidateId: targetCandidateId || ev.confirmedCandidateId,
            }
          : ev
      )
    );

    // Supabase に非同期保存
    supabase
      .from("events")
      .update({
        status,
        confirmed_candidate_id: targetCandidateId || null,
      })
      .eq("id", eventId)
      .then();

    // 日程確定時のDiscord通知
    if (status === "confirmed") {
      const targetEvent = events.find((e) => e.id === eventId);
      const cands = candidateSlots[eventId] || [];
      const slot = cands.find((c) => c.id === (targetCandidateId || targetEvent?.confirmedCandidateId));
      if (targetEvent && slot) {
        const loc = locations.find((l) => l.id === slot.locationId);
        triggerDiscordNotification({
          type: "event_confirmed",
          eventId,
          eventTitle: targetEvent.title,
          confirmedDate: slot.date,
          confirmedTime: `${slot.startTime} 〜 ${slot.endTime}`,
          confirmedLocationName: loc?.name || "未定",
          confirmedAttendeesCount: slot.attendeeCount,
        });
      }
    }
  };

  // 最終投票期限の更新
  const updateVotingDeadline = (eventId: string, newDeadline: string) => {
    setEvents((prev) =>
      prev.map((ev) =>
        ev.id === eventId ? { ...ev, votingDeadline: newDeadline } : ev
      )
    );

    // Supabase に非同期保存
    supabase
      .from("events")
      .update({ voting_deadline: newDeadline })
      .eq("id", eventId)
      .then();
  };

  // イベント削除
  const deleteEvent = (eventId: string) => {
    setEvents((prev) => prev.filter((ev) => ev.id !== eventId));
    setResponses((prev) => prev.filter((r) => r.eventId !== eventId));

    // Supabase から削除
    supabase.from("events").delete().eq("id", eventId).then();
  };

  // 回答の保存
  const saveResponse = (responseData: Omit<EventResponse, "id" | "updatedAt">) => {
    let targetId = `res-${Date.now()}`;
    setResponses((prev) => {
      const existingIdx = prev.findIndex(
        (r) => r.eventId === responseData.eventId && r.userId === responseData.userId
      );
      if (existingIdx >= 0) {
        targetId = prev[existingIdx].id;
      }
      const updated: EventResponse = {
        ...responseData,
        id: targetId,
        updatedAt: new Date().toISOString(),
      };
      if (existingIdx >= 0) {
        const copy = [...prev];
        copy[existingIdx] = updated;
        return copy;
      }
      return [...prev, updated];
    });

    // Supabase に upsert
    supabase
      .from("event_responses")
      .upsert(
        {
          id: targetId,
          event_id: responseData.eventId,
          user_id: responseData.userId,
          can_attend: responseData.canAttend,
          memo: responseData.memo || "",
          time_slots: responseData.timeSlots,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "event_id,user_id" }
      )
      .then();
  };

  // 練習場所の新規追加
  const addLocation = (
    name: string,
    address?: string,
    memo?: string,
    mapUrl?: string,
    reservationUrl?: string
  ): Location => {
    const newLoc: Location = {
      id: `loc-${Date.now()}`,
      name,
      address,
      memo,
      mapUrl:
        mapUrl ||
        (address
          ? `https://maps.google.com/?q=${encodeURIComponent(name + " " + address)}`
          : undefined),
      reservationUrl: reservationUrl?.trim() || undefined,
      createdBy: currentUser ? currentUser.id : undefined,
      createdAt: new Date().toISOString(),
    };
    setLocations((prev) => [...prev, newLoc]);

    // Supabase に保存
    const insertPayload: Record<string, any> = {
      id: newLoc.id,
      name: newLoc.name,
      address: newLoc.address || "",
      memo: newLoc.memo || "",
      map_url: newLoc.mapUrl || "",
      created_by: newLoc.createdBy || null,
      created_at: newLoc.createdAt,
    };
    if (newLoc.reservationUrl) {
      insertPayload.reservation_url = newLoc.reservationUrl;
    }

    supabase
      .from("locations")
      .insert(insertPayload)
      .then((res) => {
        // もしカラムが存在しない等のエラーが出た場合は reservation_url なしで再試行
        if (res.error && res.error.message?.includes("reservation_url")) {
          delete insertPayload.reservation_url;
          supabase.from("locations").insert(insertPayload).then();
        }
      });

    return newLoc;
  };

  // 練習場所の更新
  const updateLocation = (
    locationId: string,
    data: {
      name: string;
      address?: string;
      memo?: string;
      mapUrl?: string;
      reservationUrl?: string;
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

    const updatedLoc = {
      name: data.name.trim(),
      address: data.address?.trim() || undefined,
      memo: data.memo?.trim() || undefined,
      mapUrl:
        data.mapUrl?.trim() ||
        (data.address?.trim()
          ? `https://maps.google.com/?q=${encodeURIComponent(
              data.name.trim() + " " + data.address.trim()
            )}`
          : target.mapUrl),
      reservationUrl: data.reservationUrl !== undefined ? (data.reservationUrl.trim() || undefined) : target.reservationUrl,
    };

    setLocations((prev) =>
      prev.map((l) => (l.id === locationId ? { ...l, ...updatedLoc } : l))
    );

    // Supabase に更新保存
    const updatePayload: Record<string, any> = {
      name: updatedLoc.name,
      address: updatedLoc.address || "",
      memo: updatedLoc.memo || "",
      map_url: updatedLoc.mapUrl || "",
    };
    if (updatedLoc.reservationUrl !== undefined) {
      updatePayload.reservation_url = updatedLoc.reservationUrl || null;
    }

    supabase
      .from("locations")
      .update(updatePayload)
      .eq("id", locationId)
      .then((res) => {
        if (res.error && res.error.message?.includes("reservation_url")) {
          delete updatePayload.reservation_url;
          supabase.from("locations").update(updatePayload).eq("id", locationId).then();
        }
      });

    return { success: true };
  };

  // 練習場所の削除
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

    // Supabase から削除
    supabase.from("locations").delete().eq("id", locationId).then();

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

    // Supabase に候補スロットを保存
    supabase
      .from("candidate_slots")
      .upsert({
        event_id: eventId,
        slots: result.candidates,
        updated_at: new Date().toISOString(),
      })
      .then();

    if (result.autoConfirmed && result.candidates.length === 1) {
      updateEventStatus(eventId, "booking_pending", result.candidates[0].id);
    } else if (result.candidates.length > 1) {
      const defaultVotingDeadline = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
      setEvents((prev) =>
        prev.map((ev) =>
          ev.id === eventId
            ? { ...ev, status: "voting", votingDeadline: defaultVotingDeadline }
            : ev
        )
      );
      supabase
        .from("events")
        .update({
          status: "voting",
          voting_deadline: defaultVotingDeadline,
        })
        .eq("id", eventId)
        .then();

      // 最終投票開始のDiscord通知
      const candSummary = result.candidates
        .map((c, idx) => {
          const loc = locations.find((l) => l.id === c.locationId);
          return `・候補${idx + 1}: ${c.date} ${c.startTime}〜${c.endTime} (${loc?.name || "未定"}) [${c.attendeeCount}名可]`;
        })
        .join("\n");

      triggerDiscordNotification({
        type: "voting_started",
        eventId,
        eventTitle: targetEvent.title,
        votingDeadline: defaultVotingDeadline,
        candidateSummary: candSummary,
      });
    } else {
      updateEventStatus(eventId, "aggregated");
    }

    return result;
  };

  // 最終投票
  const castVote = (eventId: string, candidateId: string) => {
    if (!currentUser) return;

    const isAlreadyVoted = finalVotes.some(
      (v) =>
        v.eventId === eventId &&
        v.userId === currentUser.id &&
        v.candidateId === candidateId
    );

    setFinalVotes((prev) => toggleVote(prev, eventId, candidateId, currentUser.id));

    if (isAlreadyVoted) {
      supabase
        .from("final_votes")
        .delete()
        .match({ event_id: eventId, user_id: currentUser.id })
        .then();
    } else {
      supabase
        .from("final_votes")
        .upsert(
          {
            id: `vote-${Date.now()}`,
            event_id: eventId,
            candidate_id: candidateId,
            user_id: currentUser.id,
            created_at: new Date().toISOString(),
          },
          { onConflict: "event_id,user_id" }
        )
        .then();
    }
  };

  // （互換性のためインターフェースを維持）
  const resetToInitialData = () => {
    logout();
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
        resetUserPassword,
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
