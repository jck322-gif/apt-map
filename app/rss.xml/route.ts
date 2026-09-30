import { GUIDES } from "@/lib/guides";
import { REPORTS } from "@/lib/reports";
import { SITE_NAME, SITE_URL } from "@/lib/site";

/**
 * RSS 피드 (/rss.xml) — 새 글이 생기면 네이버·구글에 빨리 알리는 통로입니다.
 *
 * 네이버 서치어드바이저 → 요청 → RSS 제출에 https://buulapt.com/rss.xml 을 한 번 넣어 두면,
 * 이후 lib/reports.ts(주간 리포트)나 lib/guides.ts(상식 글)에 글을 추가할 때마다 자동으로 여기에 올라갑니다.
 * 매일 바뀌는 실거래 표는 넣지 않고, 사람이 쓴 글만 넣습니다.
 */
export const revalidate = 3600;

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** "2026-09-28" → RSS 날짜 형식 (한국 시간 오전 9시로 둡니다) */
function rssDate(iso: string): string {
  return new Date(`${iso}T09:00:00+09:00`).toUTCString();
}

export function GET() {
  const items = [
    ...REPORTS.map((r) => ({
      title: r.title,
      link: `${SITE_URL}/report/${r.slug}`,
      description: r.summary,
      date: r.published,
      category: "주간 리포트",
    })),
    ...GUIDES.map((g) => ({
      title: g.title,
      link: `${SITE_URL}/guide/${g.slug}`,
      description: g.summary,
      date: g.updated,
      category: `부동산 상식 · ${g.category}`,
    })),
  ].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  const lastBuild = items[0]?.date ?? new Date().toISOString().slice(0, 10);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
<title>${esc(`${SITE_NAME} — 부산·울산 아파트 주간 리포트와 부동산 상식`)}</title>
<link>${SITE_URL}</link>
<description>${esc("부산·울산 아파트 실거래를 정리한 주간 리포트와, 실거래 자료를 읽는 데 필요한 부동산 상식 글입니다.")}</description>
<language>ko</language>
<lastBuildDate>${rssDate(lastBuild)}</lastBuildDate>
<atom:link href="${SITE_URL}/rss.xml" rel="self" type="application/rss+xml"/>
${items
  .map(
    (i) => `<item>
<title>${esc(i.title)}</title>
<link>${i.link}</link>
<guid isPermaLink="true">${i.link}</guid>
<description>${esc(i.description)}</description>
<category>${esc(i.category)}</category>
<pubDate>${rssDate(i.date)}</pubDate>
</item>`
  )
  .join("\n")}
</channel>
</rss>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
