import { Event } from "@/types";
import { DiscordNotificationType } from "./discord";

export interface ReminderNotificationItem {
  eventId: string;
  eventTitle: string;
  type: DiscordNotificationType;
  reminderKey: string;
  deadline?: string;
}

/**
 * 日本時間 (Asia/Tokyo) の日付・時間を取得するヘルパー
 */
export function getJstDateParts(date: Date) {
  const jstString = date.toLocaleString("en-US", { timeZone: "Asia/Tokyo" });
  const jst = new Date(jstString);
  const year = jst.getFullYear();
  const month = String(jst.getMonth() + 1).padStart(2, "0");
  const day = String(jst.getDate()).padStart(2, "0");
  const hours = jst.getHours();
  return {
    year,
    month,
    day,
    hours,
    dateString: `${year}-${month}-${day}`,
  };
}

/**
 * イベントの回答期限を評価し、リマインダー通知を送るべき対象を算出する
 * ※通知時刻は日本時間（JST）の午前10時（10:00〜10:59）に固定
 */
export function evaluateEventReminders(
  events: Event[],
  now: Date,
  sentReminderKeys: Set<string>
): ReminderNotificationItem[] {
  const items: ReminderNotificationItem[] = [];
  const nowJst = getJstDateParts(now);

  // 通知時刻は午前10時（JST 10:00〜10:59）に固定
  if (nowJst.hours !== 10) {
    return items;
  }

  // 今日の午前0時 (JST)
  const todayMidnight = new Date(`${nowJst.dateString}T00:00:00+09:00`).getTime();

  events.forEach((ev) => {
    // 回答受付中 (open) の回答期限リマインド
    if (ev.status === "open" && ev.deadline) {
      const deadlineDate = new Date(ev.deadline);
      const deadlineJst = getJstDateParts(deadlineDate);
      const deadlineMidnight = new Date(`${deadlineJst.dateString}T00:00:00+09:00`).getTime();

      // 日付ベースの日数差
      const diffDays = Math.round((deadlineMidnight - todayMidnight) / (1000 * 60 * 60 * 24));

      // 残り3日リマインド（締切が3日後）
      if (diffDays === 3) {
        const key3d = `${ev.id}_deadline_3d_${nowJst.dateString}`;
        if (!sentReminderKeys.has(key3d)) {
          items.push({
            eventId: ev.id,
            eventTitle: ev.title,
            type: "deadline_reminder_3d",
            reminderKey: key3d,
            deadline: ev.deadline,
          });
        }
      }

      // 残り1日リマインド（締切が1日後＝明日）
      if (diffDays === 1) {
        const key1d = `${ev.id}_deadline_1d_${nowJst.dateString}`;
        if (!sentReminderKeys.has(key1d)) {
          items.push({
            eventId: ev.id,
            eventTitle: ev.title,
            type: "deadline_reminder_1d",
            reminderKey: key1d,
            deadline: ev.deadline,
          });
        }
      }
    }
  });

  return items;
}


