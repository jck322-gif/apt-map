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
    lastChecked: "2026.09",
    officialUrl: "https://dynamice.busan.go.kr/home/BARA_0000000000184/main.do",
    totalHouseholds: 3312,
    builder: "포스코이앤씨 (옛 포스코건설)",
    note: "일반분양 3,110세대 · 임대 202세대. 2026년 9월 기준 관리처분인가는 아직 확인되지 않습니다.",
    history: [
      { date: "2020.03", label: "조합설립인가" },
      { date: "2020.10", label: "시공사 선정 (포스코건설)" },
      { date: "2025.09", label: "사업시행계획인가 (남구청, 9월 5일)" },
      { date: "2026.04", label: "조합설립 변경인가 (4월 1일)" },
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
    lastChecked: "2026.09",
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
    lastChecked: "2026.09",
    officialUrl: "https://dynamice.busan.go.kr/home/BARA_0000000000300/main.do",
    totalHouseholds: 1303,
    note:
      "센텀시티역·벡스코역 인근, 지하 7층~지상 34층 20개 동 계획. 기존 시공사(DL이앤씨)와 결별 후 " +
      "2026년 3월 대우건설이 수의계약 의향서를 내 사실상 내정됐지만, 시공사 선정 총회 결과는 아직 확인되지 않습니다.",
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
    stage: "추진위원회",
    lastChecked: "2026.09",
    officialUrl: "https://dynamice.busan.go.kr/home/BARA_0000000030168/main.do",
    totalHouseholds: 1610,
    note:
      "현재 1,164세대 → 최고 43층 약 1,610세대 신축 계획(시공사 미정). 조합설립 동의율은 2025년 9월 56.5%였고, " +
      "신탁방식 병행 추진을 두고 의견이 갈려 있습니다. 조합설립인가는 아직 확인되지 않습니다.",
    history: [
      { date: "2025.03", label: "추진위원회 승인 신청" },
      { date: "2025.04", label: "추진위원회 승인 (4월 29일)" },
      { date: "2025.09", label: "조합설립 동의율 56.5%" },
    ],
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
    lastChecked: "2026.09",
    officialUrl: "https://dynamice.busan.go.kr/",
    totalHouseholds: 995,
    note:
      "현재 750세대 → 최고 38층 약 995세대 계획. 2026년 6월 조합 창립총회를 열었고, 조합설립과 정비계획 변경을 " +
      "함께 신청할 수 있게 됐습니다. 조합설립인가는 아직 확인되지 않습니다.",
    history: [{ date: "2026.06", label: "조합 창립총회 (6월 13일, 벡스코)" }],
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
    lastChecked: "2026.09",
    officialUrl: "https://dynamice.busan.go.kr/home/BARA_0000000000028/main.do",
    totalHouseholds: 937,
    builder: "DL이앤씨",
    note: "현대그린맨션 재건축. 이후 단계는 공식 페이지에서 확인해주세요.",
    history: [
      { date: "2020.02", label: "조합설립인가 (2월 24일)" },
      { date: "2022.12", label: "시공사 선정 (DL이앤씨, 약 2,978억 원)" },
    ],
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
    lastChecked: "2026.09",
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
      "관리처분인가는 2026년 9월 기준 아직 확인되지 않습니다.",
    history: [
      { date: "2025.04", label: "사업 재개 (건축심의 조건부 가결)" },
      { date: "2025.04", label: "사업시행계획인가 (4월 16일)" },
      { date: "2025.06", label: "조합설립 변경인가 (6월 11일)" },
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
    lastChecked: "2026.09",
    officialUrl: "https://dynamice.busan.go.kr/home/BARA_0000000030141/main.do",
    totalHouseholds: 966,
    builder: "HDC현대산업개발",
    note: "지상 37층, 총공사비 약 4,196억 원 규모.",
    history: [
      { date: "2022.04", label: "사전타당성 심의 통과" },
      { date: "2023.12", label: "정비구역 지정·고시" },
      { date: "2024.11", label: "조합설립인가 (11월 14일)" },
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
    lastChecked: "2026.09",
    officialUrl: "https://dynamice.busan.go.kr/home/BARA_0000000030162/main.do",
    totalHouseholds: 2090,
    builder: "GS건설",
    note: "광안동 138-6번지 일원, 지하 3층~지상 34층 계획. 창립총회 8개월 만에 시공사 선정까지 마쳐 속도가 빠른 편.",
    history: [
      { date: "2025.08", label: "창립총회" },
      { date: "2025.11", label: "조합설립인가 (11월 3일)" },
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
    lastChecked: "2026.09",
    officialUrl: "https://dynamice.busan.go.kr/",
    totalHouseholds: 1859,
    note:
      "16개 동, 지하 3층~지상 39층 1,859세대 계획. 2025년 11월 정비계획 주민공람을 했고 2026년 구역지정이 " +
      "예상됐지만, 지정 고시는 아직 확인되지 않아 단계는 비워 뒀습니다.",
    history: [{ date: "2025.11", label: "정비계획(구역 지정안) 주민공람" }],
    lat: 35.16,
    lng: 129.116,
  },
  {
    name: "남천2-3구역 (삼익비치)",
    type: "재건축",
    regionCode: "26500",
    regionName: "수영구",
    group: "부산",
    stage: "사업시행인가",
    lastChecked: "2026.09",
    officialUrl: "https://dynamice.busan.go.kr/home/BARA_0000000000084/main.do",
    totalHouseholds: 3060,
    builder: "GS건설",
    note:
      "광안리 바닷가 대표 재건축 단지. 최고 59층 8개 동, 1:1 재건축으로 계획을 바꿔 2026년 6월 사업시행 " +
      "변경인가를 받았고, 2026년 말 관리처분인가를 목표로 하고 있습니다.",
    history: [
      { date: "2022.09", label: "사업시행계획인가 (9월 28일)" },
      { date: "2025.07", label: "조합설립 변경인가 (7월 24일)" },
      { date: "2026.06", label: "사업시행 변경인가 (59층 계획)" },
    ],
    lat: 35.1427,
    lng: 129.1144,
  },

  // ── 부산진구 ──────────────────────────────────────────────
  {
    name: "촉진2-1구역 (시민공원 주변)",
    type: "재개발",
    regionCode: "26230",
    regionName: "부산진구",
    group: "부산",
    stage: "관리처분인가",
    lastChecked: "2026.09",
    officialUrl: "https://dynamice.busan.go.kr/home/BARA_0000000000149/main.do",
    totalHouseholds: 1902,
    builder: "포스코이앤씨",
    note: "부산시민공원 주변 재정비촉진구역. 최고 69층, 아파트 1,902세대 + 오피스텔 99실 계획, 2027년 착공 목표.",
    history: [
      { date: "2025.08", label: "관리처분계획인가 (8월 14일)" },
      { date: "2026.01", label: "사업시행 변경인가 (1월 28일)" },
      { date: "2026.08", label: "조합설립 변경인가 (8월 27일)" },
    ],
    lat: 35.164,
    lng: 129.062,
  },

  // ── 사하구 ────────────────────────────────────────────────
  {
    name: "괴정5구역",
    type: "재개발",
    regionCode: "26380",
    regionName: "사하구",
    group: "부산",
    stage: "관리처분인가",
    lastChecked: "2026.09",
    officialUrl: "https://dynamice.busan.go.kr/home/BARA_0000000030004/main.do",
    totalHouseholds: 3102,
    builder: "현대건설·대우건설 컨소시엄",
    note: "최고 39층, 아파트 3,102세대 + 오피스텔 144실 계획. 사하구 최대 규모 재개발로 착공은 아직입니다.",
    history: [
      { date: "2024.09", label: "시공사 선정 (현대건설·대우건설)" },
      { date: "2025.08", label: "관리처분계획인가 (8월 20일)" },
    ],
    lat: 35.101,
    lng: 128.992,
  },

  // ── 울산 ──────────────────────────────────────────────────
  // 울산 구역은 지도에 넣으면 부산 지도가 너무 멀리 줌아웃되어서, 좌표 없이 목록에만 보여줍니다.
  {
    name: "중구 B-04구역",
    type: "재개발",
    regionCode: "31110",
    regionName: "중구",
    group: "울산",
    stage: "관리처분인가",
    lastChecked: "2026.09",
    officialUrl: "https://www.junggu.ulsan.kr/",
    totalHouseholds: 4080,
    builder: "삼성물산·현대건설 컨소시엄",
    note:
      "울산 중구 교동 일원, 울산 최대 규모 재개발(약 4,080세대, 최고 29층). 2025년 이주를 마쳤고 2026년 착공, " +
      "2031년 준공이 목표입니다. 착공 여부는 확인되는 대로 갱신하겠습니다.",
    history: [
      { date: "2024.12", label: "관리처분계획인가" },
      { date: "2025.03", label: "이주 시작 (7월까지)" },
    ],
  },
  {
    name: "남구 B-04구역",
    type: "재개발",
    regionCode: "31140",
    regionName: "남구",
    group: "울산",
    lastChecked: "2026.09",
    officialUrl: "https://www.ulsannamgu.go.kr/apt/houRedevelopment/businessStatus.jsp",
    totalHouseholds: 1441,
    builder: "삼성물산",
    note:
      "울산 남구 신정동 일원, 11개 동 1,441세대 계획(브랜드 '래미안 엘리미엄 울산'). 2025년 6월 시공사를 뽑았고, " +
      "현재 인가 단계는 확인되지 않아 비워 뒀습니다.",
    history: [{ date: "2025.06", label: "시공사 선정 (삼성물산, 6월 28일)" }],
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
