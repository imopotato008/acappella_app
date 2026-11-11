/**
 * Discord API 連携ヘルパー
 */

export interface ContactMessagePayload {
  message: string;
  isAnonymous: boolean;
  userId?: string;
  userNickname?: string;
}

export interface DiscordSendResult {
  success: boolean;
  error?: string;
}

export type DiscordNotificationType =
  | "event_created"
  | "deadline_reminder_3d"
  | "deadline_reminder_1d"
  | "voting_started"
  | "voting_deadline_reminder_1d"
  | "event_confirmed";

export interface ScheduleNotificationPayload {
  type: DiscordNotificationType;
  eventId: string;
  eventTitle: string;
  organizerNickname?: string;
  deadline?: string;
  votingDeadline?: string;
  durationMinutes?: number;
  candidateSummary?: string;
  confirmedDate?: string;
  confirmedTime?: string;
  confirmedLocationName?: string;
  confirmedAttendeesCount?: number;
  eventUrl?: string;
}

/**
 * 日程連絡チャンネルIDを取得（環境変数またはGuildチャンネル検索）
 */
export async function getScheduleChannelId(
  token: string,
  customFetch: typeof fetch = fetch
): Promise<string | null> {
  if (process.env.DISCORD_SCHEDULE_CHANNEL_ID) {
    return process.env.DISCORD_SCHEDULE_CHANNEL_ID;
  }

  const guildId = process.env.DISCORD_GUILD_ID || "1317371281418485790";
  try {
    const res = await customFetch(
      `https://discord.com/api/v10/guilds/${guildId}/channels`,
      {
        headers: { Authorization: `Bot ${token}` },
      }
    );
    if (!res.ok) return null;
    const channels = (await res.json()) as Array<{ id: string; name: string; type: number }>;
    if (!Array.isArray(channels)) return null;

    // 「日程連絡」チャンネルを優先検索
    const found = channels.find(
      (c) => c.type === 0 && (c.name === "日程連絡" || c.name.includes("日程"))
    );
    return found ? found.id : null;
  } catch {
    return null;
  }
}

/**
 * 日程調整イベントに関する通知を「日程連絡」チャンネルに送信する
 */
