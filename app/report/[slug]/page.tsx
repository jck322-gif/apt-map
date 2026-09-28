import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import GuideBody from "@/components/GuideBody";
import JsonLd from "@/components/JsonLd";
import { REPORTS, getReport } from "@/lib/reports";
import { SITE_NAME, SITE_URL } from "@/lib/site";

export const dynamicParams = false;

export function generateStaticParams() {
  return REPORTS.map((r) => ({ slug: r.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const report = getReport(params.slug);
  if (!report) return { title: `주간 리포트 | ${SITE_NAME}` };
  return {
    title: `${report.title} | ${SITE_NAME}`,
    description: report.summary,
    alternates: { canonical: `/report/${report.slug}` },
    openGraph: { title: report.title, description: report.summary, type: "article" },
  };
}

export default function Page({ params }: { params: { slug: string } }) {
  const report = getReport(params.slug);
  if (!report) notFound();

  const idx = REPORTS.findIndex((r) => r.slug === report.slug);
  const newer = idx > 0 ? REPORTS[idx - 1] : null;
  const older = idx < REPORTS.length - 1 ? REPORTS[idx + 1] : null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        headline: report.title,
        description: report.summary,
        datePublished: report.published,
        dateModified: report.published,
        inLanguage: "ko-KR",
        author: { "@type": "Organization", name: SITE_NAME, url: `${SITE_URL}/about` },
        publisher: { "@type": "Organization", name: SITE_NAME },
        mainEntityOfPage: `${SITE_URL}/report/${report.slug}`,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: SITE_NAME, item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "주간 리포트", item: `${SITE_URL}/report` },
          { "@type": "ListItem", position: 3, name: report.title, item: `${SITE_URL}/report/${report.slug}` },
        ],
      },
    ],
  };

  return (
    <div className="wrap">
      <JsonLd data={jsonLd} />
      <SiteHeader current="report" />

      <article className="block">
        <Link href="/report" className="guide-back">
          ← 주간 리포트
        </Link>

        <h1 className="guide-title">{report.title}</h1>
        <p className="guide-meta">
          {report.period} · {report.published} 발행 · 글 {SITE_NAME} 운영자
        </p>
        <p className="guide-summary">{report.summary}</p>

        <GuideBody body={report.body} />

        {report.sources && report.sources.length > 0 && (
          <div className="guide-sources">
            <strong>참고한 자료</strong>
            <ul>
              {report.sources.map((s) => (
                <li key={s.url}>
                  <a href={s.url} target="_blank" rel="noopener noreferrer">
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="muted-small">
          숫자를 어떻게 셌는지는 <Link href="/about#editorial">편집 원칙</Link>에, 잘못된 내용을 알려주실 곳은{" "}
          <Link href="/contact">문의</Link>에 있습니다.
        </p>
      </article>

      {(newer || older) && (
        <nav className="block report-pager">
          {older && (
            <Link href={`/report/${older.slug}`} className="guide-card">
              <span className="report-card-meta">← 지난 리포트</span>
              <span className="guide-card-title">{older.title}</span>
            </Link>
          )}
          {newer && (
            <Link href={`/report/${newer.slug}`} className="guide-card">
              <span className="report-card-meta">다음 리포트 →</span>
              <span className="guide-card-title">{newer.title}</span>
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
