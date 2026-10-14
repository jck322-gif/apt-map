import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { attachSession, hashPassword, normalizeEmail, passwordProblem, sendVerifyMail } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** 아이디(이메일)·비밀번호 가입. 가입과 동시에 로그인되고, 이메일 확인 메일이 갑니다. */
export async function POST(request: Request) {
  let b: Record<string, unknown> = {};
  try {
    b = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "잘못된 요청입니다." }, { status: 400 });
  }
  const email = normalizeEmail(b.email);
  if (!email) return NextResponse.json({ ok: false, error: "이메일 주소를 확인해 주세요." }, { status: 400 });
  const pwErr = passwordProblem(b.password);
  if (pwErr) return NextResponse.json({ ok: false, error: pwErr }, { status: 400 });
  if (b.agree !== true || b.age !== true) {
    return NextResponse.json({ ok: false, error: "필수 항목에 모두 동의해 주세요." }, { status: 400 });
  }

  const db = getDb();
  const { data: exist } = await db.from("app_users").select("id, password_hash, google_sub, kakao_id").eq("email", email).maybeSingle();
  if (exist) {
    const via = exist.google_sub ? "구글" : exist.kakao_id ? "카카오" : null;
    return NextResponse.json(
      {
        ok: false,
        error: exist.password_hash
          ? "이미 가입된 이메일이에요. 로그인하거나 비밀번호 찾기를 이용해 주세요."
          : `이 이메일은 ${via ?? "다른 방법"} 로그인으로 가입돼 있어요. ${via ?? ""} 로그인을 이용해 주세요.`,
      },
      { status: 409 }
    );
  }

  const { data: user, error } = await db
    .from("app_users")
    .insert({
      email,
      password_hash: hashPassword(b.password as string),
      terms_agreed_at: new Date().toISOString(),
      marketing_opt_in: b.marketing === true,
    })
    .select("id")
    .single();
  if (error || !user) {
    console.error("[signup]", error?.message);
    return NextResponse.json({ ok: false, error: "가입하지 못했어요. 잠시 후 다시 시도해 주세요." }, { status: 500 });
  }
  await sendVerifyMail(email, user.id as string);
  return attachSession(NextResponse.json({ ok: true }), user.id as string);
}
