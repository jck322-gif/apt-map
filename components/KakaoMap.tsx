"use client";

import { useEffect, useRef } from "react";
import type { Region } from "@/lib/regions";
import { loadKakaoSdk } from "@/lib/kakaoSdk";

declare global {
  interface Window {
    kakao: any;
  }
}

type MapRegion = Region & { count: number; trendPct: number | null };

type Props = {
  regions: MapRegion[];
  selectedCode: string | null;
  filter: "전체" | "부산" | "울산";
  onSelect: (code: string) => void;
  onError: () => void;
};

// 카카오 지도 축척 레벨 — 9 = 축척 막대 4km. 숫자를 키우면 더 넓게, 줄이면 더 크게 보입니다.
const MAP_LEVEL = 9;
// 지도 높이(px). 축척을 고정했으므로 높이를 넉넉히 줘야 지역이 잘리지 않습니다.
const MAP_HEIGHT = 380;

export default function KakaoMap({ regions, selectedCode, filter, onSelect, onError }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const overlaysRef = useRef<any[]>([]);

  // SDK 로드 + 지도 최초 생성
  useEffect(() => {
    const appkey = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
    if (!appkey) {
      onError();
      return;
    }

    let cancelled = false;

    function initMap() {
      if (cancelled || !containerRef.current || !window.kakao?.maps) return;
      try {
        // 부산·울산 지도의 축척을 똑같이 맞춥니다 (자동 맞춤을 쓰면 두 지도의 배율이 달라져
        // 원 크기를 서로 비교하기 어렵습니다). MAP_LEVEL 9 = 축척 막대 4km.
        // 카카오 지도의 LatLngBounds에는 getCenter()가 없으므로 중심을 직접 계산합니다.
        const lats = regions.map((r) => r.lat);
        const lngs = regions.map((r) => r.lng);
        const centerLat = lats.length ? (Math.min(...lats) + Math.max(...lats)) / 2 : 35.35;
        const centerLng = lngs.length ? (Math.min(...lngs) + Math.max(...lngs)) / 2 : 129.15;

        const map = new window.kakao.maps.Map(containerRef.current, {
          center: new window.kakao.maps.LatLng(centerLat, centerLng),
          level: MAP_LEVEL,
        });
        mapRef.current = map;
      } catch {
        // 지도를 못 만들면 빈 상자 대신 개념도(SVG)가 나오도록 알립니다.
        if (!cancelled) onError();
      }
    }

    loadKakaoSdk(appkey)
      .then(() => {
        if (cancelled) return;
        window.kakao.maps.load(initMap);
      })
      .catch(() => {
        if (!cancelled) onError();
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 지역 데이터(건수·추세) 또는 필터가 바뀔 때마다 커스텀 오버레이 다시 그리기
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !window.kakao?.maps) return;

    overlaysRef.current.forEach((ov) => ov.setMap(null));
    overlaysRef.current = [];

    const maxCount = Math.max(1, ...regions.map((r) => r.count));

    regions.forEach((r) => {
      const dimmed = filter !== "전체" && r.group !== filter;
      const selected = selectedCode === r.code;
      const size = Math.round(26 + (r.count / maxCount) * 26);
      const color = r.trendPct === null ? "#5b6b66" : r.trendPct >= 0 ? "#c23b30" : "#2f6f9e";

      // 동그라미(거래 건수) + 그 아래 지역명 라벨을 세로로 묶습니다.
      const wrap = document.createElement("div");
      wrap.style.cssText = `
        display:flex;flex-direction:column;align-items:center;gap:3px;
        cursor:pointer;opacity:${dimmed ? 0.3 : 1};
        ${selected ? "z-index:5;" : ""}
      `;

      const bubble = document.createElement("div");
      bubble.style.cssText = `
        width:${size}px;height:${size}px;border-radius:50%;
        background:${color};
        display:flex;align-items:center;justify-content:center;
        color:#fff;font-family:'IBM Plex Mono',ui-monospace,monospace;font-weight:700;
        font-size:${Math.max(10, size * 0.36)}px;
        border:${selected ? "3px solid #1b2430" : "2px solid rgba(255,255,255,0.85)"};
        box-shadow:${selected ? "0 0 0 4px rgba(217,102,63,0.55), 0 2px 6px rgba(0,0,0,0.3)" : "0 1px 4px rgba(0,0,0,0.25)"};
        transform:${selected ? "scale(1.12)" : "none"};
      `;
      bubble.textContent = String(r.count);

      const label = document.createElement("div");
      label.textContent = r.name;
      label.style.cssText = `
        font-family:'Noto Sans KR',sans-serif;font-size:10.5px;font-weight:700;
        padding:1px 6px;border-radius:6px;white-space:nowrap;line-height:1.5;
        background:${selected ? "#1b2430" : "rgba(255,255,255,0.94)"};
        color:${selected ? "#fff" : "#1b2430"};
        box-shadow:0 1px 3px rgba(0,0,0,0.25);
      `;

      wrap.appendChild(bubble);
      wrap.appendChild(label);
      wrap.onclick = () => onSelect(r.code);

      const overlay = new window.kakao.maps.CustomOverlay({
        position: new window.kakao.maps.LatLng(r.lat, r.lng),
        content: wrap,
        yAnchor: 0.5,
      });
      overlay.setMap(map);
      overlaysRef.current.push(overlay);
    });
  }, [regions, selectedCode, filter, onSelect]);

  return <div ref={containerRef} style={{ width: "100%", height: MAP_HEIGHT }} />;
}
