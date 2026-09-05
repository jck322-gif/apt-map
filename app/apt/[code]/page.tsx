import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import { REGIONS } from "@/lib/regions";
import { SITE_NAME } from "@/lib/site";
import { listComplexes, type ComplexListRow } from "@/lib/complex";
import ComplexBrowser from "@/components/ComplexBrowser";

// 하루에 한 번만 다시 계산합니다 (단지 목록은 자주 바뀌지 않습니다).
export const revalidate = 86400;

export function generateStaticParams() {
  return REGIONS.map((r) => ({ code: r.code }));
}

export async function generateMetadata({ params }: { params: { code: string } }): Promise<Metadata> {
  const region = REGIONS.find((r) => r.code === params.code);
  if (!region) return { title: `아파트 단지 실거래가 | ${SITE_NAME}` };
  const full = `${region.group}광역시 ${region.name}`;
  return {
    title: `${full} 아파트 단지별 실거래가 | ${SITE_NAME}`,
    description: `${full}의 아파트 단지 목록입니다. 단지마다 최근 3년치 매매·전세·월세 실거래가와 가격 흐름을 국토교통부 자료로 정리했습니다.`,
    alternates: { canonical: `/apt/${region.code}` },
  };
}

export default async function RegionComplexListPage({ params }: { params: { code: string } }) {
  const region = REGIONS.find((r) => r.code === params.code);
  if (!region) notFound();

  let rows: ComplexListRow[];
  try {
    rows = await listComplexes(region.code);
  } catch {
    rows = [];
  }

  const full = `${region.group}광역시 ${region.name}`;

  return (
    <div className="wrap">
      <SiteHeader current="apt" />

      <article className="block">
        <Link href="/apt" className="guide-back">
          ← 지역 목록
        </Link>

        <h1 className="guide-title">{full} 아파트 단지별 실거래가</h1>
        <p className="guide-summary">
          {full}에서 최근 3년 안에 실거래가 신고된 아파트 <strong>{rows.length.toLocaleString()}개 단지</strong>
          입니다. 단지명을 누르면 그 단지의 매매·전세·월세 실거래 이력과 월별 가격 흐름을 볼 수 있습니다.
        </p>

        {rows.length === 0 ? (
          <p className="empty-note">
            아직 이 지역의 단지 목록을 불러오지 못했습니다. 잠시 후 다시 확인해 주세요.
          </p>
        ) : (
          <ComplexBrowser rows={rows} />
        )}

        <p className="section-note" style={{ marginTop: 22 }}>
          거래 건수는 최근 3년간 국토교통부에 신고된 매매·전세·월세를 모두 합한 값입니다. 거래가 없었던
          단지는 목록에 나오지 않습니다.
        </p>
      </article>
    </div>
  );
}
