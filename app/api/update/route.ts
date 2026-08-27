import { NextResponse } from "next/server";
import { REGIONS } from "@/lib/regions";
import { fetchTrades, yyyymm } from "@/lib/molit";
import { summarizeRegion, type RegionSummary } from "@/lib/trend";

export const dynamic = "force-dynamic"; // 캐시하지 않고 요청마다 새로 실행

// 동시에 너무 많은 요청을 공공데이터포털에 보내지 않도록 소규모 배치로 나눠 처리
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

export async function GET() {
  const serviceKey = process.env.MOLIT_SERVICE_KEY;
  if (!serviceKey) {
    return NextResponse.json(
      { error: "MOLIT_SERVICE_KEY 환경변수가 설정되지 않았습니다. .env.local을 확인하세요." },
      { status: 500 }
    );
  }

  const now = new Date();
  const currentYmd = yyyymm(0, now);
  const prevYmd = yyyymm(-1, now);
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const errors: { region: string; message: string }[] = [];

  const regionResults: (RegionSummary | null)[] = await mapWithConcurrency(
    REGIONS,
    5,
    async (region) => {
      try {
        const [currentRows, prevRows] = await Promise.all([
          fetchTrades(region.code, currentYmd, serviceKey),
          fetchTrades(region.code, prevYmd, serviceKey),
        ]);
        return summarizeRegion(region, currentRows, prevRows, currentYear, currentMonth);
      } catch (err) {
        errors.push({
          region: `${region.group} ${region.name}`,
          message: err instanceof Error ? err.message : String(err),
        });
        return null;
      }
    }
  );

  const regions = regionResults.filter((r): r is RegionSummary => r !== null);

  return NextResponse.json({
    updatedAt: now.toISOString(),
    dealYmd: currentYmd,
    prevYmd,
    regions,
    errors, // 일부 지역만 실패해도 나머지 지역 데이터는 정상 반환
  });
}
