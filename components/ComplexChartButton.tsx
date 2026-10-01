"use client";

import { useState } from "react";
import ComplexTrendModal from "@/components/ComplexTrendModal";

/**
 * 단지 페이지에서 "가격 그래프" 팝업을 여는 버튼.
 * 홈 화면에서 단지를 누르면 뜨던 그 팝업(매매·전세 그래프, 평형 바꾸기, 이미지 저장)을 그대로 띄웁니다.
 */
export default function ComplexChartButton({
  code,
  regionName,
  complex,
  areaM2,
  label = "📈 가격 그래프 크게 보기",
}: {
  code: string;
  regionName: string;
  complex: string;
  areaM2?: number;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="chart-open-btn" onClick={() => setOpen(true)}>
        {label}
      </button>
      {open && (
        <ComplexTrendModal
          code={code}
          regionName={regionName}
          complex={complex}
          areaM2={areaM2}
          dealType="sale"
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
