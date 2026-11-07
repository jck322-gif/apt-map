// 청약 달력에 손으로 직접 추가하는 항목.
//
// lib/subscription.ts의 나머지 데이터는 전부 한국부동산원 청약홈 공식 API에서 가져오는데,
// 그 API는 "입주자모집공고"가 실제로 올라온 뒤에야 항목이 생깁니다. 하지만 건설사·조합이
// 보도자료·SNS로 몇 주 먼저 예정 일정을 안내하는 경우가 있어서, 그런 소식은 여기에
// 수동으로 적어두면 달력에 "예정"으로 먼저 보여줄 수 있습니다.
//
// 주의:
//  - 공식 발표 전 정보라 일정이 바뀔 수 있습니다. isManual: true로 표시해서 화면에도
//    점선 배지 + "예정(미확정)" 문구로 구분되게 해두었습니다.
//  - 날짜는 아직 없고 "11월 분양"처럼 달만 나온 단지는 날짜 칸을 모두 null로 두고
//    expectedMonth: "YYYY-MM"만 적으면, 그 달 달력 아래 "이달 분양 예정" 목록에 나옵니다.
//  - 나중에 청약홈에 공식 모집공고가 올라오면(=/api/subscription-sync가 매일 자동으로 받아옴)
//    app/api/subscription/route.ts에서 단지명이 겹치는 수동 항목은 자동으로 빼고 공식 정보만
//    보여줍니다. 그러니 공식 공고가 뜬 뒤에도 이 파일을 서둘러 지울 필요는 없습니다.
//  - 지난 일정이 된 항목은 가끔 이 배열에서 정리해주세요(계속 쌓이면 관리가 어려워집니다).
//    2026-11-07 정리: 연제 갤러리 자이, 트리븐센텀 1·2단지 — 청약홈 공식 공고로 들어와서 뺐습니다.

import type { SubscriptionEntry } from "./subscription";

export const MANUAL_SUBSCRIPTIONS: SubscriptionEntry[] = [
  {
    pblancNo: "manual-hoban-summit-choryang",
    houseName: "호반써밋 초량",
    regionName: "부산광역시",
    address: "부산광역시 동구 초량동 (초량3구역 재개발)",
    houseType: "민영주택",
    totalHouseholds: 432, // 총 432세대, 일반공급 약 252~253세대 — 전용 59·70·84㎡
    noticeDate: null,
    specialSupplyStart: null,
    specialSupplyEnd: null,
    rank1Start: null,
    rank1End: null,
    rank2Start: null,
    rank2End: null,
    winnerAnnounceDate: null,
    homepageUrl: null,
    isManual: true,
    expectedMonth: "2026-11",
    // 2026-11-07 확인: 한국금융신문·아시아경제·서울신문(10.16~19) — 호반건설, 11월 분양, 지하 3층~지상 24층 5개 동.
    // 견본주택은 연제구 거제동에 마련 예정(개관일 미발표). 비규제지역, 1순위는 부산·울산·경남 거주자.
    sourceNote: "호반건설 · 59·70·84㎡ · 일반공급 약 253세대 · 견본주택 연제구 거제동(개관일 미정) · 11월 분양 예정",
  },
  {
    pblancNo: "manual-hillstate-ulsan-station-riverforet",
    houseName: "힐스테이트 울산역리버포레",
    regionName: "울산광역시",
    address: "울산광역시 울주군 삼남읍 신화리 (KTX울산역세권 M5블록)",
    houseType: "민영주택",
    totalHouseholds: 436, // 아파트 436세대(전용 84㎡ 단일) + 주거형 오피스텔 298실 = 734가구
    noticeDate: null,
    specialSupplyStart: null,
    specialSupplyEnd: null,
    rank1Start: null,
    rank1End: null,
    rank2Start: null,
    rank2End: null,
    winnerAnnounceDate: null,
    homepageUrl: null,
    isManual: true,
    expectedMonth: "2026-11",
    // 2026-11-07 확인: 파이낸셜뉴스·지피코리아(11.3) — 현대엔지니어링, 지하 3층~지상 40층 5개 동, 11월 분양.
    // 견본주택 울산 중구 우정동, 11월 중 개관 예정(날짜 미발표).
    sourceNote: "현대엔지니어링 · 아파트 84㎡ 436세대 + 오피스텔 298실 · 견본주택 중구 우정동(11월 중) · 11월 분양 예정",
  },
];
