import { NextResponse } from "next/server";
import { REGIONS } from "@/lib/regions";
import { toPyeong, yyyymm } from "@/lib/molit";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic"; // 캐시하지 않고 요청마다 새로 실행

type DealTypeParam = "sale" | "jeonse" | "monthly";

// 지역당 화면에 내려보낼 최근 거래 수 (동/단지 드릴다운 + 최근 7일 피드에 충분한 양)
const LISTINGS_PER_REGION = 80;
// 추세(전월 대비)를 계산하려면 두 달 모두 이 건수 이상이어야 합니다.
const MIN_SAMPLE_FOR_TREND = 3;

type StatsRow = {
  code: string;
  cnt: number;
  cnt_prev: number;
  avg_current: number | null;
  avg_prev: number | null;
};

type ListingRow = {
  code: string;
  dong: string;
  complex: string;
  area_m2: number;
  floor: number;
  deal_date: string; // "2026-08-24"
  price_manwon: number | null;
  deposit_manwon: number | null;
  monthly_rent_manwon: number | null;
};

/** "2026-08-24" → { label: "8/24", ymd: 20260824 } */
function parseDate(isoDate: string): { label: string; ymd: number } {
  const [y, m, d] = isoDate.split("-").map(Number);
  return { label: `${m}/${d}`, ymd: y * 10000 + m * 100 + d };
}

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
  const [statsRes, listRes, syncRes] = await Promise.all([
    db.rpc("region_stats", {
      p_deal_type: dealType,
      p_current_ym: currentYmd,
      p_prev_ym: prevYmd,
    }),
    db.rpc("region_listings", {
      p_deal_type: dealType,
      p_yms: [currentYmd, prevYmd],
      p_limit: LISTINGS_PER_REGION,
    }),
    db.from("sync_log").select("ran_at").order("ran_at", { ascending: false }).limit(1),
  ]);

  if (statsRes.error || listRes.error) {
    const message = statsRes.error?.message ?? listRes.error?.message ?? "알 수 없는 오류";
    return NextResponse.json(
      { error: `데이터베이스 조회 실패: ${message}` },
      { status: 500 }
    );
  }

  const stats = (statsRes.data ?? []) as StatsRow[];
  const listings = (listRes.data ?? []) as ListingRow[];

  const statsByCode = new Map(stats.map((s) => [s.code, s]));
  const listingsByCode = new Map<string, ListingRow[]>();
  for (const l of listings) {
    if (!listingsByCode.has(l.code)) listingsByCode.set(l.code, []);
    listingsByCode.get(l.code)!.push(l);
  }

  const regions = REGIONS.map((region) => {
    const s = statsByCode.get(region.code);
    const count = s ? Number(s.cnt) : 0;
    const countPrev = s ? Number(s.cnt_prev) : 0;
    const avgCurrent = s?.avg_current === null || s?.avg_current === undefined ? null : Number(s.avg_current);
    const avgPrev = s?.avg_prev === null || s?.avg_prev === undefined ? null : Number(s.avg_prev);

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
