import { REGIONS } from "@/lib/regions";
import { yyyymm } from "@/lib/molit";
import { getDb } from "@/lib/db";

/**
 * 단지 하나에 대한 실거래 자료를 모으는 곳.
 *
 * 팝업(/api/complex-trend)과 단지 페이지(/apt/...)가 **같은 함수**를 씁니다.
 * 두 화면에 다른 숫자가 나오면 안 되기 때문에, 계산은 여기 한 곳에만 둡니다.
 */

export type DealTypeParam = "sale" | "jeonse" | "monthly";

export const YEARS_BACK = 3; // 3년 최고/최저 계산 범위
// 화면 그래프에 표시할 개월 수.
// 전세·월세는 단지·평형별로 거래가 드물어 6개월로 자르면 그래프가 자주 비어서, 1년으로 넓게 봅니다.
export const CHART_MONTHS = 12;

export type MonthlyPoint = {
  ymd: string;
  label: string;
  avgPriceManwon: number | null;
  minPriceManwon: number | null;
  maxPriceManwon: number | null;
  count: number;
};

export type TxDetail = {
  ymd: number;
  dateLabel: string;
  priceManwon: number;
  floor: number;
  areaM2: number;
  isRecordHigh?: boolean; // 신고가 — 그 시점까지의 최고가
  cancelDate?: string | null; // 해제(거래취소)일
  isDirect?: boolean; // 직거래 여부
  registerDate?: string | null; // 등기일자
  aptDong?: string | null; // 동
};

type DealRow = {
  deal_type: DealTypeParam;
  deal_date: string; // "2026-08-24"
  floor: number;
  area_m2: number;
  dong: string;
  build_year: number | null;
  price_manwon: number | null;
  deposit_manwon: number | null;
  monthly_rent_manwon: number | null;
  cancel_date: string | null;
  dealing_type: string | null;
  register_date: string | null;
  apt_dong: string | null;
};

export type ComplexTrend = {
  code: string;
  regionName: string;
  group: string;
  complex: string;
  dong: string | null;
  buildYear: number | null;
  age: number | null;
  dealType: DealTypeParam;
  types: number[];
  counts: { sale: number; jeonse: number; monthly: number };
  comparePoints: { sale: MonthlyPoint[]; jeonse: MonthlyPoint[] };
  history: TxDetail[];
  points: MonthlyPoint[];
  stats: {
    latestSale: TxDetail | null;
    previousSale: TxDetail | null;
    saleChangeManwon: number | null;
    saleChangePct: number | null;
    highSale: TxDetail | null;
    lowSale: TxDetail | null;
    recoveryPct: number | null;
    latestJeonse: TxDetail | null;
    gapManwon: number | null;
    gapPct: number | null;
  };
  errors: { ymd: string; message: string }[];
};

