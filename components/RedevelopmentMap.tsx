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
