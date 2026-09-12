import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import { STAGE_ORDER, getRedevelopmentEntries } from "@/lib/redevelopment";
import { SITE_NAME } from "@/lib/site";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `재개발 · 재건축 현황 | ${SITE_NAME}`,
  description:
    "부산·울산 재개발·재건축 구역의 진행 단계를 정리합니다. 확실히 확인된 단계만 표시하고, 그 외에는 부산시 공식 정비사업 통합홈페이지로 바로 연결합니다.",
  alternates: { canonical: "/redevelopment" },
};

export default function RedevelopmentPage() {
  const entries = getRedevelopmentEntries();
  const busan = entries.filter((e) => e.group === "부산");
  const ulsan = entries.filter((e) => e.group === "울산");

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
            걸리기도 합니다.
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

        {[
          { title: "부산광역시", list: busan },
          { title: "울산광역시", list: ulsan },
        ].map(
          (g) =>
            g.list.length > 0 && (
              <section className="brief-section" key={g.title}>
                <h2 className="brief-h2">
                  {g.title} <span className="brief-count">{g.list.length}개 구역</span>
                </h2>
                <div className="redev-list">
                  {g.list.map((e) => (
                    <div className="redev-card" key={`${e.regionCode}-${e.name}`}>
                      <div className="redev-card-head">
                        <span className="redev-card-name">{e.name}</span>
                        <span className="redev-card-type">{e.type}</span>
                        <span className="redev-card-loc">{e.regionName}</span>
                      </div>
                      {e.stage ? (
                        <p className="redev-card-stage">
                          현재 단계 <strong>{e.stage}</strong>
                          {e.lastChecked && <span className="redev-card-checked"> · {e.lastChecked} 확인</span>}
                        </p>
                      ) : (
                        <p className="redev-card-stage redev-card-stage-unknown">
                          현재 단계는 공식 페이지에서 확인해주세요
                        </p>
                      )}
                      {e.note && <p className="redev-card-note">{e.note}</p>}
                      <a
                        href={e.officialUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="redev-card-link"
                      >
                        부산시 공식 정보 보기 ↗
                      </a>
                    </div>
                  ))}
                </div>
              </section>
            )
        )}

        <p className="section-note" style={{ marginTop: 22 }}>
          이 페이지는 아직 극히 일부 구역만 담고 있습니다. 관심 있는 구역을 <Link href="/contact">문의</Link>로
          알려주시면 확인해서 추가하겠습니다.
        </p>
      </article>
    </div>
  );
}
