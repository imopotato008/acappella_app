import { Location, User } from "@/types";

export interface LocationInput {
  name: string;
  address?: string;
  memo?: string;
  mapUrl?: string;
  reservationUrl?: string;
}

/**
 * 練習場所情報のバリデーション
 */
export function validateLocation(input: LocationInput): { valid: boolean; error?: string } {
  if (!input.name || !input.name.trim()) {
    return { valid: false, error: "練習場所名を入力してください。" };
  }
  return { valid: true };
}

/**
 * WebサイトURLの整形（前後の空白を除去し、プロトコルがなければhttps://を付与）
 */
export function formatWebUrl(url?: string): string {
  if (!url) return "";
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (!/^https?:\/\//i.test(trimmed)) {
    return `https://${trimmed}`;
  }
  return trimmed;
}

/**
 * 対象の練習場所を編集・削除できるか判定（作成者または管理者）
 */
export function canManageLocation(location: Location, user: User | null): boolean {
  if (!user) return false;
  if (user.isAdmin) return true;
  return location.createdBy === user.id;
}

/**
 * 入力されたMap URL文字列から、iframeタグが貼られた場合も含めて純粋なURLを抽出・正規化
 */
export function extractUrlFromInput(input: string): string {
  if (!input) return "";
  const trimmed = input.trim();
  // <iframe src="https://www.google.com/maps/embed?..." ...> から src を抽出
  const iframeMatch = trimmed.match(/src=["'](https?:\/\/[^"']+)["']/i);
  if (iframeMatch) {
    return iframeMatch[1];
  }
  return trimmed;
}

/**
 * 入力されたテキストまたはURLが「Google Mapの埋め込みHTML/URL」であるかを判定
 * - <iframe ...> タグを含む文字列
 * - google.com/maps/embed を含む埋め込み専用URL
 */
export function isEmbedMapHtml(input?: string): boolean {
  if (!input) return false;
  const trimmed = input.trim();
  return (
    /<iframe[\s\S]*src=["'][^"']+["'][\s\S]*>/i.test(trimmed) ||
    trimmed.includes("google.com/maps/embed") ||
    trimmed.includes("output=embed")
  );
}

/**
 * 埋め込み用URLを取得
 * HTMLコードまたは公式埋め込みURLが指定されている場合のみURLを返し、通常の共有リンク等は null を返す
 */
export function getEmbedMapUrl(input?: string): string | null {
  if (!input || !isEmbedMapHtml(input)) return null;
  return extractUrlFromInput(input);
}

/**
 * 練習場所のGoogle Mapリンク先を取得
 * - 登録された mapUrl があり、かつ埋め込み専用URL（google.com/maps/embed 等）でなければそれを返す
 * - 埋め込み専用URLまたは未登録の場合は、施設名と住所からスマホアプリ・ブラウザで確実に開く
 *   Google Maps公式検索URL (https://www.google.com/maps/search/?api=1&query=...) を生成する
 */
export function getTargetMapUrl(location: {
  name: string;
  address?: string;
  mapUrl?: string;
}): string {
  const cleanedUrl = location.mapUrl ? extractUrlFromInput(location.mapUrl) : "";
  const isEmbedOnly =
    cleanedUrl.includes("google.com/maps/embed") || cleanedUrl.includes("output=embed");

  if (cleanedUrl && !isEmbedOnly) {
    return cleanedUrl;
  }
  const query = location.address
    ? `${location.name} ${location.address}`.trim()
    : location.name.trim();
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export type MapEmbedSourceType =
  | "direct_embed"      // Google公式の埋め込み用URL (google.com/maps/embed)
  | "coordinates"       // URLから抽出した緯度・経度ピンポイント埋め込み
  | "query_embed"       // ?q= を活用した埋め込み
  | "address_fallback"  // 住所または施設名によるフォールバック埋め込み
  | "blocked_short_link"; // maps.app.goo.gl などの埋め込み不可短縮リンク

export interface MapEmbedInfo {
  embedUrl: string | null;
  canEmbed: boolean;
  sourceType: MapEmbedSourceType;
  targetOpenUrl: string;
}

/**
 * リンク先URLおよび住所情報から、最適な埋め込み用URLと開く用URLを解析して生成
 */
export function getMapEmbedInfo(location: {
  name: string;
  address?: string;
  mapUrl?: string;
}): MapEmbedInfo {
  const targetOpenUrl = getTargetMapUrl(location);
  const rawUrl = location.mapUrl ? extractUrlFromInput(location.mapUrl) : "";

  // 1. 直接埋め込み可能なURL（/maps/embed または output=embed）
  if (rawUrl && (rawUrl.includes("google.com/maps/embed") || rawUrl.includes("output=embed"))) {
    return {
      embedUrl: rawUrl,
      canEmbed: true,
      sourceType: "direct_embed",
      targetOpenUrl,
    };
  }

  // 2. 緯度・経度（@lat,lng）が含まれるURLの場合
  // 例: https://www.google.com/maps/place/.../@35.6628,139.6983,17z/...
  if (rawUrl) {
    const coordMatch = rawUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (coordMatch) {
      const lat = coordMatch[1];
      const lng = coordMatch[2];
      return {
        embedUrl: `https://maps.google.com/maps?q=${lat},${lng}&t=&z=16&ie=UTF8&iwloc=&output=embed`,
        canEmbed: true,
        sourceType: "coordinates",
        targetOpenUrl,
      };
    }

    // 3. ?q= パラメータが含まれる場合
    const qMatch = rawUrl.match(/[?&]q=([^&]+)/);
    if (qMatch) {
      return {
        embedUrl: `https://maps.google.com/maps?q=${qMatch[1]}&t=&z=16&ie=UTF8&iwloc=&output=embed`,
        canEmbed: true,
        sourceType: "query_embed",
        targetOpenUrl,
      };
    }

    // 4. 短縮リンク（maps.app.goo.gl / goo.gl/maps）
    // GoogleのX-Frame-Optionsにより直接iframeに埋め込むとブラウザで拒否される
    if (rawUrl.includes("maps.app.goo.gl") || rawUrl.includes("goo.gl/maps")) {
      // 住所情報があれば住所によるフォールバック埋め込みを用意
      const fallbackQuery = location.address
        ? `${location.name} ${location.address}`.trim()
        : location.name.trim();
      const fallbackEmbed = `https://maps.google.com/maps?q=${encodeURIComponent(fallbackQuery)}&t=&z=15&ie=UTF8&iwloc=&output=embed`;

      return {
        embedUrl: fallbackEmbed,
        canEmbed: true,
        sourceType: "blocked_short_link",
        targetOpenUrl,
      };
    }
  }

  // 5. 住所または施設名によるフォールバック
  const query = location.address
    ? `${location.name} ${location.address}`.trim()
    : location.name.trim();
  const addressEmbed = `https://maps.google.com/maps?q=${encodeURIComponent(query)}&t=&z=15&ie=UTF8&iwloc=&output=embed`;

  return {
    embedUrl: addressEmbed,
    canEmbed: true,
    sourceType: "address_fallback",
    targetOpenUrl,
  };
}
