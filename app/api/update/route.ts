import { NextResponse } from "next/server";
import { getDashboardData, type DealTypeParam } from "@/lib/dashboardData";

export const dynamic = "force-dynamic"; // 캐시하지 않고 요청마다 새로 실행
// 서버리스 함수가 중간에 강제 종료되면 브라우저는 빈 응답을 받아 "JSON 파싱 실패"로
// 보이게 됩니다(구글 서치콘솔 실제 URL 테스트에서 실제로 발생했던 문제). 기본 시간제한이
// 빠듯할 수 있어 넉넉하게 늘려둡니다.
export const maxDuration = 30;

// 화면(components/Dashboard.tsx)이 첫 렌더 이후 최신 자료로 새로고침할 때 부르는 API입니다.
// 처음 화면에 보여줄 데이터는 이제 각 페이지(app/page.tsx 등)가 서버에서 직접
// getDashboardData를 호출해 만들고, 이 라우트는 그 이후의 갱신 전용입니다.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const dealType = (searchParams.get("dealType") ?? "sale") as DealTypeParam;
  if (!["sale", "jeonse", "monthly"].includes(dealType)) {
    return NextResponse.json(
      { error: `알 수 없는 dealType입니다: ${dealType} (sale/jeonse/monthly 중 하나여야 합니다)` },
      { status: 400 }
    );
  }

  // 이 라우트는 무슨 일이 있어도 반드시 JSON을 돌려줘야 합니다 — 예외가 그대로 새어나가면
  // 브라우저 쪽 fetch가 빈 응답을 받아 "Unexpected end of JSON input" 같은 알아보기 힘든
  // 오류로 보입니다. try/catch로 감싸 항상 { error } 형태의 JSON을 보장합니다.
  try {
    const data = await getDashboardData(dealType);
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
