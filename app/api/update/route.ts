import { NextResponse } from "next/server";
import { REGIONS } from "@/lib/regions";
import { toPyeong, yyyymm } from "@/lib/molit";
import { getDb } from "@/lib/db";
 
export const dynamic = "force-dynamic"; // 캐시하지 않고 요청마다 새로 실행
 
type DealTypeParam = "sale" | "jeonse" | "monthly";
 
// 지역당 화면에 내려보낼 최근 거래 수.
// 부산 16개 × 60 = 960건으로, 한 번에 받아올 수 있는 한도(1000행) 안에 들어옵니다.
const LISTINGS_PER_REGION = 60;
// 추세(전월 대비)를 계산하려면 두 달 모두 이 건수 이상이어야 합니다.
const MIN_SAMPLE_FOR_TREND = 3;
 
type MonthlyRow = {
  region_code: string;
  deal_type: string;
  deal_ym: string;
  cnt: number;
  avg_value: number | string | null;
};
 
type RecentRow = {
  region_code: string;
  deal_date: string; // "2026-08-24"
  dong: string;
  complex: string;
  area_m2: number | string;
  floor: number;
  price_manwon: number | null;
  deposit_manwon: number | null;
  monthly_rent_manwon: number | null;
};
 
/** "2026-08-24" → { label: "8/24", ymd: 20260824 } */
function parseDate(isoDate: string): { label: string; ymd: number } {
  const [y, m, d] = isoDate.split("-").map(Number);
  return { label: `${m}/${d}`, ymd: y * 10000 + m * 100 + d };
}
 
const BUSAN_CODES = REGIONS.filter((r) => r.group === "부산").map((r) => r.code);
const ULSAN_CODES = REGIONS.filter((r) => r.group === "울산").map((r) => r.code);
 
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const dealType = (searchParams.get("dealType") ?? "sale") as DealTypeParam;
  if (!["sale", "jeonse", "monthly"].includes(dealType)) {
    return NextResponse.json(
      { error: `알 수 없는 dealType입니다: ${dealType} (sale/jeonse/monthly 중 하나여야 합니다)` },
      { status: 400 }
    );
  }
 
  const now = new Date();
  const currentYmd = yyyymm(0, now);
  const prevYmd = yyyymm(-1, now);
 
  let db;
  try {
    db = getDb();
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
 
  // 국토부 API를 직접 부르지 않고 DB에서 읽습니다 (데이터는 /api/sync가 매일 채워둡니다).
  // 최근 거래 목록은 한 번에 받을 수 있는 행 수 제한이 있어 부산 / 울산으로 나눠 요청합니다.
  const [monthlyRes, busanRes, ulsanRes, syncRes] = await Promise.all([
    db
      .from("region_monthly")
      .select("region_code, deal_type, deal_ym, cnt, avg_value")
      .eq("deal_type", dealType)
      .in("deal_ym", [currentYmd, prevYmd]),
    db
      .from("deals_recent")
      .select("region_code, deal_date, dong, complex, area_m2, floor, price_manwon, deposit_manwon, monthly_rent_manwon")
      .eq("deal_type", dealType)
      .in("region_code", BUSAN_CODES)
      .lte("rn", LISTINGS_PER_REGION)
      .order("region_code")
      .order("deal_date", { ascending: false }),
    db
      .from("deals_recent")
      .select("region_code, deal_date, dong, complex, area_m2, floor, price_manwon, deposit_manwon, monthly_rent_manwon")
      .eq("deal_type", dealType)
      .in("region_code", ULSAN_CODES)
      .lte("rn", LISTINGS_PER_REGION)
      .order("region_code")
      .order("deal_date", { ascending: false }),
    db.from("sync_log").select("ran_at").order("ran_at", { ascending: false }).limit(1),
  ]);
 
  const firstError = monthlyRes.error ?? busanRes.error ?? ulsanRes.error;
  if (firstError) {
    return NextResponse.json({ error: `데이터베이스 조회 실패: ${firstError.message}` }, { status: 500 });
  }
 
  const monthly = (monthlyRes.data ?? []) as MonthlyRow[];
  const recent = [...((busanRes.data ?? []) as RecentRow[]), ...((ulsanRes.data ?? []) as RecentRow[])];
 
  // 지역별로 이번 달 / 지난 달 집계를 찾아 쓰기 좋게 정리
  const statsByCode = new Map<string, { cnt: number; avg: number | null; cntPrev: number; avgPrev: number | null }>();
  for (const m of monthly) {
    const entry = statsByCode.get(m.region_code) ?? { cnt: 0, avg: null, cntPrev: 0, avgPrev: null };
    const avg = m.avg_value === null ? null : Number(m.avg_value);
    if (m.deal_ym === currentYmd) {
      entry.cnt = Number(m.cnt);
      entry.avg = avg;
    } else if (m.deal_ym === prevYmd) {
      entry.cntPrev = Number(m.cnt);
      entry.avgPrev = avg;
    }
    statsByCode.set(m.region_code, entry);
  }
 
  const listingsByCode = new Map<string, RecentRow[]>();
  for (const l of recent) {
    if (!listingsByCode.has(l.region_code)) listingsByCode.set(l.region_code, []);
    listingsByCode.get(l.region_code)!.push(l);
  }
 
  const regions = REGIONS.map((region) => {
    const s = statsByCode.get(region.code);
    const count = s?.cnt ?? 0;
    const countPrev = s?.cntPrev ?? 0;
    const avgCurrent = s?.avg ?? null;
    const avgPrev = s?.avgPrev ?? null;
 
    let trendPct: number | null = null;
    if (
      count >= MIN_SAMPLE_FOR_TREND &&
      countPrev >= MIN_SAMPLE_FOR_TREND &&
      avgCurrent !== null &&
      avgPrev !== null &&
      avgPrev !== 0
    ) {
      trendPct = ((avgCurrent - avgPrev) / avgPrev) * 100;
    }
 
    const rows = listingsByCode.get(region.code) ?? [];
    return {
      ...region,
      count,
      trendPct,
      avgValueManwon: avgCurrent,
      listings: rows.map((r) => {
        const { label, ymd } = parseDate(r.deal_date);
        const areaM2 = Number(r.area_m2);
        return {
          dong: r.dong,
          complex: r.complex,
          areaM2,
          pyeong: toPyeong(areaM2),
          floor: r.floor,
          date: label,
          dealYmd: ymd,
          priceManwon: r.price_manwon,
          depositManwon: r.deposit_manwon,
          monthlyRentManwon: r.monthly_rent_manwon,
        };
      }),
    };
  });
 
  // 화면의 "마지막 업데이트"는 데이터를 마지막으로 받아온 시각을 보여주는 게 정확합니다.
  const lastSyncedAt = syncRes.data?.[0]?.ran_at ?? null;
 
  return NextResponse.json({
    updatedAt: lastSyncedAt ?? now.toISOString(),
    dealType,
    dealYmd: currentYmd,
    prevYmd,
    regions,
    errors: [],
  });
}
