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

  // ?find=정비  → V-World가 제공하는 전체 레이어 목록(WMS GetCapabilities)에서 이름에 그 글자가
  // 들어간 레이어를 찾아 보여줍니다. 정비구역 레이어 ID를 모를 때 한 번 쓰는 용도입니다.
  const find = searchParams.get("find");
  if (find) {
    try {
      const capUrl = `https://api.vworld.kr/req/wms?service=WMS&request=GetCapabilities&version=1.3.0&key=${key}&domain=https://buulapt.com`;
      const res = await fetch(capUrl, { cache: "no-store" });
      const xml = await res.text();
      const found: { name: string; title: string }[] = [];
      const re = /<Layer[^>]*>[\s\S]*?<Name>([^<]+)<\/Name>[\s\S]*?<Title>([^<]*)<\/Title>/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(xml)) !== null) {
        if (m[2].includes(find) || m[1].includes(find)) found.push({ name: m[1], title: m[2] });
      }
      return NextResponse.json({ httpStatus: res.status, matched: found, totalLength: xml.length, head: xml.slice(0, 1500) });
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : "요청 실패" });
    }
  }

  if (!bbox) {
    return NextResponse.json({ features: [], error: "bbox 파라미터가 없거나 범위가 너무 넓습니다." }, { status: 400 });
  }

  const qs = new URLSearchParams({
    service: "data",
    request: "GetFeature",
    data: layer,
    key,
    format: "json",
    crs: "EPSG:4326",
    size: "1000",
    page: "1",
  });

  // V-World는 인증키를 "등록한 서비스 URL"과 짝지어 검사합니다. 서버에서 부를 때는 브라우저처럼
  // Referer가 없으므로 domain 파라미터로 알려줘야 하는데, 등록 화면에 적은 형태(https:// 포함 여부,
  // www 여부)와 정확히 같아야 통과합니다. 어떤 형태로 등록했는지 모르니 후보를 순서대로 시도합니다.
  const DOMAIN_CANDIDATES = [
    process.env.VWORLD_DOMAIN,
    "https://buulapt.com",
    "buulapt.com",
    "https://buulapt.com/",
    "www.buulapt.com",
    "https://www.buulapt.com",
  ].filter((d): d is string => !!d);

  async function fetchVworld(): Promise<{ res: Response; text: string; proto: string; domain: string }> {
    let lastErr: unknown = null;
    let last: { res: Response; text: string; proto: string; domain: string } | null = null;
    for (const domain of DOMAIN_CANDIDATES) {
      for (const url of [VWORLD_URL, VWORLD_URL.replace("https://", "http://")]) {
        try {
          // 브라우저에서 주소창에 직접 쳤을 때(Referer 없음)는 통과했으므로, 서버에서도 Referer 없이 보냅니다.
          // ⚠️ URLSearchParams는 domain의 "https://" 를 %3A%2F%2F 로 바꿔 보내는데, V-World는 이걸
          // 풀지 않고 글자 그대로 비교해서 "등록되지 않은 인증키"로 거부합니다(브라우저 주소창에 그대로
          // 쳤을 때는 통과한 이유). 그래서 domain·geomFilter는 인코딩 없이 직접 붙입니다.
          const query = `${qs.toString()}&domain=${domain}&geomFilter=BOX(${bbox!.join(",")})`;
          const res = await fetch(`${url}?${query}`, { cache: "no-store" });
          const text = await res.text();
          last = { res, text, proto: url.startsWith("https") ? "https" : "http", domain };
          // 인증키 오류(INVALID_KEY)면 다음 domain 후보로, 그 외에는 이 결과를 그대로 씁니다
          if (!/INVALID_KEY/.test(text)) return last;
          break; // 같은 domain으로 http를 또 시도할 필요는 없음
        } catch (e) {
          lastErr = e;
        }
      }
    }
    if (last) return last;
    throw lastErr;
  }

  try {
    const { res, text, proto, domain } = await fetchVworld();

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
      return NextResponse.json({ layer, proto, domain, keyTail: key.slice(-6), httpStatus: res.status, count, firstProps, rawSample: text.slice(0, 1200) });
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
    // undici의 "fetch failed"는 진짜 원인(DNS·인증서·연결 거부 등)을 cause 안에 숨겨두므로 같이 보여줍니다.
    const cause = (e as { cause?: { code?: string; message?: string } })?.cause;
    const detail = cause ? ` (${cause.code ?? ""} ${cause.message ?? ""})`.trim() : "";
    return NextResponse.json({ features: [], error: `${e instanceof Error ? e.message : "요청 실패"}${detail}` });
  }
}
