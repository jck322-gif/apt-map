
import { NextResponse } from "next/server";
import { yyyymm } from "@/lib/molit";
import { getDb } from "@/lib/db";
 
export const dynamic = "force-dynamic";
 
// 서버가 실제로 어떤 DB에 접속해 무엇을 보고 있는지 확인하는 진단용 주소입니다.
// 문제 해결이 끝나면 이 파일은 지워도 됩니다.
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const { searchParams } = new URL(request.url);
  if (cronSecret && searchParams.get("secret") !== cronSecret) {
    return NextResponse.json({ error: "인증 실패" }, { status: 401 });
  }
 
  const url = process.env.SUPABASE_URL ?? null;
  const key = process.env.SUPABASE_SECRET_KEY ?? null;
 
  const env = {
    supabaseUrl: url, // 프로젝트 주소는 비밀이 아니라 그대로 보여줍니다
    urlHasTrailingPath: url ? /\/rest|\/v1|\/$/.test(url) : null,
    keyIsSet: !!key,
    keyPrefix: key ? key.slice(0, 12) : null, // 앞 12글자만 (전체 노출 금지)
    keyLength: key ? key.length : null,
  };
 
  const now = new Date();
  const currentYm = yyyymm(0, now);
  const prevYm = yyyymm(-1, now);
 
  let db;
  try {
    db = getDb();
  } catch (err) {
    return NextResponse.json({ env, fatal: err instanceof Error ? err.message : String(err) });
  }
 
  // 1) 테이블을 직접 세어보기
  const countRes = await db.from("deals").select("id", { count: "exact", head: true });
 
  // 2) 아무 행이나 3건 읽어보기
  const sampleRes = await db
    .from("deals")
    .select("region_code, deal_type, deal_ym, deal_date, complex, price_manwon")
    .limit(3);
 
  // 3) 집계 함수 호출
  const statsRes = await db.rpc("region_stats", {
    p_deal_type: "sale",
    p_current_ym: currentYm,
    p_prev_ym: prevYm,
  });
 
  // 4) 동기화 기록
  const syncRes = await db.from("sync_log").select("*").order("ran_at", { ascending: false }).limit(1);
 
  // 5) 함수가 실제로 어떤 인자를 받는지 그대로 되돌려받기
  const echoRes = await db.rpc("echo_params", {
    p_deal_type: "sale",
    p_current_ym: currentYm,
    p_prev_ym: prevYm,
  });
 
  // 6) 같은 조건을 함수 없이 테이블에서 직접 세어보기 (함수 문제인지 구분용)
  const directRes = await db
    .from("deals")
    .select("id", { count: "exact", head: true })
    .eq("deal_type", "sale")
    .in("deal_ym", [currentYm, prevYm]);
 
  return NextResponse.json({
    env,
    params: { currentYm, prevYm, serverTime: now.toISOString() },
    dealsCount: { count: countRes.count, error: countRes.error?.message ?? null },
    dealsSample: { rows: sampleRes.data, error: sampleRes.error?.message ?? null },
    regionStats: {
      isArray: Array.isArray(statsRes.data),
      length: Array.isArray(statsRes.data) ? statsRes.data.length : null,
      first: Array.isArray(statsRes.data) ? statsRes.data[0] ?? null : statsRes.data,
      error: statsRes.error?.message ?? null,
    },
    syncLog: { rows: syncRes.data, error: syncRes.error?.message ?? null },
    echoParams: { data: echoRes.data, error: echoRes.error?.message ?? null },
    directCount: { count: directRes.count, error: directRes.error?.message ?? null },
  });
}
