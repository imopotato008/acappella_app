"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  CandidateSlot,
  DateType,
  Event,
  EventResponse,
  EventStatus,
  Location,
  User,
} from "@/types";
import { aggregateResponses } from "@/lib/aggregation";
import { authenticateUser, validateAndCreateUser, resetUserPasswordHelper, DEFAULT_INITIAL_PASSWORD } from "@/lib/auth";
import { canManageLocation, validateLocation } from "@/lib/location";
import { supabase } from "@/lib/supabase";
import { triggerDiscordNotification } from "@/lib/notifyClient";
import { evaluateEventReminders } from "@/lib/reminders";

interface AppContextType {
  currentUser: User | null;
  users: User[];
  events: Event[];
  locations: Location[];
  responses: EventResponse[];
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
    confirmedCandidateIds?: string[] | string
  ) => void;
  updateEventDeadline: (eventId: string, newDeadline: string) => void;
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
  confirmCustomSlots: (eventId: string, slots: CandidateSlot[]) => void;

  resetToInitialData: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const SESSION_USER_ID_KEY = "acappella_session_user_id";
const LOCATION_RESERVATIONS_KEY = "acappella_location_reservations";
const CONFIRMED_SLOTS_KEY = "acappella_confirmed_slots_map";

// 複数確定日程キャッシュヘルパー
function getLocalConfirmedSlotsMap(): Record<string, string[]> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(CONFIRMED_SLOTS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveLocalConfirmedSlots(eventId: string, slotIds: string[]) {
  if (typeof window === "undefined") return;
  try {
    const map = getLocalConfirmedSlotsMap();
    if (slotIds.length > 0) {
      map[eventId] = slotIds;
    } else {
      delete map[eventId];
    }
    localStorage.setItem(CONFIRMED_SLOTS_KEY, JSON.stringify(map));
  } catch {}
}

// Supabaseテーブルに reservation_url カラムがない場合でも即時永続化するためのローカルキャッシュヘルパー
function getLocalReservationMap(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(LOCATION_RESERVATIONS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveLocalReservation(locationId: string, url?: string) {
  if (typeof window === "undefined") return;
  try {
    const map = getLocalReservationMap();
    if (url && url.trim()) {
      map[locationId] = url.trim();
    } else {
      delete map[locationId];
    }
    localStorage.setItem(LOCATION_RESERVATIONS_KEY, JSON.stringify(map));
  } catch {}
}

function removeLocalReservation(locationId: string) {
  if (typeof window === "undefined") return;
  try {
    const map = getLocalReservationMap();
    delete map[locationId];
    localStorage.setItem(LOCATION_RESERVATIONS_KEY, JSON.stringify(map));
  } catch {}
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [responses, setResponses] = useState<EventResponse[]>([]);
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
          candsRes,
        ] = await Promise.all([
          supabase.from("users").select("*"),
          supabase.from("events").select("*").order("created_at", { ascending: false }),
          supabase.from("locations").select("*").order("created_at", { ascending: true }),
          supabase.from("event_responses").select("*"),
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
          const localConfirmedMap = getLocalConfirmedSlotsMap();
          setEvents(
            eventsRes.data.map((ev: any) => {
              const localIds = localConfirmedMap[ev.id];
              const primaryId = ev.confirmed_candidate_id || undefined;
              const ids = localIds && localIds.length > 0 ? localIds : (primaryId ? [primaryId] : undefined);
              return {
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
                status: (ev.status as EventStatus) || "open",
                confirmedCandidateId: primaryId,
                confirmedCandidateIds: ids,
                createdAt: ev.created_at,
              };
            })
          );
        }

        if (locsRes.data && !locsRes.error) {
          const localMap = getLocalReservationMap();
          setLocations(
            locsRes.data.map((l: any) => ({
              id: l.id,
              name: l.name,
              address: l.address || undefined,
              memo: l.memo || undefined,
              mapUrl: l.map_url || undefined,
              reservationUrl: l.reservation_url || localMap[l.id] || undefined,
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

        return ev;
      });
      return hasChanged ? updated : prev;
    });
  }, [isLoaded, candidateSlots]);

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

  // イベントステータス更新（複数候補ID対応）
  const updateEventStatus = (
    eventId: string,
    status: EventStatus,
    confirmedCandidateIds?: string[] | string
  ) => {
    let ids: string[] = [];
    if (Array.isArray(confirmedCandidateIds)) {
      ids = confirmedCandidateIds;
    } else if (confirmedCandidateIds) {
      ids = [confirmedCandidateIds];
    }
    const primaryId = ids[0] || undefined;

    setEvents((prev) =>
      prev.map((ev) => {
        if (ev.id !== eventId) return ev;
        if (status === "open") {
          saveLocalConfirmedSlots(eventId, []);
          return {
            ...ev,
            status,
            confirmedCandidateId: undefined,
            confirmedCandidateIds: undefined,
          };
        }
        const finalIds =
          ids.length > 0
            ? ids
            : ev.confirmedCandidateIds || (ev.confirmedCandidateId ? [ev.confirmedCandidateId] : []);
        if (status === "confirmed" || status === "booking_pending" || status === "completed") {
          saveLocalConfirmedSlots(eventId, finalIds);
        }
        return {
          ...ev,
          status,
          confirmedCandidateId: primaryId || ev.confirmedCandidateId,
          confirmedCandidateIds: finalIds,
        };
      })
    );

    // Supabase に非同期保存
    supabase
      .from("events")
      .update({
        status,
        confirmed_candidate_id: primaryId || (status === "open" ? null : null),
      })
      .eq("id", eventId)
      .then();

    // 日程確定時のDiscord通知
    if (status === "confirmed") {
      const targetEvent = events.find((e) => e.id === eventId);
      const cands = candidateSlots[eventId] || [];
      const matchedSlots = cands.filter((c) =>
        ids.length > 0
          ? ids.includes(c.id)
          : targetEvent?.confirmedCandidateIds?.includes(c.id) || c.id === targetEvent?.confirmedCandidateId
      );

      let summaryText = "";
      if (matchedSlots.length > 1) {
        summaryText = matchedSlots
          .map((s, idx) => {
            const loc = locations.find((l) => l.id === s.locationId);
            return `・第${idx + 1}練習日: ${s.date} ${s.startTime}〜${s.endTime} (${loc?.name || "未定"}) [${s.attendeeCount}名可]`;
          })
          .join("\n");
      }

      const firstSlot = matchedSlots[0];
      const firstLoc = firstSlot ? locations.find((l) => l.id === firstSlot.locationId) : null;

      if (targetEvent) {
        triggerDiscordNotification({
          type: "event_confirmed",
          eventId,
          eventTitle: targetEvent.title,
          confirmedSlotsSummary: summaryText || undefined,
          confirmedDate: firstSlot?.date,
          confirmedTime: firstSlot ? `${firstSlot.startTime} 〜 ${firstSlot.endTime}` : undefined,
          confirmedLocationName: firstLoc?.name || "未定",
          confirmedAttendeesCount: firstSlot?.attendeeCount,
        });
      }
    }
  };

  // 回答期限の更新
  const updateEventDeadline = (eventId: string, newDeadline: string) => {
    setEvents((prev) =>
      prev.map((ev) => (ev.id === eventId ? { ...ev, deadline: newDeadline } : ev))
    );

    // Supabase に非同期保存
    supabase
      .from("events")
      .update({ deadline: newDeadline })
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
    saveLocalReservation(newLoc.id, newLoc.reservationUrl);

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
    if (updatedLoc.reservationUrl !== undefined) {
      saveLocalReservation(locationId, updatedLoc.reservationUrl);
    }

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
    removeLocalReservation(locationId);

    // Supabase から削除
    supabase.from("locations").delete().eq("id", locationId).then();

    return { success: true };
  };

  // 集計の実行（候補スロットを算出して保存し、集計完了状態にする）
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

    // ステータスを集計完了にする
    updateEventStatus(eventId, "aggregated");

    return result;
  };

  // 幹事による自由指定確定日程の登録・保存
  const confirmCustomSlots = (eventId: string, slots: CandidateSlot[]) => {
    if (slots.length === 0) return;

    // 候補枠一覧（candidateSlots）を更新・追加保存
    setCandidateSlots((prev) => {
      const existing = prev[eventId] || [];
      const map = new Map<string, CandidateSlot>();
      existing.forEach((s) => map.set(s.id, s));
      slots.forEach((s) => map.set(s.id, s));
      const merged = Array.from(map.values());

      supabase
        .from("candidate_slots")
        .upsert({
          event_id: eventId,
          slots: merged,
          updated_at: new Date().toISOString(),
        })
        .then();

      return { ...prev, [eventId]: merged };
    });

    const slotIds = slots.map((s) => s.id);
    updateEventStatus(eventId, "booking_pending", slotIds);
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
        candidateSlots,
        login,
        logout,
        updateProfile,
        createUser,
        resetUserPassword,
        createEvent,
        updateEventStatus,
        updateEventDeadline,
        deleteEvent,
        saveResponse,
        addLocation,
        updateLocation,
        deleteLocation,
        calculateAggregation,
        confirmCustomSlots,
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
