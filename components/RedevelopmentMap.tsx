"use client";

import { useEffect, useRef, useState } from "react";
import { loadKakaoSdk } from "@/lib/kakaoSdk";
import { STAGE_ORDER, type RedevelopmentEntry, type RedevelopmentStage } from "@/lib/redevelopment";

declare global {
  interface Window {
    kakao: any;
  }
}

/** 단계별 점 색깔 — 목록 카드의 배지, 범례와 같은 색을 씁니다. */
export const STAGE_COLOR: Record<RedevelopmentStage, string> = {
  기본계획: "#8a949e",
  구역지정: "#7c4dcc",
  추진위원회: "#2f6f9e",
  조합설립: "#2e9a5e",
  사업시행인가: "#d9a520",
  관리처분인가: "#e07a2a",
  착공: "#c23b30",
  준공: "#1b2430",
};
const UNKNOWN_COLOR = "#b9c0c6";

const MAP_HEIGHT = 380;

export default function RedevelopmentMap({
  entries,
  onSelect,
}: {
  entries: RedevelopmentEntry[];
  onSelect: (e: RedevelopmentEntry) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const overlaysRef = useRef<any[]>([]);
  const polygonsRef = useRef<any[]>([]);
  const zoneCacheRef = useRef<Map<string, any[]>>(new Map());
  const zoneTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const entriesRef = useRef(entries);
  entriesRef.current = entries;
  const [failed, setFailed] = useState(false);

  const placed = entries.filter((e) => typeof e.lat === "number" && typeof e.lng === "number");

  // SDK 로드 + 지도 생성 (한 번만)
  useEffect(() => {
    const appkey = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
    if (!appkey || placed.length === 0) {
      setFailed(true);
      return;
    }
    let cancelled = false;

    function initMap() {
      if (cancelled || !containerRef.current || !window.kakao?.maps) return;
      try {
        const lats = placed.map((e) => e.lat as number);
        const lngs = placed.map((e) => e.lng as number);
        const center = new window.kakao.maps.LatLng(
          (Math.min(...lats) + Math.max(...lats)) / 2,
          (Math.min(...lngs) + Math.max(...lngs)) / 2
        );
        const map = new window.kakao.maps.Map(containerRef.current, { center, level: 7 });
        // 점이 모두 보이도록 범위 맞춤 (구역이 하나뿐이면 그냥 중심만)
        if (placed.length > 1) {
          const bounds = new window.kakao.maps.LatLngBounds();
          placed.forEach((e) => bounds.extend(new window.kakao.maps.LatLng(e.lat, e.lng)));
          map.setBounds(bounds, 40);
        }
        mapRef.current = map;
        drawOverlays();
        // 지도를 움직이거나 확대할 때마다(잠깐 멈추면) 그 범위의 구역 경계를 불러옵니다
        window.kakao.maps.event.addListener(map, "idle", scheduleZoneLoad);
        scheduleZoneLoad();
      } catch {
        if (!cancelled) setFailed(true);
      }
    }

    loadKakaoSdk(appkey)
      .then(() => {
        if (cancelled) return;
        window.kakao.maps.load(initMap);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** 지도가 멈추고 0.4초 뒤에 구역 경계를 요청합니다 (드래그 중 연속 요청 방지). */
  function scheduleZoneLoad() {
    if (zoneTimerRef.current) clearTimeout(zoneTimerRef.current);
    zoneTimerRef.current = setTimeout(loadZones, 400);
  }

  async function loadZones() {
    const map = mapRef.current;
    if (!map || !window.kakao?.maps) return;
    // 너무 멀리서 보면(레벨 9 이상) 경계가 점처럼 보여 의미가 없고 데이터만 무거우니 건너뜁니다
    if (map.getLevel() > 8) {
      drawPolygons([]);
      return;
    }
    const b = map.getBounds();
    const sw = b.getSouthWest();
    const ne = b.getNorthEast();
    // 소수점 2자리(≈1km)로 반올림해 같은 범위면 다시 요청하지 않도록 캐시 키를 만듭니다
    const r = (n: number) => Math.round(n * 100) / 100;
    const bbox = `${r(sw.getLng()) - 0.01},${r(sw.getLat()) - 0.01},${r(ne.getLng()) + 0.01},${r(ne.getLat()) + 0.01}`;

    const cached = zoneCacheRef.current.get(bbox);
    if (cached) {
      drawPolygons(cached);
      return;
    }
    try {
      const res = await fetch(`/api/redevelopment-zones?bbox=${bbox}`);
      const json = await res.json();
      const feats: any[] = Array.isArray(json?.features) ? json.features : [];
      zoneCacheRef.current.set(bbox, feats);
      drawPolygons(feats);
    } catch {
      // 경계를 못 가져와도 점 표시는 그대로 두면 됩니다
    }
  }

  /** V-World 속성에서 구역 이름으로 보이는 값을 찾습니다 (필드 이름이 문서에 명확하지 않아 후보를 순서대로 봅니다). */
  function featureName(props: Record<string, unknown> | undefined): string {
    if (!props) return "";
    for (const k of ["dgm_nm", "uname", "prpos_area_dstrc_nm", "dstrc_nm", "area_nm", "name", "nm"]) {
      const v = props[k];
      if (typeof v === "string" && v.trim()) return v.trim();
    }
    for (const v of Object.values(props)) {
      if (typeof v === "string" && /[가-힣]/.test(v) && v.length <= 40) return v.trim();
    }
    return "";
  }

  /** 우리 목록의 구역과 이름으로 짝을 맞춥니다 ("우동3구역" ↔ "우동3 재개발정비구역" 같은 표기 차이를 흡수). */
  function matchEntry(name: string): RedevelopmentEntry | undefined {
    const norm = (t: string) =>
      t.replace(/\s+/g, "").replace(/\(.*?\)/g, "").replace(/(주택)?(재개발|재건축|정비|사업|구역|지구)/g, "");
    const target = norm(name);
    if (!target) return undefined;
    return entriesRef.current.find((e) => {
      const en = norm(e.name);
      return en && (target.includes(en) || en.includes(target));
    });
  }

  function drawPolygons(feats: any[]) {
    const map = mapRef.current;
    if (!map || !window.kakao?.maps) return;
    polygonsRef.current.forEach((p) => p.setMap(null));
    polygonsRef.current = [];

    feats.forEach((f) => {
      const geom = f?.geometry;
      if (!geom) return;
      const rings: number[][][] =
        geom.type === "Polygon" ? [geom.coordinates[0]] :
        geom.type === "MultiPolygon" ? geom.coordinates.map((poly: number[][][]) => poly[0]) : [];
      if (rings.length === 0) return;

      const name = featureName(f.properties);
      const entry = matchEntry(name);
      const color = entry?.stage ? STAGE_COLOR[entry.stage] : "#6b7a86";

      rings.forEach((ring) => {
        const path = ring.map(([lng, lat]) => new window.kakao.maps.LatLng(lat, lng));
        const polygon = new window.kakao.maps.Polygon({
          path,
          strokeWeight: entry ? 2.5 : 1.5,
          strokeColor: color,
          strokeOpacity: 0.95,
          strokeStyle: entry ? "solid" : "shortdash",
          fillColor: color,
          fillOpacity: entry ? 0.28 : 0.12,
        });
        polygon.setMap(map);
        if (entry) {
          window.kakao.maps.event.addListener(polygon, "click", () => onSelect(entry));
          window.kakao.maps.event.addListener(polygon, "mouseover", () => polygon.setOptions({ fillOpacity: 0.45 }));
          window.kakao.maps.event.addListener(polygon, "mouseout", () => polygon.setOptions({ fillOpacity: 0.28 }));
        }
        polygonsRef.current.push(polygon);
      });
    });
  }

  function drawOverlays() {
    const map = mapRef.current;
    if (!map || !window.kakao?.maps) return;
    overlaysRef.current.forEach((ov) => ov.setMap(null));
    overlaysRef.current = [];

    placed.forEach((e) => {
      const color = e.stage ? STAGE_COLOR[e.stage] : UNKNOWN_COLOR;

      const wrap = document.createElement("div");
      wrap.style.cssText = "display:flex;flex-direction:column;align-items:center;gap:2px;cursor:pointer;";

      const dot = document.createElement("div");
      dot.style.cssText = `
        width:16px;height:16px;border-radius:50%;background:${color};
        border:2.5px solid rgba(255,255,255,0.95);box-shadow:0 1px 4px rgba(0,0,0,0.35);
      `;

      const label = document.createElement("div");
      label.textContent = e.name.replace(/\s*\(.*\)$/, ""); // 괄호 안 별칭은 지도에선 생략
      label.style.cssText = `
        font-family:'Noto Sans KR',sans-serif;font-size:10.5px;font-weight:700;
        padding:1px 6px;border-radius:6px;white-space:nowrap;line-height:1.5;
        background:rgba(255,255,255,0.94);color:#1b2430;box-shadow:0 1px 3px rgba(0,0,0,0.25);
      `;

      wrap.appendChild(dot);
      wrap.appendChild(label);
      wrap.onclick = () => onSelect(e);

      const overlay = new window.kakao.maps.CustomOverlay({
        position: new window.kakao.maps.LatLng(e.lat, e.lng),
        content: wrap,
        yAnchor: 0.5,
      });
      overlay.setMap(map);
      overlaysRef.current.push(overlay);
    });
  }

  // 필터로 목록이 바뀌면 점도 다시 그립니다
  useEffect(() => {
    drawOverlays();
    scheduleZoneLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries]);

  if (failed) return null;

  return (
    <div className="redev-map-wrap">
      <div ref={containerRef} style={{ width: "100%", height: MAP_HEIGHT }} />
      <div className="redev-map-legend">
        {STAGE_ORDER.map((s) => (
          <span key={s.stage} className="redev-map-legend-item">
            <span className="redev-map-legend-dot" style={{ background: STAGE_COLOR[s.stage] }} />
            {s.stage}
          </span>
        ))}
      </div>
    </div>
  );
}
