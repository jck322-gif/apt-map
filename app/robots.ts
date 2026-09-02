import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/**
 * 검색엔진 안내 파일 (/robots.txt).
 * 어떤 페이지를 긁어가도 되는지, 사이트맵이 어디 있는지 알려줍니다.
 *
 * /api/ 는 사람이 보는 페이지가 아니라 자료를 주고받는 통로라서 색인에서 제외합니다.
 * (특히 /api/sync 는 비밀 열쇠가 붙는 주소라 검색에 노출되면 안 됩니다.)
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
