import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getStoredSubscriptions } from "@/lib/subscription";

// 실거래가처럼 우리 DB(subscriptions 테이블)에서 읽기만 하므로 빠릅니다.
// 실제로 청약홈에서 데이터를 받아와 DB를 채우는 건 /api/subscription-sync 입니다.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = getDb();
    const entries = await getStoredSubscriptions(db);
    return NextResponse.json(
      { entries, error: null },
      { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=1800" } }
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "청약 정보를 가져오지 못했습니다.";
    return NextResponse.json({ entries: [], error: message }, { status: 200 });
  }
}
