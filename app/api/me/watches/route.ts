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
    .select("region_code, complex, region_name, grp, notify_record, notify_all, target_price_manwon, target_above_manwon, target_area_m2, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  return NextResponse.json({ ok: true, watches: data ?? [] });
}

type WatchIn = {
  regionCode?: unknown;
  complex?: unknown;
  notifyRecord?: unknown;
  notifyAll?: unknown;
  /** 희망가(만원). null 이면 희망가 알림 끄기, 보내지 않으면 그대로 둠 */
  targetPrice?: unknown;
  /** 이 가격(만원) 이상으로 거래되면 알림. null 이면 끄기 */
  targetAbove?: unknown;
  /** 전용면적(㎡). null 이면 모든 평형 */
  targetArea?: unknown;
};

/** 숫자면 범위 안의 정수로, null이면 null, 그 밖이면 undefined(=바꾸지 않음) */
function intOrNull(v: unknown, min: number, max: number): number | null | undefined {
  if (v === null || v === "") return null;
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  if (!Number.isFinite(n)) return undefined;
  const r = Math.round(n);
  return r >= min && r <= max ? r : undefined;
}

function clean(w: WatchIn) {
  const region = REGIONS.find((r) => r.code === w.regionCode);
  const complex = typeof w.complex === "string" ? w.complex.normalize("NFC").trim().slice(0, 100) : "";
  if (!region || !complex) return null;
  const row: {
    region_code: string;
    complex: string;
    region_name: string;
    grp: string;
    notify_record?: boolean;
    notify_all?: boolean;
    target_price_manwon?: number | null;
    target_above_manwon?: number | null;
    target_area_m2?: number | null;
  } = { region_code: region.code, complex, region_name: region.name, grp: region.group };
  // 보낸 값만 바꿉니다 — 희망가만 저장할 때 신고가 알림 설정이 지워지지 않게
  if (w.notifyRecord !== undefined) row.notify_record = w.notifyRecord === true;
  if (w.notifyAll !== undefined) row.notify_all = w.notifyAll === true;
  if (w.targetPrice !== undefined) {
    const p = intOrNull(w.targetPrice, 1000, 3000000); // 1천만~300억
    if (p !== undefined) row.target_price_manwon = p;
  }
  if (w.targetAbove !== undefined) {
    const p = intOrNull(w.targetAbove, 1000, 3000000);
    if (p !== undefined) row.target_above_manwon = p;
  }
  if (w.targetArea !== undefined) {
    const a = intOrNull(w.targetArea, 10, 400);
    if (a !== undefined) row.target_area_m2 = a;
  }
  return row;
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
