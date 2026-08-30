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

// 지도를 부산/울산 두 칸으로 나눠 보여주면서 KakaoMap 인스턴스가 동시에 여러 개 마운트되므로,
// SDK 스크립트는 페이지 전체에서 딱 한 번만 추가하고 모든 인스턴스가 같은 로딩 완료를
// 기다리도록 모듈 스코프에서 공유합니다 (그렇지 않으면 두 번째 지도가 초기화되지 않는 문제가 생김).
let kakaoSdkPromise: Promise<void> | null = null;

function loadKakaoSdk(appkey: string): Promise<void> {
  if (typeof window !== "undefined" && window.kakao?.maps) return Promise.resolve();
  if (kakaoSdkPromise) return kakaoSdkPromise;

  const promise = new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(SDK_ID) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Kakao SDK 로드 실패")));
      return;
    }
    const script = document.createElement("script");
    script.id = SDK_ID;
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appkey}&autoload=false`;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Kakao SDK 로드 실패"));
    document.head.appendChild(script);
  });

  kakaoSdkPromise = promise;
  // 실패했으면 다음 시도에서 다시 로드할 수 있도록 캐시를 초기화 (반환하는 promise 자체는 그대로 reject됨)
  promise.catch(() => {
    kakaoSdkPromise = null;
  });

  return promise;
}

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
      const bounds = new window.kakao.maps.LatLngBounds();
      regions.forEach((r) => bounds.extend(new window.kakao.maps.LatLng(r.lat, r.lng)));
      const map = new window.kakao.maps.Map(containerRef.current, {
        center: new window.kakao.maps.LatLng(35.35, 129.15),
        level: 9,
      });
      map.setBounds(bounds);
      mapRef.current = map;
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

  return <div ref={containerRef} style={{ width: "100%", height: 320 }} />;
}
