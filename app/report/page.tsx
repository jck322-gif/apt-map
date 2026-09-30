import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import { REPORTS } from "@/lib/reports";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  alternates: { canonical: "/report" },
  title: `주간 리포트 | ${SITE_NAME}`,
  description:
    "한 주 동안 국토교통부에 새로 신고된 부산·울산 아파트 실거래를 운영자가 직접 읽고 정리한 주간 시장 리포트입니다. 신고가, 거래량, 착시가 있는 거래까지 짚어 드립니다.",
};

export default function Page() {
  return (
    <div className="wrap">
      <SiteHeader current="report" />

      <section className="block">
        <h1 className="guide-title">부산·울산 아파트 주간 리포트</h1>
        <p className="section-note">
          매주 월요일, 지난 한 주 동안 새로 신고된 부산·울산 아파트 실거래를 정리합니다. 자동으로 뽑는 표와 달리
          숫자 뒤의 사정(몇 년 만의 거래인지, 층이 다른지, 거래량은 어떤지)을 사람이 읽고 해석을 붙인 글입니다.
        </p>

        <div className="guide-list">
          {REPORTS.map((r) => (
            <Link className="guide-card" href={`/report/${r.slug}`} key={r.slug}>
              <span className="guide-card-title">{r.title}</span>
              <span className="guide-card-summary">{r.summary}</span>
              <span className="report-card-meta">
                {r.period} · {r.published} 발행
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="block">
        <h2>함께 보면 좋은 페이지</h2>
        <p className="section-note">
          리포트에 쓰인 숫자는 아래 분석 페이지에서 매일 새로 계산됩니다.{" "}
          <Link href="/insight/weekly-records">이번 주 신고가</Link> ·{" "}
          <Link href="/insight/region-trend">구·군별 거래량과 84㎡ 가격</Link> ·{" "}
          <Link href="/insight/jeonse-rate">전세가율</Link>
        </p>
      </section>
    </div>
  );
}
