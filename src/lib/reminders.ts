import { Event } from "@/types";
import { DiscordNotificationType } from "./discord";

export interface ReminderNotificationItem {
  eventId: string;
  eventTitle: string;
  type: DiscordNotificationType;
  reminderKey: string;
  deadline?: string;
  votingDeadline?: string;
}

/**
 * イベントの回答期限・投票期限を評価し、リマインダー通知を送るべき対象を算出する
 */
export function evaluateEventReminders(
  events: Event[],
  now: Date,
  sentReminderKeys: Set<string>
): ReminderNotificationItem[] {
  const items: ReminderNotificationItem[] = [];

  events.forEach((ev) => {
    // 1. 回答受付中 (open) の回答期限リマインド
    if (ev.status === "open" && ev.deadline) {
      const deadlineDate = new Date(ev.deadline);
      const diffMs = deadlineDate.getTime() - now.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);

      // 残り3日リマインド (48時間超〜72時間以下)
      const key3d = `${ev.id}_deadline_3d`;
      if (diffHours > 24 && diffHours <= 72 && !sentReminderKeys.has(key3d)) {
        items.push({
          eventId: ev.id,
          eventTitle: ev.title,
          type: "deadline_reminder_3d",
          reminderKey: key3d,
          deadline: ev.deadline,
        });
      }

      // 残り1日リマインド (0時間超〜24時間以下)
      const key1d = `${ev.id}_deadline_1d`;
      if (diffHours > 0 && diffHours <= 24 && !sentReminderKeys.has(key1d)) {
        items.push({
          eventId: ev.id,
          eventTitle: ev.title,
          type: "deadline_reminder_1d",
          reminderKey: key1d,
          deadline: ev.deadline,
        });
      }
    }

    // 2. 最終投票中 (voting) の投票期限リマインド
    if (ev.status === "voting" && ev.votingDeadline) {
      const votingDeadlineDate = new Date(ev.votingDeadline);
      const diffMs = votingDeadlineDate.getTime() - now.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);

      // 投票期限残り1日リマインド (0時間超〜24時間以下)
      const keyVote1d = `${ev.id}_voting_deadline_1d`;
      if (diffHours > 0 && diffHours <= 24 && !sentReminderKeys.has(keyVote1d)) {
        items.push({
          eventId: ev.id,
          eventTitle: ev.title,
          type: "voting_deadline_reminder_1d",
          reminderKey: keyVote1d,
          votingDeadline: ev.votingDeadline,
        });
      }
    }
  });

  return items;
}
