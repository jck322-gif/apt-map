import { NextResponse } from "next/server";
import { loadComplexTrend, ComplexError, type DealTypeParam } from "@/lib/complex";

export const dynamic = "force-dynamic"; // 캐시하지 않고 요청마다 새로 실행
// force-dynamic만으로는 부족합니다. Next.js는 서버가 DB에 보내는 요청까지 따로 캐시해 두는데,
// 그러면 새벽에 새 실거래가 들어와도 API가 어제 만든 응답을 그대로 돌려줍니다(실제로 겪었습니다).
// 아래 두 줄과 응답의 Cache-Control 헤더까지 있어야 Next·Vercel CDN·브라우저 세 군데가 모두 막힙니다.
export const fetchCache = "force-no-store";
export const revalidate = 0;

/** 어디에도 저장하지 말라고 못박는 응답 헤더 */
const NO_STORE = { "Cache-Control": "no-store, max-age=0, must-revalidate" } as const;

// 계산은 전부 lib/complex.ts 에 있습니다.
// 팝업(이 API)과 단지 페이지(/apt/...)가 같은 함수를 써야 두 화면의 숫자가 어긋나지 않습니다.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const areaParam = searchParams.get("area");

  try {
    const data = await loadComplexTrend({
      code: searchParams.get("code") ?? "",
      complex: searchParams.get("complex") ?? "",
      dealType: (searchParams.get("dealType") ?? "sale") as DealTypeParam,
      area: areaParam ? Number(areaParam) : null,
    });
    return NextResponse.json(data, { headers: NO_STORE });
  } catch (err) {
    if (err instanceof ComplexError) {
      return NextResponse.json({ error: err.message }, { status: err.status, headers: NO_STORE });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
