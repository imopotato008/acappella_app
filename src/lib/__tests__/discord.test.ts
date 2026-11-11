import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { sendContactToAdminDm, ContactMessagePayload } from "../discord";

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
