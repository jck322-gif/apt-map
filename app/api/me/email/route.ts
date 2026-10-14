import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUser, mailRateLimited, normalizeEmail, sendVerifyMail } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** 알림 받을 이메일 등록·재인증 (카카오처럼 이메일이 없거나, 확인 메일을 다시 받을 때) */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "로그인이 필요합니다." }, { status: 401 });
  let b: Record<string, unknown> = {};
  try {
    b = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const email = normalizeEmail(b.email ?? user.email);
  if (!email) return NextResponse.json({ ok: false, error: "이메일 주소를 확인해 주세요." }, { status: 400 });
  if (user.password_hash && user.email && email !== user.email) {
    return NextResponse.json({ ok: false, error: "아이디(이메일)로 가입한 계정은 주소를 바꿀 수 없어요." }, { status: 400 });
  }
  const { data: other } = await getDb().from("app_users").select("id").eq("email", email).neq("id", user.id).maybeSingle();
  if (other) return NextResponse.json({ ok: false, error: "이미 다른 계정에서 쓰는 이메일이에요." }, { status: 409 });
  if (await mailRateLimited(email)) {
    return NextResponse.json({ ok: false, error: "잠시 후 다시 시도해 주세요. (10분에 3번까지)" }, { status: 429 });
  }
  const sent = await sendVerifyMail(email, user.id);
  if (!sent) return NextResponse.json({ ok: false, error: "메일을 보내지 못했어요." }, { status: 502 });
  return NextResponse.json({ ok: true });
}
