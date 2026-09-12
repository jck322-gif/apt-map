// 재개발·재건축 구역 현황 — 국토부 실거래가처럼 자동으로 가져오는 자료가 아니라,
// 부산시 정비사업 통합홈페이지(dynamice.busan.go.kr)·뉴스를 직접 확인해서 손으로 넣는
// 자료입니다. 확실히 확인 안 된 "현재 단계"는 억지로 채우지 않고, 공식 페이지 링크만
// 둡니다 (틀린 정보를 보여주는 것보다 "직접 확인하세요" 링크가 낫습니다).
//
// ── 사장님이 직접 새 구역을 추가하시는 법 ──────────────────────────────
// 1. GitHub에서 이 파일(lib/redevelopment.ts)을 엽니다.
// 2. 아래 ENTRIES 배열 안에서, 이미 있는 항목 하나를 통째로 복사합니다
//    (여는 중괄호 { 부터 닫는 중괄호 }, 까지 — 콤마(,)까지 포함해서).
// 3. 붙여넣고, 값만 바꿉니다:
//    - name: 구역 이름 (예: "우동1구역")
//    - type: "재개발" 또는 "재건축"
//    - regionCode / regionName: 아래 REGION_CODES 표에서 그 구·군 코드를 찾아 넣습니다
//    - officialUrl: 부산시 정비사업 통합홈페이지에서 그 구역을 검색해 나온 주소
//      (모르면 그냥 "https://dynamice.busan.go.kr/" 로 둬도 됩니다)
//    - stage: 확실하면 아래 STAGE_ORDER 중 하나를 그대로 적고, 확실하지 않으면
//      이 줄 자체를 지우거나 `stage: undefined,` 로 둡니다
//    - lastChecked: 확인한 시점 (예: "2026.09")
// 4. 저장(커밋)하면 끝입니다. 화면 쪽 코드는 손댈 필요 없습니다.
//
// 구·군 코드표 (lib/regions.ts와 동일):
//   부산 — 중구 26110·서구 26140·동구 26170·영도구 26200·부산진구 26230·동래구 26260·
//          남구 26290·북구 26320·해운대구 26350·사하구 26380·금정구 26410·강서구 26440·
//          연제구 26470·수영구 26500·사상구 26530·기장군 26710
//   울산 — 중구 31110·남구 31140·동구 31170·북구 31200·울주군 31710

export type RedevelopmentStage =
  | "기본계획"
  | "구역지정"
  | "추진위원회"
  | "조합설립"
  | "사업시행인가"
  | "관리처분인가"
  | "착공"
  | "준공";

/** 화면에 보여줄 단계 순서 + 짧은 설명. 부산시 정비사업 통합홈페이지의 분류를 따랐습니다. */
export const STAGE_ORDER: { stage: RedevelopmentStage; desc: string }[] = [
  { stage: "기본계획", desc: "도시 전체 정비 방향을 정하는 가장 이른 단계" },
  { stage: "구역지정", desc: "정비구역으로 지정 · 정비계획 수립" },
  { stage: "추진위원회", desc: "조합 설립을 준비하는 주민 대표 조직 구성" },
  { stage: "조합설립", desc: "정식 조합 설립 인가" },
  { stage: "사업시행인가", desc: "구체적인 사업 계획(설계 등) 인가" },
  { stage: "관리처분인가", desc: "조합원별 분담금 · 이주 계획 확정" },
  { stage: "착공", desc: "실제 공사 시작" },
  { stage: "준공", desc: "공사 완료 · 입주" },
];

export type RedevelopmentEntry = {
  name: string;
  type: "재개발" | "재건축";
  regionCode: string;
  regionName: string;
  group: "부산" | "울산";
  /** 확실히 확인된 경우에만 적습니다. 불확실하면 넣지 않습니다. */
  stage?: RedevelopmentStage;
  /** stage를 언제 확인했는지 (예: "2026.09") */
  lastChecked?: string;
  officialUrl: string;
  note?: string;
  /** 총 세대수 (확인되면) */
  totalHouseholds?: number;
  /** 시공사 (확인되면) */
  builder?: string;
  /** 주요 이력 — 팝업에서만 보여주는, 목록 카드에는 없는 자세한 내용입니다. */
  history?: { date: string; label: string }[];
  /**
   * 지도에 점을 찍을 위치 (대략적인 구역 중심). 없으면 지도에는 안 나오고 목록에만 나옵니다.
   * 카카오맵에서 그 동네를 찾아 주소창 좌표를 복사해 넣으면 됩니다.
   */
  lat?: number;
  lng?: number;
};

