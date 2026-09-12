import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * 재개발·재건축 "구역 경계"를 국토부 V-World 2D 데이터 API에서 가져와 그대로 넘겨줍니다.
 * (도시계획정보(UPIS) 중 정비구역 레이어. 브라우저에서 직접 부르면 키가 노출되고 도메인 제한에
 *  걸리므로 서버에서 대신 불러줍니다.)
 *
 * 필요한 환경변수
 *   VWORLD_API_KEY    — vworld.go.kr 에서 발급한 인증키 (서비스 URL에 buulapt.com 등록)
 *   VWORLD_ZONE_LAYER — (선택) 정비구역 레이어 ID. 기본값은 아래 DEFAULT_LAYER.
 *
 * 사용법
 *   /api/redevelopment-zones?bbox=minLng,minLat,maxLng,maxLat       → GeoJSON features 배열
 *   /api/redevelopment-zones?bbox=...&debug=1[&layer=LT_C_XXXX]      → 원문 일부 + 첫 항목 속성
 *     (어느 레이어가 정비구역인지 확인할 때 씁니다. 배포 후 한 번 열어보고 맞으면 그대로 두면 됩니다.)
 */
const DEFAULT_LAYER = "LT_C_UPISUQ174";
const VWORLD_URL = "https://api.vworld.kr/req/data";

function parseBbox(raw: string | null): [number, number, number, number] | null {
  if (!raw) return null;
  const parts = raw.split(",").map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) return null;
  const [minLng, minLat, maxLng, maxLat] = parts;
  // 한 번에 너무 넓은 범위를 요청하면 응답이 수 MB가 되므로 제한합니다 (약 0.5도 ≈ 45km).
  if (maxLng - minLng > 0.6 || maxLat - minLat > 0.6) return null;
  return [minLng, minLat, maxLng, maxLat];
}

export async function GET(request: Request) {
  const key = process.env.VWORLD_API_KEY;
  const { searchParams } = new URL(request.url);
  const bbox = parseBbox(searchParams.get("bbox"));
  const debug = searchParams.get("debug") === "1";
  const layer = searchParams.get("layer") || process.env.VWORLD_ZONE_LAYER || DEFAULT_LAYER;

  if (!key) {
    return NextResponse.json({ features: [], error: "VWORLD_API_KEY 환경변수가 없습니다." });
  }
  if (!bbox) {
    return NextResponse.json({ features: [], error: "bbox 파라미터가 없거나 범위가 너무 넓습니다." }, { status: 400 });
  }

  const qs = new URLSearchParams({
    service: "data",
    request: "GetFeature",
    data: layer,
    key,
    domain: "buulapt.com",
    format: "json",
    crs: "EPSG:4326",
    geomFilter: `BOX(${bbox[0]},${bbox[1]},${bbox[2]},${bbox[3]})`,
    size: "1000",
    page: "1",
  });

  try {
    const res = await fetch(`${VWORLD_URL}?${qs.toString()}`, { cache: "no-store" });
    const text = await res.text();

    if (debug) {
      let firstProps: unknown = null;
      let count: number | null = null;
      try {
        const j = JSON.parse(text);
        const feats = j?.response?.result?.featureCollection?.features;
        if (Array.isArray(feats)) {
          count = feats.length;
          firstProps = feats[0]?.properties ?? null;
        }
      } catch {
        // 원문이 JSON이 아니면 아래 rawSample 로만 보여줍니다
      }
      return NextResponse.json({ layer, httpStatus: res.status, count, firstProps, rawSample: text.slice(0, 1200) });
    }

    if (!res.ok) {
      return NextResponse.json({ features: [], error: `V-World HTTP ${res.status}` });
    }
    const json = JSON.parse(text);
    const status = json?.response?.status;
    if (status && status !== "OK") {
      // V-World는 결과가 없을 때 status "NOT_FOUND" 를 돌려줍니다 — 오류가 아닙니다.
      return NextResponse.json(
        { features: [], error: status === "NOT_FOUND" ? null : String(json?.response?.error?.text ?? status) },
        { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" } }
      );
    }
    const features = json?.response?.result?.featureCollection?.features ?? [];
    return NextResponse.json(
      { features, error: null },
      { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" } }
    );
  } catch (e) {
    return NextResponse.json({ features: [], error: e instanceof Error ? e.message : "요청 실패" });
  }
}
