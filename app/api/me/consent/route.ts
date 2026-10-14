import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** 구글·카카오로 처음 가입한 사람의 필수 동의 저장 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });
  let b: Record<string, unknown> = {};
  try {
    b = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  if (b.agree !== true || b.age !== true) {
    return NextResponse.json({ ok: false, error: "필수 항목에 모두 동의해 주세요." }, { status: 400 });
  }
  await getDb()
    .from("app_users")
    .update({ terms_agreed_at: new Date().toISOString(), marketing_opt_in: b.marketing === true })
    .eq("id", user.id);
  return NextResponse.json({ ok: true });
}
