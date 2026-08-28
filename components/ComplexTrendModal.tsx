"use client";

import { useEffect, useState } from "react";
import { fmtManwon, fmtManwonShort } from "@/lib/format";

type MonthlyPoint = {
  ymd: string;
  label: string;
  avgPriceManwon: number | null;
  minPriceManwon: number | null;
  maxPriceManwon: number | null;
  count: number;
};

type TrendResponse = {
  code: string;
  regionName: string;
  group: "부산" | "울산";
  complex: string;
  dealType: "sale" | "jeonse" | "monthly";
  points: MonthlyPoint[];
  errors: { ymd: string; message: string }[];
};

const VALUE_LABEL: Record<string, string> = { sale: "매매가", jeonse: "보증금", monthly: "월세" };

// 차트 도형 계산용 상수 (viewBox 좌표계, CSS로 반응형 확대/축소됨)
const W = 600;
const H = 220;
const PAD = { top: 20, right: 16, bottom: 30, left: 54 };

function buildScale(values: number[]) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min === max) {
    // 값이 전부 같으면(또는 점이 1개면) 위아래로 여유를 둬서 평평한 선이 중앙에 오게 함
    const pad = Math.max(min * 0.1, 1);
    return { min: min - pad, max: max + pad };
  }
  const pad = (max - min) * 0.15;
  return { min: min - pad, max: max + pad };
}

export default function ComplexTrendModal({
  code,
  regionName,
  complex,
  dealType,
  onClose,
}: {
  code: string;
  regionName: string;
  complex: string;
  dealType: "sale" | "jeonse" | "monthly";
  onClose: () => void;
}) {
  const [state, setState] = useState<{
    loading: boolean;
    error: string | null;
    data: TrendResponse | null;
  }>({ loading: true, error: null, data: null });
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    setState({ loading: true, error: null, data: null });
    setActiveIdx(null);
    fetch(`/api/complex-trend?code=${code}&complex=${encodeURIComponent(complex)}&dealType=${dealType}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? `요청 실패 (${res.status})`);
        if (!cancelled) setState({ loading: false, error: null, data: json as TrendResponse });
      })
      .catch((err) => {
        if (!cancelled) {
          setState({ loading: false, error: err instanceof Error ? err.message : String(err), data: null });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [code, complex, dealType]);

  const points = state.data?.points ?? [];
  const withValue = points.filter((p) => p.avgPriceManwon !== null) as (MonthlyPoint & { avgPriceManwon: number })[];

  let chart: React.ReactNode = null;
  if (withValue.length > 0) {
    const scale = buildScale(withValue.map((p) => p.avgPriceManwon));
    const innerW = W - PAD.left - PAD.right;
    const innerH = H - PAD.top - PAD.bottom;
    const xOf = (i: number) => PAD.left + (points.length === 1 ? innerW / 2 : (innerW * i) / (points.length - 1));
    const yOf = (v: number) => PAD.top + innerH - ((v - scale.min) / (scale.max - scale.min)) * innerH;

    // 값이 있는 점들만 이어서 선을 그리되, 중간에 데이터 없는 달이 있으면 선이 끊기도록 구간을 나눔
    const segments: { x: number; y: number; i: number }[][] = [];
    let cur: { x: number; y: number; i: number }[] = [];
    points.forEach((p, i) => {
      if (p.avgPriceManwon === null) {
        if (cur.length) segments.push(cur);
        cur = [];
        return;
      }
      cur.push({ x: xOf(i), y: yOf(p.avgPriceManwon), i });
    });
    if (cur.length) segments.push(cur);

    const gridLines = [0, 0.5, 1].map((t) => scale.min + (scale.max - scale.min) * t);
    const active = activeIdx !== null ? points[activeIdx] : null;
    const activeHasValue = active && active.avgPriceManwon !== null;

    chart = (
      <svg
        className="trend-chart-svg"
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`${complex} ${VALUE_LABEL[dealType]} 최근 6개월 추이`}
      >
        {gridLines.map((v, idx) => (
          <g key={idx}>
            <line x1={PAD.left} x2={W - PAD.right} y1={yOf(v)} y2={yOf(v)} className="trend-grid-line" />
            <text x={PAD.left - 8} y={yOf(v) + 3} textAnchor="end" className="trend-axis-label">
              {fmtManwonShort(v)}
            </text>
          </g>
        ))}

        {points.map((p, i) => (
          <text key={p.ymd} x={xOf(i)} y={H - 8} textAnchor="middle" className="trend-axis-label">
            {p.label}
          </text>
        ))}

        {segments.map((seg, idx) => (
          <path
            key={idx}
            d={seg.map((pt, i) => `${i === 0 ? "M" : "L"} ${pt.x} ${pt.y}`).join(" ")}
            className="trend-line"
          />
        ))}

        {points.map((p, i) =>
          p.avgPriceManwon === null ? null : (
            <g key={p.ymd}>
              {/* 탭하기 편하도록 실제 점보다 넉넉한 히트 영역을 둠 (모바일 터치 대응) */}
              <circle
                cx={xOf(i)}
                cy={yOf(p.avgPriceManwon)}
                r={16}
                fill="transparent"
                onClick={() => setActiveIdx((prev) => (prev === i ? null : i))}
                style={{ cursor: "pointer" }}
              />
              <circle
                cx={xOf(i)}
                cy={yOf(p.avgPriceManwon)}
                r={activeIdx === i ? 6 : 4}
                className={`trend-dot${activeIdx === i ? " active" : ""}`}
              />
            </g>
          )
        )}

        {activeHasValue && activeIdx !== null && (
          <line
            x1={xOf(activeIdx)}
            x2={xOf(activeIdx)}
            y1={PAD.top}
            y2={H - PAD.bottom}
            className="trend-crosshair"
          />
        )}
      </svg>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3 className="modal-title">
              {regionName} · {complex}
            </h3>
            <p className="modal-subtitle">
              {VALUE_LABEL[dealType]} 추이 · 최근 6개월 (월별 평균)
            </p>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="닫기">
            ✕
          </button>
        </div>

        {state.loading && <div className="empty-note">불러오는 중…</div>}
        {state.error && (
          <div className="banner error">
            <strong>불러오기 실패</strong> — {state.error}
          </div>
        )}

        {!state.loading && !state.error && withValue.length === 0 && (
          <div className="empty-note">최근 6개월 안에 이 단지의 실거래 데이터가 없습니다.</div>
        )}

        {!state.loading && !state.error && withValue.length > 0 && (
          <>
            <div className="trend-chart-wrap">{chart}</div>
            {activeIdx !== null && points[activeIdx]?.avgPriceManwon !== null && (
              <div className="trend-tooltip">
                {points[activeIdx].label} · 평균 {fmtManwon(points[activeIdx].avgPriceManwon as number)} ·{" "}
                {points[activeIdx].count}건
              </div>
            )}
            <div className="trend-table">
              {points.map((p) => (
                <div className="trend-table-row" key={p.ymd}>
                  <span className="trend-table-month">{p.label}</span>
                  <span className="trend-table-value">
                    {p.avgPriceManwon === null ? "거래 없음" : fmtManwon(p.avgPriceManwon)}
                  </span>
                  <span className="trend-table-count">{p.count}건</span>
                </div>
              ))}
            </div>
          </>
        )}

        <p className="empty-note" style={{ padding: "10px 0 0", fontSize: 12 }}>
          국토부에는 계약 후 최대 30일까지 신고할 수 있어, 최근 1~2개월 수치는 이후 거래가 더 추가될
          수 있습니다.
        </p>
      </div>
    </div>
  );
}
