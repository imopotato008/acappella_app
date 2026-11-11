import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  sendContactToAdminDm,
  ContactMessagePayload,
  sendScheduleNotificationToChannel,
  ScheduleNotificationPayload,
} from "../discord";

describe("Discord Contact DM Notification", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = {
      ...originalEnv,
      DISCORD_BOT_TOKEN: "mock-bot-token",
      DISCORD_ADMIN_USER_ID: "492691434177036299",
    };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it("トークンが未設定の場合はエラーを返す", async () => {
    delete process.env.DISCORD_BOT_TOKEN;
    const res = await sendContactToAdminDm({
      message: "テスト要望です",
      isAnonymous: false,
    });
    expect(res.success).toBe(false);
    expect(res.error).toContain("DISCORD_BOT_TOKEN");
  });

  it("メッセージが空文字の場合はエラーを返す", async () => {
    const res = await sendContactToAdminDm({
      message: "   ",
      isAnonymous: false,
    });
    expect(res.success).toBe(false);
    expect(res.error).toContain("メッセージ内容を入力してください");
  });

  it("通常送信時、ユーザー名とユーザーIDがEmbedに含まれてDM送信される", async () => {
    let capturedCreateDmBody: unknown = null;
    let capturedMessageBody: unknown = null;

    const mockFetch = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      const urlStr = url.toString();
      if (urlStr.includes("/users/@me/channels")) {
        capturedCreateDmBody = JSON.parse(init?.body as string);
        return {
          ok: true,
          status: 200,
          json: async () => ({ id: "mock-dm-channel-123" }),
        } as Response;
      }
      if (urlStr.includes("/channels/mock-dm-channel-123/messages")) {
        capturedMessageBody = JSON.parse(init?.body as string);
        return {
          ok: true,
          status: 200,
          json: async () => ({ id: "mock-msg-999" }),
        } as Response;
      }
      return { ok: false, status: 404, text: async () => "Not Found" } as Response;
    });

    const payload: ContactMessagePayload = {
      message: "練習日程の機能を追加してください！",
      isAnonymous: false,
      userId: "ohtsuka",
      userNickname: "けんちゃん",
    };

    const res = await sendContactToAdminDm(payload, mockFetch as unknown as typeof fetch);

    expect(res.success).toBe(true);
    expect(capturedCreateDmBody).toEqual({ recipient_id: "492691434177036299" });

    const messageObj = capturedMessageBody as {
      embeds: Array<{
        fields: Array<{ name: string; value: string }>;
      }>;
    };
    expect(messageObj.embeds).toBeDefined();
    const senderField = messageObj.embeds[0].fields.find((f) => f.name.includes("送信者"));
    expect(senderField?.value).toContain("けんちゃん");
    expect(senderField?.value).toContain("ohtsuka");

    const contentField = messageObj.embeds[0].fields.find((f) => f.name.includes("内容"));
    expect(contentField?.value).toBe("練習日程の機能を追加してください！");
  });

  it("匿名送信時、送信者情報が「匿名ユーザー」となりユーザーID等が表示されない", async () => {
    let capturedMessageBody: unknown = null;

    const mockFetch = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      const urlStr = url.toString();
      if (urlStr.includes("/users/@me/channels")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ id: "mock-dm-channel-123" }),
        } as Response;
      }
      if (urlStr.includes("/channels/mock-dm-channel-123/messages")) {
        capturedMessageBody = JSON.parse(init?.body as string);
        return {
          ok: true,
          status: 200,
          json: async () => ({ id: "mock-msg-999" }),
        } as Response;
      }
      return { ok: false, status: 404, text: async () => "Not Found" } as Response;
    });

    const payload: ContactMessagePayload = {
      message: "匿名の問い合わせです。",
      isAnonymous: true,
      userId: "ohtsuka",
      userNickname: "けんちゃん",
    };

    const res = await sendContactToAdminDm(payload, mockFetch as unknown as typeof fetch);

    expect(res.success).toBe(true);

    const messageObj = capturedMessageBody as {
      embeds: Array<{
        fields: Array<{ name: string; value: string }>;
      }>;
    };
    const senderField = messageObj.embeds[0].fields.find((f) => f.name.includes("送信者"));
    expect(senderField?.value).toContain("匿名ユーザー");
    expect(senderField?.value).not.toContain("ohtsuka");
    expect(senderField?.value).not.toContain("けんちゃん");
  });

  it("Discord APIがエラー（DM送信不可など）を返した場合、適切に失敗を返す", async () => {
    const mockFetch = vi.fn(async () => {
      return {
        ok: false,
        status: 403,
        text: async () => "Cannot send messages to this user",
      } as Response;
    });

    const res = await sendContactToAdminDm(
      { message: "テスト", isAnonymous: false },
      mockFetch as unknown as typeof fetch
    );

    expect(res.success).toBe(false);
    expect(res.error).toContain("403");
  });
});

