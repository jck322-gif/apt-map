import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { attachSession, consumeAuthToken, hashPassword, passwordProblem } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** 새 비밀번호 저장 — 메일 링크를 받았다는 건 그 주소 주인이라는 뜻이라 이메일 확인도 함께 끝냅니다. */
export async function POST(request: Request) {
  let b: Record<string, unknown> = {};
  try {
    b = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const pwErr = passwordProblem(b.password);
  if (pwErr) return NextResponse.json({ ok: false, error: pwErr }, { status: 400 });
  const row = await consumeAuthToken(typeof b.token === "string" ? b.token : "", "reset");
  if (!row || !row.user_id) {
    return NextResponse.json({ ok: false, error: "링크가 만료됐거나 이미 사용됐어요. 비밀번호 찾기를 다시 해 주세요." }, { status: 400 });
  }
  const db = getDb();
  await db
    .from("app_users")
    .update({ password_hash: hashPassword(b.password as string), email_verified: true })
    .eq("id", row.user_id);
  await db.from("user_sessions").delete().eq("user_id", row.user_id); // 다른 기기 로그인은 모두 끊습니다
  return attachSession(NextResponse.json({ ok: true }), row.user_id);
}
