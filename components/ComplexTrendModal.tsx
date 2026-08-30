"use client";

import { useEffect, useState } from "react";
import { fmtManwon, fmtManwonShort, typeLabel, areaDetail } from "@/lib/format";

type MonthlyPoint = {
  ymd: string;
  label: string;
  avgPriceManwon: number | null;
  minPriceManwon: number | null;
  maxPriceManwon: number | null;
  count: number;
};

type TxDetail = {
  ymd: number; // YYYYMMDD
  dateLabel: string; // "26.08.24"
  priceManwon: number;
  floor: number;
  areaM2: number;
  isRecordHigh?: boolean; // 신고가 (우리가 가진 3년치 기준)
  cancelDate?: string | null; // 해제(거래취소)일
  isDirect?: boolean; // 직거래
  registerDate?: string | null; // 등기일자
  aptDong?: string | null; // 동
};

type Stats = {
  latestSale: TxDetail | null;
  previousSale: TxDetail | null;
  saleChangeManwon: number | null;
  saleChangePct: number | null;
  highSale: TxDetail | null;
  lowSale: TxDetail | null;
  recoveryPct: number | null;
  latestJeonse: TxDetail | null;
  gapManwon: number | null;
  gapPct: number | null;
};

type TrendResponse = {
  code: string;
  regionName: string;
  group: "부산" | "울산";
  complex: string;
  dong: string | null;
  buildYear: number | null;
  age: number | null;
  dealType: "sale" | "jeonse" | "monthly";
  types: number[]; // 이 단지가 가진 전용면적(타입) 목록
  history: TxDetail[]; // 선택한 타입의 개별 실거래 이력
  points: MonthlyPoint[];
  stats: Stats;
  errors: { ymd: string; message: string }[];
};

const VALUE_LABEL: Record<string, string> = { sale: "매매가", jeonse: "보증금", monthly: "월세" };
const DEAL_LABEL: Record<string, string> = { sale: "매매", jeonse: "전세", monthly: "월세" };

// 차트 도형 계산용 상수 (viewBox 좌표계, CSS로 반응형 확대/축소됨)
// viewBox를 실제 표시 크기(약 350~400px)와 비슷하게 잡아야 축 글자가 작아 보이지 않습니다.
const W = 380;
const H = 250;
const PAD = { top: 20, right: 16, bottom: 36, left: 62 };

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

function ChangeBadge({ amount, pct }: { amount: number | null; pct: number | null }) {
  if (amount === null || pct === null) return null;
  const up = amount >= 0;
  return (
    <span className={`stat-change ${up ? "up" : "down"}`}>
      {up ? "▲" : "▼"} {fmtManwon(Math.abs(amount))} ({Math.abs(pct).toFixed(1)}%)
    </span>
  );
}

