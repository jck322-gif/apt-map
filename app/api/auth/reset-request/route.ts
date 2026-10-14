import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { mailRateLimited, normalizeEmail, sendResetMail } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** 비밀번호 찾기 — 가입 여부와 상관없이 같은 답을 돌려줍니다(가입자 목록 유출 방지). */
export async function POST(request: Request) {
  let b: Record<string, unknown> = {};
  try {
    b = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const email = normalizeEmail(b.email);
  if (!email) return NextResponse.json({ ok: false, error: "이메일 주소를 확인해 주세요." }, { status: 400 });
  if (await mailRateLimited(email)) {
    return NextResponse.json({ ok: false, error: "잠시 후 다시 시도해 주세요. (10분에 3번까지)" }, { status: 429 });
  }
  const { data: user } = await getDb().from("app_users").select("id").eq("email", email).maybeSingle();
  if (user) await sendResetMail(email, user.id as string);
  return NextResponse.json({ ok: true });
}
