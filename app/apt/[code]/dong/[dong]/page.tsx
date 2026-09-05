import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import { REGIONS } from "@/lib/regions";
import { SITE_NAME } from "@/lib/site";
import { fmtManwon } from "@/lib/format";
import { getDongSummary, complexHref, type DongDeal } from "@/lib/complex";

export const revalidate = 86400;
export const dynamicParams = true;

function decodeName(v: string): string {
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
}

type Params = { code: string; dong: string };

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const region = REGIONS.find((r) => r.code === params.code);
  const dong = decodeName(params.dong);
  if (!region) return { title: `${dong} 아파트 실거래가 | ${SITE_NAME}` };

  const full = `${region.group}광역시 ${region.name} ${dong}`;
  let extra = "";
  try {
    const s = await getDongSummary(params.code, dong);
    if (s?.topSales[0]) {
      extra = ` 최근 1년 이 동에서 가장 비싼 매매는 ${s.topSales[0].complex} ${Math.round(
        s.topSales[0].areaM2
      )}㎡ ${fmtManwon(s.topSales[0].priceManwon)}입니다.`;
    }
  } catch {
    /* 설명 문구만 빠집니다 */
  }

  return {
    title: `${dong} 아파트 실거래가 — ${region.name} | ${SITE_NAME}`,
    description: `${full}의 아파트 실거래가입니다. 단지 목록, 최근 1년 최고가 거래, 국평(84㎡) 최고가를 국토교통부 자료로 정리했습니다.${extra}`,
    alternates: { canonical: `/apt/${region.code}/dong/${encodeURIComponent(dong)}` },
  };
}

function DealTable({ rows, code, caption }: { rows: DongDeal[]; code: string; caption: string }) {
  if (rows.length === 0) return <p className="empty-note">{caption} 해당하는 거래가 없습니다.</p>;
  return (
    <div className="top5-table-wrap">
      <table className="top5-table">
        <thead>
          <tr>
            <th className="c-rank">#</th>
            <th className="c-name">아파트</th>
            <th className="c-area">전용</th>
            <th className="c-price">매매가</th>
            <th className="c-date">계약일</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((d, i) => (
            <tr key={`${d.complex}-${d.priceManwon}-${i}`}>
              <td className="c-rank">
                <span className={`rank-badge${i === 0 ? " first" : ""}`}>{i + 1}</span>
              </td>
              <td className="c-name">
                <Link href={complexHref(code, d.complex)} className="t5-complex-link">
                  {d.complex}
                </Link>
                <span className="t5-loc">{d.floor}층</span>
              </td>
              <td className="c-area">{Math.round(d.areaM2)}㎡</td>
              <td className="c-price">{fmtManwon(d.priceManwon)}</td>
              <td className="c-date">{d.dateLabel}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function DongPage({ params }: { params: Params }) {
  const region = REGIONS.find((r) => r.code === params.code);
  if (!region) notFound();

  const dong = decodeName(params.dong);
  let s;
  try {
    s = await getDongSummary(params.code, dong);
  } catch {
    s = null;
  }
  if (!s) notFound();

  const full = `${s.group}광역시 ${s.regionName} ${s.dong}`;

  return (
    <div className="wrap">
      <SiteHeader current="apt" />

      <article className="block">
        <nav className="crumbs">
          <Link href="/apt">단지</Link>
          <span>›</span>
          <Link href={`/apt/${region.code}`}>{region.name}</Link>
        </nav>

        <h1 className="guide-title">{s.dong} 아파트 실거래가</h1>
        <p className="guide-meta">{full}</p>

        <p className="guide-summary">
          {full}에는 최근 3년 안에 거래가 신고된 아파트가 <strong>{s.complexes.length}개 단지</strong>{" "}
          있습니다. 최근 1년간 이 동에서 신고된 매매는 {s.saleCount12m.toLocaleString()}건입니다.
          {s.topSales[0] && (
            <>
              {" "}
              가장 비싼 거래는 <strong>{s.topSales[0].complex}</strong>{" "}
              {Math.round(s.topSales[0].areaM2)}㎡ <strong>{fmtManwon(s.topSales[0].priceManwon)}</strong>
              였습니다.
            </>
          )}
        </p>

        <section className="brief-section">
          <h2 className="brief-h2">
            최근 1년 최고가 <span className="brief-count">전 평형</span>
          </h2>
          <DealTable rows={s.topSales} code={region.code} caption="최근 1년 안에" />
        </section>

        <section className="brief-section">
          <h2 className="brief-h2">
            국평(84㎡) 최고가 <span className="brief-count">전용 83~86㎡</span>
          </h2>
          <p className="type-help">
            가장 흔한 평형이라 시세를 가늠하기 좋습니다. 대형 평형은 위 표에서 보세요.
          </p>
          <DealTable rows={s.topSales84} code={region.code} caption="최근 1년 안에 국평 중" />
        </section>

        <section className="brief-section">
          <h2 className="brief-h2">
            {s.dong} 단지 목록 <span className="brief-count">{s.complexes.length}개</span>
          </h2>
          <div className="complex-grid">
            {s.complexes.map((c) => (
              <Link key={c.complex} href={complexHref(c.regionCode, c.complex)} className="complex-link">
                <span className="complex-link-name">{c.complex}</span>
                <span className="complex-link-meta">
                  {c.buildYear ? `${c.buildYear}년 · ` : ""}
                  거래 {c.totalCount}건
                </span>
              </Link>
            ))}
          </div>
        </section>

        <p className="section-note" style={{ marginTop: 22 }}>
          모든 숫자는 국토교통부 실거래가 공개시스템에 신고된 자료입니다. 매매는 계약 후 30일 이내에
          신고하면 되기 때문에 최근 계약은 아직 반영되지 않았을 수 있고, 해제(취소)된 거래는
          제외했습니다.
        </p>

        <p className="section-note">
          <Link href={`/apt/${region.code}`}>{region.name}의 다른 동 보기</Link>
          {" · "}
          <Link href="/daily">오늘의 실거래 브리핑</Link>
        </p>
      </article>
    </div>
  );
}
