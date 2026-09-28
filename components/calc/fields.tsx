"use client";

import { useEffect, useState } from "react";
import { wonKo } from "@/lib/calc";

/** 숫자만 받는 금액 칸. 만원 단위로 입력받고, 아래에 "7억 5,000만원"처럼 읽어 줍니다. */
export function ManwonField({
  label,
  value,
  onChange,
  hint,
  id,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  hint?: string;
  id: string;
}) {
  const [text, setText] = useState(value ? value.toLocaleString("ko-KR") : "");
  useEffect(() => {
    const cur = Number(text.replace(/[^\d]/g, "")) || 0;
    if (cur !== value) setText(value ? value.toLocaleString("ko-KR") : "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <div className="calc-field">
      <label htmlFor={id}>{label}</label>
      <div className="calc-input-row">
        <input
          id={id}
          className="calc-input"
          inputMode="numeric"
          autoComplete="off"
          value={text}
          placeholder="0"
          onChange={(e) => {
            const digits = e.target.value.replace(/[^\d]/g, "").slice(0, 9);
            const n = Number(digits) || 0;
            setText(n ? n.toLocaleString("ko-KR") : "");
            onChange(n);
          }}
        />
        <span className="calc-unit">만원</span>
      </div>
      <span className="calc-hint">{value > 0 ? `= ${wonKo(value * 10000)}` : hint ?? " "}</span>
    </div>
  );
}

export function NumberField({
  label,
  value,
  onChange,
  unit,
  step = 0.1,
  min = 0,
  max,
  id,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  unit: string;
  step?: number;
  min?: number;
  max?: number;
  id: string;
}) {
  return (
    <div className="calc-field">
      <label htmlFor={id}>{label}</label>
      <div className="calc-input-row">
        <input
          id={id}
          className="calc-input"
          type="number"
          inputMode="decimal"
          step={step}
          min={min}
          max={max}
          value={Number.isFinite(value) ? value : ""}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        <span className="calc-unit">{unit}</span>
      </div>
    </div>
  );
}

/** 몇 개 중 하나를 고르는 버튼 묶음 */
export function Choice<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div className="calc-field">
      <span className="calc-label">{label}</span>
      <div className="calc-choice" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button
            type="button"
            key={o.value}
            role="radio"
            aria-checked={value === o.value}
            className={`calc-choice-btn${value === o.value ? " is-on" : ""}`}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Check({
  label,
  checked,
  onChange,
  desc,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  desc?: string;
}) {
  return (
    <label className="calc-check">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>
        {label}
        {desc && <small>{desc}</small>}
      </span>
    </label>
  );
}

/** 주소 뒤 ?price=75000 같은 값을 처음 한 번 읽어 옵니다 (단지 페이지에서 넘어올 때). */
export function readQueryNumber(key: string): number | null {
  if (typeof window === "undefined") return null;
  const v = new URLSearchParams(window.location.search).get(key);
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}
