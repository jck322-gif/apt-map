import { createHash, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { SITE_URL } from "@/lib/site";
import { sendMail, mailLayout, escapeHtml } from "@/lib/mail";

/**
 * 회원 — 아이디(이메일)·비밀번호 가입 + 구글·카카오 로그인.
 *
 * - 비밀번호는 scrypt로 해시해 저장합니다(원문 저장 안 함).
 * - 세션 ID·메일 링크 토큰도 DB에는 SHA-256 해시만 저장합니다.
 * - 세션 쿠키(bu_s)는 httpOnly. 화면 표시용으로만 내용 없는 bu_li=1 쿠키를 둡니다.
 */

export const SESSION_COOKIE = "bu_s";
export const LOGIN_FLAG_COOKIE = "bu_li";
export const SESSION_DAYS = 60;
export const MAX_WATCHES = 30;

export type AppUser = {
  id: string;
  email: string | null;
  email_verified: boolean;
  password_hash: string | null;
  google_sub: string | null;
  kakao_id: string | null;
  display_name: string | null;
  terms_agreed_at: string | null;
  marketing_opt_in: boolean;
  email_paused: boolean;
  unsub_token: string;
  created_at: string;
};

export const USER_COLUMNS =
  "id, email, email_verified, password_hash, google_sub, kakao_id, display_name, terms_agreed_at, marketing_opt_in, email_paused, unsub_token, created_at";

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function sha256(v: string): string {
  return createHash("sha256").update(v).digest("hex");
}

export function normalizeEmail(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const e = raw.trim().toLowerCase();
  if (e.length > 200) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e)) return null;
  return e;
}

/** 비밀번호 규칙: 8~64자, 영문과 숫자를 모두 포함 */
export function passwordProblem(pw: unknown): string | null {
  if (typeof pw !== "string" || pw.length < 8) return "비밀번호는 8자 이상이어야 해요.";
  if (pw.length > 64) return "비밀번호는 64자 이하로 정해 주세요.";
  if (!/[A-Za-z]/.test(pw) || !/[0-9]/.test(pw)) return "비밀번호에 영문과 숫자를 모두 넣어 주세요.";
  return null;
}

