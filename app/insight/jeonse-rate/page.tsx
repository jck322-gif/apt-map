import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import InsightNav from "@/components/InsightNav";
import { SITE_NAME } from "@/lib/site";
import { fmtManwon } from "@/lib/format";
import { complexAreaHref, complexHref } from "@/lib/complex";
import { getJeonseRate, type JeonseRate, type JeonseRateRow, type Group } from "@/lib/insights";

export const revalidate = 21600;
export const maxDuration = 60;

export const metadata: Metadata = {
  title: `부산·울산 전세가율 높은 아파트 TOP | ${SITE_NAME}`,
  description:
    "최근 3개월 부산·울산 아파트의 같은 단지·같은 평형 매매가와 전세가를 비교해 전세가율이 높은 단지와 낮은 단지를 정리했습니다. 전세 계약 전 깡통전세 위험을 가늠하는 데 참고하세요.",
  alternates: { canonical: "/insight/jeonse-rate" },
};

function Table({ rows }: { rows: JeonseRateRow[] }) {
  return (
    <div className="top5-table-wrap">
      <table className="top5-table">
        <thead>
          <tr>
            <th className="c-rank">#</th>
            <th className="c-name">아파트</th>
            <th className="c-area">전용</th>
            <th className="c-price">매매 중간값</th>
            <th className="c-price">전세 중간값</th>
            <th>전세가율</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={`${r.regionCode}-${r.complex}-${r.areaM2}`}>
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
                  {r.regionName} · 매매 {r.saleCount}건 · 전세 {r.jeonseCount}건
                </span>
              </td>
              <td className="c-area">
                <Link href={complexAreaHref(r.regionCode, r.complex, r.areaM2)}>{Math.round(r.areaM2)}㎡</Link>
              </td>
              <td className="c-price">{fmtManwon(r.saleMedian)}</td>
              <td className="c-price">{fmtManwon(r.jeonseMedian)}</td>
              <td className={r.ratePct >= 80 ? "num-up" : undefined}>{r.ratePct.toFixed(0)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function Page() {
  let data: JeonseRate | null = null;
  try {
    data = await getJeonseRate();
  } catch {
    data = null;
  }

  return (
    <div className="wrap">
      <SiteHeader current="insight" />
      <article className="block">
        <nav className="crumbs">
          <Link href="/insight">분석</Link>
        </nav>
        <h1 className="guide-title">부산·울산 전세가율 높은 아파트</h1>
        {!data ? (
          <p className="empty-note">자료를 불러오지 못했습니다. 잠시 후 다시 확인해 주세요.</p>
        ) : (
          <>
            <p className="guide-meta">최근 3개월 계약 기준 · 하루 네 번 새로 계산</p>
            <p className="guide-summary">
              전세가율은 전세 보증금이 매매가의 몇 %인지를 뜻합니다. 최근 3개월 같은 단지·같은 평형에서 매매와
              전세가 각각 2건 이상 있었던 곳을 비교했더니, 부산은 {data.groupCount["부산"]}곳의 전세가율
              중간값이 <strong>{data.groupMedian["부산"]?.toFixed(0) ?? "-"}%</strong>, 울산은{" "}
              {data.groupCount["울산"]}곳 중간값이 <strong>{data.groupMedian["울산"]?.toFixed(0) ?? "-"}%</strong>
              였습니다. 전세가율 80%를 넘는 곳은 부산 {data.over80["부산"]}곳, 울산 {data.over80["울산"]}곳입니다.
            </p>

            {(["부산", "울산"] as Group[]).map((g) => {
              const list = data!.rows.filter((r) => r.group === g);
              const high = list.slice(0, g === "부산" ? 20 : 10);
              const low = [...list].reverse().slice(0, g === "부산" ? 10 : 5);
              return (
                <section className="brief-section" key={g}>
                  <h2 className="brief-h2">{g} 전세가율 높은 단지</h2>
                  {high.length ? <Table rows={high} /> : <p className="empty-note">비교할 수 있는 단지가 없습니다.</p>}
                  {low.length > 0 && (
                    <>
                      <h3 className="group-heading" style={{ marginTop: 18 }}>
                        {g} 전세가율 낮은 단지
                      </h3>
                      <Table rows={low} />
                    </>
                  )}
                </section>
              );
            })}

            <section className="brief-section">
              <h2 className="brief-h2">전세가율, 이렇게 읽으세요</h2>
              <p className="complex-commentary">
                전세가율이 높다는 것은 매매가와 전세 보증금의 차이(갭)가 작다는 뜻입니다. 세입자 입장에서는 집값이
                조금만 내려도 보증금을 온전히 돌려받기 어려워질 수 있어, 흔히 80%를 넘으면 주의가 필요하다고
                봅니다. 이런 집에 전세로 들어간다면 전세보증금 반환보증 가입이 가능한지, 등기부등본에 선순위
                근저당이 얼마나 있는지를 반드시 확인하세요.
              </p>
              <p className="complex-commentary">
                반대로 전세가율이 낮은 단지는 매매가에 비해 보증금이 적어 세입자 부담은 덜하지만, 집을 사서 전세를
                놓으려는 사람에게는 필요한 자기 돈이 많다는 뜻입니다. 재건축을 기다리는 오래된 단지나 선호도가
                높은 신축 대단지에서 이런 모습이 자주 나타납니다.
              </p>
              <p className="complex-commentary">
                계산 방법: 최근 3개월 계약된 매매가와 전세 보증금을 같은 단지·같은 평형(전용면적 반올림)끼리 묶어
                각각 중간값을 구한 뒤 나눴습니다. 해제된 거래는 뺐습니다. 실거래 자료에는 신규 계약과 갱신 계약이
                섞여 있어, 보증금을 적게 올린 갱신 계약이 많으면 전세가율이 실제보다 낮게 나올 수 있습니다. 층과 동이
                전혀 다른 거래끼리 묶여 30% 미만이나 110% 초과로 나온 경우는 오류일 가능성이 커서 뺐습니다.
              </p>
            </section>
          </>
        )}
        <InsightNav current="jeonse-rate" />
      </article>
    </div>
  );
}
