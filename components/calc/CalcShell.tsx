import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import JsonLd from "@/components/JsonLd";
import { CALC_PAGES, type CalcSlug } from "@/lib/calcPages";
import { RULES_AS_OF } from "@/lib/calc";
import { SITE_NAME, SITE_URL } from "@/lib/site";

export type Faq = { q: string; a: string };

/** 계산기 페이지 공통 틀 — 제목, 계산기, 설명 글, 자주 묻는 질문, 다른 계산기 링크 */
export default function CalcShell({
  slug,
  lead,
  calculator,
  children,
  faqs,
  sources,
}: {
  slug: CalcSlug;
  lead: string;
  calculator: React.ReactNode;
  children: React.ReactNode;
  faqs: Faq[];
  sources: { label: string; url: string }[];
}) {
  const page = CALC_PAGES.find((p) => p.slug === slug)!;
  const url = `${SITE_URL}/calc/${slug}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        name: page.title,
        description: page.desc,
        url,
        applicationCategory: "FinanceApplication",
        operatingSystem: "All",
        inLanguage: "ko-KR",
        offers: { "@type": "Offer", price: "0", priceCurrency: "KRW" },
        publisher: { "@type": "Organization", name: SITE_NAME },
      },
      {
        "@type": "FAQPage",
        mainEntity: faqs.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: SITE_NAME, item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "계산기", item: `${SITE_URL}/calc` },
          { "@type": "ListItem", position: 3, name: page.title, item: url },
        ],
      },
    ],
  };

  return (
    <div className="wrap">
      <JsonLd data={jsonLd} />
      <SiteHeader current="calc" />
      <article className="block">
        <Link href="/calc" className="guide-back">
          ← 계산기
        </Link>
        <h1 className="guide-title">{page.title}</h1>
        <p className="guide-meta">{RULES_AS_OF} 기준 법령·규정 반영 · 입력한 값은 저장되지 않습니다</p>
        <p className="guide-summary">{lead}</p>

        {calculator}

        <div className="guide-body calc-article">{children}</div>

        <h2 className="calc-h2">자주 묻는 질문</h2>
        <div className="calc-faq">
          {faqs.map((f) => (
            <details key={f.q}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>

        <p className="guide-note">
          이 계산기는 이해를 돕기 위한 참고용입니다. 실제 세금·수수료·대출 한도는 개인 사정과 심사에 따라 달라지므로,
          계약 전에 위택스·중개사무소·은행에서 꼭 다시 확인하세요.
        </p>

        <div className="guide-sources">
          <strong>참고한 자료</strong>
          <ul>
            {sources.map((s) => (
              <li key={s.url}>
                <a href={s.url} target="_blank" rel="noopener noreferrer">
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </article>

      <section className="block">
        <h2>다른 계산기</h2>
        <div className="guide-list">
          {CALC_PAGES.filter((p) => p.slug !== slug).map((p) => (
            <Link className="guide-card" href={`/calc/${p.slug}`} key={p.slug}>
              <span className="guide-card-title">{p.title}</span>
              <span className="guide-card-summary">{p.desc}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