const ENTRIES: RedevelopmentEntry[] = [
  {
    name: "대연8구역",
    type: "재개발",
    regionCode: "26290",
    regionName: "남구",
    group: "부산",
    stage: "사업시행인가",
    lastChecked: "2025.09",
    officialUrl: "https://dynamice.busan.go.kr/home/BARA_0000000000184/main.do",
    totalHouseholds: 3312,
    builder: "포스코건설",
    note: "일반분양 3,110세대 · 임대 202세대. 다음 단계(관리처분인가)는 확인되는 대로 갱신하겠습니다.",
    history: [
      { date: "2020.03", label: "조합설립인가" },
      { date: "2020.10", label: "시공사 선정 (포스코건설)" },
      { date: "2025.09", label: "사업시행계획인가 (남구청)" },
    ],
    lat: 35.1355,
    lng: 129.0905,
  },

  // ── 해운대구 ──────────────────────────────────────────────
  {
    name: "우동3구역 (디에이치 아센테르)",
    type: "재개발",
    regionCode: "26350",
    regionName: "해운대구",
    group: "부산",
    stage: "관리처분인가",
    lastChecked: "2026.05",
    officialUrl: "https://dynamice.busan.go.kr/home/BARA_0000000000013/main.do",
    totalHouseholds: 2395,
    builder: "현대건설",
    note: "부산 첫 '디에이치' 브랜드. 임대 121세대 포함, 지하 6층~지상 39층 20개 동 계획.",
    history: [
      { date: "2022.09", label: "시공사 선정 (현대건설)" },
      { date: "2025.02", label: "사업시행인가" },
      { date: "2026.05", label: "관리처분계획인가 (5월 14일)" },
    ],
    lat: 35.172,
    lng: 129.157,
  },
  {
    name: "우동1구역",
    type: "재건축",
    regionCode: "26350",
    regionName: "해운대구",
    group: "부산",
    stage: "사업시행인가",
    lastChecked: "2026.03",
    officialUrl: "https://dynamice.busan.go.kr/",
    totalHouseholds: 1303,
    note:
      "센텀시티역·벡스코역 인근, 지하 7층~지상 34층 20개 동 계획. 기존 시공사(DL이앤씨)와 결별 후 " +
      "2026년 대우건설과 수의계약 전환을 추진 중이라 시공사는 확정 전입니다.",
    history: [
      { date: "2021.03", label: "시공사 선정 (DL이앤씨)" },
      { date: "2024.05", label: "사업시행계획인가 (5월 15일)" },
      { date: "2026.03", label: "시공사 재선정 추진 (대우건설 수의계약 전환)" },
    ],
    lat: 35.1695,
    lng: 129.1315,
  },
  {
    name: "대우마리나 1·2차",
    type: "재건축",
    regionCode: "26350",
    regionName: "해운대구",
    group: "부산",
    stage: "구역지정",
    lastChecked: "2025.04",
    officialUrl: "https://dynamice.busan.go.kr/",
    note:
      "현재 1,164세대 → 약 1,500~1,600세대 신축 계획. 2025년 3월 추진위원회 승인을 신청했고, " +
      "조합설립을 추진 중입니다. 최신 단계는 공식 페이지에서 확인해주세요.",
    history: [{ date: "2025.03", label: "추진위원회 승인 신청" }],
    lat: 35.1555,
    lng: 129.14,
  },
  {
    name: "대우마리나 3차",
    type: "재건축",
    regionCode: "26350",
    regionName: "해운대구",
    group: "부산",
    stage: "추진위원회",
    lastChecked: "2026.06",
    officialUrl: "https://dynamice.busan.go.kr/",
    note: "경남마리나와 함께 재건축 추진 중. 추진위 동의서 징구·창립총회 준비 단계로 알려져 있습니다.",
    lat: 35.1548,
    lng: 129.1435,
  },
  {
    name: "반여3구역",
    type: "재건축",
    regionCode: "26350",
    regionName: "해운대구",
    group: "부산",
    stage: "조합설립",
    lastChecked: "2022.12",
    officialUrl: "https://dynamice.busan.go.kr/home/BARA_0000000000028/main.do",
    totalHouseholds: 937,
    builder: "DL이앤씨",
    note: "현대그린맨션 재건축. 이후 단계는 공식 페이지에서 확인해주세요.",
    history: [{ date: "2022.12", label: "시공사 선정 (DL이앤씨, 약 2,978억 원)" }],
    lat: 35.2035,
    lng: 129.1275,
  },
  {
    name: "반여3-1구역",
    type: "재건축",
    regionCode: "26350",
    regionName: "해운대구",
    group: "부산",
    stage: "관리처분인가",
    lastChecked: "2026.04",
    officialUrl: "https://dynamice.busan.go.kr/home/BARA_0000000030000/main.do",
    totalHouseholds: 811,
    builder: "현대건설",
    note: "조합원분 509세대 · 일반분양 302세대. 지하 3층~지상 35층 계획, 2027년 3월 철거 예정.",
    history: [{ date: "2026.04", label: "관리처분계획인가 (4월 22일)" }],
    lat: 35.205,
    lng: 129.129,
  },

  // ── 수영구 ────────────────────────────────────────────────
  {
    name: "광안A구역",
    type: "재개발",
    regionCode: "26500",
    regionName: "수영구",
    group: "부산",
    stage: "사업시행인가",
    lastChecked: "2026.09",
    officialUrl: "https://dynamice.busan.go.kr/home/BARA_0000000000076/main.do",
    totalHouseholds: 2550,
    note:
      "17년간 멈춰 있다가 2025년 다시 본궤도에 오른 구역. 세대수를 2,002 → 2,550세대로 늘리는 계획. " +
      "단계는 외부 자료 기준이니 공식 페이지에서 한 번 더 확인해주세요.",
    history: [
      { date: "2025.04", label: "사업 재개 (건축심의 조건부 가결)" },
    ],
    lat: 35.1585,
    lng: 129.112,
  },
  {
    name: "광안4구역",
    type: "재개발",
    regionCode: "26500",
    regionName: "수영구",
    group: "부산",
    stage: "조합설립",
    lastChecked: "2025.03",
    officialUrl: "https://dynamice.busan.go.kr/home/BARA_0000000030141/main.do",
    totalHouseholds: 966,
    builder: "HDC현대산업개발",
    note: "지상 37층, 총공사비 약 4,196억 원 규모.",
    history: [
      { date: "2022.04", label: "사전타당성 심의 통과" },
      { date: "2023.12", label: "정비구역 지정·고시" },
      { date: "2025.03", label: "시공사 선정 (HDC현대산업개발)" },
    ],
    lat: 35.156,
    lng: 129.115,
  },
  {
    name: "광안5구역",
    type: "재개발",
    regionCode: "26500",
    regionName: "수영구",
    group: "부산",
    stage: "조합설립",
    lastChecked: "2026.04",
    officialUrl: "https://dynamice.busan.go.kr/home/BARA_0000000030162/main.do",
    totalHouseholds: 2090,
    builder: "GS건설",
    note: "광안동 138-6번지 일원, 지하 3층~지상 34층 계획. 창립총회 8개월 만에 시공사 선정까지 마쳐 속도가 빠른 편.",
    history: [
      { date: "2025.08", label: "창립총회" },
      { date: "2026.04", label: "시공사 선정 (GS건설, 4월 26일)" },
    ],
    lat: 35.154,
    lng: 129.1105,
  },
  {
    name: "광안6구역",
    type: "재개발",
    regionCode: "26500",
    regionName: "수영구",
    group: "부산",
    stage: "구역지정",
    lastChecked: "2026.09",
    officialUrl: "https://dynamice.busan.go.kr/",
    totalHouseholds: 1859,
    note: "16개 동, 지하 3층~지상 39층 1,859세대 계획. 2025년 11월 주민공람을 거쳐 2026년 정비구역으로 지정.",
    history: [
      { date: "2025.11", label: "정비구역 지정안 주민공람" },
      { date: "2026", label: "정비구역 지정·고시" },
    ],
    lat: 35.16,
    lng: 129.116,
  },
];

export function getRedevelopmentEntries(): RedevelopmentEntry[] {
  return ENTRIES;
}

/** 팝업에서 "유튜브/네이버에서 찾아보기" 버튼에 쓸 검색 링크. */
export function redevelopmentSearchLinks(name: string, type: "재개발" | "재건축"): { label: string; url: string }[] {
  const q = encodeURIComponent(`${name} ${type}`);
  return [
    { label: "유튜브에서 검색", url: `https://www.youtube.com/results?search_query=${q}` },
    { label: "네이버에서 검색", url: `https://search.naver.com/search.naver?query=${q}` },
  ];
}
