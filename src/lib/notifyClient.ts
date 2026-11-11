import { ScheduleNotificationPayload } from "./discord";

/**
 * クライアントからDiscord通知APIを安全に呼び出す（エラー時はコンソールログのみでアプリ動作を阻害しない）
 */
export async function triggerDiscordNotification(
  payload: ScheduleNotificationPayload
): Promise<boolean> {
  try {
    const res = await fetch("/api/discord/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    return Boolean(data.success);
  } catch (err) {
    console.warn("Failed to trigger Discord notification:", err);
    return false;
  }
}
