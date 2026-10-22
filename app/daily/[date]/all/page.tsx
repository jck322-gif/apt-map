import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import BriefTopRows from "@/components/BriefTopRows";
import AdSlot from "@/components/AdSlot";
import { getDailyBrief, isValidDate, koDate, koDateLong, type DailyDeal, type Group } from "@/lib/daily";
import { REGIONS } from "@/lib/regions";
import { SITE_NAME } from "@/lib/site";
import { NOINDEX, THIN_DAILY_MIN_SALES } from "@/lib/thin";

/**
 * 그날 신고된 부산·울산 아파트 매매 "전체" 목록 — 구·군별로 나눠 가격 높은 순으로 모두 보여줍니다.
 *
 * 브리핑(/daily/[date])은 부산·울산 각 TOP10만 보여주는데, 이 페이지는 같은 자료를 빠짐없이 펼칩니다.
 *  - 방문자: 내 동네(구·군) 거래를 바로 찾아봄
 *  - 검색: "○○구 아파트 실거래가"처럼 구 이름으로 찾는 사람에게 걸리고, 단지 페이지 링크가 수백 개 생김
 *  - 카페·블로그 글: 구별 전체 시세 표를 만들 때 이 페이지를 원본으로 씀
 */

export const revalidate = 3600;

type RegionBlock = { code: string; name: string; group: Group; deals: DailyDeal[] };

function byRegion(deals: DailyDeal[]): RegionBlock[] {
  const map = new Map<string, RegionBlock>();
  for (const d of deals) {
    const b = map.get(d.regionCode) ?? { code: d.regionCode, name: d.regionName, group: d.group, deals: [] };
    b.deals.push(d);
    map.set(d.regionCode, b);
  }
  // 부산 먼저, 같은 시·도 안에서는 거래가 많은 구·군부터. 각 구 안은 이미 가격 높은 순입니다.
  const order = new Map(REGIONS.map((r, i) => [r.code, i]));
  return Array.from(map.values()).sort(
    (a, b) =>
      (a.group === b.group ? 0 : a.group === "부산" ? -1 : 1) ||
      b.deals.length - a.deals.length ||
      (order.get(a.code) ?? 0) - (order.get(b.code) ?? 0)
  );
}

export async function generateMetadata({ params }: { params: { date: string } }): Promise<Metadata> {
  if (!isValidDate(params.date)) return { title: `실거래 전체 | ${SITE_NAME}` };
  let thin = false;
  let n = 0;
  try {
    const brief = await getDailyBrief(params.date);
    n = brief.deals.length;
    thin = brief.totals.sale < THIN_DAILY_MIN_SALES;
  } catch {
    thin = false;
  }
  return {
    title: `${koDate(params.date)} 부산·울산 아파트 매매 실거래가 전체${n ? ` ${n}건` : ""} · 구별 시세 | ${SITE_NAME}`,
    description: `${koDateLong(params.date)} 국토교통부에 신고된 부산·울산 아파트 매매를 구·군별로 모두 정리했습니다. 단지명, 전용면적, 층, 매매가, 계약일을 확인하세요.`,
    alternates: { canonical: `/daily/${params.date}/all` },
    ...(thin ? { robots: NOINDEX } : {}),
  };
}

export default async function Page({ params }: { params: { date: string } }) {
  if (!isValidDate(params.date)) notFound();

  let brief;
  try {
    brief = await getDailyBrief(params.date);
  } catch {
    return (
      <div className="wrap">
        <SiteHeader current="daily" />
        <section className="block">
          <h2>실거래 전체 목록</h2>
          <p className="empty-note">목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</p>
        </section>
      </div>
    );
  }

  const blocks = byRegion(brief.deals);
  const busanN = brief.deals.filter((d) => d.group === "부산").length;
  const ulsanN = brief.deals.length - busanN;

  return (
    <div className="wrap">
      <SiteHeader current="daily" />
      <article className="block">
        <Link href={`/daily/${brief.date}`} className="guide-back">
          ← {koDate(brief.date)} 브리핑
        </Link>
        <h1 className="guide-title">
          {koDate(brief.date)} 부산 · 울산 아파트 매매 실거래 전체
        </h1>
        <p className="guide-meta">{koDateLong(brief.date)} 국토교통부 신고분 · 구·군별 가격 높은 순</p>

        {brief.deals.length === 0 ? (
          <p className="guide-summary">
            {koDate(brief.date)}에는 새로 신고된 부산·울산 아파트 매매가 없습니다. 주말과 공휴일에는
            신고가 없거나 매우 적습니다.
          </p>
        ) : (
          <>
            <p className="guide-summary">
              이날 신고된 매매 <strong>{brief.deals.length.toLocaleString()}건</strong>(부산 {busanN}건 · 울산{" "}
              {ulsanN}건)을 구·군별로 모두 모았습니다. 단지 이름을 누르면 그 단지의 최근 3년 거래를 볼 수
              있습니다.
            </p>
            <p className="brief-regions">
              {blocks.map((b, i) => (
                <span key={b.code}>
                  {i > 0 && " · "}
                  <a href={`#r-${b.code}`}>
                    {b.group} {b.name} {b.deals.length}
                  </a>
                </span>
              ))}
            </p>
          </>
        )}

        {blocks.map((b, i) => (
          <section className="brief-section" id={`r-${b.code}`} key={b.code}>
            <h2 className="brief-h2">
              {b.group} {b.name} 아파트 실거래가 <span className="brief-count">매매 {b.deals.length}건</span>
            </h2>
            <BriefTopRows rows={b.deals} />
            {i === 2 && <AdSlot name="list" />}
          </section>
        ))}

        <p className="section-note" style={{ marginTop: 22 }}>
          신고일 기준이며 계약일은 며칠에서 한 달 전일 수 있습니다. 취소(해제)된 거래는 제외했습니다. 출처:
          국토교통부 실거래가 공개시스템.
        </p>
        {blocks.length > 3 && <AdSlot name="list" />}
      </article>
    </div>
  );
}
