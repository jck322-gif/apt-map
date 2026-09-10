import { getDb } from "@/lib/db";
import { REGIONS } from "@/lib/regions";
import { kstToday } from "@/lib/kst";

/**
 * "오늘의 브리핑" 자료를 만드는 곳.
 *
 * 브리핑은 "그날 국토교통부에 새로 신고된 거래"를 정리한 것입니다.
 * 기준은 계약일이 아니라 first_seen_at(우리가 그 거래를 처음 받아온 날)입니다.
 * 이 값은 한 번 기록되면 바뀌지 않기 때문에, 과거 날짜의 브리핑을 다시 열어도
 * 그때와 똑같은 내용이 나옵니다.
 */

export type Group = "부산" | "울산";

export type DailyDeal = {
  regionCode: string;
  regionName: string;
  group: Group;
  dong: string;
  complex: string;
  areaM2: number;
  floor: number;
  dealDate: string; // 계약일 "2026-08-20"
  priceManwon: number;
  isDirect: boolean;
};

export type GroupBrief = {
  group: Group;
  count: number;
  top: DailyDeal[];
  byRegion: { name: string; count: number }[];
};

/**
 * 신고가 한 건 — 그 단지·그 평형에서 이전까지 나온 가장 비싼 값을 넘어선 거래.
 * 우리가 가진 자료가 3년치라 정확히는 "최근 3년 내 최고가"라는 뜻입니다.
 */
export type RecordHigh = {
  regionCode: string;
  regionName: string;
  group: Group;
  dong: string;
  complex: string;
  areaM2: number;
  floor: number;
  dealDate: string;
  priceManwon: number;
  /** 직전 최고가 — "바로 앞 거래"가 아니라 "그때까지 가장 비쌌던 값"입니다 */
  prevPriceManwon: number;
  /** 그 직전 최고가가 나온 계약일. 이걸 같이 적어야 "직전거래"와 헷갈리지 않습니다. */
  prevDealDate: string | null;
  /** 직전 최고가보다 얼마나 올랐는지 (만원) */
  gainManwon: number;
};

export type DailyBrief = {
  date: string; // "2026-09-03"
  totals: { sale: number; jeonse: number; monthly: number };
  groups: GroupBrief[];
  /** 그날 신고분 전체에서 가장 비싼 매매 한 건 */
  highlight: DailyDeal | null;
  /** 그날 신고분 중 신고가를 새로 쓴 거래 */
  records: RecordHigh[];
};

type Row = {
  region_code: string;
  deal_type: string;
  deal_date: string;
  dong: string;
  complex: string;
  area_m2: number | string;
  floor: number;
  price_manwon: number | null;
  dealing_type: string | null;
  cancel_date: string | null;
};

const REGION_BY_CODE = new Map(REGIONS.map((r) => [r.code, r]));

/** 브리핑 한 열에 보여줄 거래 수 */
const TOP_PER_GROUP = 10;

/** "오늘의 신고가"에 보여줄 건수 */
const RECORDS_LIMIT = 12;

/** "2026-09-03" 형식인지 확인 (주소로 아무 값이나 들어오는 것을 막습니다) */
export function isValidDate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const d = new Date(`${date}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === date;
}

/** "2026-09-03" → "9월 3일" */
export function koDate(date: string): string {
  const [, m, d] = date.split("-").map(Number);
  return `${m}월 ${d}일`;
}

/** "2026-09-03" → "2026년 9월 3일 (수)" */
export function koDateLong(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const day = ["일", "월", "화", "수", "목", "금", "토"][new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${y}년 ${m}월 ${d}일 (${day})`;
}

/** 최근 브리핑이 있는 날짜들 (많은 날부터가 아니라 최신순) */
export async function getBriefDates(limit = 30): Promise<{ date: string; count: number }[]> {
  const db = getDb();
  const { data, error } = await db.from("daily_counts").select("d, deal_type, cnt");
  if (error || !data) return [];

  const byDate = new Map<string, number>();
  for (const row of data as { d: string; deal_type: string; cnt: number }[]) {
    byDate.set(row.d, (byDate.get(row.d) ?? 0) + Number(row.cnt));
  }
  return Array.from(byDate.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, limit);
}

type RecordRow = {
  region_code: string;
  complex: string;
  dong: string;
  area_m2: number | string;
  floor: number;
  price_manwon: number;
  deal_date: string;
  prev_price_manwon: number;
  prev_deal_date: string | null;
  gain_manwon: number;
};

/**
 * 그날 새로 신고된 거래 중 신고가를 쓴 것들.
 *
 * 한 단지가 목록을 다 차지하지 않도록 단지마다 한 건씩만 골라냅니다.
 * (같은 단지에서 84㎡·59㎡가 같은 날 나란히 신고가를 쓰는 일이 꽤 있습니다.)
 */
