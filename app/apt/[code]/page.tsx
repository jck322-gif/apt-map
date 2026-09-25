import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import { REGIONS } from "@/lib/regions";
import { SITE_NAME } from "@/lib/site";
import { listComplexes, type ComplexListRow } from "@/lib/complex";
import ComplexBrowser from "@/components/ComplexBrowser";
import RegionSummaryBlock from "@/components/RegionSummaryBlock";
import { getRegionSummary, type RegionSummary } from "@/lib/regionSummary";

// 하루에 한 번만 다시 계산합니다 (단지 목록은 자주 바뀌지 않습니다).
// 거래 요약(최근 30일)이 들어가서 하루 네 번 새로 만듭니다.
export const revalidate = 21600;

// 배포(빌드) 때 21개 페이지를 미리 만들지 않고, 처음 요청이 왔을 때 만들어 저장합니다.
// 목록 조회가 실패하면 이제 오류를 던지는데, 빌드 중에 데이터베이스가 잠깐 느리면 배포 자체가
// 실패하게 되기 때문입니다. (한 번 만들어진 뒤에는 revalidate 주기마다 새로 만듭니다.)

/**
 * 검색 결과에 뜨는 제목과 설명.
 *
 * 구글에서 "부산 실거래가"로 검색하면 경쟁 사이트들이 **구·군 페이지**로 올라옵니다
 * (예: "부산광역시 부산진구 아파트 실거래가·시세와 신고가"). 홈페이지가 아니라
 * 이 페이지가 그 자리를 노리는 자리라서, 제목에 사람들이 실제로 치는 말
 * — 실거래가, 시세, 신고가 — 을 넣습니다.
 *
 * 설명에는 그 지역의 **단지 이름 몇 개와 단지 수**를 실제 자료에서 뽑아 넣습니다.
 * 검색 결과에 구체적인 이름과 숫자가 보이면 클릭률이 올라가고, 단지명 자체가
 * 검색어가 되기 때문입니다. (경쟁 사이트들이 전부 이렇게 하고 있습니다.)
 */
export async function generateMetadata({ params }: { params: { code: string } }): Promise<Metadata> {
  const region = REGIONS.find((r) => r.code === params.code);
  if (!region) return { title: `아파트 단지 실거래가 | ${SITE_NAME}` };
  const full = `${region.group}광역시 ${region.name}`;

  // 거래가 많은 단지 = 사람들이 많이 찾는 단지. 그 이름을 설명에 넣습니다.
  let lead = "";
  let count = 0;
  try {
    const rows = await listComplexes(region.code);
    count = rows.length;
    const top = [...rows].sort((a, b) => b.totalCount - a.totalCount).slice(0, 3);
    if (top.length > 0) lead = top.map((r) => r.complex).join(", ");
  } catch {
    // 목록을 못 불러와도 제목·설명은 나와야 하므로 조용히 넘어갑니다.
  }

  const description = lead
    ? `${lead} 등 ${full} 아파트 ${count.toLocaleString()}개 단지의 매매·전세·월세 실거래가를 국토교통부 자료로 매일 업데이트합니다. 단지별 시세 흐름과 신고가를 확인하세요.`
    : `${full} 아파트의 매매·전세·월세 실거래가를 국토교통부 자료로 매일 업데이트합니다. 단지별 시세 흐름과 신고가를 확인하세요.`;

  return {
    title: `${full} 아파트 실거래가 · 시세 · 신고가 | ${SITE_NAME}`,
    description,
    alternates: { canonical: `/apt/${region.code}` },
  };
}

export default async function RegionComplexListPage({ params }: { params: { code: string } }) {
  const region = REGIONS.find((r) => r.code === params.code);
  if (!region) notFound();

  // 목록을 못 불러오면 빈 화면을 내보내지 않고 오류(500)로 넘깁니다. 빈 목록 화면은 21개 구·군이
  // 전부 똑같아서, 구글이 그 순간에 들르면 "중복 페이지"로 분류합니다. 오류를 던지면 Next.js가
  // 마지막으로 성공한 페이지를 계속 보여주고, 구글은 나중에 다시 옵니다.
  const rows: ComplexListRow[] = await listComplexes(region.code);

  const full = `${region.group}광역시 ${region.name}`;

  // 이 지역 최근 거래 요약 — 실패해도 단지 목록은 그대로 보여줍니다.
  let summary: RegionSummary | null = null;
  try {
    summary = await getRegionSummary(region.code);
  } catch {
    summary = null;
  }

  return (
    <div className="wrap">
      <SiteHeader current="apt" />

      <article className="block">
        <Link href="/apt" className="guide-back">
          ← 지역 목록
        </Link>

        <h1 className="guide-title">{full} 아파트 실거래가 · 시세 · 신고가</h1>
        <p className="guide-summary">
          {full}에서 최근 3년 안에 실거래가 신고된 아파트 <strong>{rows.length.toLocaleString()}개 단지</strong>
          입니다. 단지명을 누르면 그 단지의 매매·전세·월세 실거래 이력, 평형별 시세 흐름, 신고가 기록을 볼 수
          있습니다. 국토교통부 실거래가 자료를 매일 받아 갱신합니다.
        </p>

        {summary && <RegionSummaryBlock code={region.code} fullName={full} summary={summary} />}

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
