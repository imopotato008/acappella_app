import { NextResponse } from "next/server";
import { sendContactToAdminDm, ContactMessagePayload } from "@/lib/discord";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<ContactMessagePayload>;

    if (!body.message || !body.message.trim()) {
      return NextResponse.json(
        { success: false, error: "お問い合わせ内容を入力してください。" },
        { status: 400 }
      );
    }

    const result = await sendContactToAdminDm({
      message: body.message,
      isAnonymous: Boolean(body.isAnonymous),
      userId: body.userId,
      userNickname: body.userNickname,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || "送信に失敗しました。" },
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
