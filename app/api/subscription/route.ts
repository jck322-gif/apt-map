import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getStoredSubscriptions } from "@/lib/subscription";
import { MANUAL_SUBSCRIPTIONS } from "@/lib/subscriptionManual";

// 실거래가처럼 우리 DB(subscriptions 테이블)에서 읽기만 하므로 빠릅니다.
// 실제로 청약홈에서 데이터를 받아와 DB를 채우는 건 /api/subscription-sync 입니다.
export const dynamic = "force-dynamic";

// 단지명이 서로 포함 관계면 같은 단지로 봅니다("연제 갤러리 자이" vs "연제갤러리자이" 같은
// 띄어쓰기 차이도 있을 수 있어, 공백을 지우고 비교합니다).
function sameHouse(a: string, b: string): boolean {
  const norm = (s: string) => s.replace(/\s+/g, "");
  const na = norm(a);
  const nb = norm(b);
  return na.length > 0 && nb.length > 0 && (na.includes(nb) || nb.includes(na));
}

export async function GET() {
  try {
    const db = getDb();
    const stored = await getStoredSubscriptions(db);
    // 청약홈에 이미 공식 공고가 올라온 단지는 수동 항목을 빼고 공식 정보만 보여줍니다.
    const manual = MANUAL_SUBSCRIPTIONS.filter(
      (m) => !stored.some((s) => sameHouse(s.houseName, m.houseName))
    );
    const entries = [...stored, ...manual];
    return NextResponse.json(
      { entries, error: null },
      { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=1800" } }
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "청약 정보를 가져오지 못했습니다.";
    // DB 조회가 실패해도(예: Supabase 설정 문제) 수동으로 적어둔 항목만이라도 보여줍니다.
    return NextResponse.json({ entries: MANUAL_SUBSCRIPTIONS, error: message }, { status: 200 });
  }
}
