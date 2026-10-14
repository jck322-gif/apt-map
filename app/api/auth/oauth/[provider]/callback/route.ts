import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getDb } from "@/lib/db";
import { attachSession, safeNextPath } from "@/lib/auth";
import { OAUTH_STATE_COOKIE, PROVIDERS, fetchProfile, type Provider } from "@/lib/oauth";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

/**
 * 구글·카카오 로그인 돌아오는 곳.
 * 1) 이미 그 계정으로 가입돼 있으면 로그인
 * 2) 같은 이메일(확인된 주소)로 가입한 회원이 있으면 그 계정에 연결
 * 3) 처음이면 새로 가입 → 알림 설정 화면에서 필수 동의를 받습니다
 */
export async function GET(request: Request, { params }: { params: { provider: string } }) {
  const p = params.provider as Provider;
  const fail = (why: string) => NextResponse.redirect(`${SITE_URL}/login?error=${why}`);
  if (!PROVIDERS.includes(p)) return fail("oauth");

  const sp = new URL(request.url).searchParams;
  const [savedState, savedNext] = (cookies().get(OAUTH_STATE_COOKIE)?.value ?? "").split("|");
  if (!sp.get("code") || !savedState || sp.get("state") !== savedState) return fail("oauth");

  const profile = await fetchProfile(p, sp.get("code") as string);
  if (!profile) return fail("oauth");

  const db = getDb();
  const col = p === "google" ? "google_sub" : "kakao_id";
  let userId: string | null = null;
  let isNew = false;

  const { data: byId } = await db.from("app_users").select("id").eq(col, profile.id).maybeSingle();
  if (byId) userId = byId.id as string;

  if (!userId && profile.email && profile.emailVerified) {
    const { data: byEmail } = await db.from("app_users").select("id").eq("email", profile.email).maybeSingle();
    if (byEmail) {
      userId = byEmail.id as string;
      await db.from("app_users").update({ [col]: profile.id, email_verified: true }).eq("id", userId);
    }
  }

  if (!userId) {
    const { data: created, error } = await db
      .from("app_users")
      .insert({
        [col]: profile.id,
        email: profile.email && profile.emailVerified ? profile.email : null,
        email_verified: !!(profile.email && profile.emailVerified),
        display_name: profile.name,
      })
      .select("id")
      .single();
    if (error || !created) {
      console.error(`[oauth/${p}] 가입 실패`, error?.message);
      return fail("oauth");
    }
    userId = created.id as string;
    isNew = true;
  }

  const next = isNew ? "/account?welcome=1" : safeNextPath(savedNext);
  const res = NextResponse.redirect(`${SITE_URL}${next}`);
  res.cookies.set(OAUTH_STATE_COOKIE, "", { path: "/", maxAge: 0 });
  return attachSession(res, userId);
}
