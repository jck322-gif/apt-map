import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUser, clearSessionCookies } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** 알림 일시중지·광고성 정보 수신 동의 변경. body: { emailPaused?, marketing? } */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });
  let body: { emailPaused?: unknown; marketing?: unknown } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const patch: Record<string, boolean> = {};
  if (typeof body.emailPaused === "boolean") patch.email_paused = body.emailPaused;
  if (typeof body.marketing === "boolean") patch.marketing_opt_in = body.marketing;
  if (Object.keys(patch).length) await getDb().from("app_users").update(patch).eq("id", user.id);
  return NextResponse.json({ ok: true });
}

/** 회원 탈퇴 — 계정과 관심 단지·세션·발송 기록을 모두 지웁니다(연결된 표는 cascade로 함께 삭제). */
export async function DELETE() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });
  const db = getDb();
  if (user.email) {
    await db.from("auth_tokens").delete().eq("email", user.email);
    await db.from("login_attempts").delete().eq("email", user.email);
  }
  await db.from("app_users").delete().eq("id", user.id);
  return clearSessionCookies(NextResponse.json({ ok: true }));
}
