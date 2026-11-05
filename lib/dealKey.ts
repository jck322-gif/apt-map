/**
 * 거래 한 건을 가리키는 짧은 열쇠 + 그 거래의 "비교 정보" 모양.
 * 서버(lib/dealContext.ts)와 브라우저(BriefTopRows) 양쪽에서 쓰므로 DB 코드를 넣지 않습니다.
 */

export type DealCtx = {
  /** 같은 단지·같은 평형의 바로 앞 매매 */
  prevPrice: number | null;
  prevDate: string | null; // "26.10.10"
  /** 최근 3년 같은 평형 최고가 (이 거래 포함) */
  highPrice: number | null;
  /** 이 거래가 3년 최고가의 몇 %인지 */
  recoveryPct: number | null;
  /** 같은 평형의 가장 최근 전세 */
  jeonsePrice: number | null;
  jeonseDate: string | null;
  /** 매매가 − 전세가, 그리고 매매가 대비 비율(%) */
  gapManwon: number | null;
  gapPct: number | null;
};

export function dealKey(d: { regionCode: string; complex: string; areaM2: number; dealDate: string; floor: number; priceManwon: number }): string {
  return `${d.regionCode}|${d.complex}|${Math.round(d.areaM2)}|${d.dealDate}|${d.floor}|${d.priceManwon}`;
}
