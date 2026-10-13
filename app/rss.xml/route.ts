import { GUIDES } from "@/lib/guides";
import { REPORTS } from "@/lib/reports";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { getDb } from "@/lib/db";
import { THIN_DAILY_MIN_SALES } from "@/lib/thin";
import { koDate } from "@/lib/daily";

/**
 * RSS 피드 (/rss.xml) — 새 글이 생기면 네이버·구글에 빨리 알리는 통로입니다.
 *
 * 네이버 서치어드바이저 → 요청 → RSS 제출에 https://buulapt.com/rss.xml 을 한 번 넣어 두면,
 * 이후 lib/reports.ts(주간 리포트)나 lib/guides.ts(상식 글)에 글을 추가할 때마다 자동으로 여기에 올라갑니다.
 * 데일리 브리핑(/daily/날짜)은 매매 신고가 10건 이상인 날(검색엔진에 올리는 날)만 최근 14일치를 넣습니다.
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

/** 최근 데일리 브리핑 중 매매 신고 10건 이상인 날 (noindex 기준과 같습니다) */
async function recentDailies(): Promise<{ d: string; cnt: number }[]> {
  try {
    const { data } = await getDb()
      .from("daily_counts")
      .select("d, cnt")
      .eq("deal_type", "sale")
      .gte("cnt", THIN_DAILY_MIN_SALES)
      .order("d", { ascending: false })
      .limit(14);
    return (data as { d: string; cnt: number }[] | null) ?? [];
  } catch {
    // DB를 못 읽어도 피드는 나가야 합니다 (리포트·상식 글만이라도).
    return [];
  }
}

export async function GET() {
  const dailies = await recentDailies();
  const items = [
    ...dailies.map((x) => ({
      title: `부산·울산 아파트 실거래 순위 — ${koDate(x.d)} 신고분 (매매 ${Number(x.cnt).toLocaleString("ko-KR")}건)`,
      link: `${SITE_URL}/daily/${x.d}`,
      description: `${koDate(x.d)} 국토교통부에 새로 신고된 부산·울산 아파트 매매 ${Number(x.cnt).toLocaleString("ko-KR")}건의 가격 순위와 신고가를 정리했습니다.`,
      date: x.d,
      category: "데일리 브리핑",
    })),
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
<title>${esc(`${SITE_NAME} — 부산·울산 아파트 실거래 브리핑·주간 리포트·부동산 상식`)}</title>
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
