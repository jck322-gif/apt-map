import { NextResponse } from "next/server";
import { REGIONS } from "@/lib/regions";
import { fetchTrades, fetchRents, yyyymm, type TradeRow, type RentRow } from "@/lib/molit";

export const dynamic = "force-dynamic"; // 캐시하지 않고 요청마다 새로 실행

type DealTypeParam = "sale" | "jeonse" | "monthly";

const SALE_MONTHS_BACK = 36; // 3년치 매매 이력을 훑어서 3년 최고/최저를 계산
const RENT_MONTHS_BACK = 6; // 전세/월세는 최근 시세만 참고하면 되므로 6개월이면 충분
const CHART_MONTHS = 6; // 화면에 보여줄 추이 그래프 개월 수
// 같은 단지라도 평형(전용면적)이 다르면 가격이 크게 달라서, 특정 거래를 클릭해 들어온 경우
// 같은 평형(오차 0.5㎡ 이내)끼리만 비교합니다. area가 없으면(예: 단지 전체 보기) 전체 평형을 합쳐서 봅니다.
const AREA_TOLERANCE = 0.5;

export type MonthlyPoint = {
  ymd: string; // "202608"
  label: string; // "8월"
  avgPriceManwon: number | null;
  minPriceManwon: number | null;
  maxPriceManwon: number | null;
  count: number;
};

export type TxDetail = {
  ymd: number; // YYYYMMDD 정수
  dateLabel: string; // "26.08.24"
  priceManwon: number;
  floor: number;
  areaM2: number;
};

// 특정 단지 하나만 보므로(21개 지역 전체를 훑는 /api/update와 달리) 다소 많은 개월수를
// 조회해도 부담이 적지만, 그래도 순간적으로 요청이 몰리지 않도록 소규모 동시 처리합니다.
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
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

