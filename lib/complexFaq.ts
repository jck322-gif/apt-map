import { fmtManwon, aptLabel, pickJosa } from "@/lib/format";
import type { ComplexTrend, AreaStat } from "@/lib/complex";

/**
 * 단지 페이지 "자주 묻는 질문" — 사람들이 검색창에 그대로 치는 질문에, 이 단지 실거래 숫자로 바로 답합니다.
 *
 * 왜 필요한가:
 *  - 구글·네이버·AI 검색(구글 AI 요약, 네이버 AI 브리핑, ChatGPT 검색 등)은 "질문 → 짧은 답" 형태의 문장을
 *    출처로 가져다 쓰기 좋아합니다. 표 안의 숫자만 있을 때보다 인용될 가능성이 커집니다.
 *  - 같은 국토부 숫자를 보여주는 다른 사이트와 달리, 이 단지만의 문장(대표 평형 중간값, 3년 최고가 대비 수준,
 *    전세가율, 거래량 변화)이 생겨 "내용이 겹치는 페이지"로 보일 가능성이 줄어듭니다.
 *
 * 원칙: 실제 자료에서 계산한 값만 씁니다. 자료가 없는 질문은 통째로 뺍니다(빈 답이나 추측 문장 금지).
 */

export type FaqItem = { q: string; a: string };

/** 대표 평형: 84㎡대(83~86㎡)에 최근 매매가 있으면 그것, 없으면 최근 1년(없으면 3년) 매매가 가장 많은 평형 */
export function pickRepresentativeArea(data: ComplexTrend): AreaStat | null {
  const list = data.insights.areaStats.filter((a) => a.latest);
  if (list.length === 0) return null;
  const k84 = list
    .filter((a) => a.areaM2 >= 83 && a.areaM2 < 86)
    .sort((a, b) => b.count12m - a.count12m || b.count3y - a.count3y)[0];
  if (k84) return k84;
  return [...list].sort((a, b) => b.count12m - a.count12m || b.count3y - a.count3y)[0];
}

export function buildComplexFaq(data: ComplexTrend): FaqItem[] {
  const name = aptLabel(data.complex);
  const nameJosa = pickJosa(name, "은", "는");
  const s = data.stats;
  const ins = data.insights;
  const out: FaqItem[] = [];

  // 1. 최근 실거래가
  if (s.latestSale) {
    const l = s.latestSale;
    out.push({
      q: `${name} 최근 실거래가는 얼마인가요?`,
      a:
        `국토교통부에 신고된 가장 최근 매매는 ${l.dateLabel} 계약된 전용 ${Math.round(l.areaM2)}㎡ ${l.floor}층으로 ` +
        `${fmtManwon(l.priceManwon)}입니다. 매매는 계약 후 30일 안에 신고하므로, 그 뒤 계약분이 아직 반영되지 않았을 수 있습니다.`,
    });
  }

  // 2. 대표 평형 시세 (최근 12개월 중간값·범위)
  const rep = pickRepresentativeArea(data);
  if (rep && rep.count12m >= 2 && rep.median12m !== null && rep.high12m !== null && rep.low12m !== null) {
    const area = Math.round(rep.areaM2);
    out.push({
      q: `${name} ${area}㎡ 시세는 어느 정도인가요?`,
      a:
        `최근 12개월 동안 전용 ${area}㎡ 매매는 ${rep.count12m}건 신고됐고, 가운데 값(중간값)은 ${fmtManwon(rep.median12m)}입니다. ` +
        `같은 기간 가장 높은 거래는 ${fmtManwon(rep.high12m)}, 가장 낮은 거래는 ${fmtManwon(rep.low12m)}로, ` +
        `층·향·수리 상태에 따라 같은 평형도 가격 차이가 있습니다.`,
    });
  } else if (rep?.latest && rep.count12m < 2) {
    const area = Math.round(rep.areaM2);
    out.push({
      q: `${name} ${area}㎡ 시세는 어느 정도인가요?`,
      a:
        `최근 12개월 안에 신고된 전용 ${area}㎡ 매매가 ${rep.count12m}건뿐이라 시세를 한 숫자로 말하기는 어렵습니다. ` +
        `이 평형의 가장 최근 거래는 ${rep.latest.dateLabel} ${fmtManwon(rep.latest.priceManwon)}(${rep.latest.floor}층)입니다.`,
    });
  }

  // 3. 3년 최고가와 지금 수준 (최근 거래와 같은 평형끼리 비교)
  if (s.latestSale && s.highSale) {
    const area = Math.round(s.latestSale.areaM2);
    const h = s.highSale;
    let a = `최근 3년 동안 전용 ${area}㎡의 가장 높은 매매가는 ${h.dateLabel} 계약된 ${fmtManwon(h.priceManwon)}(${h.floor}층)입니다.`;
    if (h === s.latestSale) a += " 가장 최근 거래가 곧 3년 최고가입니다.";
    else if (s.recoveryPct !== null) a += ` 가장 최근 거래는 이 최고가의 약 ${Math.round(s.recoveryPct)}% 수준입니다.`;
    if (ins.recordHighs90d > 0) a += ` 최근 90일 안에 평형별 최고가를 새로 쓴 거래(신고가)가 ${ins.recordHighs90d}건 있었습니다.`;
    out.push({ q: `${name} 최고가(신고가)는 얼마인가요?`, a });
  }

  // 4. 전세 시세와 전세가율
  if (s.latestJeonse) {
    const j = s.latestJeonse;
    let a = `가장 최근 전세 계약은 ${j.dateLabel} 전용 ${Math.round(j.areaM2)}㎡ ${j.floor}층 보증금 ${fmtManwon(j.priceManwon)}입니다.`;
    if (ins.jeonseRatePct !== null) {
      a += ` 같은 평형의 최근 매매가와 견준 전세가율은 약 ${Math.round(ins.jeonseRatePct)}%입니다.`;
      if (ins.jeonseRatePct >= 70) a += " 전세가율이 높은 편이라 전세 계약 때는 보증보험 가입 여부를 꼭 확인하세요.";
    }
    out.push({ q: `${name} 전세 시세와 전세가율은?`, a });
  }

  // 5. 준공연도
  if (data.buildYear) {
    out.push({
      q: `${name}${nameJosa} 언제 지어졌나요?`,
      a:
        `국토교통부 실거래 자료 기준으로 ${data.buildYear}년에 준공된 아파트로, 올해 ${data.age}년차입니다. ` +
        `위치는 ${data.group}광역시 ${data.regionName}${data.dong ? ` ${data.dong}` : ""}입니다.`,
    });
  }

  // 6. 거래량
  const v = ins.volume;
  if (v.m12 > 0) {
    let a = `최근 12개월 동안 매매는 ${v.m12}건, 최근 3개월은 ${v.m3}건 신고됐습니다.`;
    if (v.m3 > v.prev3) a += ` 그 전 3개월(${v.prev3}건)보다 늘었습니다.`;
    else if (v.m3 < v.prev3) a += ` 그 전 3개월(${v.prev3}건)보다 줄었습니다.`;
    a += ` 3년 전체로는 매매 ${data.counts.sale}건, 전세 ${data.counts.jeonse}건, 월세 ${data.counts.monthly}건이 신고됐습니다.`;
    out.push({ q: `${name} 거래는 활발한 편인가요?`, a });
  }

  return out;
}
