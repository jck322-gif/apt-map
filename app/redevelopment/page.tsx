import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import RedevelopmentBoard from "@/components/RedevelopmentBoard";
import { STAGE_ORDER, getRedevelopmentEntries } from "@/lib/redevelopment";
import { complexHref } from "@/lib/complex";
import { SITE_NAME } from "@/lib/site";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `재개발 · 재건축 현황 | ${SITE_NAME}`,
  description:
    "부산·울산 재개발·재건축 구역의 진행 단계를 정리합니다. 단계별로 걸러보고, 구역을 누르면 자세한 진행 단계와 관련 자료를 볼 수 있습니다.",
  alternates: { canonical: "/redevelopment" },
};

export default function RedevelopmentPage() {
  const entries = getRedevelopmentEntries().map((e) => ({
    ...e,
    href: complexHref(e.regionCode, e.name),
  }));

  return (
    <div className="wrap">
      <SiteHeader current="redevelopment" />

      <article className="block">
        <h1 className="guide-title">재개발 · 재건축 현황</h1>
        <p className="guide-summary">
          재개발·재건축은 실거래가처럼 매일 자동으로 갱신되는 자료가 없습니다. 그래서 이 페이지는
          확실히 확인된 정보만 담고, 그 외에는 억지로 채우지 않고{" "}
          <a href="https://dynamice.busan.go.kr/" target="_blank" rel="noopener noreferrer">
            부산시 정비사업 통합홈페이지
          </a>
          로 바로 연결합니다. 궁금한 구역이 있으면 언제든 알려주세요 — 확인해서 추가하겠습니다.
        </p>

        <section className="brief-section">
          <h2 className="brief-h2">진행 단계 8가지</h2>
          <p className="section-note" style={{ margin: "0 0 10px" }}>
            부산시 정비사업 통합홈페이지의 분류를 따랐습니다. 순서대로 진행되며, 단계마다 몇 달~몇 년씩
            걸리기도 합니다. 아래 구역을 누르면 지금 어느 단계인지 자세히 볼 수 있어요.
          </p>
          <ol className="stage-legend">
            {STAGE_ORDER.map((s, i) => (
              <li key={s.stage} className="stage-legend-item">
                <span className="stage-legend-num">{i + 1}</span>
                <span className="stage-legend-name">{s.stage}</span>
                <span className="stage-legend-desc">{s.desc}</span>
              </li>
            ))}
          </ol>
        </section>

        <RedevelopmentBoard entries={entries} />

        <p className="section-note" style={{ marginTop: 22 }}>
          이 페이지는 아직 극히 일부 구역만 담고 있습니다. 관심 있는 구역을 <Link href="/contact">문의</Link>로
          알려주시면 확인해서 추가하겠습니다.
        </p>
      </article>
    </div>
  );
}
