import Link from "next/link";
import { fmtManwon, areaDetail, typeLabel } from "@/lib/format";
import { complexHref, complexAreaHref, type ComplexTrend } from "@/lib/complex";

/**
 * 단지 상세 화면 본문.
 * 전체 평형 페이지(/apt/26500/삼익비치)와 평형별 페이지(/apt/26500/삼익비치/95.17)가
 * 같은 화면을 쓰기 때문에 컴포넌트로 빼두었습니다.
 *
 * 서버에서 그대로 그려지므로 표 안의 숫자를 검색엔진이 전부 읽습니다.
 */
export default function ComplexDetail({
  data,
  selectedArea,
}: {
  data: ComplexTrend;
  /** 지금 보고 있는 전용면적. 없으면 전체 평형 합산입니다. */
  selectedArea?: number;
}) {
  const s = data.stats;
  const name = data.complex;
  const where = `${data.group}광역시 ${data.regionName}${data.dong ? ` ${data.dong}` : ""}`;
  const monthsNewestFirst = [...data.points].reverse();
  const areaSuffix = selectedArea ? ` ${Math.round(selectedArea)}㎡` : "";

  return (
    <article className="block">
      <nav className="crumbs">
        <Link href="/apt">단지</Link>
        <span>›</span>
        <Link href={`/apt/${data.code}`}>{data.regionName}</Link>
        {selectedArea && (
          <>
            <span>›</span>
            <Link href={complexHref(data.code, name)}>{name}</Link>
          </>
        )}
      </nav>

      <h1 className="guide-title">
        {name}
        {areaSuffix} 실거래가
      </h1>
      <p className="guide-meta">
        {where}
        {data.buildYear ? ` · ${data.buildYear}년 준공 (${data.age}년차)` : ""}
        {selectedArea ? ` · ${areaDetail(selectedArea)}` : ""}
      </p>

      <p className="guide-summary">
        {name}
        {areaSuffix}은(는) {where}에 있는 아파트입니다. 최근 3년간 국토교통부에 신고된 거래는 매매{" "}
        {data.counts.sale}건, 전세 {data.counts.jeonse}건, 월세 {data.counts.monthly}건입니다.
        {s.latestSale && (
          <>
            {" "}
            가장 최근 매매는 <strong>{s.latestSale.dateLabel}</strong> 계약분으로{" "}
            <strong>{fmtManwon(s.latestSale.priceManwon)}</strong>({Math.round(s.latestSale.areaM2)}㎡,{" "}
            {s.latestSale.floor}층)이었습니다.
          </>
        )}
      </p>

      {/* 평형 고르기 — 누르면 그 평형 거래만 보여주는 페이지로 갑니다. */}
      {data.types.length > 0 && (
        <section className="brief-section">
          <h2 className="brief-h2">
            평형 <span className="brief-count">{data.types.length}개 타입</span>
          </h2>
          <p className="type-help">평형을 누르면 그 평형의 거래만 따로 볼 수 있습니다.</p>
          <div className="area-tabs">
            <Link
              href={complexHref(data.code, name)}
              className="area-tab"
              aria-current={selectedArea === undefined ? "page" : undefined}
            >
              전체
            </Link>
            {data.types.map((a) => (
              <Link
                key={a}
                href={complexAreaHref(data.code, name, a)}
                className="area-tab"
                aria-current={selectedArea === a ? "page" : undefined}
              >
                <span className="area-tab-main">{typeLabel(a)}</span>
                <span className="area-tab-sub">{a}㎡</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 핵심 숫자 — 검색엔진이 글자로 읽을 수 있게 표로 둡니다 */}
      <section className="brief-section">
        <h2 className="brief-h2">매매 요약{selectedArea ? ` — ${typeLabel(selectedArea)}` : ""}</h2>
        <div className="top5-table-wrap">
          <table className="top5-table">
            <tbody>
              <tr>
                <th className="c-name">최근 매매가</th>
                <td>
                  {s.latestSale
                    ? `${fmtManwon(s.latestSale.priceManwon)} · ${s.latestSale.floor}층 · ${
                        s.latestSale.dateLabel
                      } 계약`
                    : "최근 3년 내 매매 거래 없음"}
                </td>
              </tr>
              <tr>
                <th className="c-name">직전 거래</th>
                <td>
                  {s.previousSale
                    ? `${fmtManwon(s.previousSale.priceManwon)} · ${s.previousSale.floor}층 · ${
                        s.previousSale.dateLabel
                      }`
                    : "-"}
                </td>
              </tr>
              <tr>
                <th className="c-name">3년 최고가</th>
                <td>
                  {s.highSale
                    ? `${fmtManwon(s.highSale.priceManwon)} · ${s.highSale.floor}층 · ${s.highSale.dateLabel}`
                    : "-"}
                  {s.recoveryPct !== null && (
                    <span className="stat-pill">회복율 {s.recoveryPct.toFixed(0)}%</span>
                  )}
                </td>
              </tr>
              <tr>
                <th className="c-name">3년 최저가</th>
                <td>
                  {s.lowSale
                    ? `${fmtManwon(s.lowSale.priceManwon)} · ${s.lowSale.floor}층 · ${s.lowSale.dateLabel}`
                    : "-"}
                </td>
              </tr>
              <tr>
                <th className="c-name">최근 전세</th>
                <td>
                  {s.latestJeonse
                    ? `${fmtManwon(s.latestJeonse.priceManwon)} · ${s.latestJeonse.floor}층 · ${
                        s.latestJeonse.dateLabel
                      }`
                    : "최근 3년 내 전세 거래 없음"}
                  {s.gapManwon !== null && s.gapPct !== null && (
                    <span className="stat-pill">
                      갭 {fmtManwon(s.gapManwon)} ({s.gapPct.toFixed(0)}%)
                    </span>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="brief-section">
        <h2 className="brief-h2">최근 12개월 매매 평균가</h2>
        <div className="top5-table-wrap">
          <table className="top5-table">
            <thead>
              <tr>
                <th className="c-name">월</th>
                <th className="c-price">평균 매매가</th>
                <th className="c-area">최저</th>
                <th className="c-area">최고</th>
                <th className="c-date">건수</th>
              </tr>
            </thead>
            <tbody>
              {monthsNewestFirst.map((p) => (
                <tr key={p.ymd}>
                  <td className="c-name">
                    {p.ymd.slice(0, 4)}년 {Number(p.ymd.slice(4, 6))}월
                  </td>
                  <td className="c-price">
                    {p.avgPriceManwon === null ? "거래 없음" : fmtManwon(p.avgPriceManwon)}
                  </td>
                  <td className="c-area">{p.minPriceManwon === null ? "-" : fmtManwon(p.minPriceManwon)}</td>
                  <td className="c-area">{p.maxPriceManwon === null ? "-" : fmtManwon(p.maxPriceManwon)}</td>
                  <td className="c-date">{p.count}건</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {data.history.length > 0 && (
        <section className="brief-section">
          <h2 className="brief-h2">
            매매 실거래 이력{" "}
            <span className="brief-count">최근 {Math.min(data.history.length, 60)}건</span>
          </h2>
          <div className="top5-table-wrap">
            <table className="top5-table">
              <thead>
                <tr>
                  <th className="c-date">계약일</th>
                  <th className="c-price">거래금액</th>
                  <th className="c-area">전용</th>
                  <th className="c-area">층</th>
                  <th className="c-name">비고</th>
                </tr>
              </thead>
              <tbody>
                {data.history.slice(0, 60).map((tx, i) => (
                  <tr key={`${tx.ymd}-${tx.floor}-${i}`}>
                    <td className="c-date">{tx.dateLabel}</td>
                    <td className={`c-price${tx.cancelDate ? " struck" : ""}`}>
                      {fmtManwon(tx.priceManwon)}
                    </td>
                    <td className="c-area">{tx.areaM2}㎡</td>
                    <td className="c-area">{tx.floor}층</td>
                    <td className="c-name">
                      {tx.isRecordHigh && !tx.cancelDate && <span className="flag high">신고가</span>}
                      {tx.isDirect && <span className="flag direct">직거래</span>}
                      {tx.cancelDate && <span className="flag cancel">취소</span>}
                      {tx.aptDong ? `${tx.aptDong}동` : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <p className="section-note" style={{ marginTop: 22 }}>
        이 페이지의 모든 숫자는 국토교통부 실거래가 공개시스템에 신고된 자료입니다. 아파트 매매는 계약 후
        30일 이내에 신고하면 되기 때문에, 가장 최근 계약은 아직 목록에 없을 수 있습니다. 해제(취소)된
        거래는 <span className="flag cancel">취소</span> 로 표시했습니다. 실거래가를 읽는 방법은{" "}
        <Link href="/guide/how-to-read-real-transaction-data">실거래가 읽는 법</Link>에 정리해 두었습니다.
      </p>

      <p className="section-note">
        <Link href={`/apt/${data.code}`}>{data.regionName}의 다른 단지 보기</Link>
        {" · "}
        <Link href="/daily">오늘의 실거래 브리핑</Link>
        {" · "}
        <Link href="/compare">단지 비교하기</Link>
      </p>
    </article>
  );
}