export function hashPassword(pw: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(pw, salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt$${salt.toString("base64")}$${hash.toString("base64")}`;
}

export function verifyPassword(pw: string, stored: string | null): boolean {
  if (!stored) return false;
  const [algo, saltB64, hashB64] = stored.split("$");
  if (algo !== "scrypt" || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, "base64");
  const got = scryptSync(pw, Buffer.from(saltB64, "base64"), expected.length, { N: 16384, r: 8, p: 1 });
  return got.length === expected.length && timingSafeEqual(got, expected);
}

/** 로그인 후 돌아갈 주소 — 사이트 안의 경로만 허용 */
export function safeNextPath(raw: unknown): string {
  if (typeof raw !== "string") return "/account";
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) return "/account";
  return raw.slice(0, 300);
}

export async function getCurrentUser(): Promise<AppUser | null> {
  const sid = cookies().get(SESSION_COOKIE)?.value;
  if (!sid) return null;
  const db = getDb();
  const { data: sess } = await db.from("user_sessions").select("user_id, expires_at").eq("id_hash", sha256(sid)).maybeSingle();
  if (!sess || new Date(sess.expires_at as string).getTime() < Date.now()) return null;
  const { data: user } = await db.from("app_users").select(USER_COLUMNS).eq("id", sess.user_id).maybeSingle();
  return (user as AppUser | null) ?? null;
}

function cookieBase(maxAge: number, httpOnly: boolean) {
  return { httpOnly, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", maxAge };
}

/** 세션을 만들고 응답에 로그인 쿠키를 붙입니다. */
export async function attachSession(res: NextResponse, userId: string): Promise<NextResponse> {
  const sid = randomToken();
  const maxAge = SESSION_DAYS * 24 * 60 * 60;
  const db = getDb();
  await db.from("user_sessions").insert({
    id_hash: sha256(sid),
    user_id: userId,
    expires_at: new Date(Date.now() + maxAge * 1000).toISOString(),
  });
  await db.from("app_users").update({ last_login_at: new Date().toISOString() }).eq("id", userId);
  res.cookies.set(SESSION_COOKIE, sid, cookieBase(maxAge, true));
  res.cookies.set(LOGIN_FLAG_COOKIE, "1", cookieBase(maxAge, false));
  return res;
}

export function clearSessionCookies(res: NextResponse): NextResponse {
  res.cookies.set(SESSION_COOKIE, "", cookieBase(0, true));
  res.cookies.set(LOGIN_FLAG_COOKIE, "", cookieBase(0, false));
  return res;
}

/** 메일 링크 토큰(인증·재설정)을 만들어 원문을 돌려줍니다. */
export async function createAuthToken(purpose: "verify" | "reset", email: string, userId: string | null, minutes: number) {
  const token = randomToken();
  await getDb()
    .from("auth_tokens")
    .insert({
      token_hash: sha256(token),
      purpose,
      email,
      user_id: userId,
      expires_at: new Date(Date.now() + minutes * 60 * 1000).toISOString(),
    });
  return token;
}

/** 같은 주소로 10분에 3번까지만 메일 발송 */
export async function mailRateLimited(email: string): Promise<boolean> {
  const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { count } = await getDb()
    .from("auth_tokens")
    .select("token_hash", { count: "exact", head: true })
    .eq("email", email)
    .gte("created_at", since);
  return (count ?? 0) >= 3;
}

/** 이메일 인증 메일 (가입 직후, 카카오 등 알림 메일 등록 시) */
export async function sendVerifyMail(email: string, userId: string): Promise<boolean> {
  const token = await createAuthToken("verify", email, userId, 60 * 24);
  const link = `${SITE_URL}/api/auth/verify?token=${encodeURIComponent(token)}`;
  return sendMail({
    to: email,
    subject: "[부울아파트] 이메일 주소를 확인해 주세요",
    html: mailLayout(
      "이메일 확인",
      `<p style="margin:0 0 14px">아래 버튼을 누르면 이메일 확인이 끝나고, 관심 단지 알림을 이 주소로 받을 수 있어요. (24시간 안에 눌러 주세요)</p>
<p style="margin:0 0 18px"><a href="${escapeHtml(link)}" style="display:inline-block;background:#1f6f78;color:#fff;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:999px">이메일 확인하기</a></p>
<p style="margin:0;font-size:13px;color:#5b6b66">버튼이 안 눌리면 이 주소를 브라우저에 붙여 넣으세요.<br>${escapeHtml(link)}</p>`,
      "직접 가입하지 않았다면 이 메일은 무시하셔도 됩니다.<br>부울아파트 · buulapt.com"
    ),
    text: `부울아파트 이메일 확인 링크 (24시간): ${link}`,
  });
}

export async function sendResetMail(email: string, userId: string): Promise<boolean> {
  const token = await createAuthToken("reset", email, userId, 30);
  const link = `${SITE_URL}/reset?token=${encodeURIComponent(token)}`;
  return sendMail({
    to: email,
    subject: "[부울아파트] 비밀번호 재설정",
    html: mailLayout(
      "비밀번호 재설정",
      `<p style="margin:0 0 14px">아래 버튼을 눌러 새 비밀번호를 정해 주세요. 링크는 <b>30분</b> 동안 한 번만 쓸 수 있어요.</p>
<p style="margin:0 0 18px"><a href="${escapeHtml(link)}" style="display:inline-block;background:#1f6f78;color:#fff;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:999px">새 비밀번호 정하기</a></p>
<p style="margin:0;font-size:13px;color:#5b6b66">${escapeHtml(link)}</p>`,
      "직접 요청하지 않았다면 이 메일은 무시하셔도 됩니다. 비밀번호는 바뀌지 않아요.<br>부울아파트 · buulapt.com"
    ),
    text: `부울아파트 비밀번호 재설정 링크 (30분): ${link}`,
  });
}

/** 메일 토큰 확인 — 맞으면 사용 처리하고 내용을 돌려줍니다. */
export async function consumeAuthToken(token: string, purpose: "verify" | "reset") {
  if (!token) return null;
  const db = getDb();
  const { data: row } = await db
    .from("auth_tokens")
    .select("token_hash, purpose, email, user_id, expires_at, used_at")
    .eq("token_hash", sha256(token))
    .maybeSingle();
  if (!row || row.purpose !== purpose || row.used_at || new Date(row.expires_at as string).getTime() < Date.now()) return null;
  await db.from("auth_tokens").update({ used_at: new Date().toISOString() }).eq("token_hash", row.token_hash);
  return row as { email: string; user_id: string | null };
}
