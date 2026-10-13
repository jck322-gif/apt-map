"use client";

import { useEffect, useRef, useState } from "react";
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
  // 실제 광고 모양은 화면 폭을 본 뒤에 정합니다. 휴대폰에서 가로형(728px)을 요청하면 광고가 화면보다 넓어져
  // 페이지 전체가 축소돼 보이는 문제가 있어서, 좁은 화면에서는 항상 자동 크기(화면 폭에 맞춤)로 바꿉니다.
  const [actualFormat, setActualFormat] = useState<"auto" | "horizontal" | null>(null);

  useEffect(() => {
    // 휴대폰은 가로로 돌리면 잠깐 넓어지므로, 지금 폭이 아니라 기기 화면의 짧은 쪽 길이로 판단합니다.
    // (가로 상태에서 넓은 광고를 받은 뒤 세로로 돌리면 광고가 화면을 넘쳐 페이지가 축소돼 보였습니다.)
    const shortSide = Math.min(window.screen?.width ?? 9999, window.screen?.height ?? 9999);
    const narrow = shortSide < 760 || window.matchMedia("(max-width: 760px)").matches;
    setActualFormat(format === "horizontal" && !narrow ? "horizontal" : "auto");
  }, [format]);

  useEffect(() => {
    if (!actualFormat || !slot || !ADSENSE_CLIENT || pushed.current) return;
    pushed.current = true;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // 광고 차단기 등으로 실패해도 페이지는 그대로 둡니다.
    }
  }, [actualFormat, slot]);

  if (!slot || !ADSENSE_CLIENT) return null;

  return (
    <aside className={`ad-slot${format === "horizontal" ? " ad-slot-horizontal" : ""}`} aria-label="광고">
      <span className="ad-label">광고</span>
      {actualFormat && (
        <ins
          className="adsbygoogle"
          style={{ display: "block", width: "100%", maxWidth: "100%" }}
          data-ad-client={ADSENSE_CLIENT}
          data-ad-slot={slot}
          data-ad-format={actualFormat}
          data-full-width-responsive={actualFormat === "auto" ? "true" : "false"}
        />
      )}
    </aside>
  );
}
