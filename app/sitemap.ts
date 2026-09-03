import type { MetadataRoute } from "next";
import { GUIDES } from "@/lib/guides";
import { SITE_URL } from "@/lib/site";

/**
 * 사이트맵 — 검색엔진에게 "이 사이트에 어떤 페이지들이 있는지" 알려주는 목록입니다.
 * /sitemap.xml 주소로 자동 생성되며, Google Search Console에 이 주소를 제출합니다.
 *
 * 새 글을 lib/guides.ts에 추가하면 여기에도 자동으로 포함됩니다.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  // 자주 바뀌는 실거래 화면들
  const pages: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/jeonse`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/monthly`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/daily`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/map`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
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

  return [...pages, ...guides];
}
