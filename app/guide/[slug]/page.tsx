import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import GuideBody from "@/components/GuideBody";
import { GUIDES, getGuide } from "@/lib/guides";
import { SITE_NAME } from "@/lib/site";

export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const guide = getGuide(params.slug);
  if (!guide) return { title: `부동산 상식 | ${SITE_NAME}` };
  return {
    title: `${guide.title} | ${SITE_NAME}`,
    description: guide.summary,
  };
}

export default function Page({ params }: { params: { slug: string } }) {
  const guide = getGuide(params.slug);
  if (!guide) notFound();

  const others = GUIDES.filter((g) => g.slug !== guide.slug).slice(0, 3);

  return (
    <div className="wrap">
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
