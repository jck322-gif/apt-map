import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import { SITE_NAME } from "@/lib/site";
import { INSIGHT_PAGES } from "@/lib/insightPages";

export const metadata: Metadata = {
  title: `부산 · 울산 아파트 실거래 분석 | ${SITE_NAME}`,
  description:
    "이번 주 신고가, 구·군별 거래량 변화와 84㎡ 가격, 전세가율 높은 아파트까지. 국토교통부 실거래 자료로 매일 새로 계산하는 부산·울산 아파트 분석입니다.",
  alternates: { canonical: "/insight" },
};

export default function Page() {
  return (
    <div className="wrap">
      <SiteHeader current="insight" />
      <article className="block">
        <h1 className="guide-title">부산 · 울산 아파트 실거래 분석</h1>
        <p className="guide-summary">
          실거래 목록만으로는 흐름이 잘 보이지 않습니다. 아래 분석은 국토교통부에 신고된 실거래를 모아 매일
          새로 계산한 것입니다. 숫자는 자동으로 바뀌고, 계산 방법과 주의할 점은 각 페이지에 함께 적었습니다.
        </p>
        <ul className="insight-list">
          {INSIGHT_PAGES.map((p) => (
            <li key={p.slug}>
              <Link href={`/insight/${p.slug}`} className="insight-card">
                <strong>{p.title}</strong>
                <span>{p.desc}</span>
              </Link>
            </li>
          ))}
          <li>
            <Link href="/rank" className="insight-card">
              <strong>최근 3개월 아파트 랭킹</strong>
              <span>국평 신고가, 평당가 TOP, 거래량이 많은 단지 순위입니다.</span>
            </Link>
          </li>
          <li>
            <Link href="/daily" className="insight-card">
              <strong>오늘의 실거래 브리핑</strong>
              <span>오늘 새로 신고된 거래와 신고가를 하루 단위로 정리합니다.</span>
            </Link>
          </li>
        </ul>
      </article>
    </div>
  );
}
