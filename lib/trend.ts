import type { TradeRow } from "./molit";

export type RegionSummary = {
  code: string;
  name: string;
  group: "부산" | "울산";
  x: number;
  y: number;
  count: number; // 이번 달 거래 건수
  trendPct: number | null; // null = 표본이 적어 추세를 표시하지 않음
  avgPriceManwon: number | null;
  listings: {
    dong: string;
    complex: string;
    areaM2: number;
    floor: number;
    priceManwon: number;
    date: string;
  }[];
};

const MIN_SAMPLE_FOR_TREND = 3;

function average(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

/**
 * 이번 달 거래(currentRows)와 지난 달 거래(prevRows)를 비교해 지역 요약을 만듭니다.
 * 거래가 MIN_SAMPLE_FOR_TREND건 미만인 달은 추세를 계산하지 않고 null로 둡니다(05장 규칙).
 */
export function summarizeRegion(
  base: { code: string; name: string; group: "부산" | "울산"; x: number; y: number },
  currentRows: TradeRow[],
  prevRows: TradeRow[],
  currentYear: number,
  currentMonth: number
): RegionSummary {
  const currentPrices = currentRows.map((r) => r.priceManwon);
  const prevPrices = prevRows.map((r) => r.priceManwon);
  const avgCurrent = average(currentPrices);
  const avgPrev = average(prevPrices);

  let trendPct: number | null = null;
  if (
    currentRows.length >= MIN_SAMPLE_FOR_TREND &&
    prevRows.length >= MIN_SAMPLE_FOR_TREND &&
    avgCurrent !== null &&
    avgPrev !== null &&
    avgPrev !== 0
  ) {
    trendPct = ((avgCurrent - avgPrev) / avgPrev) * 100;
  }

  const listings = currentRows
    .slice()
    .sort((a, b) => (b.dealDay ?? 0) - (a.dealDay ?? 0))
    .slice(0, 8)
    .map((r) => ({
      dong: r.dong,
      complex: r.complex,
      areaM2: r.areaM2,
      floor: r.floor,
      priceManwon: r.priceManwon,
      date: `${currentMonth}/${r.dealDay}`,
    }));

  return {
    ...base,
    count: currentRows.length,
    trendPct,
    avgPriceManwon: avgCurrent,
    listings,
  };
}
