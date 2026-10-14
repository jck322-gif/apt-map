import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { consumeAuthToken } from "@/lib/auth";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

/** 이메일 확인 링크 — 확인되면 그 주소로 알림을 보낼 수 있게 됩니다. */
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  const row = await consumeAuthToken(token, "verify");
  if (!row || !row.user_id) return NextResponse.redirect(`${SITE_URL}/account?verify=expired`);
  const db = getDb();
  // 다른 계정이 그 사이 같은 주소를 확인했으면 덮어쓰지 않습니다.
  const { data: other } = await db.from("app_users").select("id").eq("email", row.email).neq("id", row.user_id).maybeSingle();
  if (other) return NextResponse.redirect(`${SITE_URL}/account?verify=taken`);
  await db.from("app_users").update({ email: row.email, email_verified: true }).eq("id", row.user_id);
  return NextResponse.redirect(`${SITE_URL}/account?verify=ok`);
}
