import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import InsightNav from "@/components/InsightNav";
import { SITE_NAME } from "@/lib/site";
import { fmtManwon, josa } from "@/lib/format";
import { complexHref } from "@/lib/complex";
import { getRegionTrend, type RegionTrend, type RegionTrendRow, type Group } from "@/lib/insights";

export const revalidate = 21600;
export const maxDuration = 60;

export const metadata: Metadata = {
  title: `부산·울산 구·군별 아파트 거래량 변화와 84㎡ 가격 | ${SITE_NAME}`,
  description:
    "부산 16개 구·군, 울산 5개 구·군의 지난달 아파트 매매 거래량을 전달과 비교하고, 전용 84㎡ 전후 매매 중간값과 최고가 거래를 국토교통부 실거래 자료로 정리했습니다.",
  alternates: { canonical: "/insight/region-trend" },
};

function Change({ pct }: { pct: number | null }) {
  if (pct === null) return <>-</>;
  if (Math.abs(pct) < 0.5) return <>0%</>;
  return <span className={pct > 0 ? "num-up" : "num-down"}>{`${pct > 0 ? "+" : ""}${pct.toFixed(0)}%`}</span>;
}

function Table({ rows, data }: { rows: RegionTrendRow[]; data: RegionTrend }) {
  return (
    <div className="top5-table-wrap">
      <table className="top5-table">
        <thead>
          <tr>
            <th className="c-name">구·군</th>
            <th>{data.monthA}</th>
            <th>{data.monthB}</th>
            <th>변화</th>
            <th className="c-price">84㎡ 중간값</th>
            <th className="c-name">최근 90일 최고가</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.code}>
              <th className="c-name">
                <Link href={`/apt/${r.code}`}>{r.name}</Link>
              </th>
              <td>{r.countA.toLocaleString()}건</td>
              <td>{r.countB.toLocaleString()}건</td>
              <td>
                <Change pct={r.changePct} />
              </td>
              <td className="c-price">{r.median84 !== null ? fmtManwon(r.median84) : "-"}</td>
              <td className="c-name">
                {r.top ? (
                  <>
                    <Link href={complexHref(r.code, r.top.complex)}>{r.top.complex}</Link>
                    <span className="t5-loc">
                      {Math.round(r.top.areaM2)}㎡ · {fmtManwon(r.top.priceManwon)}
                    </span>
                  </>
                ) : (
                  "-"
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function groupSentences(g: Group, rows: RegionTrendRow[], data: RegionTrend): string[] {
  const out: string[] = [];
  const A = rows.reduce((n, r) => n + r.countA, 0);
  const B = rows.reduce((n, r) => n + r.countB, 0);
  if (B > 0) {
    const pct = ((A - B) / B) * 100;
    const trend = Math.abs(pct) < 3 ? "비슷했습니다" : `${Math.abs(pct).toFixed(0)}% ${pct > 0 ? "늘었습니다" : "줄었습니다"}`;
    out.push(`${g} 전체 아파트 매매는 ${data.monthA} ${A.toLocaleString()}건으로 ${data.monthB}(${B.toLocaleString()}건)보다 ${trend}.`);
  }
  const movers = rows.filter((r) => r.countB >= 20 && r.changePct !== null);
  const up = [...movers].sort((x, y) => (y.changePct as number) - (x.changePct as number))[0];
  const down = [...movers].sort((x, y) => (x.changePct as number) - (y.changePct as number))[0];
  if (up && (up.changePct as number) > 3) out.push(`거래가 가장 많이 늘어난 곳은 ${up.name}(+${(up.changePct as number).toFixed(0)}%)입니다.`);
  if (down && down !== up && (down.changePct as number) < -3)
    out.push(`가장 많이 줄어든 곳은 ${down.name}(${(down.changePct as number).toFixed(0)}%)입니다.`);
  const priced = rows.filter((r) => r.median84 !== null).sort((x, y) => (y.median84 as number) - (x.median84 as number));
  if (priced.length >= 2) {
    const hi = priced[0];
    const lo = priced[priced.length - 1];
    out.push(
      `전용 84㎡ 전후 매매 중간값은 ${josa(hi.name, "이", "가")} ${fmtManwon(hi.median84 as number)}으로 가장 높고, ${josa(
        lo.name,
        "이",
        "가"
      )} ${fmtManwon(lo.median84 as number)}으로 가장 낮아 ${(((hi.median84 as number) / (lo.median84 as number))).toFixed(1)}배 차이가 납니다.`
    );
  }
  return out;
}

export default async function Page() {
  let data: RegionTrend | null = null;
  try {
    data = await getRegionTrend();
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
        <h1 className="guide-title">부산·울산 구·군별 아파트 거래량과 84㎡ 가격</h1>
        {!data ? (
          <p className="empty-note">자료를 불러오지 못했습니다. 잠시 후 다시 확인해 주세요.</p>
        ) : (
          <>
            <p className="guide-meta">
              {data.monthA}·{data.monthB} 계약 기준 · 가격은 최근 90일 · 하루 네 번 새로 계산
            </p>
            {(["부산", "울산"] as Group[]).map((g) => {
              const rows = data!.rows.filter((r) => r.group === g).sort((x, y) => y.countA - x.countA);
              return (
                <section className="brief-section" key={g}>
                  <h2 className="brief-h2">{g}광역시</h2>
                  {groupSentences(g, rows, data!).map((t, i) => (
                    <p key={i} className="complex-commentary">
                      {t}
                    </p>
                  ))}
                  <Table rows={rows} data={data!} />
                </section>
              );
            })}
            <section className="brief-section">
              <h2 className="brief-h2">계산 방법</h2>
              <p className="complex-commentary">
                거래량은 계약일 기준 매매 건수이며 해제(취소)된 거래는 뺐습니다. 아파트 매매는 계약 후 30일 안에
                신고하면 되기 때문에 이번 달은 아직 덜 들어와 있어, 끝난 두 달({data.monthA}·{data.monthB})을
                비교했습니다. 그래도 가장 최근 달은 늦게 들어오는 신고가 조금 더 붙을 수 있습니다.
              </p>
              <p className="complex-commentary">
                84㎡ 중간값은 최근 90일 전용 80~90㎡ 매매 가격을 줄 세웠을 때 가운데 값으로, 거래가 3건 미만인
                구·군은 비워 두었습니다. 평균 대신 중간값을 쓴 것은 초고가 거래 몇 건이 숫자를 끌어올리는 것을
                막기 위해서입니다. 같은 구 안에서도 신축과 구축, 동네에 따라 가격 차이가 크니 구·군 이름을 눌러
                단지별 거래를 함께 확인하세요.
              </p>
            </section>
          </>
        )}
        <InsightNav current="region-trend" />
      </article>
    </div>
  );
}
