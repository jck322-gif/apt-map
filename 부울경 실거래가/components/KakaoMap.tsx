"use client";

import { useEffect, useRef } from "react";
import type { Region } from "@/lib/regions";

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

const SDK_ID = "kakao-map-sdk";

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

    function initMap() {
      if (!containerRef.current || !window.kakao?.maps) return;
      const bounds = new window.kakao.maps.LatLngBounds();
      regions.forEach((r) => bounds.extend(new window.kakao.maps.LatLng(r.lat, r.lng)));
      const map = new window.kakao.maps.Map(containerRef.current, {
        center: new window.kakao.maps.LatLng(35.35, 129.15),
        level: 9,
      });
      map.setBounds(bounds);
      mapRef.current = map;
    }

    if (window.kakao?.maps) {
      window.kakao.maps.load(initMap);
      return;
    }

    if (document.getElementById(SDK_ID)) return; // 이미 로딩 중

    const script = document.createElement("script");
    script.id = SDK_ID;
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appkey}&autoload=false`;
    script.onload = () => window.kakao.maps.load(initMap);
    script.onerror = () => onError();
    document.head.appendChild(script);
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
      const size = Math.round(26 + (r.count / maxCount) * 26);
      const color = r.trendPct === null ? "#5b6b66" : r.trendPct >= 0 ? "#c23b30" : "#2f6f9e";
      const el = document.createElement("div");
      el.style.cssText = `
        width:${size}px;height:${size}px;border-radius:50%;
        background:${color};opacity:${dimmed ? 0.28 : 0.92};
        display:flex;align-items:center;justify-content:center;
        color:#fff;font-family:'IBM Plex Mono',ui-monospace,monospace;font-weight:700;
        font-size:${Math.max(10, size * 0.36)}px;cursor:pointer;
        border:${selectedCode === r.code ? "2.5px solid #1b2430" : "none"};
        box-shadow:0 1px 4px rgba(0,0,0,0.25);
      `;
      el.textContent = String(r.count);
      el.onclick = () => onSelect(r.code);

      const overlay = new window.kakao.maps.CustomOverlay({
        position: new window.kakao.maps.LatLng(r.lat, r.lng),
        content: el,
        yAnchor: 0.5,
      });
      overlay.setMap(map);
      overlaysRef.current.push(overlay);
    });
  }, [regions, selectedCode, filter, onSelect]);

  return <div ref={containerRef} style={{ width: "100%", height: 320 }} />;
}
