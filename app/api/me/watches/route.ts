import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUser, MAX_WATCHES } from "@/lib/auth";
import { REGIONS } from "@/lib/regions";

export const dynamic = "force-dynamic";

const unauth = () => NextResponse.json({ ok: false, error: "로그인이 필요합니다." }, { status: 401 });

/** 내 관심 단지 목록 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return unauth();
  const { data } = await getDb()
    .from("user_watches")
    .select("region_code, complex, region_name, grp, notify_record, notify_all, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  return NextResponse.json({ ok: true, watches: data ?? [] });
}

type WatchIn = { regionCode?: unknown; complex?: unknown; notifyRecord?: unknown; notifyAll?: unknown };

function clean(w: WatchIn) {
  const region = REGIONS.find((r) => r.code === w.regionCode);
  const complex = typeof w.complex === "string" ? w.complex.normalize("NFC").trim().slice(0, 100) : "";
  if (!region || !complex) return null;
  return {
    region_code: region.code,
    complex,
    region_name: region.name,
    grp: region.group,
    notify_record: w.notifyRecord === undefined ? true : w.notifyRecord === true,
    notify_all: w.notifyAll === true,
  };
}

/** 관심 단지 추가·알림 종류 변경. body: { items: [{regionCode, complex, notifyRecord?, notifyAll?}] } 또는 한 건 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return unauth();
  let body: { items?: WatchIn[] } & WatchIn = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "잘못된 요청입니다." }, { status: 400 });
  }
  const rows = (Array.isArray(body.items) ? body.items : [body]).map(clean).filter((x): x is NonNullable<typeof x> => !!x);
  if (rows.length === 0) return NextResponse.json({ ok: false, error: "단지 정보가 없습니다." }, { status: 400 });

  const db = getDb();
  const { data: current } = await db.from("user_watches").select("region_code, complex").eq("user_id", user.id);
  const have = new Set((current ?? []).map((c) => `${c.region_code}|${c.complex}`));
  const newOnes = rows.filter((r) => !have.has(`${r.region_code}|${r.complex}`));
  if (have.size + newOnes.length > MAX_WATCHES) {
    return NextResponse.json({ ok: false, error: `관심 단지는 ${MAX_WATCHES}곳까지 담을 수 있어요.` }, { status: 400 });
  }
  const { error } = await db
    .from("user_watches")
    .upsert(rows.map((r) => ({ ...r, user_id: user.id })), { onConflict: "user_id,region_code,complex" });
  if (error) {
    console.error("[me/watches]", error.message);
    return NextResponse.json({ ok: false, error: "저장하지 못했습니다." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

/** 관심 단지 삭제. body: {regionCode, complex} */
export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user) return unauth();
  let body: WatchIn = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const c = clean(body);
  if (!c) return NextResponse.json({ ok: false }, { status: 400 });
  await getDb().from("user_watches").delete().eq("user_id", user.id).eq("region_code", c.region_code).eq("complex", c.complex);
  return NextResponse.json({ ok: true });
}
