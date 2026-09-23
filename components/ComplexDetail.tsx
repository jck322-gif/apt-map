import Link from "next/link";
import { fmtManwon, areaDetail, typeLabel } from "@/lib/format";
import { complexHref, complexAreaHref, type ComplexTrend, type ComplexListRow } from "@/lib/complex";
import FavoriteButton from "@/components/FavoriteButton";
import InteriorLinks from "@/components/InteriorLinks";

/**
 * 단지 상세 화면 본문.
 * 전체 평형 페이지(/apt/26500/삼익비치)와 평형별 페이지(/apt/26500/삼익비치/95.17)가
 * 같은 화면을 쓰기 때문에 컴포넌트로 빼두었습니다.
 *
 * 서버에서 그대로 그려지므로 표 안의 숫자를 검색엔진이 전부 읽습니다.
 */
/** "3.2% 올랐습니다" 같은 변동 문장 */
function changeWords(pct: number): string {
  const a = Math.abs(pct);
  if (a < 0.5) return "거의 같은 가격입니다";
  return `${a.toFixed(1)}% ${pct > 0 ? "올랐습니다" : "내렸습니다"}`;
}

/**
 * 숫자를 사람이 읽는 문장으로 풀어 쓴 해설.
 * 전부 실제 자료에서 계산한 값만 쓰고, 자료가 부족한 항목은 문장 자체를 빼서 없는 말을 지어내지 않습니다.
 */
function buildCommentary(data: ComplexTrend, selectedArea?: number): string[] {
  const i = data.insights;
  const latest = data.stats.latestSale;
  const out: string[] = [];

  if (latest) {
    let t = `가장 최근 매매는 ${latest.dateLabel} 계약된 전용 ${Math.round(latest.areaM2)}㎡ ${latest.floor}층으로 ${fmtManwon(
      latest.priceManwon
    )}입니다.`;
    if (i.sameAreaPrev && i.sameAreaChangePct !== null) {
      t += ` 같은 평형의 직전 거래(${i.sameAreaPrev.dateLabel}, ${fmtManwon(i.sameAreaPrev.priceManwon)})와 비교하면 ${changeWords(
        i.sameAreaChangePct
      )}.`;
    } else {
      t += " 같은 평형의 이전 거래가 없어 직전 거래와 비교하기는 어렵습니다.";
    }
    t += " 층·향·수리 상태에 따라 같은 평형도 가격 차이가 크므로, 한 건만으로 시세가 바뀌었다고 보기는 이릅니다.";
    out.push(t);
  }

  const v = i.volume;
  if (v.m12 > 0) {
    let t = `최근 12개월 동안 매매는 ${v.m12}건 신고됐고, 최근 3개월은 ${v.m3}건입니다.`;
    if (v.prev3 > 0 || v.m3 > 0) {
      if (v.m3 > v.prev3) t += ` 그 전 3개월(${v.prev3}건)보다 거래가 늘었습니다.`;
      else if (v.m3 < v.prev3) t += ` 그 전 3개월(${v.prev3}건)보다 거래가 줄었습니다.`;
      else t += ` 그 전 3개월과 거래 건수가 같습니다.`;
    }
    t += " 최근 한두 달은 아직 신고되지 않은 계약이 있을 수 있어(계약 후 30일 안에 신고) 실제보다 적게 보일 수 있습니다.";
    out.push(t);
  } else if (latest) {
    out.push("최근 12개월 안에 신고된 매매가 없어, 지금 시세를 판단할 때는 주변 단지 거래를 함께 보는 것이 좋습니다.");
  }

  const extra: string[] = [];
  if (i.recordHighs90d > 0) extra.push(`최근 90일 동안 평형별 3년 내 최고가를 새로 쓴 거래(신고가)가 ${i.recordHighs90d}건 있었습니다.`);
  if (i.cancelled12m > 0)
    extra.push(`최근 1년 사이 계약됐다가 해제(취소)된 매매가 ${i.cancelled12m}건 있어, 아래 거래 목록에서 취소 표시를 함께 확인하세요.`);
  if (i.directPct12m !== null && i.directPct12m >= 20)
    extra.push(
      `최근 1년 거래 중 직거래 비율이 ${i.directPct12m.toFixed(0)}%로 높은 편입니다. 직거래는 가족 간 거래처럼 시세와 다른 가격이 섞일 수 있습니다.`
    );
  if (extra.length) out.push(extra.join(" "));

  if (i.jeonseRatePct !== null && !selectedArea) {
    const r = i.jeonseRatePct;
    let t = `같은 평형 기준 최근 전세가율은 약 ${r.toFixed(0)}%입니다.`;
    if (r >= 80) t += " 매매가와 전세가 차이가 매우 작아, 전세로 들어갈 때는 보증보험 가입과 선순위 채권을 꼭 확인해야 합니다.";
    else if (r >= 70) t += " 전세가율이 높은 편이라 전세 계약 시 보증보험 가입 여부를 확인하는 것이 좋습니다.";
    else if (r <= 50) t += " 전세가율이 낮은 편으로, 매매가에 비해 전세 보증금 비중이 작습니다.";
    out.push(t);
  }
  return out;
}

