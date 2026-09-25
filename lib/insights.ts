import { getDb } from "@/lib/db";
import { REGIONS } from "@/lib/regions";
import { kstToday } from "@/lib/kst";
import { fetchAll } from "@/lib/fetchAll";

/**
 * "분석" 페이지(/insight/...) 자료.
 *
 * 전부 국토교통부 실거래 자료에서 그때그때 계산합니다. 사람이 손으로 쓴 숫자는 없고,
 * 페이지를 새로 만들 때마다(하루 몇 번) 최신 자료로 다시 계산됩니다.
 * 공통 규칙: 해제(취소)된 거래는 뺍니다.
 */

export type Group = "부산" | "울산";
const REGION_BY_CODE = new Map(REGIONS.map((r) => [r.code, r]));

function shiftDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function monthRange(isoDate: string, back: number): { from: string; to: string; label: string } {
  const [y, m] = isoDate.split("-").map(Number);
  const start = new Date(Date.UTC(y, m - 1 - back, 1));
  const next = new Date(Date.UTC(y, m - back, 1));
  return {
    from: start.toISOString().slice(0, 10),
    to: next.toISOString().slice(0, 10),
    label: `${start.getUTCMonth() + 1}월`,
  };
}

export function median(nums: number[]): number | null {
  if (nums.length === 0) return null;
  const a = [...nums].sort((x, y) => x - y);
  const mid = Math.floor(a.length / 2);
  return a.length % 2 ? a[mid] : Math.round((a[mid - 1] + a[mid]) / 2);
}

/** 이번 달은 신고가 덜 들어와 있으니 끝난 두 달을 고릅니다 (15일 전이면 한 달 더 앞으로). */
export function comparableMonths(today = kstToday()) {
  const offset = Number(today.slice(8, 10)) >= 15 ? 1 : 2;
  return { a: monthRange(today, offset), b: monthRange(today, offset + 1) };
}

/* ───────────────────────── 1. 구·군별 거래량·가격 ───────────────────────── */

export type RegionTrendRow = {
  code: string;
  name: string;
  group: Group;
  countA: number;
  countB: number;
  changePct: number | null;
  /** 최근 90일 전용 80~90㎡ 매매 중간값 */
  median84: number | null;
  count84: number;
  /** 최근 90일 최고가 거래 */
  top: { complex: string; areaM2: number; priceManwon: number; dealDate: string } | null;
};

export type RegionTrend = {
  asOf: string;
  monthA: string;
  monthB: string;
  rows: RegionTrendRow[];
};

type SaleRow = {
  region_code: string;
  complex: string;
  area_m2: number | string;
  price_manwon: number | null;
  deal_date: string;
};

export async function getRegionTrend(): Promise<RegionTrend> {
  const db = getDb();
  const today = kstToday();
  const { a, b } = comparableMonths(today);
  const d90 = shiftDays(today, -90);
  const from = [b.from, d90].sort()[0];

  const rows = await fetchAll<SaleRow>((f, t) =>
    db
      .from("deals")
      .select("region_code, complex, area_m2, price_manwon, deal_date")
      .eq("deal_type", "sale")
      .is("cancel_date", null)
      .gte("deal_date", from)
      .order("id", { ascending: true })
      .range(f, t)
  );

  const out: RegionTrendRow[] = REGIONS.map((r) => {
    const mine = rows.filter((x) => x.region_code === r.code && x.price_manwon !== null);
    const countA = mine.filter((x) => x.deal_date >= a.from && x.deal_date < a.to).length;
    const countB = mine.filter((x) => x.deal_date >= b.from && x.deal_date < b.to).length;
    const last90 = mine.filter((x) => x.deal_date >= d90);
    const p84 = last90
      .filter((x) => Number(x.area_m2) >= 80 && Number(x.area_m2) < 90)
      .map((x) => x.price_manwon as number);
    const topRow = [...last90].sort((x, y) => (y.price_manwon as number) - (x.price_manwon as number))[0];
    return {
      code: r.code,
      name: r.name,
      group: r.group as Group,
      countA,
      countB,
      changePct: countB > 0 ? ((countA - countB) / countB) * 100 : null,
      median84: p84.length >= 3 ? median(p84) : null,
      count84: p84.length,
      top: topRow
        ? {
            complex: topRow.complex,
            areaM2: Number(topRow.area_m2),
            priceManwon: topRow.price_manwon as number,
            dealDate: topRow.deal_date,
          }
        : null,
    };
  });

  return { asOf: today, monthA: a.label, monthB: b.label, rows: out };
}

