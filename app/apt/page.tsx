import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import { REGIONS } from "@/lib/regions";
import { SITE_NAME } from "@/lib/site";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `아파트 단지별 실거래가 — 부산 · 울산 | ${SITE_NAME}`,
  description:
    "부산 16개 구·군, 울산 5개 구·군의 아파트 단지를 지역별로 찾아보세요. 단지마다 최근 3년치 매매·전세·월세 실거래가와 가격 흐름을 국토교통부 자료로 정리했습니다.",
  alternates: { canonical: "/apt" },
};

export default function AptIndexPage() {
  const busan = REGIONS.filter((r) => r.group === "부산");
  const ulsan = REGIONS.filter((r) => r.group === "울산");

  return (
    <main className="page">
      <SiteHeader current="apt" />

      <article className="block">
        <h1 className="guide-title">아파트 단지별 실거래가</h1>
        <p className="guide-summary">
          지역을 고르면 그 구·군에서 최근 거래가 있었던 아파트 단지 목록이 나옵니다. 단지를 누르면 최근
          3년치 매매·전세·월세 실거래가와 월별 가격 흐름, 3년 최고·최저가, 전세 갭을 한 화면에서 볼 수
          있습니다. 모든 숫자는 국토교통부 실거래가 공개시스템 자료입니다.
        </p>

        {[
          { title: "부산광역시", list: busan },
          { title: "울산광역시", list: ulsan },
        ].map((g) => (
          <section className="brief-section" key={g.title}>
            <h2 className="brief-h2">
              {g.title} <span className="brief-count">{g.list.length}개 구·군</span>
            </h2>
            <div className="region-grid">
              {g.list.map((r) => (
                <Link key={r.code} href={`/apt/${r.code}`} className="region-link">
                  {r.name}
                </Link>
              ))}
            </div>
          </section>
        ))}

        <p className="section-note" style={{ marginTop: 22 }}>
          찾는 단지가 목록에 없다면 최근 3년 안에 신고된 거래가 없는 것입니다. 실거래가는 실제로 계약이
          이루어져 신고된 건만 공개되기 때문에, 거래가 드문 단지는 자료가 없을 수 있습니다.
        </p>
      </article>
    </main>
  );
}
