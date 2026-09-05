import { NextResponse } from "next/server";
import { loadComplexTrend, ComplexError, type DealTypeParam } from "@/lib/complex";

export const dynamic = "force-dynamic";

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
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof ComplexError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
