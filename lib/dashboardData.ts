// 홈/매매/전세/월세 화면에 필요한 "오늘의 실거래 + 지역별 집계" 데이터를 만드는 곳.
//
// 예전에는 이 로직이 app/api/update/route.ts 안에만 있어서, 화면은 항상
// "브라우저에서 /api/update를 fetch → JSON 파싱"을 거쳐야만 실거래 내용을 볼 수 있었습니다.
// 문제는 이 fetch 한 번이라도 실패하면(네트워크 지연, 서버리스 콜드스타트, 일시적 오류 등)
// 화면에는 "0건" 뼈대만 남는다는 점이었습니다 — 구글 크롤러가 실제로 이 상태를 만났습니다
// (서치콘솔 실제 URL 테스트에서 "데이터를 불러오지 못했습니다"만 보임).
//
// 그래서 이 함수를 페이지 컴포넌트(서버)에서 직접 호출해 처음 화면에 쓸 데이터를 만들고,
// /api/update는 이후 브라우저가 새로고침할 때만 쓰는 방식으로 바꿨습니다. 서버에서 만든
// 결과는 Next.js가 페이지 단위로 캐시(revalidate)하므로, 이번 조회가 실패해도 최근에 성공한
// 결과가 그대로 보이고, 구글 크롤러도 자바스크립트 실행 없이 처음 HTML에서 바로 실제 데이터를
// 읽을 수 있습니다.

import { REGIONS, type Region } from "@/lib/regions";
import { toPyeong } from "@/lib/molit";
import { getDb } from "@/lib/db";
import { kstYyyymm } from "@/lib/kst";

export type DealTypeParam = "sale" | "jeonse" | "monthly";

const LISTINGS_PER_REGION = 60;
const LISTINGS_BY_REGISTERED = 40;
const MIN_SAMPLE_FOR_TREND = 5;

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
  deal_date: string;
  first_seen_at: string | null;
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

export type DashboardListing = {
  dong: string;
  complex: string;
  areaM2: number;
  pyeong: number;
  floor: number;
  date: string;
  dealYmd: number;
  registeredYmd: number | null;
  isCancelled: boolean;
  isDirect: boolean;
  priceManwon: number | null;
  depositManwon: number | null;
  monthlyRentManwon: number | null;
};

export type DashboardRegion = Region & {
  count: number;
  trendPct: number | null;
  avgValueManwon: number | null;
  listings: DashboardListing[];
};

export type DashboardData = {
  updatedAt: string;
  dealType: DealTypeParam;
  dealYmd: string;
  prevYmd: string;
  regions: DashboardRegion[];
  errors: { region: string; message: string }[];
};

function parseDate(isoDate: string): { label: string; ymd: number } {
  const [y, m, d] = isoDate.split("-").map(Number);
  return { label: `${m}/${d}`, ymd: y * 10000 + m * 100 + d };
}

const BUSAN_CODES = REGIONS.filter((r) => r.group === "부산").map((r) => r.code);
const ULSAN_CODES = REGIONS.filter((r) => r.group === "울산").map((r) => r.code);

/** dealType 하나에 대한 대시보드 데이터를 DB에서 직접 만듭니다. 실패하면 예외를 던집니다. */
export async function getDashboardData(dealType: DealTypeParam): Promise<DashboardData> {
  const now = new Date();
  const currentYmd = kstYyyymm(0, now);
  const prevYmd = kstYyyymm(-1, now);

  const db = getDb();

  const RECENT_COLUMNS =
    "region_code, deal_date, first_seen_at, cancel_date, dealing_type, dong, complex, area_m2, floor, price_manwon, deposit_manwon, monthly_rent_manwon";

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
      .select(RECENT_COLUMNS)
      .eq("deal_type", dealType)
      .in("region_code", BUSAN_CODES)
      .lte("rn", LISTINGS_PER_REGION)
      .order("region_code")
      .order("deal_date", { ascending: false }),
    db
      .from("deals_recent")
      .select(RECENT_COLUMNS)
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
    throw new Error(`데이터베이스 조회 실패: ${firstError.message}`);
  }

  const rolling = (rollingRes.data ?? []) as RollingRow[];

  const dedupeKey = (r: RecentRow) =>
    [
      r.region_code,
      r.deal_date,
      r.complex,
      Number(r.area_m2).toFixed(2),
      r.floor,
      r.price_manwon,
      r.deposit_manwon,
      r.monthly_rent_manwon,
    ].join("|");
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

  const statsByCode = new Map<
    string,
    { cnt: number; avg: number | null; cntPrev: number; avgPrev: number | null }
  >();
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

  const regions: DashboardRegion[] = REGIONS.map((region) => {
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

  const lastSyncedAt = syncRes.data?.[0]?.ran_at ?? null;

  return {
    updatedAt: lastSyncedAt ?? now.toISOString(),
    dealType,
    dealYmd: currentYmd,
    prevYmd,
    regions,
    errors: [],
  };
}