export async function getRecordHighs(date: string, limit = RECORDS_LIMIT): Promise<RecordHigh[]> {
  const db = getDb();
  const { data, error } = await db
    .from("record_highs")
    .select(
      "region_code, complex, dong, area_m2, floor, price_manwon, deal_date, prev_price_manwon, prev_deal_date, gain_manwon"
    )
    .eq("first_seen_at", date)
    .order("price_manwon", { ascending: false })
    .limit(300);

  // record_highs 뷰를 아직 만들지 않았어도 브리핑 전체가 죽으면 안 되므로 빈 목록을 돌려줍니다.
  // 다만 조용히 넘어가면 "표가 왜 안 보이지" 할 때 원인을 찾을 수가 없어서, 이유를 서버 기록에 남깁니다.
  // (Vercel → 프로젝트 → Logs 에서 "[record_highs]" 로 검색하면 보입니다.)
  if (error) {
    console.error("[record_highs] 조회 실패:", error.code, error.message, error.hint ?? "");
    return [];
  }
  if (!data) {
    console.error("[record_highs] 조회 결과가 비어 있습니다 (date:", date, ")");
    return [];
  }
  if (data.length === 0) {
    console.log("[record_highs] 이 날짜에는 신고가가 없습니다 (date:", date, ")");
  }

  const seen = new Set<string>();
  const out: RecordHigh[] = [];
  for (const r of data as RecordRow[]) {
    const region = REGION_BY_CODE.get(r.region_code);
    if (!region) continue;
    const key = `${r.region_code}|${r.complex}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      regionCode: r.region_code,
      regionName: region.name,
      group: region.group as Group,
      dong: r.dong,
      complex: r.complex,
      areaM2: Number(r.area_m2),
      floor: r.floor,
      dealDate: r.deal_date,
      priceManwon: Number(r.price_manwon),
      prevPriceManwon: Number(r.prev_price_manwon),
      prevDealDate: r.prev_deal_date ?? null,
      gainManwon: Number(r.gain_manwon),
    });
    if (out.length >= limit) break;
  }
  return out;
}

/** 그날 브리핑. 신고된 거래가 하나도 없으면 건수가 0인 브리핑을 돌려줍니다. */
export async function getDailyBrief(date: string): Promise<DailyBrief> {
  const db = getDb();

  const [countsRes, dealsRes, records] = await Promise.all([
    db.from("daily_counts").select("deal_type, cnt").eq("d", date),
    // 브리핑에 쓰는 건 매매입니다. 전세·월세는 건수만 보여줍니다.
    db
      .from("deals")
      .select(
        "region_code, deal_type, deal_date, dong, complex, area_m2, floor, price_manwon, dealing_type, cancel_date"
      )
      .eq("first_seen_at", date)
      .eq("deal_type", "sale")
      .order("price_manwon", { ascending: false })
      .limit(400),
    getRecordHighs(date),
  ]);

  const totals = { sale: 0, jeonse: 0, monthly: 0 };
  for (const c of (countsRes.data ?? []) as { deal_type: string; cnt: number }[]) {
    if (c.deal_type === "sale") totals.sale = Number(c.cnt);
    else if (c.deal_type === "jeonse") totals.jeonse = Number(c.cnt);
    else if (c.deal_type === "monthly") totals.monthly = Number(c.cnt);
  }

  const rows = (dealsRes.data ?? []) as Row[];
  const deals: DailyDeal[] = rows
    // 취소된 거래는 실제로 성사되지 않았으므로 브리핑에서 뺍니다.
    .filter((r) => !r.cancel_date && r.price_manwon !== null)
    .map((r) => {
      const region = REGION_BY_CODE.get(r.region_code);
      if (!region) return null;
      return {
        regionCode: r.region_code,
        regionName: region.name,
        group: region.group as Group,
        dong: r.dong,
        complex: r.complex,
        areaM2: Number(r.area_m2),
        floor: r.floor,
        dealDate: r.deal_date,
        priceManwon: r.price_manwon as number,
        isDirect: (r.dealing_type ?? "").includes("직거래"),
      };
    })
    .filter((x): x is DailyDeal => x !== null);

  const groups: GroupBrief[] = (["부산", "울산"] as const).map((group) => {
    const list = deals.filter((d) => d.group === group);
    const byRegionMap = new Map<string, number>();
    for (const d of list) byRegionMap.set(d.regionName, (byRegionMap.get(d.regionName) ?? 0) + 1);
    return {
      group,
      count: list.length,
      top: list.slice(0, TOP_PER_GROUP),
      byRegion: Array.from(byRegionMap.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count),
    };
  });

  return {
    date,
    totals,
    groups,
    highlight: deals[0] ?? null,
    records,
  };
}

/** 브리핑을 보여줄 기본 날짜 — 자료가 있는 가장 최근 날 (없으면 오늘) */
export async function getLatestBriefDate(): Promise<string> {
  const dates = await getBriefDates(1);
  return dates[0]?.date ?? kstToday();
}
