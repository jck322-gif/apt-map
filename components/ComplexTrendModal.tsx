"use client";

import { useEffect, useState } from "react";
import { fmtManwon, fmtManwonShort, typeLabel, areaDetail } from "@/lib/format";
import { downloadDealCard, copyDealCard, type CardPayload, type CardRow } from "@/lib/dealCard";
import { SITE_NAME } from "@/lib/site";

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
  // 거래유형별 자료 건수 — 매매/전세/월세 버튼을 켜고 끄는 데 씁니다.
  counts?: { sale: number; jeonse: number; monthly: number };
  // 매매·전세를 한 그래프에 겹쳐 보기 위한 월별 평균
  comparePoints?: { sale: MonthlyPoint[]; jeonse: MonthlyPoint[] };
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

/**
 * 점들을 부드러운 곡선으로 잇습니다 (꺾인 선보다 추세가 눈에 잘 들어옵니다).
 * 곡선이 실제 값보다 위아래로 튀어나가면 없는 가격을 그린 것처럼 보이므로,
 * 조절점의 높이를 양 끝 점 사이로 제한해 과장되지 않게 막았습니다.
 */
function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return "";
  if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const lo = Math.min(p1.y, p2.y);
    const hi = Math.max(p1.y, p2.y);
    const clamp = (v: number) => Math.min(hi, Math.max(lo, v));
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = clamp(p1.y + (p2.y - p0.y) / 6);
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = clamp(p2.y - (p3.y - p1.y) / 6);
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

