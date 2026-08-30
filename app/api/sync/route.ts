import { createClient, type SupabaseClient } from "@supabase/supabase-js";
 
// Supabase 접속 정보는 서버에서만 씁니다 (NEXT_PUBLIC_ 접두사를 붙이면 안 됩니다 —
// 붙이는 순간 브라우저에 노출되어 누구나 DB를 읽고 지울 수 있게 됩니다).
 
export type DealType = "sale" | "jeonse" | "monthly";
 
export type DealRow = {
  region_code: string;
  deal_type: DealType;
  deal_ym: string; // "202608"
  deal_date: string; // "2026-08-24"
  dong: string;
  complex: string;
  area_m2: number;
  floor: number;
  build_year: number | null;
  price_manwon: number | null;
  deposit_manwon: number | null;
  monthly_rent_manwon: number | null;
  cancel_date?: string | null; // 해제(거래취소)일
  dealing_type?: string | null; // '중개거래' | '직거래'
  register_date?: string | null; // 등기일자
  apt_dong?: string | null; // 아파트 동명
  first_seen_at?: string | null; // 우리 DB에서 이 거래를 처음 본 날 (= 사실상 신고일)
};
 
let cached: SupabaseClient | null = null;
 
export function getDb(): SupabaseClient {
  if (cached) return cached;
 
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    throw new Error(
      "SUPABASE_URL / SUPABASE_SECRET_KEY 환경변수가 설정되지 않았습니다. Vercel 프로젝트 설정을 확인하세요."
    );
  }
 
  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
 
/** 거래 유형별로 "그 거래의 대표 금액"이 담긴 컬럼 이름을 돌려줍니다. */
export function valueColumn(dealType: DealType): "price_manwon" | "deposit_manwon" | "monthly_rent_manwon" {
  if (dealType === "sale") return "price_manwon";
  if (dealType === "jeonse") return "deposit_manwon";
  return "monthly_rent_manwon";
}
 
/** "202608" → "2026-08-01" (월 시작일) */
export function ymToFirstDay(ym: string): string {
  return `${ym.slice(0, 4)}-${ym.slice(4, 6)}-01`;
}
 
/** "202608" 의 마지막 날 → "2026-08-31" */
export function ymToLastDay(ym: string): string {
  const y = Number(ym.slice(0, 4));
  const m = Number(ym.slice(4, 6));
  const last = new Date(y, m, 0).getDate(); // m월의 마지막 날
  return `${ym.slice(0, 4)}-${ym.slice(4, 6)}-${String(last).padStart(2, "0")}`;
}
 
