import { NextResponse } from "next/server";
import { REGIONS } from "@/lib/regions";
import { fetchTrades, fetchRents, yyyymm } from "@/lib/molit";

export const dynamic = "force-dynamic"; // 캐시하지 않고 요청마다 새로 실행

type DealTypeParam = "sale" | "jeonse" | "monthly";

const MONTHS_BACK = 6; // 최근 몇 개월 추이를 보여줄지

export type MonthlyPoint = {
  ymd: string; // "202608"
  label: string; // "8월"
  avgPriceManwon: number | null;
  minPriceManwon: number | null;
  maxPriceManwon: number | null;
  count: number;
};

// 지역별 실거래 데이터 전체를 훑는 /api/update와 달리, 특정 단지 하나만 보므로
// 순서대로(직렬) 호출해도 부담이 적습니다 — 그래도 살짝 겹쳐서 너무 느리지 않게 처리합니다.
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
  const monthOffsets = Array.from({ length: MONTHS_BACK }, (_, i) => -(MONTHS_BACK - 1) + i); // 오래된 달 -> 최근 달 순
  const ymds = monthOffsets.map((offset) => yyyymm(offset, now));

  const errors: { ymd: string; message: string }[] = [];

  const points: MonthlyPoint[] = await mapWithConcurrency(ymds, 2, async (ymd) => {
    try {
      let values: number[] = [];
      if (dealTypeParam === "sale") {
        const rows = await fetchTrades(region.code, ymd, serviceKey);
        values = rows.filter((r) => r.complex.trim() === complex).map((r) => r.priceManwon);
      } else {
        const dealType = dealTypeParam === "jeonse" ? "전세" : "월세";
        const rows = await fetchRents(region.code, ymd, serviceKey);
        values = rows
          .filter((r) => r.complex.trim() === complex)
          .filter((r) => (dealType === "전세" ? r.monthlyRentManwon === 0 : r.monthlyRentManwon > 0))
          .map((r) => (dealType === "전세" ? r.depositManwon : r.monthlyRentManwon));
      }
      const m = Number(ymd.slice(4, 6));
      return {
        ymd,
        label: `${m}월`,
        avgPriceManwon: average(values),
        minPriceManwon: values.length ? Math.min(...values) : null,
        maxPriceManwon: values.length ? Math.max(...values) : null,
        count: values.length,
      };
    } catch (err) {
      errors.push({ ymd, message: err instanceof Error ? err.message : String(err) });
      const m = Number(ymd.slice(4, 6));
      return { ymd, label: `${m}월`, avgPriceManwon: null, minPriceManwon: null, maxPriceManwon: null, count: 0 };
    }
  });

  return NextResponse.json({
    code: region.code,
    regionName: region.name,
    group: region.group,
    complex,
    dealType: dealTypeParam,
    points,
    errors,
  });
}
