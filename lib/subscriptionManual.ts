// 청약 달력에 손으로 직접 추가하는 항목.
//
// lib/subscription.ts의 나머지 데이터는 전부 한국부동산원 청약홈 공식 API에서 가져오는데,
// 그 API는 "입주자모집공고"가 실제로 올라온 뒤에야 항목이 생깁니다. 하지만 건설사·조합이
// SNS(인스타그램 등)로 몇 주 먼저 예정 일정을 안내하는 경우가 있어서, 그런 소식은 여기에
// 수동으로 적어두면 달력에 "예정"으로 먼저 보여줄 수 있습니다.
//
// 주의:
//  - 공식 발표 전 정보라 일정이 바뀔 수 있습니다. isManual: true로 표시해서 화면에도
//    점선 배지 + "예정(미확정)" 문구로 구분되게 해두었습니다.
//  - 나중에 청약홈에 공식 모집공고가 올라오면(=/api/subscription-sync가 매일 자동으로 받아옴)
//    app/api/subscription/route.ts에서 단지명이 겹치는 수동 항목은 자동으로 빼고 공식 정보만
//    보여줍니다. 그러니 공식 공고가 뜬 뒤에도 이 파일을 서둘러 지울 필요는 없습니다.
//  - 지난 일정이 된 항목은 가끔 이 배열에서 정리해주세요(계속 쌓이면 관리가 어려워집니다).

import type { SubscriptionEntry } from "./subscription";

export const MANUAL_SUBSCRIPTIONS: SubscriptionEntry[] = [
  {
    pblancNo: "manual-yeonje-galleria-zai",
    houseName: "연제 갤러리 자이",
    regionName: "부산광역시",
    address: "부산광역시 연제구 연산동",
    houseType: "민영주택",
    totalHouseholds: 499, // 총 499세대(일반분양 459세대) — 84A 112 · 84B 114 · 84C 39 · 84D 234세대
    noticeDate: "2026-10-08",
    specialSupplyStart: "2026-10-19",
    specialSupplyEnd: null,
    rank1Start: "2026-10-20",
    rank1End: null,
    rank2Start: "2026-10-21",
    rank2End: null,
    winnerAnnounceDate: "2026-10-27",
    homepageUrl: null,
    isManual: true,
    // 2026-10-08 재확인: 10.8 입주자모집공고가 청약홈 목록에 게재됨(청약기간 10.19~10.21).
    // 월요신문·아주경제·파이낸셜뉴스(10.8): 특공 10.19 · 1순위 10.20 · 2순위 10.21 · 당첨자 발표 10.27 · 정당계약 11.9~11.
    // 2026-10-18 재확인: 헤럴드경제(10.16)·오피니언뉴스(10.18) 일정 변경 없음. 84㎡ 분양가 7억4,070만~9억1,560만원.
    // 견본주택 10.8 개관. 지하 4층~지상 43층 3개 동, 전 세대 전용 84㎡. 청약홈 자동 수집에 들어오면 이 항목은 자동으로 빠집니다.
    sourceNote: "GS건설 · 전 세대 84㎡ · 일반분양 459세대 · 84㎡ 분양가 7.4억~9.2억 · 당첨 발표 10.27 · 계약 11.9~11",
  },
  {
    pblancNo: "manual-trivn-centum-1",
    houseName: "트리븐센텀 1단지",
    regionName: "부산광역시",
    address: "부산광역시 해운대구 반여동",
    houseType: "민영주택",
    totalHouseholds: 852, // 1단지 852세대 (1·2단지 합계 1,644세대) — 전용 75·84A·84B·84C·114㎡
    noticeDate: "2026-10-16",
    specialSupplyStart: "2026-10-26",
    specialSupplyEnd: null,
    rank1Start: "2026-10-27",
    rank1End: null,
    rank2Start: "2026-10-28",
    rank2End: null,
    winnerAnnounceDate: "2026-11-04",
    homepageUrl: null,
    isManual: true,
    // 2026-10-18 확인: 스트레이트뉴스(10.16)·파이낸셜뉴스(10.14) — 명장공원 민간공원 특례사업, 두산에너빌리티 시공.
    // 10.16 모집공고, 특공 10.26 · 1순위 10.27 · 2순위 10.28 · 당첨 발표 1단지 11.4 / 2단지 11.5 · 계약 11.17~19.
    // 일반분양 세대수·단지별 분양가는 청약홈 공고문 확인 필요. 청약홈 자동 수집에 들어오면 이 항목은 자동으로 빠집니다.
    sourceNote: "두산에너빌리티 · 명장공원 특례사업 · 10.16 모집공고 · 당첨 발표 11.4 · 계약 11.17~19",
  },
  {
    pblancNo: "manual-trivn-centum-2",
    houseName: "트리븐센텀 2단지",
    regionName: "부산광역시",
    address: "부산광역시 해운대구 반여동",
    houseType: "민영주택",
    totalHouseholds: 792, // 2단지 792세대 (1·2단지 합계 1,644세대)
    noticeDate: "2026-10-16",
    specialSupplyStart: "2026-10-26",
    specialSupplyEnd: null,
    rank1Start: "2026-10-27",
    rank1End: null,
    rank2Start: "2026-10-28",
    rank2End: null,
    winnerAnnounceDate: "2026-11-05",
    homepageUrl: null,
    isManual: true,
    // 1단지와 같은 날 청약, 당첨 발표만 하루 늦은 11.5 (스트레이트뉴스 10.16).
    sourceNote: "두산에너빌리티 · 명장공원 특례사업 · 10.16 모집공고 · 당첨 발표 11.5 · 계약 11.17~19",
  },
];
