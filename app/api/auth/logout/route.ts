import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getDb } from "@/lib/db";
import { SESSION_COOKIE, clearSessionCookies, sha256 } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST() {
  const sid = cookies().get(SESSION_COOKIE)?.value;
  if (sid) await getDb().from("user_sessions").delete().eq("id_hash", sha256(sid));
  return clearSessionCookies(NextResponse.json({ ok: true }));
}