export async function sendScheduleNotificationToChannel(
  payload: ScheduleNotificationPayload,
  customFetch: typeof fetch = fetch
): Promise<DiscordSendResult> {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) {
    return {
      success: false,
      error: "DISCORD_BOT_TOKEN が環境変数に設定されていません。",
    };
  }

  const channelId =
    process.env.DISCORD_SCHEDULE_CHANNEL_ID || (await getScheduleChannelId(token, customFetch));

  if (!channelId) {
    return {
      success: false,
      error: "日程連絡チャンネルが見つかりませんでした。",
    };
  }

  const defaultBaseUrl =
    process.env.NEXT_PUBLIC_APP_URL || "https://acappella-app.vercel.app";
  const targetUrl =
    payload.eventUrl || `${defaultBaseUrl}/events/${payload.eventId}`;

  let title = "";
  let description = "";
  let color = 0x6366f1; // Indigo
  const fields: Array<{ name: string; value: string; inline?: boolean }> = [];

  const formatJst = (isoString?: string) => {
    if (!isoString) return "未定";
    try {
      return new Date(isoString).toLocaleString("ja-JP", {
        timeZone: "Asia/Tokyo",
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoString;
    }
  };

  switch (payload.type) {
    case "event_created":
      title = `📢 【新規日程調整】${payload.eventTitle}`;
      description = `新しい日程調整が作成されました！\n下記のリンクから希望の日程・練習場所を回答してください。`;
      color = 0x6366f1; // Indigo
      if (payload.organizerNickname) {
        fields.push({ name: "幹事", value: payload.organizerNickname, inline: true });
      }
      if (payload.durationMinutes) {
        fields.push({
          name: "練習時間",
          value: `${Math.floor(payload.durationMinutes / 60)}時間${payload.durationMinutes % 60 > 0 ? `${payload.durationMinutes % 60}分` : ""}`,
          inline: true,
        });
      }
      if (payload.deadline) {
        fields.push({ name: "回答期限", value: formatJst(payload.deadline), inline: true });
      }
      break;

    case "deadline_reminder_3d":
      title = `⏰ 【回答期限まであと3日】${payload.eventTitle}`;
      description = `日程調整の回答期限が近づいています（残り3日）。\nまだ回答されていないメンバーは、お早めに回答をお願いします！`;
      color = 0xf59e0b; // Amber
      if (payload.deadline) {
        fields.push({ name: "回答期限", value: formatJst(payload.deadline), inline: true });
      }
      break;

    case "deadline_reminder_1d":
      title = `🚨 【回答期限は明日まで！】${payload.eventTitle}`;
      description = `日程調整の回答期限が明日となりました。\n未回答の方は本日中に希望日程・場所の回答をお願いします！`;
      color = 0xef4444; // Red
      if (payload.deadline) {
        fields.push({ name: "回答期限", value: formatJst(payload.deadline), inline: true });
      }
      break;

    case "voting_started":
      title = `🗳️ 【最終投票が開始されました】${payload.eventTitle}`;
      description = `日程調整の集計が完了し、複数の最有力候補があるため最終投票を開始しました！\n下記のリンクより希望する候補に投票してください。`;
      color = 0x8b5cf6; // Purple
      if (payload.votingDeadline) {
        fields.push({ name: "投票期限", value: formatJst(payload.votingDeadline), inline: true });
      }
      if (payload.candidateSummary) {
        fields.push({ name: "候補一覧", value: payload.candidateSummary });
      }
      break;

    case "voting_deadline_reminder_1d":
      title = `🚨 【最終投票の期限は明日まで！】${payload.eventTitle}`;
      description = `最終投票の締切が明日となりました。\nまだ投票されていない方は、忘れずに投票をお願いします！`;
      color = 0xef4444; // Red
      if (payload.votingDeadline) {
        fields.push({ name: "投票期限", value: formatJst(payload.votingDeadline), inline: true });
      }
      break;

    case "event_confirmed":
      title = `🎉 【練習日程・場所が確定しました】${payload.eventTitle}`;
      description = `スタジオの予約が完了し、練習日程・場所が確定しました！メンバーの皆様はスケジュールのご確認をお願いします。`;
      color = 0x10b981; // Emerald
      if (payload.confirmedDate && payload.confirmedTime) {
        fields.push({
          name: "確定日時",
          value: `${payload.confirmedDate} ${payload.confirmedTime}`,
          inline: true,
        });
      }
      if (payload.confirmedLocationName) {
        fields.push({
          name: "練習場所",
          value: payload.confirmedLocationName,
          inline: true,
        });
      }
      if (payload.confirmedAttendeesCount !== undefined) {
        fields.push({
          name: "参加人数",
          value: `${payload.confirmedAttendeesCount}名`,
          inline: true,
        });
      }
      break;
  }

  // 詳細画面へのリンクを必須追加
  fields.push({
    name: "🔗 日程調整ページ",
    value: `[👉 クリックして詳細を開く](${targetUrl})`,
  });

  try {
    const postRes = await customFetch(
      `https://discord.com/api/v10/channels/${channelId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bot ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          embeds: [
            {
              title,
              description,
              color,
              fields,
              footer: {
                text: "Acappella Hub 日程連絡システム",
              },
            },
          ],
        }),
      }
    );

    if (!postRes.ok) {
      const errText = await postRes.text();
      return {
        success: false,
        error: `Discordメッセージ送信エラー (Status: ${postRes.status}): ${errText}`,
      };
    }

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      error: `Discord通信エラー: ${message}`,
    };
  }
}

/**
 * お問い合わせメッセージを管理者のDiscord個人DMへ送信する
 */
export async function sendContactToAdminDm(
  payload: ContactMessagePayload,
  customFetch: typeof fetch = fetch
): Promise<DiscordSendResult> {
  const token = process.env.DISCORD_BOT_TOKEN;
  const adminUserId = process.env.DISCORD_ADMIN_USER_ID || "492691434177036299";

  if (!token) {
    return {
      success: false,
      error: "DISCORD_BOT_TOKEN が環境変数に設定されていません。",
    };
  }

  if (!payload.message || !payload.message.trim()) {
    return {
      success: false,
      error: "メッセージ内容を入力してください。",
    };
  }

  try {
    // 1. 管理者とのDMチャンネルを取得/作成
    const dmChannelRes = await customFetch(
      "https://discord.com/api/v10/users/@me/channels",
      {
        method: "POST",
        headers: {
          Authorization: `Bot ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipient_id: adminUserId,
        }),
      }
    );

    if (!dmChannelRes.ok) {
      const errText = await dmChannelRes.text();
      return {
        success: false,
        error: `DMチャンネルの作成に失敗しました (Status: ${dmChannelRes.status}): ${errText}`,
      };
    }

    const dmChannel = (await dmChannelRes.json()) as { id: string };
    const channelId = dmChannel.id;

    // 2. 送信者情報の生成
    const senderDisplay = payload.isAnonymous
      ? "🔒 匿名ユーザー"
      : `${payload.userNickname || "不明なユーザー"} (ID: ${payload.userId || "不明"})`;

    const nowTokyo = new Date().toLocaleString("ja-JP", {
      timeZone: "Asia/Tokyo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

    // 3. DMチャンネルへEmbedメッセージを送信
    const postMessageRes = await customFetch(
      `https://discord.com/api/v10/channels/${channelId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bot ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          embeds: [
            {
              title: "📩 Acappella Hub お問い合わせ・ご意見",
              color: 0x6366f1, // Indigo
              fields: [
                {
                  name: "👤 送信者",
                  value: senderDisplay,
                  inline: true,
                },
                {
                  name: "🕒 送信日時 (JST)",
                  value: nowTokyo,
                  inline: true,
                },
                {
                  name: "📝 内容",
                  value: payload.message.trim(),
                },
              ],
              footer: {
                text: "Acappella Hub Contact System",
              },
            },
          ],
        }),
      }
    );

    if (!postMessageRes.ok) {
      const errText = await postMessageRes.text();
      return {
        success: false,
        error: `Discordメッセージの送信に失敗しました (Status: ${postMessageRes.status}): ${errText}`,
      };
    }

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      error: `通信エラー: ${message}`,
    };
  }
}
