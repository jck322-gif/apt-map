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
    rank2Start: null,
    rank2End: null,
    winnerAnnounceDate: null,
    homepageUrl: null,
    isManual: true,
    // GS건설이 연산동에 이 단지를 10월 분양한다는 건 언론(서울신문 9.15, 브릿지경제 9.8 등)으로도
    // 확인됐지만, 정확한 모집공고·특공·1순위 날짜는 아직 SNS 사전 안내에서만 나온 값입니다.
    sourceNote: "GS건설 연산동 분양(언론 보도로 확인) — 정확한 날짜는 SNS 사전 안내 기준, 공식 모집공고 전이라 바뀔 수 있어요",
  },
  {
    pblancNo: "manual-ssangyong-platinum-centum",
    houseName: "쌍용더플래티넘 센텀",
    regionName: "부산광역시",
    address: "부산광역시 수영구 망미동",
    houseType: "지역주택조합",
    totalHouseholds: 490, // 총 490세대(일반분양 53세대, 특공 22세대) — 63A·63B·74B·84 타입
    noticeDate: "2026-09-18",
    specialSupplyStart: "2026-09-28",
    specialSupplyEnd: null,
    rank1Start: "2026-09-29",
    rank1End: null,
    rank2Start: null,
    rank2End: null,
    winnerAnnounceDate: null,
    homepageUrl: null,
    isManual: true,
    // 9.18 모집공고가 예정대로 나왔다는 정황(블로그 보도, 2026-09-18)은 있지만 청약홈에서
    // 직접 확인은 안 돼서 100% 공식 확정은 아닙니다. 84㎡ 약 11.98~13.21억, 63A 9.12~9.38억,
    // 63B 9.11~9.16억, 74B 10.41~11.02억으로 알려져 있습니다.
    sourceNote: "망미동 지역주택조합, 29년 1월 입주 예정 — 9.18 모집공고 소식은 있으나 청약홈 미확인, 일정이 바뀔 수 있어요",
  },
];
