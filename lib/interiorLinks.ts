// 단지별 "내부 구조 · 인테리어" 참고 링크 모음.
//
// 사진이나 글을 그대로 퍼오지 않고, 원문(유튜브·카페·블로그·인테리어 업체 시공사례)으로
// 바로 연결만 해줍니다. 저작권 문제 없이, 방문자가 궁금해하는 "이 단지 내부는 어떻게
// 생겼나"를 실제로 다룬 자료를 찾아 링크만 모아두는 방식입니다.
//
// 단지를 하나씩 추가하려면 아래 INTERIOR_LINKS에 항목을 넣으면 됩니다. 단지명은
// 실거래가 데이터에 찍히는 이름과 완전히 같지 않아도 괜찮습니다(공백 유무 정도는
// normalizeComplexName이 흡수합니다).

export type InteriorLink = {
  title: string;
  url: string;
  source: "유튜브" | "카페" | "블로그" | "시공사례";
};

/** 비교용 키를 만듭니다 — 공백만 제거합니다 (괄호·숫자는 단지를 구분하는 정보라 그대로 둡니다). */
function normalizeComplexName(name: string): string {
  return name.replace(/\s+/g, "");
}

const RAW_INTERIOR_LINKS: Record<string, InteriorLink[]> = {
  더샵센텀파크1차: [
    {
      title: "재송동 더샵센텀파크1차 인테리어 시공 리뷰",
      url: "https://contents.ohou.se/projects/137655",
      source: "시공사례",
    },
    {
      title: "더샵센텀파크1차 50평 가성비 전세집 인테리어",
      url: "https://hanssembusan.com/project/31",
      source: "시공사례",
    },
    {
      title: "더샵센텀파크1차아파트 34평 모던 인테리어",
      url: "https://mall.hanssem.com/homeIdeaMain/contents/homeIdeaDetail.do?seq=18091",
      source: "시공사례",
    },
  ],
  레이카운티: [
    {
      title: "연제구 레이카운티 34평 내추럴 인테리어",
      url: "https://mall.hanssem.com/homeIdeaMain/contents/homeIdeaDetail.do?seq=25113",
      source: "시공사례",
    },
  ],
  대연힐스테이트푸르지오: [
    {
      title: "대연동 힐스테이트 푸르지오 40평 인테리어",
      url: "https://contents.ohou.se/projects/68846",
      source: "시공사례",
    },
    {
      title: "남구 대연힐스테이트푸르지오 33평 모던 인테리어",
      url: "https://mall.hanssem.com/homeIdeaMain/contents/homeIdeaDetail.do?seq=3980",
      source: "시공사례",
    },
    {
      title: "대연힐스테이트푸르지오 46평형 인테리어",
      url: "https://thebeautyofwordsblog.com/portfolio/78",
      source: "시공사례",
    },
  ],
  래미안포레스티지: [
    {
      title: "온천장 래미안포레스티지 인테리어",
      url: "http://www.designamc.com/board/?db=project&mari_mode=view@view&no=355",
      source: "시공사례",
    },
  ],
  동래래미안아이파크: [
    {
      title: "온천동 동래래미안아이파크 인테리어 시공 리뷰",
      url: "https://contents.ohou.se/projects/196569",
      source: "시공사례",
    },
    {
      title: "동래구 동래 래미안 아이파크 26평 모던 인테리어",
      url: "https://mall.hanssem.com/homeIdeaMain/contents/homeIdeaDetail.do?seq=5990",
      source: "시공사례",
    },
  ],
  해운대두산위브더제니스: [
    {
      title: "해운대두산위브더제니스 69평 호텔 감성 인테리어",
      url: "https://contents.ohou.se/projects/177685",
      source: "시공사례",
    },
    {
      title: "해운대두산위브더제니스 45평 리조트 감성 인테리어",
      url: "https://contents.ohou.se/projects/37712",
      source: "시공사례",
    },
  ],
};

const INTERIOR_LINKS = new Map(
  Object.entries(RAW_INTERIOR_LINKS).map(([name, links]) => [normalizeComplexName(name), links])
);

export function getInteriorLinks(complex: string): InteriorLink[] {
  return INTERIOR_LINKS.get(normalizeComplexName(complex)) ?? [];
}

/** 큐레이션된 링크가 아직 없는 단지에서도 항상 보여주는 "직접 찾아보기" 검색 링크. */
export function interiorSearchLinks(complex: string): { label: string; url: string }[] {
  const q = encodeURIComponent(`${complex} 인테리어`);
  return [
    { label: "유튜브에서 검색", url: `https://www.youtube.com/results?search_query=${q}` },
    { label: "네이버에서 검색", url: `https://search.naver.com/search.naver?query=${q}` },
  ];
}
