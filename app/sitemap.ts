import type { MetadataRoute } from "next";
import { GUIDES } from "@/lib/guides";
import { SITE_URL } from "@/lib/site";
import { REGIONS } from "@/lib/regions";
import { listAllComplexesForSitemap, complexHref } from "@/lib/complex";

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

  // 자주 바뀌는 실거래 화면들
  const pages: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/jeonse`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/monthly`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/daily`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/map`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE_URL}/apt`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_URL}/compare`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/guide`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${SITE_URL}/contact`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${SITE_URL}/privacy`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
  ];

  // 정보글은 각 글의 갱신일을 그대로 씁니다
  const guides: MetadataRoute.Sitemap = GUIDES.map((g) => ({
    url: `${SITE_URL}/guide/${g.slug}`,
    lastModified: new Date(g.updated),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  // 지역별 단지 목록 페이지 (21개)
  const regionPages: MetadataRoute.Sitemap = REGIONS.map((r) => ({
    url: `${SITE_URL}/apt/${r.code}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  // 단지별 페이지 — 거래가 3건 이상인 단지만 올립니다.
  // (거래 1~2건짜리 단지까지 넣으면 내용이 얇은 페이지를 무더기로 제출하는 셈이라 오히려 손해입니다.
  //  목록 페이지에는 전부 링크가 있으니 검색엔진이 알아서 찾아갑니다.)
  let complexPages: MetadataRoute.Sitemap = [];
  try {
    const rows = await listAllComplexesForSitemap(3);
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

  return [...pages, ...guides, ...regionPages, ...complexPages];
}
