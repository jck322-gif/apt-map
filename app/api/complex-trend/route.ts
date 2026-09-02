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
  isRecordHigh?: boolean;   // 신고가 — 그 시점까지의 최고가
  cancelDate?: string | null;   // 해제(거래취소)일
  isDirect?: boolean;       // 직거래 여부
  registerDate?: string | null; // 등기일자
  aptDong?: string | null;  // 동
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

  // 이 단지가 가진 평형(타입) 목록 — 팝업에서 타입을 바꿔가며 볼 수 있도록 항상 함께 내려줍니다.
  // 거래유형(매매/전세/월세)을 바꿔도 타입 목록이 흔들리지 않도록 유형 구분 없이 모읍니다.
  const typesQuery = db
    .from("complex_types")
    .select("area_m2")
    .eq("region_code", region.code)
    .eq("complex", complex);

  const [{ data, error }, typesRes] = await Promise.all([
    query.order("deal_date", { ascending: false }).limit(1000),
    typesQuery,
  ]);

  if (error) {
    return NextResponse.json({ error: `데이터베이스 조회 실패: ${error.message}` }, { status: 500 });
  }

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
  const source = markRecordHighs(dealType === "sale" ? allSales : dealType === "jeonse" ? allJeonse : allMonthly);
  const points: MonthlyPoint[] = monthlySeries(source, chartYmds);

  return NextResponse.json({
    code: region.code,
    regionName: region.name,
    group: region.group,
    complex,
    dong,
    buildYear,
    age,
    dealType,
    types,
    // 이 단지(선택한 평형)에 거래유형별로 자료가 몇 건씩 있는지 —
    // 팝업에서 매매/전세/월세 버튼을 켜고 끄는 데 씁니다.
    counts: { sale: allSales.length, jeonse: allJeonse.length, monthly: allMonthly.length },
    // 매매·전세를 함께 볼 수 있도록 두 계열의 월별 평균을 같이 내려줍니다.
    comparePoints: {
      sale: monthlySeries(allSales, chartYmds),
      jeonse: monthlySeries(allJeonse, chartYmds),
    },
    // 선택한 타입의 개별 실거래 이력 (최근순)
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
  });
}
