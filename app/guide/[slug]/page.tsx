import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import GuideBody from "@/components/GuideBody";
import JsonLd from "@/components/JsonLd";
import { GUIDES, getGuide } from "@/lib/guides";
import { SITE_NAME, SITE_URL } from "@/lib/site";

export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const guide = getGuide(params.slug);
  if (!guide) return { title: `부동산 상식 | ${SITE_NAME}` };
  return {
    title: `${guide.title} | ${SITE_NAME}`,
    description: guide.summary,
    alternates: { canonical: `/guide/${guide.slug}` },
  };
}

export default function Page({ params }: { params: { slug: string } }) {
  const guide = getGuide(params.slug);
  if (!guide) notFound();

  const others = GUIDES.filter((g) => g.slug !== guide.slug).slice(0, 3);

  // 이 글이 "글(Article)"이고, 사이트 안에서 어떤 경로로 들어오는지(Breadcrumb) 구글에 알려줍니다.
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        headline: guide.title,
        description: guide.summary,
        datePublished: guide.updated,
        dateModified: guide.updated,
        inLanguage: "ko-KR",
        author: { "@type": "Organization", name: SITE_NAME },
        publisher: { "@type": "Organization", name: SITE_NAME },
        mainEntityOfPage: `${SITE_URL}/guide/${guide.slug}`,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: SITE_NAME, item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "부동산 상식", item: `${SITE_URL}/guide` },
          { "@type": "ListItem", position: 3, name: guide.title, item: `${SITE_URL}/guide/${guide.slug}` },
        ],
      },
    ],
  };

  return (
    <div className="wrap">
      <JsonLd data={jsonLd} />
      <SiteHeader current="guide" />

      <article className="block">
        <Link href="/guide" className="guide-back">
          ← 부동산 상식
        </Link>

        <h1 className="guide-title">{guide.title}</h1>
        <p className="guide-meta">
          {guide.category} · {guide.readMinutes}분 읽기 · {guide.updated} 갱신
        </p>
        <p className="guide-summary">{guide.summary}</p>

        <GuideBody body={guide.body} />

        {guide.sources && guide.sources.length > 0 && (
          <div className="guide-sources">
            <strong>참고한 자료</strong>
            <ul>
              {guide.sources.map((s) => (
                <li key={s.url}>
                  <a href={s.url} target="_blank" rel="noopener noreferrer">
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </article>

      {others.length > 0 && (
        <section className="block">
          <h2>다른 글</h2>
          <div className="guide-list">
            {others.map((g) => (
              <Link className="guide-card" href={`/guide/${g.slug}`} key={g.slug}>
                <span className="guide-card-title">{g.title}</span>
                <span className="guide-card-summary">{g.summary}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
