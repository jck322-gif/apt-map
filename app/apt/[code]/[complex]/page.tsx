import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import ComplexDetail from "@/components/ComplexDetail";
import { REGIONS } from "@/lib/regions";
import { SITE_NAME } from "@/lib/site";
import { fmtManwon } from "@/lib/format";
import { loadComplexTrend, complexHref, type ComplexTrend } from "@/lib/complex";

// 단지 페이지는 하루에 한 번만 다시 만듭니다.
// (실거래 신고는 하루 단위로 올라오므로 이 정도면 충분하고, DB 부담도 적습니다.)
export const revalidate = 86400;
export const dynamicParams = true;

function decodeName(v: string): string {
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
}

async function load(code: string, complexRaw: string): Promise<ComplexTrend | null> {
  try {
    return await loadComplexTrend({ code, complex: decodeName(complexRaw), dealType: "sale" });
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: { code: string; complex: string };
}): Promise<Metadata> {
  const region = REGIONS.find((r) => r.code === params.code);
  const name = decodeName(params.complex);
  if (!region) return { title: `${name} 실거래가 | ${SITE_NAME}` };

  const data = await load(params.code, params.complex);
  const latest = data?.stats.latestSale;
  const where = `${region.group}광역시 ${region.name}${data?.dong ? ` ${data.dong}` : ""}`;

  const description = latest
    ? `${where} ${name} 실거래가. 가장 최근 매매는 ${latest.dateLabel} ${fmtManwon(
        latest.priceManwon
      )}(${Math.round(latest.areaM2)}㎡, ${latest.floor}층)입니다. 최근 3년치 매매·전세·월세 실거래 이력과 월별 가격 흐름을 국토교통부 자료로 정리했습니다.`
    : `${where} ${name}의 매매·전세·월세 실거래가를 국토교통부 자료로 정리했습니다.`;

  return {
    title: `${name} 실거래가 — ${region.name} | ${SITE_NAME}`,
    description,
    alternates: { canonical: complexHref(region.code, name) },
    openGraph: { title: `${name} 실거래가 — ${region.name}`, description, type: "article" },
  };
}

export default async function ComplexPage({ params }: { params: { code: string; complex: string } }) {
  const region = REGIONS.find((r) => r.code === params.code);
  if (!region) notFound();

  const data = await load(params.code, params.complex);
  if (!data) notFound();
  if (data.counts.sale + data.counts.jeonse + data.counts.monthly === 0) notFound();

  return (
    <div className="wrap">
      <SiteHeader current="apt" />
      <ComplexDetail data={data} />
    </div>
  );
}