export default function ComplexTrendModal({
  code,
  regionName,
  complex,
  areaM2,
  dealType,
  onClose,
}: {
  code: string;
  regionName: string;
  complex: string;
  areaM2?: number;
  dealType: "sale" | "jeonse" | "monthly";
  onClose: () => void;
}) {
  const [state, setState] = useState<{
    loading: boolean;
    error: string | null;
    data: TrendResponse | null;
  }>({ loading: true, error: null, data: null });
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  // 팝업 안에서 타입(평형)을 바꿔가며 볼 수 있게, 선택한 타입을 따로 들고 있습니다.
  // undefined = 전체 타입 합산
  const [selectedArea, setSelectedArea] = useState<number | undefined>(areaM2);
  // 월별 표에서 펼쳐 놓은 달 ("202608")
  const [openMonth, setOpenMonth] = useState<string | null>(null);

  // 다른 단지를 열면 선택 타입을 새로 받은 값으로 되돌립니다.
  useEffect(() => {
    setSelectedArea(areaM2);
  }, [areaM2, complex, code]);

  useEffect(() => {
    let cancelled = false;
    setState({ loading: true, error: null, data: null });
    setActiveIdx(null);
    setOpenMonth(null);
    const areaQs = selectedArea !== undefined ? `&area=${selectedArea}` : "";
    fetch(`/api/complex-trend?code=${code}&complex=${encodeURIComponent(complex)}&dealType=${dealType}${areaQs}`)
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
  }, [code, complex, dealType, selectedArea]);

  const data = state.data;
  const points = data?.points ?? [];
  const withValue = points.filter((p) => p.avgPriceManwon !== null) as (MonthlyPoint & { avgPriceManwon: number })[];
  const stats = data?.stats;

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
                r={18}
                fill="transparent"
                onClick={() => setActiveIdx((prev) => (prev === i ? null : i))}
                style={{ cursor: "pointer" }}
              />
              <circle
                cx={xOf(i)}
                cy={yOf(p.avgPriceManwon)}
                r={activeIdx === i ? 7 : 5}
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

  const infoLine = data
    ? [
        `${data.group}광역시 ${data.regionName}${data.dong ? " " + data.dong : ""}`,
        data.buildYear ? `${data.buildYear}년 준공 (${data.age}년차)` : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : "";

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3 className="modal-title">{complex}</h3>
            {data && <p className="modal-address">{infoLine}</p>}
            <div className="modal-chips">
              <span className="modal-chip deal">{DEAL_LABEL[dealType]}</span>
              {selectedArea !== undefined && (
                <span className="modal-chip">{areaDetail(selectedArea)}</span>
              )}
            </div>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="닫기">
            ✕
          </button>
        </div>

        {/* 이 단지가 가진 타입(평형) 목록 — 누르면 그 타입 기준으로 다시 보여줍니다. */}
        {data && data.types.length > 0 && (
          <div className="type-picker">
            <span className="type-picker-label">타입 선택</span>
            <div className="type-picker-chips">
              {data.types.map((a) => (
                <button
                  key={a}
                  className="type-chip"
                  aria-pressed={selectedArea === a}
                  onClick={() => setSelectedArea(a)}
                >
                  {typeLabel(a)}
                  <span className="type-chip-sub">{a}㎡</span>
                </button>
              ))}
              <button
                className="type-chip"
                aria-pressed={selectedArea === undefined}
                onClick={() => setSelectedArea(undefined)}
              >
                전체
              </button>
            </div>
          </div>
        )}

        {state.loading && (
          <div className="empty-note">
            최근 3년치 매매 이력을 불러오는 중이에요 — 데이터가 많아 몇 초 걸릴 수 있어요…
          </div>
        )}
        {state.error && (
          <div className="banner error">
            <strong>불러오기 실패</strong> — {state.error}
          </div>
        )}

        {!state.loading && !state.error && data && stats && (
          <>
            <div className="trend-top">
              <div className="trend-chart-wrap">
                {withValue.length > 0 ? (
                  chart
                ) : (
                  <div className="empty-note">
                    최근 6개월 안에 {VALUE_LABEL[dealType]} 실거래 데이터가 없습니다.
                  </div>
                )}
                {activeIdx !== null && points[activeIdx]?.avgPriceManwon !== null && (
                  <div className="trend-tooltip">
                    {points[activeIdx].label} · 평균 {fmtManwon(points[activeIdx].avgPriceManwon as number)} ·{" "}
                    {points[activeIdx].count}건
                  </div>
                )}
              </div>

              <div className="stat-card">
                <div className="stat-row main">
                  <span className="stat-label">매매 실거래가</span>
                  <span className="stat-main-value">
                    <span className="stat-main-price">
                      {stats.latestSale ? fmtManwon(stats.latestSale.priceManwon) : "데이터 없음"}
                    </span>
                    <ChangeBadge amount={stats.saleChangeManwon} pct={stats.saleChangePct} />
                  </span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">직전거래</span>
                  <span className="stat-value">
                    {stats.previousSale
                      ? `${fmtManwon(stats.previousSale.priceManwon)} · ${stats.previousSale.floor}층 · ${stats.previousSale.dateLabel}`
                      : "-"}
                  </span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">3년 최고</span>
                  <span className="stat-value">
                    {stats.highSale ? (
                      <>
                        {fmtManwon(stats.highSale.priceManwon)} · {stats.highSale.floor}층 ·{" "}
                        {stats.highSale.dateLabel}
                        {stats.recoveryPct !== null && (
                          <span className="stat-pill">회복율 {stats.recoveryPct.toFixed(0)}%</span>
                        )}
                      </>
                    ) : (
                      "-"
                    )}
                  </span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">3년 최저</span>
                  <span className="stat-value">
                    {stats.lowSale
                      ? `${fmtManwon(stats.lowSale.priceManwon)} · ${stats.lowSale.floor}층 · ${stats.lowSale.dateLabel}`
                      : "-"}
                  </span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">전세</span>
                  <span className="stat-value">
                    {stats.latestJeonse ? (
                      <>
                        {fmtManwon(stats.latestJeonse.priceManwon)} · {stats.latestJeonse.floor}층 ·{" "}
                        {stats.latestJeonse.dateLabel}
                        {stats.gapManwon !== null && stats.gapPct !== null && (
                          <span className="stat-pill">
                            갭 {fmtManwon(stats.gapManwon)} ({stats.gapPct.toFixed(0)}%)
                          </span>
                        )}
                      </>
                    ) : (
                      "최근 6개월 전세 실거래 없음"
                    )}
                  </span>
                </div>
              </div>
            </div>

            <div className="trend-table">
              <div className="trend-table-head">
                월별 평균 · 건수를 누르면 그 달의 거래 내역이 모두 펼쳐집니다
                <span className="table-legend">
                  <span className="flag high">신고가</span>3년 내 최고가
                  <span className="flag direct">직거래</span>중개사 없이 거래
                  <span className="flag cancel">취소</span>계약 해제
                </span>
              </div>
              {points.map((p) => {
                const monthDeals = (data.history ?? []).filter(
                  (tx) => String(tx.ymd).slice(0, 6) === p.ymd
                );
                const open = openMonth === p.ymd;
                return (
                  <div key={p.ymd}>
                    <button
                      className={`trend-table-row${open ? " open" : ""}`}
                      disabled={p.count === 0}
                      onClick={() => setOpenMonth(open ? null : p.ymd)}
                    >
                      <span className="trend-table-month">{p.label}</span>
                      <span className="trend-table-value">
                        {p.avgPriceManwon === null ? "거래 없음" : fmtManwon(p.avgPriceManwon)}
                      </span>
                      <span className="trend-table-count">
                        {p.count}건{p.count > 0 && <span className="trend-chev">{open ? "▴" : "▾"}</span>}
                      </span>
                    </button>
                    {open && (
                      <div className="month-deals">
                        {monthDeals.length === 0 ? (
                          <div className="empty-note">이 달의 개별 내역을 불러오지 못했습니다.</div>
                        ) : (
                          monthDeals.map((tx, i) => (
                            <div className="month-deal-row" key={`${tx.ymd}-${tx.floor}-${i}`}>
                              <span className="month-deal-date">{tx.dateLabel}</span>
                              <span className={`month-deal-price${tx.cancelDate ? " struck" : ""}`}>
                                {tx.isRecordHigh && !tx.cancelDate && <span className="flag high">신고가</span>}
                                {tx.isDirect && <span className="flag direct">직거래</span>}
                                {tx.cancelDate && <span className="flag cancel">취소</span>}
                                {fmtManwon(tx.priceManwon)}
                              </span>
                              <span className="month-deal-meta">
                                {tx.floor}층 · {tx.areaM2}㎡
                                {tx.aptDong ? ` · ${tx.aptDong}동` : ""}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        <p className="empty-note" style={{ padding: "10px 0 0", fontSize: 12 }}>
          매매 3년 최고/최저·직전거래·전세는 이 단지의 실거래 신고 자료를 기준으로 계산했어요.
          국토부에는 계약 후 최대 30일까지 신고할 수 있어, 최근 거래는 이후에도 추가될 수 있습니다.
          세대수 정보는 국토부 실거래가 API에 포함되어 있지 않아 표시하지 않았어요.
        </p>
      </div>
    </div>
  );
}