function average(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function ymdInt(y: number, m: number, d: number): number {
  return y * 10000 + m * 100 + d;
}

function dateLabel(y: number, m: number, d: number): string {
  return `${String(y).slice(2)}.${String(m).padStart(2, "0")}.${String(d).padStart(2, "0")}`;
}

function areaMatches(rowArea: number, targetArea?: number): boolean {
  if (targetArea === undefined) return true;
  return Math.abs(rowArea - targetArea) <= AREA_TOLERANCE;
}

export async function GET(request: Request) {
  const serviceKey = process.env.MOLIT_SERVICE_KEY;
  if (!serviceKey) {
    return NextResponse.json(
      { error: "MOLIT_SERVICE_KEY 환경변수가 설정되지 않았습니다. .env.local을 확인하세요." },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code") ?? "";
  const complex = (searchParams.get("complex") ?? "").trim();
  const dealTypeParam = (searchParams.get("dealType") ?? "sale") as DealTypeParam;
  const areaParam = searchParams.get("area");
  const targetArea = areaParam ? Number(areaParam) : undefined;

  const region = REGIONS.find((r) => r.code === code);
  if (!region) {
    return NextResponse.json({ error: `알 수 없는 지역 코드입니다: ${code}` }, { status: 400 });
  }
  if (!complex) {
    return NextResponse.json({ error: "단지명(complex)이 필요합니다." }, { status: 400 });
  }
  if (!["sale", "jeonse", "monthly"].includes(dealTypeParam)) {
    return NextResponse.json(
      { error: `알 수 없는 dealType입니다: ${dealTypeParam} (sale/jeonse/monthly 중 하나여야 합니다)` },
      { status: 400 }
    );
  }

  const now = new Date();
  const saleYmds = Array.from({ length: SALE_MONTHS_BACK }, (_, i) => yyyymm(-(SALE_MONTHS_BACK - 1) + i, now));
  const rentYmds = Array.from({ length: RENT_MONTHS_BACK }, (_, i) => yyyymm(-(RENT_MONTHS_BACK - 1) + i, now));

  const errors: { ymd: string; message: string }[] = [];

  // 3년치 매매 실거래(해당 단지 · 해당 평형만) — 3년 최고/최저, 직전거래, 차트 데이터의 원본
  const saleRowsByMonth = await mapWithConcurrency(saleYmds, 4, async (ymd) => {
    try {
      const rows = await fetchTrades(region.code, ymd, serviceKey);
      return rows.filter((r) => r.complex.trim() === complex && areaMatches(r.areaM2, targetArea));
    } catch (err) {
      errors.push({ ymd, message: err instanceof Error ? err.message : String(err) });
      return [] as TradeRow[];
    }
  });

  // 최근 6개월 전월세 실거래(해당 단지 · 해당 평형만) — 현재 전세가, 전세/월세 탭일 때의 차트 데이터
  const rentRowsByMonth = await mapWithConcurrency(rentYmds, 4, async (ymd) => {
    try {
      const rows = await fetchRents(region.code, ymd, serviceKey);
      return rows.filter((r) => r.complex.trim() === complex && areaMatches(r.areaM2, targetArea));
    } catch (err) {
      errors.push({ ymd, message: err instanceof Error ? err.message : String(err) });
      return [] as RentRow[];
    }
  });

  const saleRowsFlat = saleRowsByMonth.flat();
  const rentRowsFlat = rentRowsByMonth.flat();

  const allSales: TxDetail[] = saleRowsFlat
    .map((r) => ({
      ymd: ymdInt(r.dealYear, r.dealMonth, r.dealDay),
      dateLabel: dateLabel(r.dealYear, r.dealMonth, r.dealDay),
      priceManwon: r.priceManwon,
      floor: r.floor,
      areaM2: r.areaM2,
    }))
    .sort((a, b) => b.ymd - a.ymd);

  const allJeonse: TxDetail[] = rentRowsFlat
    .filter((r) => r.monthlyRentManwon === 0)
    .map((r) => ({
      ymd: ymdInt(r.dealYear, r.dealMonth, r.dealDay),
      dateLabel: dateLabel(r.dealYear, r.dealMonth, r.dealDay),
      priceManwon: r.depositManwon,
      floor: r.floor,
      areaM2: r.areaM2,
    }))
    .sort((a, b) => b.ymd - a.ymd);

  const allMonthly: TxDetail[] = rentRowsFlat
    .filter((r) => r.monthlyRentManwon > 0)
    .map((r) => ({
      ymd: ymdInt(r.dealYear, r.dealMonth, r.dealDay),
      dateLabel: dateLabel(r.dealYear, r.dealMonth, r.dealDay),
      priceManwon: r.monthlyRentManwon,
      floor: r.floor,
      areaM2: r.areaM2,
    }))
    .sort((a, b) => b.ymd - a.ymd);

  // 실거래가 카드용 통계 — 매매 기준 (탭이 전세/월세여도 "3년 최고/최저"는 매매가 개념이라 항상 매매로 계산)
  const latestSale = allSales[0] ?? null;
  const previousSale = allSales[1] ?? null;
  const highSale = allSales.length
    ? allSales.reduce((max, cur) => (cur.priceManwon > max.priceManwon ? cur : max))
    : null;
  const lowSale = allSales.length
    ? allSales.reduce((min, cur) => (cur.priceManwon < min.priceManwon ? cur : min))
    : null;
  const recoveryPct = latestSale && highSale && highSale.priceManwon !== 0 ? (latestSale.priceManwon / highSale.priceManwon) * 100 : null;
  const saleChangeManwon = latestSale && previousSale ? latestSale.priceManwon - previousSale.priceManwon : null;
  const saleChangePct =
    latestSale && previousSale && previousSale.priceManwon !== 0
      ? (saleChangeManwon! / previousSale.priceManwon) * 100
      : null;

  const latestJeonse = allJeonse[0] ?? null;
  const gapManwon = latestSale && latestJeonse ? latestSale.priceManwon - latestJeonse.priceManwon : null;
  const gapPct = latestSale && gapManwon !== null && latestSale.priceManwon !== 0 ? (gapManwon / latestSale.priceManwon) * 100 : null;

  // 단지 기본 정보 — 매매/전세/월세를 통틀어 가장 최근 거래 한 건에서 동/준공년도를 가져옵니다
  // (셋 다 없으면 null). 같은 단지·같은 평형이면 동/준공년도는 어느 거래에서 가져와도 동일합니다.
  const infoSourceRow = [...saleRowsFlat, ...rentRowsFlat].sort(
    (a, b) => ymdInt(b.dealYear, b.dealMonth, b.dealDay) - ymdInt(a.dealYear, a.dealMonth, a.dealDay)
  )[0] as (TradeRow | RentRow) | undefined;
  const buildYear = infoSourceRow?.buildYear ?? null;
  const age = buildYear ? now.getFullYear() - buildYear + 1 : null;
  const dong = infoSourceRow?.dong ?? null;

  // 화면 상단 추이 그래프용 월별 집계 — 현재 보고 있는 거래유형(dealType) 기준, 최근 6개월
  const chartYmds = Array.from({ length: CHART_MONTHS }, (_, i) => yyyymm(-(CHART_MONTHS - 1) + i, now));
  const points: MonthlyPoint[] = chartYmds.map((ymd) => {
    const source = dealTypeParam === "sale" ? allSales : dealTypeParam === "jeonse" ? allJeonse : allMonthly;
    const values = source.filter((tx) => String(tx.ymd).slice(0, 6) === ymd).map((tx) => tx.priceManwon);
    const m = Number(ymd.slice(4, 6));
    return {
      ymd,
      label: `${m}월`,
      avgPriceManwon: average(values),
      minPriceManwon: values.length ? Math.min(...values) : null,
      maxPriceManwon: values.length ? Math.max(...values) : null,
      count: values.length,
    };
  });

  return NextResponse.json({
    code: region.code,
    regionName: region.name,
    group: region.group,
    complex,
    dong,
    buildYear,
    age,
    dealType: dealTypeParam,
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
    errors,
  });
}
