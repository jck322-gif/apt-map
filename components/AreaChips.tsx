"use client";

/** 평형 고르기 버튼 줄 — "전체" + 전용㎡ 타입들. 흔히 쓰는 평수(공급 기준 어림)도 같이 보여줍니다. */
export function roundAreas(types: number[]): number[] {
  return Array.from(new Set(types.map((a) => Math.round(a)))).sort((a, b) => a - b);
}

// 전용 84㎡ ≈ 공급 34평처럼, 전용면적에 1.33을 곱해 평으로 바꾼 어림값
const pyeong = (a: number) => Math.round((a * 1.33) / 3.3058);

export default function AreaChips({
  areas,
  value,
  onChange,
}: {
  areas: number[];
  /** 고른 전용㎡. 빈 문자열이면 전체 */
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="area-chips" role="group" aria-label="평형 고르기">
      <button type="button" className="area-chip" aria-pressed={value === ""} onClick={() => onChange("")}>
        <b>전체 평형</b>
      </button>
      {areas.map((a) => (
        <button
          key={a}
          type="button"
          className="area-chip"
          aria-pressed={value === String(a)}
          onClick={() => onChange(String(a))}
        >
          <b>약 {pyeong(a)}평</b>
          <small>전용 {a}㎡</small>
        </button>
      ))}
    </div>
  );
}
