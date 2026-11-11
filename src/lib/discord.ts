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
