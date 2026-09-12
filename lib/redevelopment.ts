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
    note:
      "총 3,312세대(일반분양 3,110·임대 202) 규모. 2020년 3월 조합설립, 같은 해 10월 시공사로 포스코건설 선정, " +
      "2025년 9월 5일 남구청으로부터 사업시행계획인가를 받았습니다. 다음 단계(관리처분인가)는 확인되는 대로 갱신하겠습니다.",
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
