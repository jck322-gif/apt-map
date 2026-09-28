import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import { CALC_PAGES } from "@/lib/calcPages";
import { RULES_AS_OF } from "@/lib/calc";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: `부동산 계산기 — 취득세·중개수수료·대출 | ${SITE_NAME}`,
  description:
    "아파트 살 때 필요한 돈을 한 번에 계산하세요. 취득세, 중개수수료(복비), 주택담보대출 이자와 부산·울산 기준 LTV·DSR 한도 계산기입니다.",
  alternates: { canonical: "/calc" },
};

export default function Page() {
  return (
    <div className="wrap">
      <SiteHeader current="calc" />
      <article className="block">
        <h1 className="guide-title">부동산 계산기</h1>
        <p className="guide-summary">
          아파트를 살 때는 집값 말고도 취득세, 중개수수료, 대출 이자가 함께 듭니다. 아래 계산기는 {RULES_AS_OF} 기준
          법령과 부산·울산에 적용되는 규정을 반영했습니다. 단지 페이지에서 &quot;취득세 계산&quot;을 누르면 그 단지의 최근
          실거래가로 바로 계산됩니다.
        </p>
        <ul className="insight-list">
          {CALC_PAGES.map((p) => (
            <li key={p.slug}>
              <Link href={`/calc/${p.slug}`} className="insight-card">
                <strong>{p.title}</strong>
                <span>{p.desc}</span>
              </Link>
            </li>
          ))}
        </ul>
        <h2 className="calc-h2">5억 아파트를 사면 드는 돈 (예시)</h2>
        <div className="top5-table-wrap">
          <table className="top5-table guide-table nowrap-table">
            <tbody>
              <tr>
                <td>취득세 + 지방교육세 (1주택, 84㎡)</td>
                <td>550만원</td>
              </tr>
              <tr>
                <td>중개수수료 (0.4%, 부가세 포함)</td>
                <td>220만원</td>
              </tr>
              <tr>
                <td>대출 3억원 · 연 4% · 30년 월 상환액</td>
                <td>약 143만원</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="muted-small">
          법무사 수수료·국민주택채권 할인비용·인지세 등은 빠져 있습니다. 보통 수십만~100만원대가 더 듭니다.
        </p>
      </article>
    </div>
  );
}
