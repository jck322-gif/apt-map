import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { attachSession, normalizeEmail, verifyPassword } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** 아이디(이메일)·비밀번호 로그인. 15분에 8번 틀리면 잠시 막습니다. */
export async function POST(request: Request) {
  let b: Record<string, unknown> = {};
  try {
    b = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "잘못된 요청입니다." }, { status: 400 });
  }
  const email = normalizeEmail(b.email);
  const pw = typeof b.password === "string" ? b.password : "";
  if (!email || !pw) return NextResponse.json({ ok: false, error: "이메일과 비밀번호를 입력해 주세요." }, { status: 400 });

  const db = getDb();
  const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const { count } = await db
    .from("login_attempts")
    .select("id", { count: "exact", head: true })
    .eq("email", email)
    .eq("ok", false)
    .gte("created_at", since);
  if ((count ?? 0) >= 8) {
    return NextResponse.json({ ok: false, error: "비밀번호를 여러 번 틀렸어요. 15분 뒤 다시 시도하거나 비밀번호 찾기를 이용해 주세요." }, { status: 429 });
  }

  const { data: user } = await db.from("app_users").select("id, password_hash, google_sub, kakao_id").eq("email", email).maybeSingle();
  const ok = !!user && verifyPassword(pw, user.password_hash as string | null);
  await db.from("login_attempts").insert({ email, ok });
  if (!ok) {
    if (user && !user.password_hash) {
      const via = user.google_sub ? "구글" : user.kakao_id ? "카카오" : "소셜";
      return NextResponse.json({ ok: false, error: `이 이메일은 ${via} 로그인으로 가입돼 있어요. ${via} 버튼으로 로그인해 주세요.` }, { status: 401 });
    }
    return NextResponse.json({ ok: false, error: "이메일 또는 비밀번호가 맞지 않아요." }, { status: 401 });
  }
  return attachSession(NextResponse.json({ ok: true }), user!.id as string);
}
