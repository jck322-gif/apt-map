import { getDb } from "@/lib/db";
import { REGIONS } from "@/lib/regions";
 
/**
 * 랭킹 페이지(/rank) 자료.
 *
 * Supabase의 ranking_data() 함수가 네 가지 순위를 JSON 한 덩어리로 돌려줍니다.
 * 한 번에 1000줄 제한이 있어서 표를 여러 번 읽는 대신 함수 하나로 묶었습니다.
 * (supabase-views-8.sql)
 *
 * 모든 순위는 **단지마다 한 건씩만** 넣습니다. 안 그러면 거래가 많은 단지 하나가
 * 표를 통째로 차지해서 순위가 아무 의미가 없어집니다.
 */
 
export type Group = "부산" | "울산";
 
/** 순위표 한 줄의 공통 부분 */
type Base = {
  rank: number;
  regionCode: string;
  regionName: string;
  group: Group;
  dong: string;
  complex: string;
};
 
export type RecordRank = Base & {
  areaM2: number;
  floor: number;
  priceManwon: number;
  dealDate: string;
  prevPriceManwon: number;
  prevDealDate: string | null;
  gainManwon: number;
};
 
export type PriceRank = Base & {
  areaM2: number;
  floor: number;
  priceManwon: number;
  dealDate: string;
  /** 평당가 (만원). 1평 = 3.3058㎡ */
  pyeongManwon: number;
};
 
export type VolumeRank = Base & {
  count: number;
  avgPriceManwon: number;
};
 
export type Ranking = {
  from: string;
  to: string;
  records: RecordRank[];
  kukpyeong: PriceRank[];
  pyeong: PriceRank[];
  volume: VolumeRank[];
};
 
const REGION_BY_CODE = new Map(REGIONS.map((r) => [r.code, r]));
 
/** 함수가 돌려준 줄 하나를 화면에서 쓰는 모양으로 바꿉니다. 지역을 모르면 버립니다. */
function base(r: Record<string, unknown>): Base | null {
  const code = String(r.region_code ?? "");
  const region = REGION_BY_CODE.get(code);
  if (!region) return null;
  return {
    rank: Number(r.rn),
    regionCode: code,
    regionName: region.name,
    group: region.group as Group,
    dong: String(r.dong ?? ""),
    complex: String(r.complex ?? ""),
  };
}
 
function toRecord(r: Record<string, unknown>): RecordRank | null {
  const b = base(r);
  if (!b) return null;
  return {
    ...b,
    areaM2: Number(r.area_m2),
    floor: Number(r.floor),
    priceManwon: Number(r.price_manwon),
    dealDate: String(r.deal_date),
    prevPriceManwon: Number(r.prev_price_manwon),
    prevDealDate: r.prev_deal_date ? String(r.prev_deal_date) : null,
    gainManwon: Number(r.gain_manwon),
  };
}
 
function toPrice(r: Record<string, unknown>): PriceRank | null {
  const b = base(r);
  if (!b) return null;
  return {
    ...b,
    areaM2: Number(r.area_m2),
    floor: Number(r.floor),
    priceManwon: Number(r.price_manwon),
    dealDate: String(r.deal_date),
    pyeongManwon: Number(r.pyeong_manwon),
  };
}
 
function toVolume(r: Record<string, unknown>): VolumeRank | null {
  const b = base(r);
  if (!b) return null;
  return {
    ...b,
    count: Number(r.cnt),
    avgPriceManwon: Number(r.avg_price_manwon),
  };
}
 
/** "2026-09-11" 꼴로 만듭니다 (한국 날짜 기준) */
function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}
 
/**
 * 최근 몇 개월치 랭킹.
 *
 * 기본 3개월인 이유: 1개월이면 거래가 적은 구·군은 표가 텅 비고,
 * 1년이면 "요즘 시세"라고 부르기 어렵습니다.
 */
export async function getRanking(months = 3): Promise<Ranking> {
  const to = new Date();
  const from = new Date(to);
  from.setMonth(from.getMonth() - months);
 
  const empty: Ranking = {
    from: ymd(from),
    to: ymd(to),
    records: [],
    kukpyeong: [],
    pyeong: [],
    volume: [],
  };
 
  const db = getDb();
  const { data, error } = await db.rpc("ranking_data", {
    p_from: ymd(from),
    p_to: ymd(to),
  });
 
  // 함수를 아직 안 만들었거나 조회가 실패해도 페이지 전체가 죽으면 안 됩니다.
  // 다만 조용히 넘어가면 원인을 못 찾으니 서버 기록을 남깁니다.
  // (Vercel → Logs 에서 "[ranking]" 으로 검색하면 보입니다.)
  if (error || !data) {
    console.error("[ranking] 조회 실패:", error?.code, error?.message, error?.hint ?? "");
    return empty;
  }
 
  const d = data as Record<string, unknown>;
  const arr = (key: string) => (Array.isArray(d[key]) ? (d[key] as Record<string, unknown>[]) : []);
 
  return {
    from: String(d.from ?? empty.from),
    to: String(d.to ?? empty.to),
    records: arr("records").map(toRecord).filter((x): x is RecordRank => x !== null),
    kukpyeong: arr("kukpyeong").map(toPrice).filter((x): x is PriceRank => x !== null),
    pyeong: arr("pyeong").map(toPrice).filter((x): x is PriceRank => x !== null),
    volume: arr("volume").map(toVolume).filter((x): x is VolumeRank => x !== null),
  };
}
 
/** 한 순위표를 부산·울산으로 갈라줍니다. */
export function byGroup<T extends { group: Group }>(list: T[], group: Group): T[] {
  return list.filter((r) => r.group === group);
}