/* ───────────────────────── 2. 전세가율 ───────────────────────── */

export type JeonseRateRow = {
  regionCode: string;
  regionName: string;
  group: Group;
  complex: string;
  areaM2: number;
  saleMedian: number;
  jeonseMedian: number;
  saleCount: number;
  jeonseCount: number;
  ratePct: number;
};

export type JeonseRate = {
  asOf: string;
  from: string;
  rows: JeonseRateRow[];
  /** 부산·울산 각각 비교 가능한 단지·평형의 전세가율 중간값 */
  groupMedian: Record<Group, number | null>;
  groupCount: Record<Group, number>;
  /** 80% 이상인 단지·평형 수 */
  over80: Record<Group, number>;
};

type JRow = {
  region_code: string;
  complex: string;
  area_m2: number | string;
  deal_type: string;
  price_manwon: number | null;
  deposit_manwon: number | null;
};

export const MIN_DEALS = 3;
export const MIN_SALE_MANWON = 10000;

/** 최근 3개월, 같은 단지·같은 평형의 매매 중간값과 전세 중간값을 견줍니다 (각각 3건 이상, 매매 1억 이상). */
export async function getJeonseRate(): Promise<JeonseRate> {
  const db = getDb();
  const today = kstToday();
  const from = shiftDays(today, -92);

  const rows = await fetchAll<JRow>(
    (f, t) =>
      db
        .from("deals")
        .select("region_code, complex, area_m2, deal_type, price_manwon, deposit_manwon")
        .in("deal_type", ["sale", "jeonse"])
        .is("cancel_date", null)
        .gte("deal_date", from)
        .order("id", { ascending: true })
        .range(f, t),
    { parallel: 6 }
  );

  const bucket = new Map<string, { sale: number[]; jeonse: number[]; area: number; code: string; complex: string }>();
  for (const r of rows) {
    const value = r.deal_type === "sale" ? r.price_manwon : r.deposit_manwon;
    if (!value) continue;
    const area = Number(r.area_m2);
    const key = `${r.region_code}|${r.complex}|${Math.round(area)}`;
    let b = bucket.get(key);
    if (!b) {
      b = { sale: [], jeonse: [], area, code: r.region_code, complex: r.complex };
      bucket.set(key, b);
    }
    (r.deal_type === "sale" ? b.sale : b.jeonse).push(value);
  }

  const out: JeonseRateRow[] = [];
  for (const b of bucket.values()) {
    // 매매·전세 각 3건 이상, 매매 중간값 1억 이상인 곳만 봅니다. 기준이 느슨하면 매매 5천만원대
    // 초소형 구축이 표를 채워서, 사람들이 실제로 궁금해하는 단지가 보이지 않았습니다.
    if (b.sale.length < MIN_DEALS || b.jeonse.length < MIN_DEALS) continue;
    const region = REGION_BY_CODE.get(b.code);
    if (!region) continue;
    const s = median(b.sale) as number;
    const j = median(b.jeonse) as number;
    if (s < MIN_SALE_MANWON) continue;
    const rate = (j / s) * 100;
    // 100%를 크게 넘거나 30% 아래는 층·동이 전혀 다른 거래끼리 묶인 경우가 많아 뺍니다.
    if (rate < 30 || rate > 110) continue;
    out.push({
      regionCode: b.code,
      regionName: region.name,
      group: region.group as Group,
      complex: b.complex,
      areaM2: b.area,
      saleMedian: s,
      jeonseMedian: j,
      saleCount: b.sale.length,
      jeonseCount: b.jeonse.length,
      ratePct: rate,
    });
  }
  out.sort((x, y) => y.ratePct - x.ratePct);

  const groups: Group[] = ["부산", "울산"];
  const groupMedian = {} as Record<Group, number | null>;
  const groupCount = {} as Record<Group, number>;
  const over80 = {} as Record<Group, number>;
  for (const g of groups) {
    const list = out.filter((r) => r.group === g);
    const med = median(list.map((r) => Math.round(r.ratePct * 10)));
    groupMedian[g] = med === null ? null : med / 10;
    groupCount[g] = list.length;
    over80[g] = list.filter((r) => r.ratePct >= 80).length;
  }

  return { asOf: today, from, rows: out, groupMedian, groupCount, over80 };
}

