import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import { getAllInteriorEntries } from "@/lib/interiorLinks";
import { SITE_NAME } from "@/lib/site";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `집구경 — 단지 내부 구조·인테리어 참고 | ${SITE_NAME}`,
  description:
    "부산·울산 아파트 단지의 내부 구조와 리모델링 사례를 모아 소개합니다. 사진·글은 옮기지 않고 원문(유튜브·블로그·인테리어 시공사례)으로 바로 연결합니다.",
  alternates: { canonical: "/interior" },
};

export default function InteriorPage() {
  const entries = getAllInteriorEntries();
  const busan = entries.filter((e) => e.group === "부산");
  const ulsan = entries.filter((e) => e.group === "울산");

  return (
    <div className="wrap">
      <SiteHeader current="interior" />

      <article className="block">
        <h1 className="guide-title">집구경 — 내부 구조 · 인테리어 참고</h1>
        <p className="guide-summary">
          실거래가만 봐서는 그 집 내부가 어떻게 생겼는지 알기 어렵죠. 이 단지들은 실제로 유튜브·블로그·
          인테리어 시공사례에 내부 구조나 리모델링 사례가 올라와 있어 모아봤습니다. 집안 구조 변경이나
          리모델링을 고민 중이시라면 참고해보세요. (사진과 글은 이 사이트로 옮기지 않고, 항상 원문으로
          바로 연결합니다.)
        </p>

        {[
          { title: "부산광역시", list: busan },
          { title: "울산광역시", list: ulsan },
        ].map(
          (g) =>
            g.list.length > 0 && (
              <section className="brief-section" key={g.title}>
                <h2 className="brief-h2">
                  {g.title} <span className="brief-count">{g.list.length}개 단지</span>
                </h2>
                <div className="interior-gallery">
                  {g.list.map((e) => (
                    <div className="interior-card" key={e.href}>
                      <div className="interior-card-head">
                        <Link href={e.href} className="interior-card-name">
                          {e.complex}
                        </Link>
                        <span className="interior-card-loc">{e.regionName}</span>
                      </div>
                      <ul className="interior-list">
                        {e.links.map((l) => (
                          <li key={l.url}>
                            <a
                              href={l.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="interior-link"
                            >
                              <span className="interior-badge">{l.source}</span>
                              {l.title}
                              <span aria-hidden="true" className="interior-go">
                                ↗
                              </span>
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </section>
            )
        )}

        <p className="section-note" style={{ marginTop: 22 }}>
          여기 없는 단지도 <Link href="/apt">단지별 실거래가</Link> 페이지에서 찾아 들어가면, 각 단지
          페이지 아래쪽 &quot;내부 구조 · 인테리어 참고&quot;에서 유튜브·네이버 검색으로 바로 찾아볼 수
          있습니다. 소개할 만한 단지·자료를 알고 계시면 <Link href="/contact">문의</Link>로 알려주세요.
        </p>
      </article>
    </div>
  );
}
