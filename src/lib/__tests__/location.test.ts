import { describe, it, expect } from "vitest";
import {
  validateLocation,
  canManageLocation,
  getTargetMapUrl,
  extractUrlFromInput,
  getMapEmbedInfo,
  isEmbedMapHtml,
  getEmbedMapUrl,
} from "../location";
import { Location, User } from "@/types";

describe("Location management helper functions", () => {
  describe("validateLocation", () => {
    it("練習場所名が未入力の場合はエラーを返す", () => {
      expect(validateLocation({ name: "" }).valid).toBe(false);
      expect(validateLocation({ name: "   " }).valid).toBe(false);
    });

    it("練習場所名が入力されていれば有効と判定する", () => {
      const res = validateLocation({
        name: "サウンドスタジオ NOAH 渋谷店",
        address: "東京都渋谷区",
      });
      expect(res.valid).toBe(true);
      expect(res.error).toBeUndefined();
    });
  });

  describe("canManageLocation", () => {
    const sampleLocation: Location = {
      id: "loc-test-1",
      name: "テストスタジオ",
      address: "東京都",
      createdBy: "user-creator",
      createdAt: "2026-11-10T00:00:00.000Z",
    };

    const creatorUser: User = {
      id: "user-creator",
      nickname: "クリエイター",
      password: "pass",
      isAdmin: false,
    };

    const adminUser: User = {
      id: "user-admin",
      nickname: "管理者",
      password: "pass",
      isAdmin: true,
    };

    const otherUser: User = {
      id: "user-other",
      nickname: "一般メンバー",
      password: "pass",
      isAdmin: false,
    };

    it("未ログイン（null）の場合は管理不可（false）", () => {
      expect(canManageLocation(sampleLocation, null)).toBe(false);
    });

    it("管理者ユーザーは作成者でなくても管理可能（true）", () => {
      expect(canManageLocation(sampleLocation, adminUser)).toBe(true);
    });

    it("作成者本人は管理可能（true）", () => {
      expect(canManageLocation(sampleLocation, creatorUser)).toBe(true);
    });

    it("他人が作成した場所は一般ユーザーは管理不可（false）", () => {
      expect(canManageLocation(sampleLocation, otherUser)).toBe(false);
    });

    it("初期データなど作成者未設定（createdBy: undefined）の場合、一般ユーザーは管理不可", () => {
      const officialLocation: Location = {
        ...sampleLocation,
        createdBy: undefined,
      };
      expect(canManageLocation(officialLocation, otherUser)).toBe(false);
      expect(canManageLocation(officialLocation, adminUser)).toBe(true);
    });
  });

  describe("getTargetMapUrl", () => {
    it("登録されたmapUrlがある場合は、名前検索ではなく登録されたリンクURLをそのまま返す", () => {
      const loc = {
        name: "サウンドスタジオ NOAH 渋谷店",
        address: "東京都渋谷区宇田川町39-2",
        mapUrl: "https://maps.app.goo.gl/AbCdEfGh12345",
      };
      // 場所名検索ではなく、登録された mapUrl が直接返ること
      expect(getTargetMapUrl(loc)).toBe("https://maps.app.goo.gl/AbCdEfGh12345");
    });

    it("mapUrlが未登録で住所がある場合は、名前と住所でGoogle Maps検索URLを生成する", () => {
      const loc = {
        name: "新宿村スタジオ",
        address: "東京都新宿区北新宿2-1-2",
      };
      const url = getTargetMapUrl(loc);
      expect(url).toContain("https://www.google.com/maps/search/?api=1&query=");
      expect(url).toContain(encodeURIComponent("新宿村スタジオ 東京都新宿区北新宿2-1-2"));
    });

    it("mapUrlも住所もない場合は、施設名のみで検索URLを生成する", () => {
      const loc = {
        name: "公民館ホール",
      };
      const url = getTargetMapUrl(loc);
      expect(url).toContain("https://www.google.com/maps/search/?api=1&query=");
      expect(url).toContain(encodeURIComponent("公民館ホール"));
    });
  });

  describe("extractUrlFromInput", () => {
    it("iframeタグが貼られた場合、src属性のURLを抽出する", () => {
      const iframeCode =
        '<iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d12345" width="600" height="450" style="border:0;" allowfullscreen="" loading="lazy"></iframe>';
      expect(extractUrlFromInput(iframeCode)).toBe(
        "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d12345"
      );
    });

    it("通常のURL文字列は前後の空白を除去してそのまま返す", () => {
      const plainUrl = "  https://maps.app.goo.gl/AbCdEfGh  ";
      expect(extractUrlFromInput(plainUrl)).toBe("https://maps.app.goo.gl/AbCdEfGh");
    });
  });

  describe("getMapEmbedInfo", () => {
    it("公式埋め込みURL（/maps/embed）の場合はそのままdirect_embedとして埋め込み可能とする", () => {
      const loc = {
        name: "スタジオNOAH",
        mapUrl: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d123",
      };
      const info = getMapEmbedInfo(loc);
      expect(info.canEmbed).toBe(true);
      expect(info.sourceType).toBe("direct_embed");
      expect(info.embedUrl).toBe("https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d123");
    });

    it("URLに@座標（緯度・経度）が含まれる場合、座標ピンポイント埋め込みURLを生成する", () => {
      const loc = {
        name: "スタジオNOAH 渋谷店",
        mapUrl:
          "https://www.google.com/maps/place/NOAH/@35.662845,139.698312,17z/data=!3m1!4b1",
      };
      const info = getMapEmbedInfo(loc);
      expect(info.canEmbed).toBe(true);
      expect(info.sourceType).toBe("coordinates");
      expect(info.embedUrl).toContain("q=35.662845,139.698312");
      expect(info.embedUrl).toContain("output=embed");
    });

    it("短縮共有リンク（maps.app.goo.gl）の場合はblocked_short_linkとして扱い、別タブURLに共有リンクを保持する", () => {
      const loc = {
        name: "スタジオNOAH 渋谷店",
        address: "東京都渋谷区宇田川町39-2",
        mapUrl: "https://maps.app.goo.gl/AbCdEfGh",
      };
      const info = getMapEmbedInfo(loc);
      expect(info.sourceType).toBe("blocked_short_link");
      expect(info.targetOpenUrl).toBe("https://maps.app.goo.gl/AbCdEfGh");
      // 住所によるフォールバック埋め込みURLがセットされていること
      expect(info.embedUrl).toContain("output=embed");
    });

    it("mapUrl未登録の場合はaddress_fallbackとして埋め込みURLを生成する", () => {
      const loc = {
        name: "新宿村スタジオ",
        address: "東京都新宿区北新宿2-1-2",
      };
      const info = getMapEmbedInfo(loc);
      expect(info.canEmbed).toBe(true);
      expect(info.sourceType).toBe("address_fallback");
      expect(info.embedUrl).toContain("output=embed");
    });
  });

  describe("isEmbedMapHtml and getEmbedMapUrl", () => {
    const iframeSnippet =
      '<iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d12345" width="600" height="450"></iframe>';
    const embedUrlDirect = "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d12345";
    const shareShortUrl = "https://maps.app.goo.gl/AbCdEfGh12345";
    const normalPlaceUrl = "https://www.google.com/maps/place/NOAH/@35.66,139.69";

    it("iframeタグが含まれている場合はHTMLコードとしてtrueを返し、埋め込みURLを抽出できる", () => {
      expect(isEmbedMapHtml(iframeSnippet)).toBe(true);
      expect(getEmbedMapUrl(iframeSnippet)).toBe(
        "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d12345"
      );
    });

    it("google.com/maps/embedを含む公式URLの場合はtrueを返し、そのURLを返す", () => {
      expect(isEmbedMapHtml(embedUrlDirect)).toBe(true);
      expect(getEmbedMapUrl(embedUrlDirect)).toBe(embedUrlDirect);
    });

    it("通常の共有リンク（maps.app.goo.gl）やプレイスURLの場合はfalseを返し、埋め込みURLはnullとなる", () => {
      expect(isEmbedMapHtml(shareShortUrl)).toBe(false);
      expect(getEmbedMapUrl(shareShortUrl)).toBeNull();

      expect(isEmbedMapHtml(normalPlaceUrl)).toBe(false);
      expect(getEmbedMapUrl(normalPlaceUrl)).toBeNull();
    });

    it("未入力・undefined・空文字の場合はfalseを返し、nullとなる", () => {
      expect(isEmbedMapHtml("")).toBe(false);
      expect(isEmbedMapHtml(undefined)).toBe(false);
      expect(getEmbedMapUrl("")).toBeNull();
      expect(getEmbedMapUrl(undefined)).toBeNull();
    });
  });
});