/* ───────────────────────── 3. 이번 주 신고가 ───────────────────────── */

export type WeeklyRecord = {
  regionCode: string;
  regionName: string;
  group: Group;
  dong: string;
  complex: string;
  areaM2: number;
  floor: number;
  priceManwon: number;
  dealDate: string;
  prevPriceManwon: number;
  prevDealDate: string | null;
  gainManwon: number;
  gainPct: number;
};

export type WeeklyRecords = {
  from: string;
  to: string;
  /** 단지마다 가장 크게 오른 한 건만 (오른 금액 순) */
  rows: WeeklyRecord[];
  totalByGroup: Record<Group, number>;
};

type RecRow = {
  region_code: string;
  complex: string;
  dong: string;
  area_m2: number | string;
  floor: number;
  price_manwon: number;
  deal_date: string;
  prev_price_manwon: number | null;
  prev_deal_date: string | null;
  gain_manwon: number | null;
};

/** 최근 7일 동안 새로 "신고된" 거래 중 평형별 3년 내 최고가를 넘은 거래. */
export async function getWeeklyRecords(): Promise<WeeklyRecords> {
  const db = getDb();
  const to = kstToday();
  const from = shiftDays(to, -6);

  const rows = await fetchAll<RecRow>((f, t) =>
    db
      .from("record_highs")
      .select("region_code, complex, dong, area_m2, floor, price_manwon, deal_date, prev_price_manwon, prev_deal_date, gain_manwon")
      .gte("first_seen_at", from)
      .lte("first_seen_at", to)
      .order("region_code", { ascending: true })
      .order("complex", { ascending: true })
      .order("deal_date", { ascending: true })
      .order("area_m2", { ascending: true })
      .order("floor", { ascending: true })
      .range(f, t)
  );

  const totalByGroup: Record<Group, number> = { 부산: 0, 울산: 0 };
  const best = new Map<string, WeeklyRecord>();
  for (const r of rows) {
    const region = REGION_BY_CODE.get(r.region_code);
    if (!region) continue;
    const group = region.group as Group;
    totalByGroup[group] += 1;
    const prev = Number(r.prev_price_manwon ?? 0);
    const gain = Number(r.gain_manwon ?? 0);
    const rec: WeeklyRecord = {
      regionCode: r.region_code,
      regionName: region.name,
      group,
      dong: r.dong,
      complex: r.complex,
      areaM2: Number(r.area_m2),
      floor: r.floor,
      priceManwon: Number(r.price_manwon),
      dealDate: r.deal_date,
      prevPriceManwon: prev,
      prevDealDate: r.prev_deal_date,
      gainManwon: gain,
      gainPct: prev > 0 ? (gain / prev) * 100 : 0,
    };
    const key = `${r.region_code}|${r.complex}`;
    const cur = best.get(key);
    if (!cur || rec.gainManwon > cur.gainManwon) best.set(key, rec);
  }
  const list = [...best.values()].sort((x, y) => y.gainManwon - x.gainManwon);
  return { from, to, rows: list, totalByGroup };
}
