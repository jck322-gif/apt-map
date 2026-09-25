import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import InsightNav from "@/components/InsightNav";
import { SITE_NAME } from "@/lib/site";
import { fmtManwon, pickJosa } from "@/lib/format";
import { complexHref } from "@/lib/complex";
import { getWeeklyRecords, type WeeklyRecords, type WeeklyRecord } from "@/lib/insights";

export const revalidate = 21600;
export const maxDuration = 60;

export const metadata: Metadata = {
  title: `이번 주 부산·울산 아파트 신고가 TOP | ${SITE_NAME}`,
  description:
    "최근 7일 동안 국토교통부에 새로 신고된 부산·울산 아파트 거래 중 평형별 3년 내 최고가를 넘은 신고가를 오른 금액 순으로 정리했습니다.",
  alternates: { canonical: "/insight/weekly-records" },
};

const md = (d: string) => `${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))}`;
/** "2024-04-15" → "24.04" */
const ym = (d: string) => `${d.slice(2, 4)}.${d.slice(5, 7)}`;

/**
 * 직전 최고가 거래가 1년 반 넘게 전이면 "오랜만의 거래"로 봅니다.
 * 그 사이 거래가 없던 구축은 몇 년 치 상승분이 한 번에 붙어 오른 폭이 커 보이기 때문에,
 * 표에 따로 표시하고 맨 위 요약 문장에서도 뺍니다.
 */
function isStale(r: WeeklyRecord): boolean {
  if (!r.prevDealDate) return false;
  const gapDays = (Date.parse(r.dealDate) - Date.parse(r.prevDealDate)) / 86400000;
  return gapDays > 548;
}

function Table({ rows }: { rows: WeeklyRecord[] }) {
  return (
    <div className="top5-table-wrap">
      <table className="top5-table">
        <thead>
          <tr>
            <th className="c-rank">#</th>
            <th className="c-name">아파트</th>
            <th className="c-area">전용</th>
            <th className="c-price">신고가</th>
            <th className="c-price">직전 최고가</th>
            <th>오른 폭</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={`${r.regionCode}-${r.complex}`}>
              <td className="c-rank">
                <span className={`rank-badge${i === 0 ? " first" : ""}`}>{i + 1}</span>
              </td>
              <td className="c-name">
                <span className="t5-complex">
                  <Link href={complexHref(r.regionCode, r.complex)} className="t5-complex-link">
                    {r.complex}
                  </Link>
                </span>
                <span className="t5-loc">
                  {r.regionName} · {r.dong} · {r.floor}층 · {md(r.dealDate)} 계약
                </span>
              </td>
              <td className="c-area">{Math.round(r.areaM2)}㎡</td>
              <td className="c-price">{fmtManwon(r.priceManwon)}</td>
              <td className="c-price">
                {r.prevPriceManwon > 0 ? fmtManwon(r.prevPriceManwon) : "-"}
                {r.prevDealDate && <span className="t5-loc">{ym(r.prevDealDate)} 거래</span>}
                {isStale(r) && <span className="stat-pill">오랜만의 거래</span>}
              </td>
              <td className="num-up">
                +{fmtManwon(r.gainManwon)}
                {r.gainPct > 0 && <span className="muted-small"> ({r.gainPct.toFixed(1)}%)</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function Page() {
  let data: WeeklyRecords | null = null;
  try {
    data = await getWeeklyRecords();
  } catch {
    data = null;
  }

  const busan = data?.rows.filter((r) => r.group === "부산").slice(0, 20) ?? [];
  const ulsan = data?.rows.filter((r) => r.group === "울산").slice(0, 10) ?? [];
  // 요약 문장에는 "오랜만의 거래"를 뺀 신고가만 씁니다 (몇 년 만의 거래로 부풀려진 1위를 피하려고).
  const headline = busan.find((r) => !isStale(r));
  const topPct = data ? [...data.rows].filter((r) => !isStale(r)).sort((a, b) => b.gainPct - a.gainPct)[0] : undefined;

  return (
    <div className="wrap">
      <SiteHeader current="insight" />
      <article className="block">
        <nav className="crumbs">
          <Link href="/insight">분석</Link>
        </nav>
        <h1 className="guide-title">이번 주 부산·울산 아파트 신고가</h1>
        {!data ? (
          <p className="empty-note">자료를 불러오지 못했습니다. 잠시 후 다시 확인해 주세요.</p>
        ) : (
          <>
            <p className="guide-meta">
              {md(data.from)} ~ {md(data.to)} 신고분 · 하루 네 번 새로 계산
            </p>
            <p className="guide-summary">
              최근 7일 동안 국토교통부에 새로 신고된 거래 중 신고가(같은 단지·같은 평형의 3년 내 최고가를 넘은
              거래)는 부산 <strong>{data.totalByGroup["부산"]}건</strong>, 울산{" "}
              <strong>{data.totalByGroup["울산"]}건</strong>입니다.
              {headline && (
                <>
                  {" "}
                  부산에서 가장 크게 오른 곳(몇 년 만의 거래 제외)은{" "}
                  <Link href={complexHref(headline.regionCode, headline.complex)}>{headline.complex}</Link>(
                  {headline.regionName}) 전용 {Math.round(headline.areaM2)}㎡로, 직전 최고가보다{" "}
                  {fmtManwon(headline.gainManwon)} 높은 {fmtManwon(headline.priceManwon)}에 거래됐습니다.
                </>
              )}
              {topPct && topPct.gainPct > 0 && topPct !== headline && (
                <>
                  {" "}
                  오른 비율로 보면{" "}
                  <Link href={complexHref(topPct.regionCode, topPct.complex)}>{topPct.complex}</Link>(
                  {topPct.regionName}){pickJosa(topPct.complex, "이", "가")} {topPct.gainPct.toFixed(1)}%로 가장 컸습니다.
                </>
              )}
            </p>

            <section className="brief-section">
              <h2 className="brief-h2">부산 신고가 TOP {busan.length}</h2>
              {busan.length ? <Table rows={busan} /> : <p className="empty-note">이번 주 부산 신고가가 없습니다.</p>}
            </section>
            <section className="brief-section">
              <h2 className="brief-h2">울산 신고가 TOP {ulsan.length}</h2>
              {ulsan.length ? <Table rows={ulsan} /> : <p className="empty-note">이번 주 울산 신고가가 없습니다.</p>}
            </section>

            <section className="brief-section">
              <h2 className="brief-h2">이 표를 볼 때 알아둘 점</h2>
              <p className="complex-commentary">
                신고가는 우리가 가진 3년치 자료 안에서의 최고가입니다. 그보다 오래전(예: 2021년 고점)에 더 비싼
                거래가 있었다면 실제로는 "전고점 회복 중"인 거래일 수 있습니다. 단지마다 가장 크게 오른 한 건만
                넣어, 거래가 많은 단지 하나가 표를 차지하지 않게 했습니다.
              </p>
              <p className="complex-commentary">
                "신고분"은 계약일이 아니라 국토교통부에 올라온 날 기준입니다. 계약은 몇 주 전일 수 있고, 이후
                계약이 해제되면 이 목록에서 빠질 수 있습니다. 직전 최고가와 층이 크게 다르면 오른 폭이 과장돼
                보일 수 있으니 단지 페이지에서 층별 거래를 함께 확인하세요.
              </p>
            </section>
          </>
        )}
        <InsightNav current="weekly-records" />
      </article>
    </div>
  );
}
