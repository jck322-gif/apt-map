import { NextResponse } from "next/server";
import { REGIONS } from "@/lib/regions";
import { toPyeong } from "@/lib/molit";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic"; // 캐시하지 않고 요청마다 새로 실행
// force-dynamic만으로는 부족합니다. Next.js는 서버가 DB에 보내는 요청까지 따로 캐시해 두는데,
// 그러면 새벽에 새 실거래가 들어와도 API가 어제 만든 응답을 그대로 돌려줍니다(실제로 겪었습니다).
// 아래 두 줄과 응답의 Cache-Control 헤더까지 있어야 Next·Vercel CDN·브라우저 세 군데가 모두 막힙니다.
export const fetchCache = "force-no-store";
export const revalidate = 0;

/** 어디에도 저장하지 말라고 못박는 응답 헤더 */
const NO_STORE = { "Cache-Control": "no-store, max-age=0, must-revalidate" } as const;

type DealTypeParam = "sale" | "jeonse" | "monthly";

const LIMIT = 60;

type TypeRow = {
  region_code: string;
  complex: string;
  area_m2: number | string;
  dong: string;
  floor: number;
  deal_date: string;
  price_manwon: number | null;
  deposit_manwon: number | null;
  monthly_rent_manwon: number | null;
};

const REGION_BY_CODE = new Map(REGIONS.map((r) => [r.code, r]));

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();
  const dealType = (searchParams.get("dealType") ?? "sale") as DealTypeParam;

  if (!q) return NextResponse.json({ query: q, results: [] }, { headers: NO_STORE });
  if (!["sale", "jeonse", "monthly"].includes(dealType)) {
    return NextResponse.json({ error: `알 수 없는 dealType입니다: ${dealType}` }, { status: 400, headers: NO_STORE });
  }

  let db;
  try {
    db = getDb();
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500, headers: NO_STORE });
  }

  // 단지명 또는 동 이름으로 찾되, 같은 단지라도 평형(타입)이 다르면 따로 보여줍니다.
  // %, _ 는 검색 패턴에서 특별한 뜻을 가지므로 그대로 찾도록 이스케이프합니다.
  const pattern = `%${q.replace(/[%_\\]/g, (m) => `\\${m}`)}%`;

  const { data, error } = await db
    .from("complex_types")
    .select("region_code, complex, area_m2, dong, floor, deal_date, price_manwon, deposit_manwon, monthly_rent_manwon")
    .eq("deal_type", dealType)
    .or(`complex.ilike.${pattern},dong.ilike.${pattern}`)
    .order("deal_date", { ascending: false })
    .limit(LIMIT);

  if (error) {
    return NextResponse.json({ error: `검색 실패: ${error.message}` }, { status: 500, headers: NO_STORE });
  }

  const rows = (data ?? []) as TypeRow[];

  const results = rows
    .map((r) => {
      const region = REGION_BY_CODE.get(r.region_code);
      if (!region) return null;
      const areaM2 = Number(r.area_m2);
      const [y, m, d] = r.deal_date.split("-").map(Number);
      return {
        regionCode: r.region_code,
        regionName: region.name,
        group: region.group,
        dong: r.dong,
        complex: r.complex,
        areaM2,
        pyeong: toPyeong(areaM2),
        floor: r.floor,
        date: `${m}/${d}`,
        dealYmd: y * 10000 + m * 100 + d,
        priceManwon: r.price_manwon,
        depositManwon: r.deposit_manwon,
        monthlyRentManwon: r.monthly_rent_manwon,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    // 같은 단지의 평형들이 흩어지지 않도록 단지명 → 평형 순으로 정렬
    .sort((a, b) => a.complex.localeCompare(b.complex, "ko") || a.areaM2 - b.areaM2);

  return NextResponse.json({ query: q, dealType, results }, { headers: NO_STORE });
}
