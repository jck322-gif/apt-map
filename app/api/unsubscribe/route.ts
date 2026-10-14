import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

/** 메일 하단 "수신 거부" — 로그인 없이 바로 알림 메일을 멈춥니다. */
export async function GET(request: Request) {
  const t = new URL(request.url).searchParams.get("t") ?? "";
  if (t && /^[a-f0-9]{16,64}$/.test(t)) {
    await getDb().from("app_users").update({ email_paused: true }).eq("unsub_token", t);
  }
  return NextResponse.redirect(`${SITE_URL}/account/unsubscribed`);
}

// 메일 앱의 "원클릭 수신 거부"(List-Unsubscribe-Post)도 같은 처리
export const POST = GET;
