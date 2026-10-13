import type { Metadata } from "next";
import { THIN_COMPLEX_MIN, NOINDEX } from "@/lib/thin";
import { notFound } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import ComplexDetail from "@/components/ComplexDetail";
import JsonLd from "@/components/JsonLd";
import { REGIONS } from "@/lib/regions";
import { SITE_NAME, SITE_URL, OG_IMAGE } from "@/lib/site";
import { eokShort, ymdMonthLabel, fmtManwon, aptLabel } from "@/lib/format";
import { loadComplexTrend, listNearbyComplexes, complexHref, ComplexError, type ComplexTrend } from "@/lib/complex";

// 단지 페이지는 하루에 한 번만 다시 만듭니다.
// (실거래 신고는 하루 단위로 올라오므로 이 정도면 충분하고, DB 부담도 적습니다.)
export const revalidate = 86400;
export const dynamicParams = true;

function decodeName(v: string): string {
  try {
    // 한글 자모가 풀어진 형태(NFD)로 들어온 주소도 같은 단지로 보도록 NFC로 맞춥니다.
    // (같은 단지가 주소 두 개로 잡혀 "표준(canonical) 없는 중복 페이지"가 되는 것을 막습니다.)
    return decodeURIComponent(v).normalize("NFC");
  } catch {
    return v.normalize("NFC");
  }
}

async function load(code: string, complexRaw: string): Promise<ComplexTrend | null> {
  try {
    return await loadComplexTrend({ code, complex: decodeName(complexRaw), dealType: "sale" });
  } catch (err) {
    // 잘못된 주소(400)만 "없는 페이지"로 처리합니다. 데이터베이스가 잠깐 응답하지 않은 경우까지
    // 404로 보내면 구글이 멀쩡한 단지 페이지를 "없어진 페이지"로 알고 검색에서 빼버립니다.
    // 오류를 그대로 던지면 서버 오류(500)가 되어 구글이 나중에 다시 오고, 이미 만들어 둔
    // 페이지가 있으면 Next.js가 그 마지막 정상 페이지를 계속 보여줍니다.
    if (err instanceof ComplexError && err.status < 500) return null;
    throw err;
  }
}

function totalDeals(d: { counts: { sale: number; jeonse: number; monthly: number } }): number {
  return d.counts.sale + d.counts.jeonse + d.counts.monthly;
}

/** 제목에 쓸 대표 평형: 84㎡대(83~86㎡)에 매매가 있으면 그것, 없으면 최근 1년(없으면 3년) 매매가 가장 많은 평형 */
function representativeArea(data: ComplexTrend | null) {
  const list = (data?.insights.areaStats ?? []).filter((a) => a.latest);
  if (list.length === 0) return null;
  const k84 = list
    .filter((a) => a.areaM2 >= 83 && a.areaM2 < 86)
    .sort((a, b) => b.count12m - a.count12m || b.count3y - a.count3y)[0];
  if (k84) return k84;
  return [...list].sort((a, b) => b.count12m - a.count12m || b.count3y - a.count3y)[0];
}

export async function generateMetadata({
  params,
}: {
  params: { code: string; complex: string };
}): Promise<Metadata> {
  const region = REGIONS.find((r) => r.code === params.code);
  const name = decodeName(params.complex);
  const label = aptLabel(name);
  if (!region) return { title: `${label} 실거래가 | ${SITE_NAME}` };

  const data = await load(params.code, params.complex);
  const latest = data?.stats.latestSale;
  const where = `${region.group}광역시 ${region.name}${data?.dong ? ` ${data.dong}` : ""}`;

  // 검색 결과 제목에는 "대표 평형"의 최근 거래가를 넣습니다. 그냥 가장 최근 거래를 쓰면
  // 소형 평형 가격이 제목에 나와 단지 시세가 싸 보이는 문제가 있었습니다 (예: 삼익비치 "7억(42㎡)").
  // 대표 평형 = 84㎡대가 있으면 84㎡, 없으면 최근 1년 매매가 가장 많은 평형.
  // (예: "삼익비치 실거래가·시세 84㎡ 11.5억(26년 9월) — 수영구 남천동")
  const m12 = data?.insights.volume.m12 ?? 0;
  const high = data?.stats.highSale;
  const rep = representativeArea(data);
  const title = rep?.latest
    ? `${label} 실거래가·시세 ${Math.round(rep.areaM2)}㎡ ${eokShort(rep.latest.priceManwon)}(${ymdMonthLabel(rep.latest.ymd)}) — ${region.name}${data?.dong ? ` ${data.dong}` : ""}`
    : latest
    ? `${label} 실거래가·시세 ${eokShort(latest.priceManwon)}(${Math.round(latest.areaM2)}㎡·${ymdMonthLabel(latest.ymd)}) — ${region.name}${data?.dong ? ` ${data.dong}` : ""}`
    : `${label} 실거래가·시세 — ${region.name}`;

  const description = latest
    ? `${where} ${label} 최근 매매 ${latest.dateLabel} ${fmtManwon(latest.priceManwon)}(${Math.round(
        latest.areaM2
      )}㎡ ${latest.floor}층).${m12 > 0 ? ` 최근 1년 매매 ${m12}건.` : ""}${
        high && high !== latest ? ` 같은 평형 3년 최고가 ${fmtManwon(high.priceManwon)}.` : ""
      } 매매·전세·월세 실거래 이력과 가격 흐름을 국토교통부 자료로 매일 갱신합니다.`
    : `${where} ${label}의 매매·전세·월세 실거래가를 국토교통부 자료로 정리했습니다.`;

  return {
    title: `${title} | ${SITE_NAME}`,
    description,
    alternates: { canonical: complexHref(region.code, name) },
    openGraph: { title, description, type: "article", images: [OG_IMAGE] },
    // 3년 동안 거래가 몇 건 없는 단지는 내용이 얇아 검색엔진에는 올리지 않습니다 (lib/thin.ts).
    ...(data && totalDeals(data) < THIN_COMPLEX_MIN ? { robots: NOINDEX } : {}),
  };
}

export default async function ComplexPage({ params }: { params: { code: string; complex: string } }) {
  const region = REGIONS.find((r) => r.code === params.code);
  if (!region) notFound();

  const data = await load(params.code, params.complex);
  if (!data) notFound();
  if (data.counts.sale + data.counts.jeonse + data.counts.monthly === 0) notFound();

  const name = decodeName(params.complex);
  // 같은 동의 다른 단지 — 페이지 아래 "주변 단지" 링크로 보여줍니다.
  const nearby = await listNearbyComplexes(region.code, data.dong, data.complex);
  // "홈 > 지역 > 단지" 탐색 경로를 구글에 알려줍니다 (검색결과에 경로가 표시될 수 있습니다).
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: SITE_NAME, item: SITE_URL },
          {
            "@type": "ListItem",
            position: 2,
            name: `${region.group}광역시 ${region.name}`,
            item: `${SITE_URL}/apt/${region.code}`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: aptLabel(name),
            item: `${SITE_URL}${complexHref(region.code, name)}`,
          },
        ],
      },
    ],
  };

  return (
    <div className="wrap">
      <JsonLd data={jsonLd} />
      <SiteHeader current="apt" />
      <ComplexDetail data={data} nearby={nearby} />
    </div>
  );
}
