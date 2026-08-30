import { NextResponse } from "next/server";
import { REGIONS } from "@/lib/regions";
import { toPyeong } from "@/lib/molit";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

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

  if (!q) return NextResponse.json({ query: q, results: [] });
  if (!["sale", "jeonse", "monthly"].includes(dealType)) {
    return NextResponse.json({ error: `알 수 없는 dealType입니다: ${dealType}` }, { status: 400 });
  }

  let db;
  try {
    db = getDb();
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
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
    return NextResponse.json({ error: `검색 실패: ${error.message}` }, { status: 500 });
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

  return NextResponse.json({ query: q, dealType, results });
}
