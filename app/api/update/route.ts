import { NextResponse } from "next/server";
import { REGIONS } from "@/lib/regions";
import { toPyeong } from "@/lib/molit";
import { getDb } from "@/lib/db";
import { kstYyyymm } from "@/lib/kst";

export const dynamic = "force-dynamic"; // 캐시하지 않고 요청마다 새로 실행

type DealTypeParam = "sale" | "jeonse" | "monthly";

// 지역당 화면에 내려보낼 최근 거래 수.
// 부산 16개 × 60 = 960건으로, 한 번에 받아올 수 있는 한도(1000행) 안에 들어옵니다.
const LISTINGS_PER_REGION = 60;
// "오늘의 실거래"는 신고(등록)일 기준이라, 계약일 순으로 자르면 오래 전 계약인데
// 최근 신고된 거래가 빠집니다. 그래서 신고일 순으로도 따로 받아 와서 합칩니다.
// 부산 16개 × 40 = 640건으로 한도(1000행) 안에 들어옵니다.
const LISTINGS_BY_REGISTERED = 40;
// 등락률을 계산하려면 최근 30일과 그 이전 30일 모두 이 건수 이상이어야 합니다.
// (거래 2~3건으로 "집값이 올랐다/내렸다"고 말하면 숫자가 크게 튑니다)
const MIN_SAMPLE_FOR_TREND = 5;

/** region_rolling 뷰 한 줄 — 최근 30일과 그 이전 30일을 한 번에 담고 있습니다. */
type RollingRow = {
  region_code: string;
  deal_type: string;
  cnt: number;
  avg_value: number | string | null;
  cnt_prev: number;
  avg_prev: number | string | null;
};

type RecentRow = {
  region_code: string;
  deal_date: string; // "2026-08-24"
  first_seen_at: string | null; // 우리가 처음 본 날 (= 사실상 신고일)
  cancel_date: string | null;
  dealing_type: string | null;
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

  // 서버는 UTC로 돌아가므로 "이번 달"도 한국 시간 기준으로 계산합니다.
  const now = new Date();
  const currentYmd = kstYyyymm(0, now);
  const prevYmd = kstYyyymm(-1, now);

  let db;
  try {
    db = getDb();
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }

  // 국토부 API를 직접 부르지 않고 DB에서 읽습니다 (데이터는 /api/sync가 매일 채워둡니다).
  // 최근 거래 목록은 한 번에 받을 수 있는 행 수 제한이 있어 부산 / 울산으로 나눠 요청합니다.
  const RECENT_COLUMNS =
    "region_code, deal_date, first_seen_at, cancel_date, dealing_type, dong, complex, area_m2, floor, price_manwon, deposit_manwon, monthly_rent_manwon";

  /** 신고일 순으로 상위 N건 (계약일 순 목록에서 빠진 "최근 신고분"을 보완합니다) */
  const byRegistered = (codes: string[]) =>
    db
      .from("deals_recent")
      .select(RECENT_COLUMNS)
      .eq("deal_type", dealType)
      .in("region_code", codes)
      .lte("rn_reg", LISTINGS_BY_REGISTERED)
      .order("region_code")
      .order("first_seen_at", { ascending: false });

  const [rollingRes, busanRes, ulsanRes, busanRegRes, ulsanRegRes, syncRes] = await Promise.all([
    db
      .from("region_rolling")
      .select("region_code, deal_type, cnt, avg_value, cnt_prev, avg_prev")
      .eq("deal_type", dealType),
    db
      .from("deals_recent")
      .select(
        "region_code, deal_date, first_seen_at, cancel_date, dealing_type, dong, complex, area_m2, floor, price_manwon, deposit_manwon, monthly_rent_manwon"
      )
      .eq("deal_type", dealType)
      .in("region_code", BUSAN_CODES)
      .lte("rn", LISTINGS_PER_REGION)
      .order("region_code")
      .order("deal_date", { ascending: false }),
    db
      .from("deals_recent")
      .select(
        "region_code, deal_date, first_seen_at, cancel_date, dealing_type, dong, complex, area_m2, floor, price_manwon, deposit_manwon, monthly_rent_manwon"
      )
      .eq("deal_type", dealType)
      .in("region_code", ULSAN_CODES)
      .lte("rn", LISTINGS_PER_REGION)
      .order("region_code")
      .order("deal_date", { ascending: false }),
    byRegistered(BUSAN_CODES),
    byRegistered(ULSAN_CODES),
    db.from("sync_log").select("ran_at").order("ran_at", { ascending: false }).limit(1),
  ]);

  const firstError =
    rollingRes.error ?? busanRes.error ?? ulsanRes.error ?? busanRegRes.error ?? ulsanRegRes.error;
  if (firstError) {
    return NextResponse.json({ error: `데이터베이스 조회 실패: ${firstError.message}` }, { status: 500 });
  }

  const rolling = (rollingRes.data ?? []) as RollingRow[];

  // 계약일 순 목록과 신고일 순 목록을 합치고, 같은 거래가 두 번 들어가지 않게 걸러냅니다.
  const dedupeKey = (r: RecentRow) =>
    [r.region_code, r.deal_date, r.complex, Number(r.area_m2).toFixed(2), r.floor, r.price_manwon, r.deposit_manwon, r.monthly_rent_manwon].join(
      "|"
    );
  const seen = new Set<string>();
  const recent: RecentRow[] = [];
  for (const row of [
    ...((busanRes.data ?? []) as RecentRow[]),
    ...((ulsanRes.data ?? []) as RecentRow[]),
    ...((busanRegRes.data ?? []) as RecentRow[]),
    ...((ulsanRegRes.data ?? []) as RecentRow[]),
  ]) {
    const k = dedupeKey(row);
    if (seen.has(k)) continue;
    seen.add(k);
    recent.push(row);
  }

  // 지역별 "최근 30일 / 그 이전 30일" 집계를 쓰기 좋게 정리
  const statsByCode = new Map<string, { cnt: number; avg: number | null; cntPrev: number; avgPrev: number | null }>();
  for (const m of rolling) {
    statsByCode.set(m.region_code, {
      cnt: Number(m.cnt ?? 0),
      avg: m.avg_value === null ? null : Number(m.avg_value),
      cntPrev: Number(m.cnt_prev ?? 0),
      avgPrev: m.avg_prev === null ? null : Number(m.avg_prev),
    });
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
          // 신고(등록)일 — 국토부는 이 값을 주지 않아, 우리가 처음 받아온 날로 대신합니다.
          registeredYmd: r.first_seen_at ? Number(r.first_seen_at.replace(/-/g, "")) : null,
          isCancelled: !!r.cancel_date,
          isDirect: (r.dealing_type ?? "").includes("직거래"),
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
