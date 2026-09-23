import { getDb } from "@/lib/db";
import { kstToday } from "@/lib/kst";
import { fetchAll } from "@/lib/fetchAll";

/**
 * 구·군 페이지 맨 위의 "이 지역 요즘 거래 요약".
 *
 * 매일 숫자가 바뀌는 고유한 문장이 페이지마다 생기므로, 검색엔진이 "단지 목록만 복사한 페이지"가
 * 아니라 그 지역만의 내용이 있는 페이지로 봅니다. 방문자에게도 목록보다 먼저 흐름을 보여줍니다.
 *
 * 규칙
 *  - 매매만, 해제(취소)된 거래는 뺍니다.
 *  - 거래량 비교는 "지난달 vs 그 전달"처럼 끝난 달끼리 합니다. 이번 달은 계약 후 30일 안에
 *    신고하면 되기 때문에 아직 덜 들어와 있어, 이번 달과 비교하면 늘 "감소"로 보이는 착시가 생깁니다.
 *    이달 15일 전이면 지난달도 아직 신고가 덜 들어왔으므로 한 달 더 앞의 두 달을 비교합니다.
 */

export type RegionDeal = {
  complex: string;
  dong: string;
  areaM2: number;
  floor: number;
  priceManwon: number;
  dealDate: string; // "2026-09-12"
};

export type RegionSummary = {
  /** 최근 30일(계약일 기준) 매매 건수 */
  d30: number;
  /** 비교하는 두 달 — 예: { label: "8월", count: 120 } */
  monthA: { label: string; count: number };
  monthB: { label: string; count: number };
  /** monthA가 monthB보다 몇 % 많은지 (monthB가 0이면 null) */
  monthChangePct: number | null;
  /** 최근 30일 최고가 거래 */
  topDeal: RegionDeal | null;
  /** 최근 90일 전용 84㎡ 전후(80~90㎡) 최고가 거래 */
  top84: RegionDeal | null;
  /** 최근 90일 전용 84㎡ 전후 거래 가격 중간값 */
  median84: number | null;
  count84: number;
  /** 최근 90일 거래가 많았던 단지 */
  busiest: { complex: string; count: number }[];
  /** 최근 30일 계약분 중 신고가 건수 (뷰가 없으면 null) */
  recordHighs30: number | null;
};

type Row = {
  complex: string;
  dong: string;
  area_m2: number | string;
  floor: number;
  price_manwon: number | null;
  deal_date: string;
};

function shiftDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** "2026-09-23" 기준 n달 전 달의 시작일·다음달 시작일·라벨 */
function monthRange(isoDate: string, back: number): { from: string; to: string; label: string } {
  const [y, m] = isoDate.split("-").map(Number);
  const start = new Date(Date.UTC(y, m - 1 - back, 1));
  const next = new Date(Date.UTC(y, m - back, 1));
  return {
    from: start.toISOString().slice(0, 10),
    to: next.toISOString().slice(0, 10),
    label: `${start.getUTCMonth() + 1}월`,
  };
}

function median(nums: number[]): number | null {
  if (nums.length === 0) return null;
  const a = [...nums].sort((x, y) => x - y);
  const mid = Math.floor(a.length / 2);
  return a.length % 2 ? a[mid] : Math.round((a[mid - 1] + a[mid]) / 2);
}

function toDeal(r: Row): RegionDeal {
  return {
    complex: r.complex,
    dong: r.dong,
    areaM2: Number(r.area_m2),
    floor: r.floor,
    priceManwon: r.price_manwon as number,
    dealDate: r.deal_date,
  };
}

export async function getRegionSummary(regionCode: string): Promise<RegionSummary> {
  const db = getDb();
  const today = kstToday();
  const day = Number(today.slice(8, 10));
  // 15일 전이면 지난달 신고가 아직 덜 들어왔으므로 한 달씩 더 뒤로 갑니다.
  const offset = day >= 15 ? 1 : 2;
  const a = monthRange(today, offset);
  const b = monthRange(today, offset + 1);
  const from = [b.from, shiftDays(today, -90)].sort()[0];
  const d30 = shiftDays(today, -30);
  const d90 = shiftDays(today, -90);

  // 거래가 많은 구(해운대·부산진 등)는 넉 달 치가 1000행을 넘으므로 나눠 받습니다.
  const [dealRows, recordsRes] = await Promise.all([
    fetchAll<Row>((f, t) =>
      db
        .from("deals")
        .select("complex, dong, area_m2, floor, price_manwon, deal_date")
        .eq("region_code", regionCode)
        .eq("deal_type", "sale")
        .is("cancel_date", null)
        .gte("deal_date", from)
        .order("id", { ascending: true })
        .range(f, t)
    ),
    db
      .from("record_highs")
      .select("complex", { count: "exact", head: true })
      .eq("region_code", regionCode)
      .gte("deal_date", d30),
  ]);

  const rows = dealRows.filter((r) => r.price_manwon !== null);

  const inRange = (r: Row, f: string, t: string) => r.deal_date >= f && r.deal_date < t;
  const countA = rows.filter((r) => inRange(r, a.from, a.to)).length;
  const countB = rows.filter((r) => inRange(r, b.from, b.to)).length;

  const last30 = rows.filter((r) => r.deal_date >= d30);
  const last90 = rows.filter((r) => r.deal_date >= d90);
  const top30 = [...last30].sort((x, y) => (y.price_manwon as number) - (x.price_manwon as number))[0];

  const is84 = (r: Row) => Number(r.area_m2) >= 80 && Number(r.area_m2) < 90;
  const r84 = last90.filter(is84);
  const top84 = [...r84].sort((x, y) => (y.price_manwon as number) - (x.price_manwon as number))[0];

  const byComplex = new Map<string, number>();
  for (const r of last90) byComplex.set(r.complex, (byComplex.get(r.complex) ?? 0) + 1);
  const busiest = [...byComplex.entries()]
    .map(([complex, count]) => ({ complex, count }))
    .sort((x, y) => y.count - x.count || x.complex.localeCompare(y.complex, "ko"))
    .slice(0, 3);

  return {
    d30: last30.length,
    monthA: { label: a.label, count: countA },
    monthB: { label: b.label, count: countB },
    monthChangePct: countB > 0 ? ((countA - countB) / countB) * 100 : null,
    topDeal: top30 ? toDeal(top30) : null,
    top84: top84 ? toDeal(top84) : null,
    median84: median(r84.map((r) => r.price_manwon as number)),
    count84: r84.length,
    busiest,
    recordHighs30: recordsRes.error ? null : recordsRes.count ?? null,
  };
}
