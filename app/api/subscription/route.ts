import { NextResponse } from "next/server";
import { getBusanUlsanSubscriptions } from "@/lib/subscription";

// 청약홈 공공데이터 호출은 느릴 수 있어서, 페이지는 먼저 그려두고 이 API를 화면에서
// 따로 불러오게 합니다(실거래가 화면이 /api/update를 쓰는 것과 같은 방식).
// 여러 방문자가 매번 외부 API를 다시 부르지 않도록 10분 동안은 같은 결과를 재사용합니다.
export const revalidate = 600;

export async function GET() {
  const serviceKey = process.env.APPLYHOME_SERVICE_KEY;
  if (!serviceKey) {
    return NextResponse.json(
      { entries: [], error: "APPLYHOME_SERVICE_KEY 환경변수가 설정되어 있지 않습니다." },
      { status: 200 }
    );
  }

  try {
    const entries = await getBusanUlsanSubscriptions(serviceKey);
    return NextResponse.json(
      { entries, error: null },
      { headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1800" } }
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "청약 정보를 가져오지 못했습니다.";
    return NextResponse.json({ entries: [], error: message }, { status: 200 });
  }
}
