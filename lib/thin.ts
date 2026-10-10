/**
 * "얇은 페이지" 기준 — 거래가 너무 적어 표 몇 줄밖에 없는 페이지는 검색엔진에 올리지 않습니다(noindex).
 *
 * 페이지는 그대로 열리고 사이트 안 링크도 살아 있습니다. 다만 구글에게 "이 페이지는 색인하지 말고
 * 링크만 따라가라"고 알려서, 내용 없는 페이지 수천 개가 사이트 전체 평가를 깎지 않게 합니다.
 * 사이트맵도 같은 기준을 씁니다. 거래가 쌓여 기준을 넘으면 자동으로 다시 색인 대상이 됩니다.
 */

/** 단지·평형 페이지: 최근 3년 매매+전세+월세가 이보다 적으면 noindex */
export const THIN_COMPLEX_MIN = 5;

/** 동 페이지: 단지가 이보다 적고 … */
export const THIN_DONG_MIN_COMPLEXES = 3;
/** … 최근 1년 매매도 이보다 적으면 noindex */
export const THIN_DONG_MIN_SALES = 10;

/** 날짜별 브리핑(/daily/날짜)은 매매 신고가 이보다 적으면(주말·공휴일 등) 내용이 얇아 검색엔진에 올리지 않습니다. */
export const THIN_DAILY_MIN_SALES = 10;

export const NOINDEX = { index: false, follow: true } as const;
