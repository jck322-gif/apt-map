import Link from "next/link";
import { fmtManwon } from "@/lib/format";
import { koDate, koDateLong, type DailyBrief } from "@/lib/daily";

/** 브리핑 한 건의 본문. 서버에서 그대로 그려지므로 검색엔진이 전부 읽습니다. */
export default function DailyBriefView({
  brief,
  dates,
}: {
  brief: DailyBrief;
  dates: { date: string; count: number }[];
}) {
  const total = brief.totals.sale + brief.totals.jeonse + brief.totals.monthly;
  const busan = brief.groups.find((g) => g.group === "부산");
  const ulsan = brief.groups.find((g) => g.group === "울산");

  return (
    <>
      <article className="block">
        <Link href="/daily" className="guide-back">
          ← 브리핑 목록
        </Link>

        <h1 className="guide-title">부산 · 울산 실거래 브리핑 — {koDate(brief.date)}</h1>
        <p className="guide-meta">{koDateLong(brief.date)} 국토교통부 신고분 기준</p>

        {total === 0 ? (
          <p className="guide-summary">
            {koDate(brief.date)}에는 국토교통부에 새로 신고된 부산·울산 아파트 거래가 없습니다. 신고는
            주로 평일에 올라오기 때문에 주말과 공휴일에는 건수가 없거나 매우 적습니다.
          </p>
        ) : (
          <p className="guide-summary">
            {koDate(brief.date)} 부산·울산에서 <strong>{total.toLocaleString()}건</strong>의 아파트
            실거래가 새로 신고됐습니다. 매매 {brief.totals.sale.toLocaleString()}건, 전세{" "}
            {brief.totals.jeonse.toLocaleString()}건, 월세 {brief.totals.monthly.toLocaleString()}건입니다.
            {brief.highlight && (
              <>
                {" "}
                이날 가장 비싼 거래는 {brief.highlight.regionName} {brief.highlight.dong}{" "}
                <strong>{brief.highlight.complex}</strong> {Math.round(brief.highlight.areaM2)}㎡{" "}
                {fmtManwon(brief.highlight.priceManwon)}이었습니다.
              </>
            )}
          </p>
        )}

        {[busan, ulsan].map((g) =>
          !g ? null : (
            <section className="brief-section" key={g.group}>
              <h2 className="brief-h2">
                {g.group} <span className="brief-count">매매 {g.count}건</span>
              </h2>

              {g.top.length === 0 ? (
                <p className="empty-note">이날 신고된 매매 거래가 없습니다.</p>
              ) : (
                <>
                  <div className="top5-table-wrap">
                    <table className="top5-table">
                      <thead>
                        <tr>
                          <th className="c-rank">#</th>
                          <th className="c-name">아파트</th>
                          <th className="c-area">전용</th>
                          <th className="c-price">매매가</th>
                          <th className="c-date">계약일</th>
                        </tr>
                      </thead>
                      <tbody>
                        {g.top.map((d, i) => (
                          <tr key={`${d.complex}-${d.priceManwon}-${i}`}>
                            <td className="c-rank">
                              <span className={`rank-badge${i === 0 ? " first" : ""}`}>{i + 1}</span>
                            </td>
                            <td className="c-name">
                              <span className="t5-complex">
                                {d.complex}
                                {d.isDirect && <span className="flag direct">직거래</span>}
                              </span>
                              <span className="t5-loc">
                                {d.regionName} · {d.dong} · {d.floor}층
                              </span>
                            </td>
                            <td className="c-area">{Math.round(d.areaM2)}㎡</td>
                            <td className="c-price">{fmtManwon(d.priceManwon)}</td>
                            <td className="c-date">{d.dealDate.slice(5).replace("-", "/")}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {g.byRegion.length > 0 && (
                    <p className="brief-regions">
                      <strong>구·군별 신고 건수</strong>{" "}
                      {g.byRegion.map((r) => `${r.name} ${r.count}`).join(" · ")}
                    </p>
                  )}
                </>
              )}
            </section>
          )
        )}

        <p className="section-note" style={{ marginTop: 22 }}>
          이 브리핑은 <strong>계약일이 아니라 신고일</strong> 기준입니다. 아파트 매매는 계약 후 30일
          이내에 신고하면 되기 때문에, 오늘 신고된 거래의 계약일은 며칠에서 한 달 전일 수 있습니다.
          취소(해제)된 거래는 제외했습니다. 자세한 내용은{" "}
          <Link href="/guide/how-to-read-real-transaction-data">실거래가 읽는 법</Link>을 참고하세요.
        </p>
      </article>

      {dates.length > 1 && (
        <section className="block">
          <h2>지난 브리핑</h2>
          <div className="brief-dates">
            {dates
              .filter((d) => d.date !== brief.date)
              .slice(0, 14)
              .map((d) => (
                <Link className="brief-date-chip" href={`/daily/${d.date}`} key={d.date}>
                  {koDate(d.date)}
                  <span>{d.count}건</span>
                </Link>
              ))}
          </div>
        </section>
      )}
    </>
  );
}
