import { NextResponse } from "next/server";
import { REGIONS } from "@/lib/regions";
import { fetchTrades, fetchRents } from "@/lib/molit";
import { getDb, type DealRow } from "@/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Vercel 함수 최대 실행 시간(초)

// 한 번에 처리할 지역·월 작업 동시 실행 수. 너무 높이면 공공데이터포털이 429(요청 과다)를 냅니다.
const CONCURRENCY = 4;
// 한 번의 INSERT에 넣을 최대 행 수
const CHUNK = 500;
// 파라미터 없이 호출됐을 때(=매일 자동 실행) 동기화할 최근 개월 수.
// 국토부는 계약 후 최대 30일까지 신고할 수 있어, 지난달까지 함께 다시 받아야 뒤늦은 신고가 반영됩니다.
const DEFAULT_MONTHS = 2;

function yyyymmOf(offset: number, base = new Date()): string {
  const d = new Date(base.getFullYear(), base.getMonth() + offset, 1);
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** "202601"~"202603" 같은 범위를 ["202601","202602","202603"] 로 펼칩니다. */
function expandMonths(from: string, to: string): string[] {
  const out: string[] = [];
  let y = Number(from.slice(0, 4));
  let m = Number(from.slice(4, 6));
  const endY = Number(to.slice(0, 4));
  const endM = Number(to.slice(4, 6));
  // 최대 24개월까지만 (실수로 너무 넓은 범위를 넣어 타임아웃 나는 것 방지)
  for (let guard = 0; guard < 24; guard++) {
    const ym = `${y}${String(m).padStart(2, "0")}`;
    out.push(ym);
    if (y === endY && m === endM) break;
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return out;
}

function dateStr(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await fn(items[idx]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

export async function GET(request: Request) {
  const serviceKey = process.env.MOLIT_SERVICE_KEY;
  if (!serviceKey) {
    return NextResponse.json({ error: "MOLIT_SERVICE_KEY 환경변수가 없습니다." }, { status: 500 });
  }

  // 인증 — 아무나 이 주소를 열어 국토부 API 할당량을 소모시키지 못하도록 막습니다.
  // Vercel 자동 실행(크론)은 Authorization 헤더로, 사람이 직접 열 때는 ?secret= 으로 인증합니다.
  const cronSecret = process.env.CRON_SECRET;
  const { searchParams } = new URL(request.url);
  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    const ok = authHeader === `Bearer ${cronSecret}` || searchParams.get("secret") === cronSecret;
    if (!ok) {
      return NextResponse.json({ error: "인증 실패 — secret이 올바르지 않습니다." }, { status: 401 });
    }
  }

  const now = new Date();
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");

  let months: string[];
  if (fromParam && toParam) {
    if (!/^\d{6}$/.test(fromParam) || !/^\d{6}$/.test(toParam)) {
      return NextResponse.json({ error: "from/to는 YYYYMM 형식이어야 합니다 (예: 202601)." }, { status: 400 });
    }
    months = expandMonths(fromParam, toParam);
  } else {
    months = Array.from({ length: DEFAULT_MONTHS }, (_, i) => yyyymmOf(-i, now));
  }

  const db = getDb();
  const started = Date.now();
  const errors: { region: string; ym: string; message: string }[] = [];
  let inserted = 0;

  // (지역 × 월) 조합을 모두 만들어 놓고 동시 실행 수를 제한해 처리합니다.
  const tasks = REGIONS.flatMap((region) => months.map((ym) => ({ region, ym })));

  await mapWithConcurrency(tasks, CONCURRENCY, async ({ region, ym }) => {
    const rows: DealRow[] = [];

    // --- 매매 ---
    try {
      const trades = await fetchTrades(region.code, ym, serviceKey);
      for (const t of trades) {
        if (!Number.isFinite(t.dealYear) || !Number.isFinite(t.dealMonth) || !Number.isFinite(t.dealDay)) continue;
        rows.push({
          region_code: region.code,
          deal_type: "sale",
          deal_ym: ym,
          deal_date: dateStr(t.dealYear, t.dealMonth, t.dealDay),
          dong: t.dong,
          complex: t.complex,
          area_m2: Number(t.areaM2.toFixed(2)),
          floor: t.floor,
          build_year: t.buildYear,
          price_manwon: Math.round(t.priceManwon),
          deposit_manwon: null,
          monthly_rent_manwon: null,
        });
      }
    } catch (err) {
      errors.push({
        region: `${region.group} ${region.name}`,
        ym,
        message: `매매: ${err instanceof Error ? err.message : String(err)}`,
      });
    }

    // --- 전월세 (한 번 호출해서 전세/월세로 나눠 저장) ---
    try {
      const rents = await fetchRents(region.code, ym, serviceKey);
      for (const r of rents) {
        if (!Number.isFinite(r.dealYear) || !Number.isFinite(r.dealMonth) || !Number.isFinite(r.dealDay)) continue;
        const isJeonse = r.monthlyRentManwon === 0;
        rows.push({
          region_code: region.code,
          deal_type: isJeonse ? "jeonse" : "monthly",
          deal_ym: ym,
          deal_date: dateStr(r.dealYear, r.dealMonth, r.dealDay),
          dong: r.dong,
          complex: r.complex,
          area_m2: Number(r.areaM2.toFixed(2)),
          floor: r.floor,
          build_year: r.buildYear,
          price_manwon: null,
          deposit_manwon: Math.round(r.depositManwon),
          monthly_rent_manwon: isJeonse ? null : Math.round(r.monthlyRentManwon),
        });
      }
    } catch (err) {
      errors.push({
        region: `${region.group} ${region.name}`,
        ym,
        message: `전월세: ${err instanceof Error ? err.message : String(err)}`,
      });
    }

    // 이 지역·이 달의 기존 데이터를 지우고 새로 넣습니다.
    // (거래 취소·정정분이 있어도 항상 국토부 최신 상태와 똑같이 맞춰지도록)
    const { error: delError } = await db
      .from("deals")
      .delete()
      .eq("region_code", region.code)
      .eq("deal_ym", ym);
    if (delError) {
      errors.push({ region: `${region.group} ${region.name}`, ym, message: `삭제 실패: ${delError.message}` });
      return;
    }

    for (let i = 0; i < rows.length; i += CHUNK) {
      const slice = rows.slice(i, i + CHUNK);
      const { error: insError } = await db.from("deals").insert(slice);
      if (insError) {
        errors.push({ region: `${region.group} ${region.name}`, ym, message: `저장 실패: ${insError.message}` });
        break;
      }
      inserted += slice.length;
    }
  });

  const elapsedSec = Math.round((Date.now() - started) / 100) / 10;

  await db.from("sync_log").insert({
    from_ym: months[months.length - 1],
    to_ym: months[0],
    inserted,
    errors: errors.length,
    note: `${months.length}개월 × ${REGIONS.length}개 지역 · ${elapsedSec}초`,
  });

  return NextResponse.json({
    ok: errors.length === 0,
    months,
    regions: REGIONS.length,
    inserted,
    elapsedSec,
    errorCount: errors.length,
    errors: errors.slice(0, 20),
  });
}
