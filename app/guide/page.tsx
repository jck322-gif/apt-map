import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import { GUIDES, GUIDE_CATEGORIES } from "@/lib/guides";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: `부동산 상식 | ${SITE_NAME}`,
  description:
    "실거래가 읽는 법, 아파트 매매 절차와 기한, 전월세 신고제와 전세가율까지. 부산·울산 실거래 자료를 다루며 정리한 부동산 기초 지식입니다.",
};

export default function Page() {
  return (
    <div className="wrap">
      <SiteHeader current="guide" />

      <section className="block">
        <h2>부동산 상식</h2>
        <p className="section-note">
          실거래가 자료를 매일 다루면서 정리한 내용입니다. 숫자를 읽는 법부터 계약 절차와 기한까지,
          한 번은 알아두면 손해를 줄일 수 있는 것들만 담았습니다.
        </p>

        {GUIDE_CATEGORIES.map((cat) => {
          const list = GUIDES.filter((g) => g.category === cat);
          if (list.length === 0) return null;
          return (
            <div className="group-section" key={cat}>
              <h3 className="group-heading">
                {cat} <span className="group-count">({list.length})</span>
              </h3>
              <div className="guide-list">
                {list.map((g) => (
                  <Link className="guide-card" href={`/guide/${g.slug}`} key={g.slug}>
                    <span className="guide-card-title">{g.title}</span>
                    <span className="guide-card-summary">{g.summary}</span>
                    <span className="guide-card-meta">
                      {g.readMinutes}분 읽기 · {g.updated} 갱신
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