export default function ComplexDetail({
  data,
  selectedArea,
  nearby = [],
}: {
  data: ComplexTrend;
  /** 지금 보고 있는 전용면적. 없으면 전체 평형 합산입니다. */
  selectedArea?: number;
  /** 같은 동의 다른 단지 */
  nearby?: ComplexListRow[];
}) {
  const commentary = buildCommentary(data, selectedArea);
  const ins = data.insights;
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

      <div className="complex-title-row">
        <h1 className="guide-title">
          {name}
          {areaSuffix} 실거래가
        </h1>
        <FavoriteButton
          code={data.code}
          complex={name}
          regionName={data.regionName}
          group={data.group}
          href={complexHref(data.code, name)}
        />
      </div>
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

      {commentary.length > 0 && (
        <section className="brief-section">
          <h2 className="brief-h2">
            {name}
            {areaSuffix} 실거래 해설
          </h2>
          {commentary.map((t, idx) => (
            <p key={idx} className="complex-commentary">
              {t}
            </p>
          ))}
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
        <h2 className="brief-h2">매매 거래량</h2>
        <div className="top5-table-wrap">
          <table className="top5-table">
            <thead>
              <tr>
                <th>최근 30일</th>
                <th>최근 3개월</th>
                <th>그 전 3개월</th>
                <th>최근 12개월</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{ins.volume.d30}건</td>
                <td>{ins.volume.m3}건</td>
                <td>{ins.volume.prev3}건</td>
                <td>{ins.volume.m12}건</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="chart-basis-note">계약일 기준, 해제(취소)된 거래는 뺐습니다.</p>
      </section>

      {!selectedArea && ins.areaStats.length > 0 && (
        <section className="brief-section">
          <h2 className="brief-h2">평형별 매매가 (최근 12개월)</h2>
          <div className="top5-table-wrap">
            <table className="top5-table">
              <thead>
                <tr>
                  <th className="c-name">평형</th>
                  <th>최근 거래</th>
                  <th>최저</th>
                  <th>중간값</th>
                  <th>최고</th>
                  <th>건수</th>
                </tr>
              </thead>
              <tbody>
                {ins.areaStats.map((a) => (
                  <tr key={a.areaM2}>
                    <th className="c-name">
                      <Link href={complexAreaHref(data.code, name, a.areaM2)}>{Math.round(a.areaM2)}㎡</Link>
                    </th>
                    <td>
                      {a.latest ? (
                        <>
                          {fmtManwon(a.latest.priceManwon)}
                          <br />
                          <span className="muted-small">{a.latest.dateLabel}</span>
                        </>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td>{a.low12m !== null ? fmtManwon(a.low12m) : "-"}</td>
                    <td>{a.median12m !== null ? fmtManwon(a.median12m) : "-"}</td>
                    <td>{a.high12m !== null ? fmtManwon(a.high12m) : "-"}</td>
                    <td>{a.count12m}건</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="chart-basis-note">
            최근 12개월 거래가 없는 평형은 최저·중간·최고가 비어 있고, 최근 거래는 3년 안의 가장 최근 거래입니다.
          </p>
        </section>
      )}

      <section className="brief-section">
        <h2 className="brief-h2">최근 12개월 매매 평균가</h2>
        <p className="chart-basis-note">
          <strong>계약일 기준</strong>입니다. 계약 후 30일 안에만 신고하면 되기 때문에, 이번 달에 신고된
          거래도 지난달 칸에 들어갈 수 있어요.
        </p>
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

      {nearby.length > 0 && (
        <section className="brief-section">
          <h2 className="brief-h2">
            {data.dong} 주변 단지 실거래가
          </h2>
          <ul className="nearby-list">
            {nearby.map((n) => (
              <li key={n.complex}>
                <Link href={complexHref(n.regionCode, n.complex)}>{n.complex} 실거래가</Link>
                <span className="muted-small">
                  {n.buildYear ? ` · ${n.buildYear}년 준공` : ""} · 3년 거래 {n.totalCount}건
                </span>
              </li>
            ))}
          </ul>
          <p className="chart-basis-note">
            <Link href={`/apt/${data.code}`}>{data.regionName} 전체 단지 보기</Link>
          </p>
        </section>
      )}

      <InteriorLinks complex={name} />

      <p className="section-note" style={{ marginTop: 22 }}>
        이 페이지의 모든 숫자는 국토교통부 실거래가 공개시스템에 신고된 자료입니다. 아파트 매매는 계약 후
        30일 이내에 신고하면 되기 때문에, 가장 최근 계약은 아직 목록에 없을 수 있습니다. 해제(취소)된
        거래는 <span className="flag cancel">취소</span> 로 표시했습니다. 실거래가를 읽는 방법은{" "}
        <Link href="/guide/how-to-read-real-transaction-data">실거래가 읽는 법</Link>에 정리해 두었습니다.
      </p>

      <p className="section-note">
        이 페이지는 공개된 실거래 자료를 정리한 참고용 정보이며, 매수·매도 등 투자 판단을 권유하는 것이
        아닙니다. 실제 거래 전에는 현장 시세와 등기부등본 등을 반드시 직접 확인하세요.
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
