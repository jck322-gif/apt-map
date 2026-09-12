import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { debugFetchSubscriptions, getBusanUlsanSubscriptions, saveSubscriptions } from "@/lib/subscription";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// 청약홈 API에서 부산·울산 청약 일정을 받아와 Supabase(subscriptions 테이블)에 저장합니다.
// 이 route는 매일 자동 실행(Vercel 크론)되고, ?secret= 으로 사람이 직접 실행할 수도 있습니다
// (실거래가 동기화 /api/sync 와 같은 방식).
export async function GET(request: Request) {
  const serviceKey = process.env.APPLYHOME_SERVICE_KEY;
  if (!serviceKey) {
    return NextResponse.json({ error: "APPLYHOME_SERVICE_KEY 환경변수가 없습니다." }, { status: 500 });
  }

  const cronSecret = process.env.CRON_SECRET;
  const { searchParams } = new URL(request.url);
  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    const ok = authHeader === `Bearer ${cronSecret}` || searchParams.get("secret") === cronSecret;
    if (!ok) {
      return NextResponse.json({ error: "인증 실패 — secret이 올바르지 않습니다." }, { status: 401 });
    }
  }

  // ?debug=1 을 붙이면 저장하지 않고, 청약홈이 실제로 무엇을 돌려주는지(원문 일부)만 보여줍니다.
  // "달력에 아무것도 안 뜬다" 같은 문제를 진단할 때 이 결과를 스크린샷해서 알려주시면 바로 원인을 알 수 있습니다.
  if (searchParams.get("debug") === "1") {
    try {
      const result = await debugFetchSubscriptions(serviceKey);
      return NextResponse.json(result);
    } catch (e) {
      const message = e instanceof Error ? e.message : "알 수 없는 오류";
      return NextResponse.json({ ok: false, error: message }, { status: 500 });
    }
  }

  const started = Date.now();
  try {
    const entries = await getBusanUlsanSubscriptions(serviceKey);
    const db = getDb();
    await saveSubscriptions(db, entries);
    const elapsedSec = Math.round((Date.now() - started) / 100) / 10;
    return NextResponse.json({ ok: true, count: entries.length, elapsedSec });
  } catch (e) {
    const message = e instanceof Error ? e.message : "알 수 없는 오류";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
