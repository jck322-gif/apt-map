import { NextResponse } from "next/server";
import { REGIONS } from "@/lib/regions";
import { yyyymm } from "@/lib/molit";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

type DealTypeParam = "sale" | "jeonse" | "monthly";

const YEARS_BACK = 3; // 3년 최고/최저 계산 범위
const CHART_MONTHS = 6; // 화면 그래프에 표시할 개월 수

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
};

function average(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function toTx(r: DealRow, value: number): TxDetail {
  const [y, m, d] = r.deal_date.split("-").map(Number);
  return {
    ymd: y * 10000 + m * 100 + d,
    dateLabel: `${String(y).slice(2)}.${String(m).padStart(2, "0")}.${String(d).padStart(2, "0")}`,
    priceManwon: value,
    floor: r.floor,
    areaM2: Number(r.area_m2),
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code") ?? "";
  const complex = (searchParams.get("complex") ?? "").trim();
  const dealType = (searchParams.get("dealType") ?? "sale") as DealTypeParam;
  const areaParam = searchParams.get("area");
  const targetArea = areaParam ? Number(areaParam) : null;

  const region = REGIONS.find((r) => r.code === code);
  if (!region) {
    return NextResponse.json({ error: `알 수 없는 지역 코드입니다: ${code}` }, { status: 400 });
  }
  if (!complex) {
    return NextResponse.json({ error: "단지명(complex)이 필요합니다." }, { status: 400 });
  }
  if (!["sale", "jeonse", "monthly"].includes(dealType)) {
    return NextResponse.json({ error: `알 수 없는 dealType입니다: ${dealType}` }, { status: 400 });
  }

  let db;
  try {
    db = getDb();
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }

  const now = new Date();
  const from = new Date(now.getFullYear() - YEARS_BACK, now.getMonth(), 1);
  const fromStr = `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, "0")}-01`;

  // 이 단지(+평형)의 3년치 거래를 한 번에 가져와, 필요한 통계는 여기서 계산합니다.
  const { data, error } = await db.rpc("complex_deals", {
    p_region_code: region.code,
    p_complex: complex,
    p_area: targetArea,
    p_from: fromStr,
  });

  if (error) {
    return NextResponse.json({ error: `데이터베이스 조회 실패: ${error.message}` }, { status: 500 });
  }

  const rows = (data ?? []) as DealRow[];

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
  const infoRow = rows
    .slice()
    .sort((a, b) => (a.deal_date < b.deal_date ? 1 : -1))[0];
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

  // 그래프용 월별 집계 — 현재 보고 있는 거래유형 기준, 최근 6개월
  const chartYmds = Array.from({ length: CHART_MONTHS }, (_, i) => yyyymm(-(CHART_MONTHS - 1) + i, now));
  const source = dealType === "sale" ? allSales : dealType === "jeonse" ? allJeonse : allMonthly;
  const points: MonthlyPoint[] = chartYmds.map((ym) => {
    const values = source.filter((tx) => String(tx.ymd).slice(0, 6) === ym).map((tx) => tx.priceManwon);
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

  return NextResponse.json({
    code: region.code,
    regionName: region.name,
    group: region.group,
    complex,
    dong,
    buildYear,
    age,
    dealType,
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
  });
}
