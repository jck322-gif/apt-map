import { getDb } from "@/lib/db";
import { fetchAll } from "@/lib/fetchAll";
import { YEARS_BACK } from "@/lib/complex";
import { dealKey, type DealCtx } from "@/lib/dealKey";
import type { DailyDeal } from "@/lib/daily";

/**
 * 그날 신고된 거래마다 "직전 거래 대비 변동 · 3년 최고가 대비(회복률) · 전세와의 갭"을 붙입니다.
 * (하우스랭킹 같은 실거래 사이트가 거래 한 줄에 보여주는 비교 정보)
 *
 * 그날 거래가 나온 단지들의 최근 3년 매매·전세를 구·군별로 한 번에 받아 계산합니다.
 * 단지별로 따로 조회하면 하루 수백 번이 되기 때문입니다.
 * 비교는 단지 페이지와 같은 규칙 — 같은 평형(면적 반올림)끼리, 취소(해제) 거래 제외.
 *
 * 실패하거나 너무 오래 걸려도 페이지는 떠야 하므로, 문제가 생기면 빈 결과를 돌려줍니다
 * (그러면 표에는 비교 줄만 빠지고 나머지는 그대로 보입니다).
 */

type Row = {
  complex: string;
  deal_type: "sale" | "jeonse";
  deal_date: string;
  area_m2: number | string;
  floor: number;
  price_manwon: number | null;
  deposit_manwon: number | null;
};

const short = (date: string) => `${date.slice(2, 4)}.${date.slice(5, 7)}.${date.slice(8, 10)}`;

export async function getDealContexts(deals: DailyDeal[]): Promise<Record<string, DealCtx>> {
  if (deals.length === 0) return {};
  const out: Record<string, DealCtx> = {};

  // 구·군별 단지 목록
  const byRegion = new Map<string, Set<string>>();
  for (const d of deals) {
    const s = byRegion.get(d.regionCode) ?? new Set<string>();
    s.add(d.complex);
    byRegion.set(d.regionCode, s);
  }

  const now = new Date();
  const from = new Date(now.getFullYear() - YEARS_BACK, now.getMonth(), 1);
  const fromStr = `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, "0")}-01`;

  let db;
  try {
    db = getDb();
  } catch {
    return {};
  }

  // 구·군마다 [단지 → 거래들]
  const history = new Map<string, Row[]>(); // key: regionCode|complex
  try {
    await Promise.all(
      Array.from(byRegion.entries()).map(async ([code, names]) => {
        const list = Array.from(names);
        // 단지명이 아주 많으면 주소가 길어지므로 40개씩 나눠 묻습니다.
        for (let i = 0; i < list.length; i += 40) {
          const chunk = list.slice(i, i + 40);
          const rows = await fetchAll<Row>(
            (f, t) =>
              db
                .from("deals")
                .select("complex, deal_type, deal_date, area_m2, floor, price_manwon, deposit_manwon")
                .eq("region_code", code)
                .in("complex", chunk)
                .in("deal_type", ["sale", "jeonse"])
                .is("cancel_date", null)
                .gte("deal_date", fromStr)
                .order("id", { ascending: true })
                .range(f, t),
            { hardCap: 20000, parallel: 3 }
          );
          for (const r of rows) {
            const k = `${code}|${r.complex}`;
            const arr = history.get(k) ?? [];
            arr.push(r);
            history.set(k, arr);
          }
        }
      })
    );
  } catch {
    return {};
  }

  for (const d of deals) {
    const rows = history.get(`${d.regionCode}|${d.complex}`) ?? [];
    const area = Math.round(d.areaM2);
    const same = rows.filter((r) => Math.round(Number(r.area_m2)) === area);
    const sales = same
      .filter((r) => r.deal_type === "sale" && r.price_manwon !== null)
      .sort((a, b) => (a.deal_date < b.deal_date ? 1 : a.deal_date > b.deal_date ? -1 : 0));
    const jeonse = same
      .filter((r) => r.deal_type === "jeonse" && r.deposit_manwon !== null)
      .sort((a, b) => (a.deal_date < b.deal_date ? 1 : -1));

    // 직전 거래: 이 거래보다 계약일이 이르거나 같은 날의 다른 거래 중 가장 최근 것
    let skippedSelf = false;
    const prev =
      sales.find((r) => {
        if (r.deal_date > d.dealDate) return false;
        if (!skippedSelf && r.deal_date === d.dealDate && r.floor === d.floor && r.price_manwon === d.priceManwon) {
          skippedSelf = true;
          return false;
        }
        return true;
      }) ?? null;

    const prices = sales.map((r) => r.price_manwon as number);
    const high = prices.length ? Math.max(...prices, d.priceManwon) : d.priceManwon;
    const j = jeonse[0] ?? null;
    const jp = j ? (j.deposit_manwon as number) : null;
    const gap = jp !== null ? d.priceManwon - jp : null;

    out[dealKey(d)] = {
      prevPrice: prev ? (prev.price_manwon as number) : null,
      prevDate: prev ? short(prev.deal_date) : null,
      highPrice: high,
      recoveryPct: high ? Math.round((d.priceManwon / high) * 1000) / 10 : null,
      jeonsePrice: jp,
      jeonseDate: j ? short(j.deal_date) : null,
      gapManwon: gap,
      gapPct: gap !== null && d.priceManwon ? Math.round((gap / d.priceManwon) * 100) : null,
    };
  }
  return out;
}
