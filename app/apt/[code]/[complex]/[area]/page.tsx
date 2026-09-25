import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import ComplexDetail from "@/components/ComplexDetail";
import { REGIONS } from "@/lib/regions";
import { SITE_NAME } from "@/lib/site";
import { fmtManwon, typeLabel } from "@/lib/format";
import { loadComplexTrend, complexAreaHref, complexHref, ComplexError, type ComplexTrend } from "@/lib/complex";

// 평형별 페이지 — 같은 단지라도 평형에 따라 가격대가 완전히 달라서, 주소를 따로 둡니다.
// ("삼익비치 95㎡ 실거래가" 처럼 평형까지 넣어 검색하는 사람이 많습니다.)
export const revalidate = 86400;
export const dynamicParams = true;

function decodeName(v: string): string {
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
}

type Params = { code: string; complex: string; area: string };

async function load(p: Params): Promise<{ data: ComplexTrend; area: number } | null> {
  const area = Number(p.area);
  if (!Number.isFinite(area)) return null;
  try {
    const data = await loadComplexTrend({
      code: p.code,
      complex: decodeName(p.complex),
      dealType: "sale",
      area,
    });
    // 이 단지에 없는 평형 주소로 들어온 경우입니다 (잘못 입력했거나 오래된 링크).
    if (!data.types.some((t) => Math.abs(t - area) < 0.005)) return null;
    return { data, area };
  } catch (err) {
    // 잘못된 주소만 404, 일시적인 데이터베이스 오류는 500으로 넘겨 구글이 다시 오게 합니다.
    if (err instanceof ComplexError && err.status < 500) return null;
    throw err;
  }
}

/**
 * 이 평형 페이지의 대표 주소.
 *
 * - 평형이 하나뿐인 단지: 평형 페이지와 단지 페이지 내용이 똑같으므로 단지 페이지가 대표입니다.
 * - 84.85㎡와 84.87㎡처럼 반올림하면 같은 평형이 여러 개: 거래를 ±0.5㎡로 묶어 보여주기 때문에
 *   두 페이지가 사실상 같습니다. 가장 작은 값을 대표로 삼습니다.
 * 이렇게 알려주지 않으면 구글이 "대표 주소가 없는 중복 페이지"로 분류합니다.
 */
function canonicalFor(code: string, name: string, area: number, types: number[]): string {
  if (types.length <= 1) return complexHref(code, name);
  const same = types.filter((t) => Math.round(t) === Math.round(area)).sort((a, b) => a - b);
  return complexAreaHref(code, name, same[0] ?? area);
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const region = REGIONS.find((r) => r.code === params.code);
  const name = decodeName(params.complex);
  if (!region) return { title: `${name} 실거래가 | ${SITE_NAME}` };

  const res = await load(params);
  if (!res) return { title: `${name} 실거래가 — ${region.name} | ${SITE_NAME}` };

  const { data, area } = res;
  const latest = data.stats.latestSale;
  const where = `${region.group}광역시 ${region.name}${data.dong ? ` ${data.dong}` : ""}`;
  const label = typeLabel(area);

  const description = latest
    ? `${where} ${name} ${label} 실거래가. 가장 최근 매매는 ${latest.dateLabel} ${fmtManwon(
        latest.priceManwon
      )}(${latest.floor}층)입니다. 이 평형의 최근 3년치 실거래 이력과 월별 가격 흐름을 국토교통부 자료로 정리했습니다.`
    : `${where} ${name} ${label}의 실거래가를 국토교통부 자료로 정리했습니다.`;

  return {
    title: `${name} ${Math.round(area)}㎡ 실거래가 — ${region.name} | ${SITE_NAME}`,
    description,
    alternates: { canonical: canonicalFor(region.code, name, area, data.types) },
    openGraph: { title: `${name} ${label} 실거래가 — ${region.name}`, description, type: "article" },
  };
}

export default async function ComplexAreaPage({ params }: { params: Params }) {
  const region = REGIONS.find((r) => r.code === params.code);
  if (!region) notFound();

  const res = await load(params);
  if (!res) notFound();

  return (
    <div className="wrap">
      <SiteHeader current="apt" />
      <ComplexDetail data={res.data} selectedArea={res.area} />
    </div>
  );
}
