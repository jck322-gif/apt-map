import type { MetadataRoute } from "next";
import { GUIDES } from "@/lib/guides";
import { INSIGHT_PAGES } from "@/lib/insightPages";
import { REPORTS } from "@/lib/reports";
import { CALC_PAGES } from "@/lib/calcPages";
import { SITE_URL } from "@/lib/site";
import { REGIONS } from "@/lib/regions";
import { listAllComplexesForSitemap, listDongs, complexHref, dongHref } from "@/lib/complex";
import { THIN_COMPLEX_MIN, THIN_DONG_MIN_COMPLEXES } from "@/lib/thin";
import { getLatestBriefDate } from "@/lib/daily";

/**
 * 손으로 쓰는 고정 페이지들의 "마지막으로 실제 고친 날".
 * 사이트맵의 lastmod는 검색엔진이 "다시 읽어갈지"를 정하는 값이라, 내용이 안 바뀌었는데 매일 오늘 날짜를
 * 넣으면 오히려 신뢰를 잃습니다. 아래 페이지를 고칠 때 여기 날짜도 같이 바꿔 주세요.
 */
const STATIC_UPDATED: Record<string, string> = {
  about: "2026-10-06",
  contact: "2026-10-13",
  privacy: "2026-08-28",
  terms: "2026-10-13",
  calc: "2026-10-13",
  compare: "2026-10-13",
  interior: "2026-10-13",
  redevelopment: "2026-10-08",
};
const kst = (ymd: string) => new Date(`${ymd}T00:00:00+09:00`);

// 단지 수가 많아 매 요청마다 DB를 훑지 않도록 하루에 한 번만 다시 만듭니다.
export const revalidate = 86400;

/**
 * 사이트맵 — 검색엔진에게 "이 사이트에 어떤 페이지들이 있는지" 알려주는 목록입니다.
 * /sitemap.xml 주소로 자동 생성되며, Google Search Console에 이 주소를 제출합니다.
 *
 * 새 글을 lib/guides.ts에 추가하면 여기에도 자동으로 포함됩니다.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  // 실거래 화면들은 "새 신고분이 마지막으로 들어온 날"을 lastmod로 씁니다 (실제로 내용이 바뀐 날).
  let dataDay = now;
  try {
    dataDay = kst(await getLatestBriefDate());
  } catch {
    dataDay = now;
  }
  // 상식 목록은 가장 최근에 고친 상식 글 날짜
  const guidesUpdated = GUIDES.reduce((m, g) => (g.updated > m ? g.updated : m), "2026-09-01");

  // 자주 바뀌는 실거래 화면들
  const pages: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: dataDay, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/jeonse`, lastModified: dataDay, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/monthly`, lastModified: dataDay, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/daily`, lastModified: dataDay, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/map`, lastModified: dataDay, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE_URL}/apt`, lastModified: dataDay, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_URL}/rank`, lastModified: dataDay, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/insight`, lastModified: dataDay, changeFrequency: "daily", priority: 0.8 },
    ...INSIGHT_PAGES.map((p) => ({
      url: `${SITE_URL}/insight/${p.slug}`,
      lastModified: dataDay,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
    { url: `${SITE_URL}/report`, lastModified: REPORTS[0] ? kst(REPORTS[0].published) : now, changeFrequency: "weekly", priority: 0.8 },
    ...REPORTS.map((r) => ({
      url: `${SITE_URL}/report/${r.slug}`,
      lastModified: kst(r.published),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    { url: `${SITE_URL}/calc`, lastModified: kst(STATIC_UPDATED.calc), changeFrequency: "monthly", priority: 0.8 },
    ...CALC_PAGES.map((p) => ({
      url: `${SITE_URL}/calc/${p.slug}`,
      lastModified: kst(STATIC_UPDATED.calc),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    { url: `${SITE_URL}/compare`, lastModified: kst(STATIC_UPDATED.compare), changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/guide`, lastModified: kst(guidesUpdated), changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/interior`, lastModified: kst(STATIC_UPDATED.interior), changeFrequency: "weekly", priority: 0.6 },
    { url: `${SITE_URL}/redevelopment`, lastModified: kst(STATIC_UPDATED.redevelopment), changeFrequency: "weekly", priority: 0.6 },
    { url: `${SITE_URL}/subscription`, lastModified: dataDay, changeFrequency: "daily", priority: 0.7 },
    { url: `${SITE_URL}/about`, lastModified: kst(STATIC_UPDATED.about), changeFrequency: "monthly", priority: 0.4 },
    { url: `${SITE_URL}/contact`, lastModified: kst(STATIC_UPDATED.contact), changeFrequency: "monthly", priority: 0.4 },
    { url: `${SITE_URL}/privacy`, lastModified: kst(STATIC_UPDATED.privacy), changeFrequency: "monthly", priority: 0.3 },
    { url: `${SITE_URL}/terms`, lastModified: kst(STATIC_UPDATED.terms), changeFrequency: "monthly", priority: 0.3 },
  ];

  // 정보글은 각 글의 갱신일을 그대로 씁니다
  const guides: MetadataRoute.Sitemap = GUIDES.map((g) => ({
    url: `${SITE_URL}/guide/${g.slug}`,
    lastModified: kst(g.updated),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  // 지역별 단지 목록 페이지 (21개)
  const regionPages: MetadataRoute.Sitemap = REGIONS.map((r) => ({
    url: `${SITE_URL}/apt/${r.code}`,
    lastModified: dataDay,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  // 단지별 페이지 — 거래가 5건 이상인 단지만 올립니다 (단지 페이지의 noindex 기준과 같습니다).
  // (거래 1~2건짜리 단지까지 넣으면 내용이 얇은 페이지를 무더기로 제출하는 셈이라 오히려 손해입니다.
  //  목록 페이지에는 전부 링크가 있으니 검색엔진이 알아서 찾아갑니다.)
  let complexPages: MetadataRoute.Sitemap = [];
  try {
    const rows = await listAllComplexesForSitemap(THIN_COMPLEX_MIN);
    complexPages = rows.map((c) => ({
      url: `${SITE_URL}${complexHref(c.regionCode, c.complex)}`,
      lastModified: c.lastDealDate ? new Date(c.lastDealDate) : now,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }));
  } catch {
    // DB를 못 읽어도 사이트맵 자체는 나가야 합니다 (나머지 주소라도 알려주는 편이 낫습니다).
    complexPages = [];
  }

  // 동별 페이지 — 구·군마다 동 목록을 읽어 옵니다.
  let dongPages: MetadataRoute.Sitemap = [];
  try {
    const lists = await Promise.all(REGIONS.map((r) => listDongs(r.code).then((ds) => ({ r, ds }))));
    dongPages = lists.flatMap(({ r, ds }) =>
      ds
        // 단지가 3곳 미만인 동은 목록이 얇아 올리지 않습니다 (동 페이지는 그대로 열립니다).
        .filter((d) => d.dong !== "기타" && d.complexCount >= THIN_DONG_MIN_COMPLEXES)
        .map((d) => ({
          url: `${SITE_URL}${dongHref(r.code, d.dong)}`,
          lastModified: dataDay,
          changeFrequency: "weekly" as const,
          priority: 0.65,
        }))
    );
  } catch {
    dongPages = [];
  }

  return [...pages, ...guides, ...regionPages, ...dongPages, ...complexPages];
}
