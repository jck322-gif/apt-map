import type { TradeRow, RentRow } from "./molit";
import { toPyeong } from "./molit";

export type DealType = "매매" | "전세" | "월세";

export type Listing = {
  dong: string;
  complex: string;
  areaM2: number;
  pyeong: number;
  floor: number;
  date: string;
  dealDay: number; // 계약일(1~31, 정렬용 원본 값 — date는 화면 표시용 문자열)
  priceManwon: number | null; // 매매가 (매매일 때만 값 있음)
  depositManwon: number | null; // 보증금 (전세·월세일 때 값 있음)
  monthlyRentManwon: number | null; // 월세금액 (월세일 때만 값 있음)
};

export type RegionSummary = {
  code: string;
  name: string;
  group: "부산" | "울산";
  x: number;
  y: number;
  lat: number;
  lng: number;
  count: number; // 이번 달 거래 건수
  trendPct: number | null; // null = 표본이 적어 추세를 표시하지 않음
  avgValueManwon: number | null; // 매매=평균 매매가, 전세=평균 보증금, 월세=평균 월세금액
  listings: Listing[];
};

const MIN_SAMPLE_FOR_TREND = 3;
// 화면에는 지역당 이 개수만큼만 최근 거래를 내려보냅니다 (동/단지별로 묶어서 보여주기에 충분한 양).
const LISTINGS_PER_REGION = 60;

function average(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

type Base = {
  code: string;
  name: string;
  group: "부산" | "울산";
  x: number;
  y: number;
  lat: number;
  lng: number;
};

function trendFrom(currentValues: number[], prevValues: number[]) {
  const avgCurrent = average(currentValues);
  const avgPrev = average(prevValues);
  let trendPct: number | null = null;
  if (
    currentValues.length >= MIN_SAMPLE_FOR_TREND &&
    prevValues.length >= MIN_SAMPLE_FOR_TREND &&
    avgCurrent !== null &&
    avgPrev !== null &&
    avgPrev !== 0
  ) {
    trendPct = ((avgCurrent - avgPrev) / avgPrev) * 100;
  }
  return { count: currentValues.length, trendPct, avgValueManwon: avgCurrent };
}

/**
 * 이번 달 매매 거래(currentRows)와 지난 달(prevRows)을 비교해 지역 요약을 만듭니다.
 * 거래가 MIN_SAMPLE_FOR_TREND건 미만인 달은 추세를 계산하지 않고 null로 둡니다.
 */
export function summarizeSale(
  base: Base,
  currentRows: TradeRow[],
  prevRows: TradeRow[],
  currentMonth: number
): RegionSummary {
  const listings: Listing[] = currentRows
    .slice()
    .sort((a, b) => (b.dealDay ?? 0) - (a.dealDay ?? 0))
    .slice(0, LISTINGS_PER_REGION)
    .map((r) => ({
      dong: r.dong,
      complex: r.complex,
      areaM2: r.areaM2,
      pyeong: toPyeong(r.areaM2),
      floor: r.floor,
      date: `${currentMonth}/${r.dealDay}`,
      dealDay: r.dealDay,
      priceManwon: r.priceManwon,
      depositManwon: null,
      monthlyRentManwon: null,
    }));

  return {
    ...base,
    ...trendFrom(
      currentRows.map((r) => r.priceManwon),
      prevRows.map((r) => r.priceManwon)
    ),
    listings,
  };
}

/**
 * 이번 달 전월세 거래(currentRentRows)와 지난 달(prevRentRows)을 비교해 지역 요약을 만듭니다.
 * dealType이 "전세"면 월세금액이 0인 거래만, "월세"면 0보다 큰 거래만 사용합니다.
 */
export function summarizeRent(
  base: Base,
  currentRentRows: RentRow[],
  prevRentRows: RentRow[],
  currentMonth: number,
  dealType: "전세" | "월세"
): RegionSummary {
  const filterFn = (r: RentRow) =>
    dealType === "전세" ? r.monthlyRentManwon === 0 : r.monthlyRentManwon > 0;
  const currentRows = currentRentRows.filter(filterFn);
  const prevRows = prevRentRows.filter(filterFn);
  const valueOf = (r: RentRow) => (dealType === "전세" ? r.depositManwon : r.monthlyRentManwon);

  const listings: Listing[] = currentRows
    .slice()
    .sort((a, b) => (b.dealDay ?? 0) - (a.dealDay ?? 0))
    .slice(0, LISTINGS_PER_REGION)
    .map((r) => ({
      dong: r.dong,
      complex: r.complex,
      areaM2: r.areaM2,
      pyeong: toPyeong(r.areaM2),
      floor: r.floor,
      date: `${currentMonth}/${r.dealDay}`,
      dealDay: r.dealDay,
      priceManwon: null,
      depositManwon: r.depositManwon,
      monthlyRentManwon: dealType === "월세" ? r.monthlyRentManwon : null,
    }));

  return {
    ...base,
    ...trendFrom(currentRows.map(valueOf), prevRows.map(valueOf)),
    listings,
  };
}
