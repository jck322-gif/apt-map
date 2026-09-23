import Link from "next/link";
import { fmtManwon } from "@/lib/format";
import { complexHref } from "@/lib/complex";
import type { RegionSummary } from "@/lib/regionSummary";

/** "25.09.12" 형식 */
function shortDate(iso: string): string {
  return `${iso.slice(2, 4)}.${iso.slice(5, 7)}.${iso.slice(8, 10)}`;
}

/**
 * 구·군 페이지 맨 위의 거래 요약. 숫자는 모두 실제 자료에서 계산하고,
 * 자료가 없는 항목은 문장째 뺍니다.
 */
export default function RegionSummaryBlock({
  code,
  fullName,
  summary: s,
}: {
  code: string;
  fullName: string;
  summary: RegionSummary;
}) {
  const lines: React.ReactNode[] = [];

  // 1) 거래량
  {
    let t = `최근 30일(계약일 기준) ${fullName}에서 신고된 아파트 매매는 ${s.d30.toLocaleString()}건입니다.`;
    if (s.monthChangePct !== null) {
      const pct = s.monthChangePct;
      const trend =
        Math.abs(pct) < 3
          ? "비슷한 수준입니다"
          : `${Math.abs(pct).toFixed(0)}% ${pct > 0 ? "늘었습니다" : "줄었습니다"}`;
      t += ` 달별로 보면 ${s.monthA.label} 계약은 ${s.monthA.count.toLocaleString()}건으로, ${s.monthB.label}(${s.monthB.count.toLocaleString()}건)보다 ${trend}.`;
    }
    lines.push(t);
  }

  // 2) 최고가
  if (s.topDeal) {
    const d = s.topDeal;
    lines.push(
      <>
        최근 30일 가장 비싸게 거래된 곳은{" "}
        <Link href={complexHref(code, d.complex)}>{d.complex}</Link>({d.dong}) 전용 {Math.round(d.areaM2)}㎡{" "}
        {d.floor}층으로 <strong>{fmtManwon(d.priceManwon)}</strong>({shortDate(d.dealDate)} 계약)입니다.
        {s.recordHighs30 !== null && s.recordHighs30 > 0
          ? ` 같은 기간 평형별 3년 내 최고가를 새로 쓴 거래(신고가)는 ${s.recordHighs30}건입니다.`
          : ""}
      </>
    );
  }

  // 3) 84㎡
  if (s.top84 && s.median84 !== null && s.count84 >= 3) {
    const d = s.top84;
    lines.push(
      <>
        많이 찾는 전용 84㎡ 전후(80~90㎡) 매매는 최근 90일 {s.count84}건, 중간값은{" "}
        <strong>{fmtManwon(s.median84)}</strong>입니다. 이 면적대 최고가는{" "}
        <Link href={complexHref(code, d.complex)}>{d.complex}</Link> {fmtManwon(d.priceManwon)}({d.floor}층,{" "}
        {shortDate(d.dealDate)})이었습니다.
      </>
    );
  }

  // 4) 거래 많은 단지
  if (s.busiest.length > 0) {
    lines.push(
      <>
        최근 90일 거래가 가장 많았던 단지는{" "}
        {s.busiest.map((b, i) => (
          <span key={b.complex}>
            {i > 0 ? ", " : ""}
            <Link href={complexHref(code, b.complex)}>{b.complex}</Link>({b.count}건)
          </span>
        ))}
        입니다.
      </>
    );
  }

  return (
    <section className="brief-section region-summary">
      <h2 className="brief-h2">{fullName} 최근 거래 요약</h2>
      {lines.map((l, i) => (
        <p key={i} className="complex-commentary">
          {l}
        </p>
      ))}
      <p className="chart-basis-note">
        매매만, 해제(취소)된 거래는 뺀 숫자입니다. 이번 달은 아직 신고가 덜 들어와 끝난 달끼리 비교했습니다.
        하루 네 번 새로 계산합니다.
      </p>
    </section>
  );
}
