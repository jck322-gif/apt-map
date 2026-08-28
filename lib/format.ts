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
