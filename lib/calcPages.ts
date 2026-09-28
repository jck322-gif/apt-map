/** 계산기 목록 — 메뉴·사이트맵·계산기 첫 화면이 함께 씁니다. */
export const CALC_PAGES = [
  {
    slug: "acquisition-tax",
    title: "아파트 취득세 계산기",
    short: "취득세",
    desc: "매매가·면적·주택 수로 취득세, 지방교육세, 농어촌특별세와 생애최초 감면까지 계산합니다.",
  },
  {
    slug: "brokerage-fee",
    title: "부동산 중개수수료(중개보수) 계산기",
    short: "중개수수료",
    desc: "매매·전세·월세 거래금액별 법정 상한요율과 한도액, 부가세까지 계산합니다.",
  },
  {
    slug: "loan",
    title: "주택담보대출 이자·한도 계산기",
    short: "대출 이자·한도",
    desc: "상환 방법별 월 상환액과 총 이자, 부산·울산 기준 LTV·스트레스 DSR 한도를 계산합니다.",
  },
] as const;

export type CalcSlug = (typeof CALC_PAGES)[number]["slug"];
