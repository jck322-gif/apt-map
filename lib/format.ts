/** 만원 단위 금액을 "5억 1,400만원" 같은 한국식 표기로 바꿉니다. */
export function fmtManwon(manwon: number): string {
  const sign = manwon < 0 ? "-" : "";
  const abs = Math.abs(Math.round(manwon));
  const eok = Math.floor(abs / 10000);
  const rest = abs % 10000;
  if (eok === 0) return `${sign}${rest.toLocaleString()}만원`;
  if (rest === 0) return `${sign}${eok}억원`;
  return `${sign}${eok}억 ${rest.toLocaleString()}만원`;
}

/**
 * 전용면적 → "84㎡ 타입" — 사람들이 흔히 부르는 타입 번호입니다.
 * (네이버 등에서 쓰는 "111.88C㎡" 같은 공급면적·A/B/C 타입 표기는
 *  국토교통부 실거래가 자료에 없어서 만들 수 없습니다. 자료에는 전용면적만 있습니다.)
 */
export function typeLabel(areaM2: number): string {
  return `${Math.round(areaM2)}㎡ 타입`;
}

/**
 * 전용면적 → "전용 84.4㎡ · 25.5평"
 * 흔히 말하는 "34평"은 공급면적 기준이라 전용 기준 평수와 다릅니다.
 * 혼동을 막기 위해 항상 "전용"임을 함께 적습니다.
 */
export function areaDetail(areaM2: number): string {
  const pyeong = areaM2 / 3.305785;
  return `전용 ${areaM2}㎡ · ${pyeong.toFixed(1)}평`;
}

/** 만원 단위 금액을 짧은 "5.1억" 형태로 줄여 표시합니다 (차트 축 라벨용). */
export function fmtManwonShort(manwon: number): string {
  const sign = manwon < 0 ? "-" : "";
  const abs = Math.abs(manwon);
  const eok = abs / 10000;
  if (eok >= 1) {
    return `${sign}${eok % 1 === 0 ? eok.toFixed(0) : eok.toFixed(1)}억`;
  }
  return `${sign}${Math.round(abs).toLocaleString()}만`;
}
