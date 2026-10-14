import { NextResponse } from "next/server";
import { randomToken, safeNextPath } from "@/lib/auth";
import { OAUTH_STATE_COOKIE, PROVIDERS, authorizeUrl, type Provider } from "@/lib/oauth";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

/** 구글·카카오 로그인 시작 — 각 회사 로그인 화면으로 보냅니다. */
export async function GET(request: Request, { params }: { params: { provider: string } }) {
  const p = params.provider as Provider;
  if (!PROVIDERS.includes(p)) return NextResponse.redirect(`${SITE_URL}/login`);
  const next = safeNextPath(new URL(request.url).searchParams.get("next"));
  const state = randomToken(16);
  const url = authorizeUrl(p, state);
  if (!url) return NextResponse.redirect(`${SITE_URL}/login?error=oauth_unavailable`);
  const res = NextResponse.redirect(url);
  res.cookies.set(OAUTH_STATE_COOKIE, `${state}|${next}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return res;
}
