import { SITE_URL } from "@/lib/site";

/**
 * 구글·카카오 로그인 설정.
 *
 * Vercel 환경변수
 *   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET   — Google Cloud Console → OAuth 클라이언트 ID(웹 애플리케이션)
 *   KAKAO_REST_API_KEY                        — Kakao Developers → 내 애플리케이션 → 앱 키 → REST API 키
 *   KAKAO_CLIENT_SECRET (선택)               — 카카오 로그인 → 보안 → Client Secret 을 "사용함"으로 켰을 때만
 *
 * 리디렉트 URI (각 콘솔에 그대로 등록)
 *   https://buulapt.com/api/auth/oauth/google/callback
 *   https://buulapt.com/api/auth/oauth/kakao/callback
 */

export type Provider = "google" | "kakao";
export const PROVIDERS: Provider[] = ["google", "kakao"];
export const OAUTH_STATE_COOKIE = "bu_oauth";

export function redirectUri(p: Provider): string {
  return `${SITE_URL}/api/auth/oauth/${p}/callback`;
}

export function authorizeUrl(p: Provider, state: string): string | null {
  if (p === "google") {
    const id = process.env.GOOGLE_CLIENT_ID;
    if (!id) return null;
    const q = new URLSearchParams({
      client_id: id,
      redirect_uri: redirectUri(p),
      response_type: "code",
      scope: "openid email profile",
      state,
      prompt: "select_account",
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${q}`;
  }
  const key = process.env.KAKAO_REST_API_KEY;
  if (!key) return null;
  const q = new URLSearchParams({ client_id: key, redirect_uri: redirectUri(p), response_type: "code", state });
  return `https://kauth.kakao.com/oauth/authorize?${q}`;
}

export type OAuthProfile = { id: string; email: string | null; emailVerified: boolean; name: string | null };

function decodeJwtPayload(jwt: string): Record<string, unknown> {
  const part = jwt.split(".")[1] ?? "";
  return JSON.parse(Buffer.from(part, "base64url").toString("utf8"));
}

/** 인가 코드 → 사용자 정보. 실패하면 null */
export async function fetchProfile(p: Provider, code: string): Promise<OAuthProfile | null> {
  try {
    if (p === "google") {
      const res = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: process.env.GOOGLE_CLIENT_ID ?? "",
          client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
          redirect_uri: redirectUri(p),
          grant_type: "authorization_code",
        }),
      });
      const j = await res.json();
      if (!res.ok || !j.id_token) {
        console.error("[oauth/google] token", res.status, JSON.stringify(j).slice(0, 200));
        return null;
      }
      // id_token은 구글 서버에서 TLS로 직접 받은 값이라 서명 검증 없이 내용을 읽어도 됩니다.
      const c = decodeJwtPayload(j.id_token);
      if (c.aud !== process.env.GOOGLE_CLIENT_ID) return null;
      return {
        id: String(c.sub),
        email: typeof c.email === "string" ? c.email.toLowerCase() : null,
        emailVerified: c.email_verified === true || c.email_verified === "true",
        name: typeof c.name === "string" ? c.name : null,
      };
    }

    const body = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: process.env.KAKAO_REST_API_KEY ?? "",
      redirect_uri: redirectUri(p),
      code,
    });
    if (process.env.KAKAO_CLIENT_SECRET) body.set("client_secret", process.env.KAKAO_CLIENT_SECRET);
    const tr = await fetch("https://kauth.kakao.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" },
      body,
    });
    const tj = await tr.json();
    if (!tr.ok || !tj.access_token) {
      console.error("[oauth/kakao] token", tr.status, JSON.stringify(tj).slice(0, 200));
      return null;
    }
    const ur = await fetch("https://kapi.kakao.com/v2/user/me", { headers: { Authorization: `Bearer ${tj.access_token}` } });
    const u = await ur.json();
    if (!ur.ok || !u.id) return null;
    const acc = u.kakao_account ?? {};
    const okEmail = typeof acc.email === "string" && acc.is_email_valid !== false && acc.is_email_verified === true;
    return {
      id: String(u.id),
      email: okEmail ? String(acc.email).toLowerCase() : null,
      emailVerified: okEmail,
      name: acc.profile?.nickname ?? null,
    };
  } catch (err) {
    console.error(`[oauth/${p}]`, err);
    return null;
  }
}