describe("Discord Schedule Notification to Channel", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = {
      ...originalEnv,
      DISCORD_BOT_TOKEN: "mock-bot-token",
      DISCORD_SCHEDULE_CHANNEL_ID: "1317372821277773835",
    };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it("event_created: 新規日程調整作成時にタイトル・リンク・詳細が含まれて送信される", async () => {
    let capturedBody: unknown = null;
    let targetUrl: string = "";

    const mockFetch = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      targetUrl = url.toString();
      capturedBody = JSON.parse(init?.body as string);
      return { ok: true, status: 200, json: async () => ({ id: "msg-1" }) } as Response;
    });

    const payload: ScheduleNotificationPayload = {
      type: "event_created",
      eventId: "ev-100",
      eventTitle: "12月クリスマス練習",
      organizerNickname: "けんちゃん",
      durationMinutes: 120,
      deadline: "2026-12-05T00:00:00.000Z",
      eventUrl: "https://acappella-app.vercel.app/events/ev-100",
    };

    const res = await sendScheduleNotificationToChannel(payload, mockFetch as unknown as typeof fetch);

    expect(res.success).toBe(true);
    expect(targetUrl).toContain("/channels/1317372821277773835/messages");

    const body = capturedBody as {
      embeds: Array<{
        title: string;
        fields: Array<{ name: string; value: string }>;
      }>;
    };
    expect(body.embeds[0].title).toContain("【新規日程調整】12月クリスマス練習");
    const linkField = body.embeds[0].fields.find((f) => f.name.includes("日程調整ページ"));
    expect(linkField?.value).toContain("https://acappella-app.vercel.app/events/ev-100");
  });

  it("event_confirmed: 日程確定時に確定日時・場所・参加人数・リンクが含まれて送信される", async () => {
    let capturedBody: unknown = null;

    const mockFetch = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      capturedBody = JSON.parse(init?.body as string);
      return { ok: true, status: 200, json: async () => ({ id: "msg-2" }) } as Response;
    });

    const payload: ScheduleNotificationPayload = {
      type: "event_confirmed",
      eventId: "ev-200",
      eventTitle: "12月定期練習",
      confirmedDate: "2026-12-15",
      confirmedTime: "13:00 〜 15:00",
      confirmedLocationName: "サウンドスタジオ NOAH 渋谷店",
      confirmedAttendeesCount: 6,
      eventUrl: "https://acappella-app.vercel.app/events/ev-200",
    };

    const res = await sendScheduleNotificationToChannel(payload, mockFetch as unknown as typeof fetch);

    expect(res.success).toBe(true);

    const body = capturedBody as {
      embeds: Array<{
        title: string;
        fields: Array<{ name: string; value: string }>;
      }>;
    };
    expect(body.embeds[0].title).toContain("【練習日程・場所が確定しました】");
    const dateField = body.embeds[0].fields.find((f) => f.name === "確定日時");
    expect(dateField?.value).toContain("2026-12-15 13:00 〜 15:00");
    const locField = body.embeds[0].fields.find((f) => f.name === "練習場所");
    expect(locField?.value).toContain("サウンドスタジオ NOAH 渋谷店");
    const linkField = body.embeds[0].fields.find((f) => f.name.includes("日程調整ページ"));
    expect(linkField?.value).toContain("https://acappella-app.vercel.app/events/ev-200");
  });

  it("voting_started & deadline reminders: 投票開始や期限リマインド通知が正しく送信される", async () => {
    const mockFetch = vi.fn(async () => {
      return { ok: true, status: 200, json: async () => ({ id: "msg-3" }) } as Response;
    });

    const resVoting = await sendScheduleNotificationToChannel(
      {
        type: "voting_started",
        eventId: "ev-300",
        eventTitle: "合宿日程調整",
        votingDeadline: "2026-12-10T12:00:00.000Z",
      },
      mockFetch as unknown as typeof fetch
    );
    expect(resVoting.success).toBe(true);

    const resReminder = await sendScheduleNotificationToChannel(
      {
        type: "deadline_reminder_1d",
        eventId: "ev-300",
        eventTitle: "合宿日程調整",
        deadline: "2026-12-08T12:00:00.000Z",
      },
      mockFetch as unknown as typeof fetch
    );
    expect(resReminder.success).toBe(true);
  });
});
