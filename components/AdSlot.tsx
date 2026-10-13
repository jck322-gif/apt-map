"use client";

import { useEffect, useRef } from "react";
import { ADSENSE_CLIENT } from "@/lib/site";
import { AD_SLOTS, type AdSlotKey } from "@/lib/ads";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

/**
 * 애드센스 디스플레이 광고 한 칸. lib/ads.ts에 슬롯 번호가 없으면 아무것도 그리지 않습니다.
 * 위에 작은 "광고" 표시를 달아 본문·직판 배너와 구분합니다.
 */
export default function AdSlot({
  name,
  format = "auto",
}: {
  name: AdSlotKey;
  /** "auto" = 자리에 맞춰 크기 자동(큰 사각형도 나옴), "horizontal" = 가로로 낮은 띠 모양(높이 90~100px 정도) */
  format?: "auto" | "horizontal";
}) {
  const slot = AD_SLOTS[name];
  const pushed = useRef(false);

  useEffect(() => {
    if (!slot || !ADSENSE_CLIENT || pushed.current) return;
    pushed.current = true;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // 광고 차단기 등으로 실패해도 페이지는 그대로 둡니다.
    }
  }, [slot]);

  if (!slot || !ADSENSE_CLIENT) return null;

  return (
    <aside className={`ad-slot${format === "horizontal" ? " ad-slot-horizontal" : ""}`} aria-label="광고">
      <span className="ad-label">광고</span>
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive={format === "auto" ? "true" : "false"}
      />
    </aside>
  );
}
