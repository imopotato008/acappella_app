import { NextResponse } from "next/server";
import {
  sendScheduleNotificationToChannel,
  ScheduleNotificationPayload,
} from "@/lib/discord";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<ScheduleNotificationPayload>;

    if (!body.type || !body.eventId || !body.eventTitle) {
      return NextResponse.json(
        { success: false, error: "type, eventId, eventTitle は必須項目です。" },
        { status: 400 }
      );
    }

    // ホスト情報からベースURLを補完
    let eventUrl = body.eventUrl;
    if (!eventUrl) {
      const url = new URL(req.url);
      const origin = `${url.protocol}//${url.host}`;
      eventUrl = `${origin}/events/${body.eventId}`;
    }

    const result = await sendScheduleNotificationToChannel({
      ...(body as ScheduleNotificationPayload),
      eventUrl,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || "通知送信に失敗しました。" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, error: `サーバーエラー: ${message}` },
      { status: 500 }
    );
  }
}