/** 곡선 아래를 채우는 영역 경로 (선 → 바닥 → 시작점으로 닫습니다) */
function areaPath(pts: { x: number; y: number }[], baseY: number): string {
  if (pts.length === 0) return "";
  return `${smoothPath(pts)} L ${pts[pts.length - 1].x} ${baseY} L ${pts[0].x} ${baseY} Z`;
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

/**
 * 화면에 보이는 값 그대로 카드 이미지용 자료를 만듭니다.
 * (표에 없는 숫자를 새로 계산하지 않습니다 — 화면과 카드가 다르면 안 되니까요.)
 */
function buildCardPayload(data: TrendResponse, viewType: "sale" | "jeonse" | "monthly"): CardPayload | null {
  const hist = data.history;
  const h0 = hist[0];
  if (!h0) return null;
  const h1 = hist[1];
  const s = data.stats;

  const high = hist.length ? hist.reduce((m, c) => (c.priceManwon > m.priceManwon ? c : m)) : null;
  const low = hist.length ? hist.reduce((m, c) => (c.priceManwon < m.priceManwon ? c : m)) : null;
  const recovery = high && high.priceManwon !== 0 ? (h0.priceManwon / high.priceManwon) * 100 : null;

  const change = h1 ? h0.priceManwon - h1.priceManwon : null;
  const changePct = h1 && h1.priceManwon !== 0 ? ((change as number) / h1.priceManwon) * 100 : null;

  const rows: CardRow[] = [];
  if (h1) {
    rows.push({
      label: "직전거래",
      value: `${fmtManwon(h1.priceManwon)} · ${h1.floor}층`,
      date: h1.dateLabel,
    });
  }
  if (high) {
    rows.push({
      label: "3년 최고",
      value: `${fmtManwon(high.priceManwon)} · ${high.floor}층`,
      pill: recovery !== null ? `회복율 ${recovery.toFixed(0)}%` : undefined,
      date: high.dateLabel,
      tone: "high",
    });
  }
  if (low) {
    rows.push({
      label: "3년 최저",
      value: `${fmtManwon(low.priceManwon)} · ${low.floor}층`,
      date: low.dateLabel,
    });
  }
  // 매매 카드에는 전세를, 전세·월세 카드에는 매매를 한 줄 곁들입니다.
  if (viewType === "sale") {
    if (s.latestJeonse) {
      rows.push({
        label: "전세",
        value: `${fmtManwon(s.latestJeonse.priceManwon)} · ${s.latestJeonse.floor}층`,
        pill:
          s.gapManwon !== null && s.gapPct !== null
            ? `갭 ${fmtManwon(s.gapManwon)} (${s.gapPct.toFixed(0)}%)`
            : undefined,
        date: s.latestJeonse.dateLabel,
        tone: "jeonse",
      });
    }
  } else if (s.latestSale) {
    rows.push({
      label: "매매",
      value: `${fmtManwon(s.latestSale.priceManwon)} · ${s.latestSale.floor}층`,
      date: s.latestSale.dateLabel,
      tone: "jeonse",
    });
  }

  return {
    complex: data.complex,
    location: `${data.group}광역시 ${data.regionName}${data.dong ? " " + data.dong : ""}`,
    built: data.buildYear ? `${data.buildYear}년 준공 (${data.age}년차)` : "",
    dealLabel: DEAL_LABEL[viewType],
    priceText: fmtManwon(h0.priceManwon),
    changeText:
      change !== null && changePct !== null
        ? `${change >= 0 ? "▲" : "▼"} ${fmtManwon(Math.abs(change))} (${Math.abs(changePct).toFixed(1)}%)`
        : null,
    changeUp: (change ?? 0) >= 0,
    chips: [`${h0.floor}층`, areaDetail(h0.areaM2), `계약일 ${h0.dateLabel}`],
    rows,
    spark: data.points.map((p) => p.avgPriceManwon),
    // 사이트 주소는 일부러 넣지 않습니다 (카페 홍보 규정) — 이름만으로 충분합니다.
    siteName: SITE_NAME,
  };
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
  // 팝업 안에서 매매/전세/월세를 바꿔볼 수 있게, 보고 있는 유형을 따로 들고 있습니다.
  const [viewType, setViewType] = useState<"sale" | "jeonse" | "monthly">(dealType);
  // 매매 그래프 위에 전세선을 겹쳐 보여줄지
  const [showJeonse, setShowJeonse] = useState(false);
  // 카드 이미지 버튼을 눌렀을 때 보여줄 안내 문구
  const [cardMsg, setCardMsg] = useState<string | null>(null);

  // 다른 단지를 열면 선택 타입과 거래유형을 새로 받은 값으로 되돌립니다.
  useEffect(() => {
    setSelectedArea(areaM2);
    setViewType(dealType);
    setShowJeonse(false);
  }, [areaM2, complex, code, dealType]);

  useEffect(() => {
    let cancelled = false;
    setState({ loading: true, error: null, data: null });
    setActiveIdx(null);
    setOpenMonth(null);
    const areaQs = selectedArea !== undefined ? `&area=${selectedArea}` : "";
    fetch(`/api/complex-trend?code=${code}&complex=${encodeURIComponent(complex)}&dealType=${viewType}${areaQs}`)
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
  }, [code, complex, viewType, selectedArea]);

  const data = state.data;
  const points = data?.points ?? [];
  const withValue = points.filter((p) => p.avgPriceManwon !== null) as (MonthlyPoint & { avgPriceManwon: number })[];
  const stats = data?.stats;

  // 매매 화면에서 전세선을 겹쳐 볼 수 있게 준비합니다.
  const jeonsePoints = data?.comparePoints?.jeonse ?? [];
  const canCompare = viewType === "sale" && (data?.counts?.jeonse ?? 0) > 0 && jeonsePoints.length > 0;
  const overlayOn = canCompare && showJeonse;
  const overlayWithValue = overlayOn
    ? (jeonsePoints.filter((p) => p.avgPriceManwon !== null) as (MonthlyPoint & { avgPriceManwon: number })[])
    : [];

  let chart: React.ReactNode = null;
  if (withValue.length > 0) {
    // 두 선이 모두 화면 안에 들어오도록 눈금 범위를 함께 계산합니다.
    const scale = buildScale([
      ...withValue.map((p) => p.avgPriceManwon),
      ...overlayWithValue.map((p) => p.avgPriceManwon),
    ]);
    const innerW = W - PAD.left - PAD.right;
    const innerH = H - PAD.top - PAD.bottom;
    const baseY = PAD.top + innerH;
    const xOf = (i: number) => PAD.left + (points.length === 1 ? innerW / 2 : (innerW * i) / (points.length - 1));
    const yOf = (v: number) => PAD.top + innerH - ((v - scale.min) / (scale.max - scale.min)) * innerH;

    // 거래가 있는 달만 모아 하나의 곡선으로 잇습니다.
    // (거래 없는 달에서 선을 끊으면 채운 면이 계단처럼 뚝뚝 떨어져 막대그래프처럼 보입니다.
    //  어느 달에 거래가 없었는지는 아래 월별 표에 "거래 없음"으로 그대로 나옵니다.)
    const toPts = (list: MonthlyPoint[]) =>
      list
        .map((p, i) => ({ p, i }))
        .filter(({ p }) => p.avgPriceManwon !== null)
        .map(({ p, i }) => ({ x: xOf(i), y: yOf(p.avgPriceManwon as number), i }));

    const linePts = toPts(points);
    const jeonseLinePts = overlayOn ? toPts(jeonsePoints) : [];

    const gridLines = [0, 0.5, 1].map((t) => scale.min + (scale.max - scale.min) * t);
    const active = activeIdx !== null ? points[activeIdx] : null;
    const activeHasValue = active && active.avgPriceManwon !== null;

    // 가장 최근 값 — 점을 크게 찍고 금액을 바로 위에 적어 눈이 먼저 가도록 합니다.
    const lastPt = linePts[linePts.length - 1] ?? null;
    const lastValue = lastPt ? (points[lastPt.i].avgPriceManwon as number) : null;
    const lastText = lastValue !== null ? fmtManwonShort(lastValue) : "";
    // 글자 뒤에 흰 판을 깔아 선·격자와 겹쳐도 읽히게 합니다
    // (테두리로 글자를 감싸는 방식은 일부 브라우저에서 글자를 지워버립니다).
    const labelW = lastText.length * 8.4 + 14;
    const labelCY = Math.min(Math.max(lastPt ? lastPt.y - 16 : 0, PAD.top + 11), baseY - 11);

    chart = (
      <svg
        className="trend-chart-svg"
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`${complex} ${VALUE_LABEL[viewType]} 최근 12개월 추이`}
      >
        <defs>
          {/* 선 아래를 옅게 채워 흐름이 한눈에 들어오게 합니다 */}
          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" style={{ stopColor: "var(--teal)", stopOpacity: 0.22 }} />
            <stop offset="100%" style={{ stopColor: "var(--teal)", stopOpacity: 0 }} />
          </linearGradient>
        </defs>

        {gridLines.map((v, idx) => (
          <g key={idx}>
            <line x1={PAD.left} x2={W - PAD.right} y1={yOf(v)} y2={yOf(v)} className="trend-grid-line" />
            <text x={PAD.left - 10} y={yOf(v) + 4} textAnchor="end" className="trend-axis-label">
              {fmtManwonShort(v)}
            </text>
          </g>
        ))}

        {points.map((p, i) =>
          // 12개월치라 라벨이 빽빽해집니다 — 두 달에 하나씩만, 마지막 달은 항상 표시합니다.
          i % 2 === 0 || i === points.length - 1 ? (
            <text key={p.ymd} x={xOf(i)} y={H - 10} textAnchor="middle" className="trend-axis-label">
              {p.label}
            </text>
          ) : null
        )}

        {/* 면(채움) → 선 → 점 순서로 그려야 서로 가리지 않습니다 */}
        <path d={areaPath(linePts, baseY)} className="trend-area" style={{ fill: "url(#trendFill)" }} />
        <path d={smoothPath(linePts)} className="trend-line" />
        {overlayOn && <path d={smoothPath(jeonseLinePts)} className="trend-line jeonse" />}
        {overlayOn &&
          jeonsePoints.map((p, i) =>
            p.avgPriceManwon === null ? null : (
              <circle key={`jd${p.ymd}`} cx={xOf(i)} cy={yOf(p.avgPriceManwon)} r={3.5} className="trend-dot jeonse" />
            )
          )}

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
                r={activeIdx === i ? 6.5 : 4}
                className={`trend-dot${activeIdx === i ? " active" : ""}`}
              />
            </g>
          )
        )}

        {/* 가장 최근 달 강조 — 큰 점 + 금액 직접 표기 */}
        {lastPt && lastValue !== null && (
          <>
            <circle cx={lastPt.x} cy={lastPt.y} r={7} className="trend-dot last-halo" />
            <circle cx={lastPt.x} cy={lastPt.y} r={4.5} className="trend-dot last" />
            <rect
              x={lastPt.x - labelW - 10}
              y={labelCY - 11}
              width={labelW}
              height={22}
              rx={6}
              className="trend-last-plate"
              style={{ fill: "var(--surface)", stroke: "var(--teal)", strokeWidth: 1.2 }}
            />
            <text
              x={lastPt.x - 17}
              y={labelCY + 5}
              textAnchor="end"
              className="trend-last-label"
              style={{ fill: "var(--teal-deep)" }}
            >
              {lastText}
            </text>
          </>
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
              {(["sale", "jeonse", "monthly"] as const).map((t) => {
                // 자료가 아직 안 왔을 때는(counts 없음) 일단 다 누를 수 있게 둡니다.
                const n = data?.counts?.[t];
                const empty = n === 0;
                return (
                  <button
                    key={t}
                    type="button"
                    className="modal-chip deal-btn"
                    aria-pressed={viewType === t}
                    disabled={empty}
                    title={empty ? `${DEAL_LABEL[t]} 거래 자료가 없습니다` : undefined}
                    onClick={() => setViewType(t)}
                  >
                    {DEAL_LABEL[t]}
                    {n !== undefined && n > 0 ? ` ${n}` : ""}
                  </button>
                );
              })}
              {selectedArea !== undefined && (
                <span className="modal-chip">{areaDetail(selectedArea)}</span>
              )}
            </div>
          </div>
          {/* 이 팝업을 그대로 캡처해서 카페·블로그에 올리는 경우가 많아, 사이트 이름을 함께 둡니다. */}
          <div className="modal-header-right">
            <span className="modal-brand">{SITE_NAME}</span>
            <button className="modal-close" onClick={onClose} aria-label="닫기">
              ✕
            </button>
          </div>
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
                    최근 12개월 안에 {DEAL_LABEL[viewType]} 실거래가 없습니다.
                    {data.history.length > 0
                      ? ` 이 단지의 가장 최근 ${DEAL_LABEL[viewType]} 거래는 ${data.history[0].dateLabel}입니다.`
                      : " 국토교통부에 신고된 자료가 아직 없어요."}
                  </div>
                )}
                {activeIdx !== null && points[activeIdx]?.avgPriceManwon !== null && (
                  <div className="trend-tooltip">
                    {points[activeIdx].label} · 평균 {fmtManwon(points[activeIdx].avgPriceManwon as number)} ·{" "}
                    {points[activeIdx].count}건
                    {overlayOn && jeonsePoints[activeIdx]?.avgPriceManwon !== null && (
                      <>
                        {" · 전세 "}
                        {fmtManwon(jeonsePoints[activeIdx].avgPriceManwon as number)}
                      </>
                    )}
                  </div>
                )}
                {/* 매매를 보고 있을 때는 전세선을 겹쳐 볼 수 있습니다 (전세 자료가 있을 때만) */}
                {canCompare && (
                  <div className="chart-legend-row">
                    {overlayOn && (
                      // 선이 둘이면 어느 선이 무엇인지 항상 글자로도 알 수 있어야 합니다.
                      <span className="chart-legend">
                        <span className="legend-item">
                          <span className="legend-swatch sale" />매매
                        </span>
                        <span className="legend-item">
                          <span className="legend-swatch jeonse" />전세
                        </span>
                      </span>
                    )}
                    <button
                      type="button"
                      className="compare-toggle"
                      aria-pressed={showJeonse}
                      onClick={() => setShowJeonse((v) => !v)}
                    >
                      <span className="compare-swatch" />
                      전세 {showJeonse ? "숨기기" : "함께 보기"}
                    </button>
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

            {/* 카페·블로그에 바로 붙일 수 있는 카드 이미지 */}
            <div className="card-actions">
              <span className="card-actions-label">이 내용을 이미지 한 장으로</span>
              <button
                type="button"
                className="card-btn"
                onClick={async () => {
                  const payload = buildCardPayload(data, viewType);
                  if (!payload) return setCardMsg("이미지로 만들 거래 자료가 없습니다.");
                  try {
                    await downloadDealCard(payload);
                    setCardMsg("이미지를 저장했습니다.");
                  } catch {
                    setCardMsg("저장에 실패했습니다. 다시 시도해 주세요.");
                  }
                }}
              >
                카드 이미지 저장
              </button>
              <button
                type="button"
                className="card-btn ghost"
                onClick={async () => {
                  const payload = buildCardPayload(data, viewType);
                  if (!payload) return setCardMsg("이미지로 만들 거래 자료가 없습니다.");
                  const ok = await copyDealCard(payload);
                  setCardMsg(
                    ok
                      ? "복사했습니다. 글쓰기 창에서 붙여넣기(Ctrl+V) 하세요."
                      : "이 브라우저는 이미지 복사를 지원하지 않아요. '저장'을 눌러 파일로 받아주세요."
                  );
                }}
              >
                이미지 복사
              </button>
              {cardMsg && <span className="card-actions-msg">{cardMsg}</span>}
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
              {/* 12개월치라 최근 달이 위로 오게 뒤집어 보여줍니다 (그래프는 왼→오른쪽 시간순 그대로) */}
              {[...points].reverse().map((p) => {
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