function average(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

/** 거래 목록을 월별 평균·최저·최고·건수로 묶습니다 (그래프용). */
function monthlySeries(list: TxDetail[], ymds: string[]): MonthlyPoint[] {
  return ymds.map((ym) => {
    const values = list.filter((tx) => String(tx.ymd).slice(0, 6) === ym).map((tx) => tx.priceManwon);
    const m = Number(ym.slice(4, 6));
    return {
      ymd: ym,
      label: `${m}월`,
      avgPriceManwon: average(values),
      minPriceManwon: values.length ? Math.min(...values) : null,
      maxPriceManwon: values.length ? Math.max(...values) : null,
      count: values.length,
    };
  });
}

function toTx(r: DealRow, value: number): TxDetail {
  const [y, m, d] = r.deal_date.split("-").map(Number);
  return {
    ymd: y * 10000 + m * 100 + d,
    dateLabel: `${String(y).slice(2)}.${String(m).padStart(2, "0")}.${String(d).padStart(2, "0")}`,
    priceManwon: value,
    floor: r.floor,
    areaM2: Number(r.area_m2),
    cancelDate: r.cancel_date ?? null,
    isDirect: (r.dealing_type ?? "").includes("직거래"),
    registerDate: r.register_date ?? null,
    aptDong: r.apt_dong ?? null,
  };
}

/**
 * 신고가 표시 — 오래된 거래부터 훑으면서, 그 시점까지의 최고가를 넘어선 거래에 표시합니다.
 * 취소된 거래는 최고가 계산에서 제외합니다.
 * (우리가 가진 자료가 3년치라 "3년 내 최고가"라는 뜻입니다.)
 */
function markRecordHighs(list: TxDetail[]): TxDetail[] {
  const oldestFirst = [...list].sort((a, b) => a.ymd - b.ymd);
  let best = -Infinity;
  for (const tx of oldestFirst) {
    if (tx.cancelDate) continue;
    if (tx.priceManwon > best) {
      tx.isRecordHigh = true;
      best = tx.priceManwon;
    }
  }
  return list;
}

export class ComplexError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

/** 단지(+평형) 하나의 3년치 실거래를 읽어 화면에 필요한 형태로 정리합니다. */
export async function loadComplexTrend(opts: {
  code: string;
  complex: string;
  dealType?: DealTypeParam;
  area?: number | null;
}): Promise<ComplexTrend> {
  const code = opts.code;
  const complex = (opts.complex ?? "").trim();
  const dealType = (opts.dealType ?? "sale") as DealTypeParam;
  const targetArea = opts.area ?? null;

  const region = REGIONS.find((r) => r.code === code);
  if (!region) throw new ComplexError(`알 수 없는 지역 코드입니다: ${code}`, 400);
  if (!complex) throw new ComplexError("단지명(complex)이 필요합니다.", 400);
  if (!["sale", "jeonse", "monthly"].includes(dealType)) {
    throw new ComplexError(`알 수 없는 dealType입니다: ${dealType}`, 400);
  }

  let db;
  try {
    db = getDb();
  } catch (err) {
    throw new ComplexError(err instanceof Error ? err.message : String(err), 500);
  }

  const now = new Date();
  const from = new Date(now.getFullYear() - YEARS_BACK, now.getMonth(), 1);
  const fromStr = `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, "0")}-01`;

  // 이 단지(+평형)의 3년치 거래를 표에서 직접 가져와, 필요한 통계는 여기서 계산합니다.
  let query = db
    .from("deals")
    .select(
      "deal_type, deal_date, floor, area_m2, dong, build_year, price_manwon, deposit_manwon, monthly_rent_manwon, cancel_date, dealing_type, register_date, apt_dong"
    )
    .eq("region_code", region.code)
    .eq("complex", complex)
    .gte("deal_date", fromStr);

  // 같은 단지라도 평형이 다르면 가격대가 크게 달라서, 특정 거래로 들어온 경우
  // 같은 평형(오차 0.5㎡ 이내)끼리만 비교합니다.
  if (targetArea !== null && Number.isFinite(targetArea)) {
    query = query.gte("area_m2", targetArea - 0.5).lte("area_m2", targetArea + 0.5);
  }

  // 이 단지가 가진 평형(타입) 목록 — 화면에서 타입을 바꿔가며 볼 수 있도록 항상 함께 내려줍니다.
  const typesQuery = db
    .from("complex_types")
    .select("area_m2")
    .eq("region_code", region.code)
    .eq("complex", complex);

  const [{ data, error }, typesRes] = await Promise.all([
    query.order("deal_date", { ascending: false }).limit(1000),
    typesQuery,
  ]);

  if (error) throw new ComplexError(`데이터베이스 조회 실패: ${error.message}`, 500);

  const rows = (data ?? []) as DealRow[];
  const types = Array.from(
    new Set((typesRes.data ?? []).map((t: { area_m2: number | string }) => Number(t.area_m2)))
  ).sort((a, b) => a - b);

  const allSales = rows
    .filter((r) => r.deal_type === "sale" && r.price_manwon !== null)
    .map((r) => toTx(r, r.price_manwon as number))
    .sort((a, b) => b.ymd - a.ymd);

  const allJeonse = rows
    .filter((r) => r.deal_type === "jeonse" && r.deposit_manwon !== null)
    .map((r) => toTx(r, r.deposit_manwon as number))
    .sort((a, b) => b.ymd - a.ymd);

  const allMonthly = rows
    .filter((r) => r.deal_type === "monthly" && r.monthly_rent_manwon !== null)
    .map((r) => toTx(r, r.monthly_rent_manwon as number))
    .sort((a, b) => b.ymd - a.ymd);

  // 단지 기본 정보 — 가장 최근 거래에서 동·준공년도를 가져옵니다.
  const infoRow = rows.slice().sort((a, b) => (a.deal_date < b.deal_date ? 1 : -1))[0];
  const buildYear = infoRow?.build_year ?? null;
  const age = buildYear ? now.getFullYear() - buildYear + 1 : null;
  const dong = infoRow?.dong ?? null;

  const latestSale = allSales[0] ?? null;
  const previousSale = allSales[1] ?? null;
  const highSale = allSales.length
    ? allSales.reduce((max, cur) => (cur.priceManwon > max.priceManwon ? cur : max))
    : null;
  const lowSale = allSales.length
    ? allSales.reduce((min, cur) => (cur.priceManwon < min.priceManwon ? cur : min))
    : null;
  const recoveryPct =
    latestSale && highSale && highSale.priceManwon !== 0
      ? (latestSale.priceManwon / highSale.priceManwon) * 100
      : null;
  const saleChangeManwon = latestSale && previousSale ? latestSale.priceManwon - previousSale.priceManwon : null;
  const saleChangePct =
    latestSale && previousSale && previousSale.priceManwon !== 0
      ? ((saleChangeManwon as number) / previousSale.priceManwon) * 100
      : null;

  const latestJeonse = allJeonse[0] ?? null;
  const gapManwon = latestSale && latestJeonse ? latestSale.priceManwon - latestJeonse.priceManwon : null;
  const gapPct =
    latestSale && gapManwon !== null && latestSale.priceManwon !== 0
      ? (gapManwon / latestSale.priceManwon) * 100
      : null;

  // 그래프용 월별 집계 — 현재 보고 있는 거래유형 기준
  const chartYmds = Array.from({ length: CHART_MONTHS }, (_, i) => yyyymm(-(CHART_MONTHS - 1) + i, now));
  const source = markRecordHighs(dealType === "sale" ? allSales : dealType === "jeonse" ? allJeonse : allMonthly);
  const points: MonthlyPoint[] = monthlySeries(source, chartYmds);

  return {
    code: region.code,
    regionName: region.name,
    group: region.group,
    complex,
    dong,
    buildYear,
    age,
    dealType,
    types,
    counts: { sale: allSales.length, jeonse: allJeonse.length, monthly: allMonthly.length },
    comparePoints: {
      sale: monthlySeries(allSales, chartYmds),
      jeonse: monthlySeries(allJeonse, chartYmds),
    },
    history: source.slice(0, 200),
    points,
    stats: {
      latestSale,
      previousSale,
      saleChangeManwon,
      saleChangePct,
      highSale,
      lowSale,
      recoveryPct,
      latestJeonse,
      gapManwon,
      gapPct,
    },
    errors: [],
  };
}

export type ComplexListRow = {
  regionCode: string;
  complex: string;
  dong: string | null;
  buildYear: number | null;
  saleCount: number;
  totalCount: number;
  lastDealDate: string | null;
};

/** 한 지역의 단지 목록 (거래가 많은 순). 단지 목록 페이지와 사이트맵이 씁니다. */
export async function listComplexes(regionCode: string, limit = 1000): Promise<ComplexListRow[]> {
  const db = getDb();
  const { data, error } = await db
    .from("complex_list")
    .select("region_code, complex, dong, build_year, sale_cnt, total_cnt, last_deal_date")
    .eq("region_code", regionCode)
    .order("total_cnt", { ascending: false })
    .limit(limit);
  if (error) throw new ComplexError(`단지 목록 조회 실패: ${error.message}`, 500);
  return (data ?? []).map((r: Record<string, unknown>) => ({
    regionCode: String(r.region_code),
    complex: String(r.complex),
    dong: (r.dong as string) ?? null,
    buildYear: (r.build_year as number) ?? null,
    saleCount: Number(r.sale_cnt ?? 0),
    totalCount: Number(r.total_cnt ?? 0),
    lastDealDate: (r.last_deal_date as string) ?? null,
  }));
}

/**
 * 사이트맵에 넣을 단지 목록 — 거래가 minCount건 이상인 단지만.
 * 거래 1~2건짜리 단지까지 전부 올리면 내용이 얇은 페이지가 무더기로 색인 요청되어 오히려 손해입니다.
 * PostgREST가 한 번에 1000행까지만 주기 때문에 나눠서 받아옵니다.
 */
export async function listAllComplexesForSitemap(minCount = 3, hardCap = 8000): Promise<ComplexListRow[]> {
  const db = getDb();
  const out: ComplexListRow[] = [];
  const PAGE = 1000;
  for (let from = 0; from < hardCap; from += PAGE) {
    const { data, error } = await db
      .from("complex_list")
      .select("region_code, complex, dong, build_year, sale_cnt, total_cnt, last_deal_date")
      .gte("total_cnt", minCount)
      .order("region_code", { ascending: true })
      .order("complex", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw new ComplexError(`사이트맵용 단지 목록 조회 실패: ${error.message}`, 500);
    const rows = data ?? [];
    for (const r of rows as Record<string, unknown>[]) {
      out.push({
        regionCode: String(r.region_code),
        complex: String(r.complex),
        dong: (r.dong as string) ?? null,
        buildYear: (r.build_year as number) ?? null,
        saleCount: Number(r.sale_cnt ?? 0),
        totalCount: Number(r.total_cnt ?? 0),
        lastDealDate: (r.last_deal_date as string) ?? null,
      });
    }
    if (rows.length < PAGE) break;
  }
  return out;
}

/** 단지 페이지 주소 — 한글이 그대로 들어가야 검색에 유리합니다. */
export function complexHref(regionCode: string, complex: string): string {
  return `/apt/${regionCode}/${encodeURIComponent(complex)}`;
}

/** 평형별 단지 페이지 주소 (예: /apt/26500/삼익비치/95.17) */
export function complexAreaHref(regionCode: string, complex: string, areaM2: number): string {
  return `${complexHref(regionCode, complex)}/${areaM2}`;
}
