"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import SiteHeader from "@/components/SiteHeader";
import { fmtManwon, fmtManwonShort, areaDetail } from "@/lib/format";

type DealType = "sale" | "jeonse" | "monthly";

const DEAL_TABS: { key: DealType; label: string }[] = [
  { key: "sale", label: "매매" },
  { key: "jeonse", label: "전세" },
  { key: "monthly", label: "월세" },
];

/** 한 번에 겹쳐 볼 수 있는 단지 수. 넘어가면 선이 엉켜 오히려 못 읽습니다. */
const MAX_ITEMS = 4;

/**
 * 비교선 색 — 색만으로 구분하지 않도록 선 모양(실선/점선)도 함께 다르게 줍니다.
 * (색약이신 분들과 흑백 인쇄를 고려한 것입니다.)
 */
const SERIES = [
  { color: "#1f6f78", dash: "" },
  { color: "#d9663f", dash: "7 4" },
  { color: "#2f6f9e", dash: "2 4" },
  { color: "#7a5ea7", dash: "10 4 2 4" },
];

type SearchResult = {
  regionCode: string;
  regionName: string;
  group: "부산" | "울산";
  dong: string;
  complex: string;
  areaM2: number;
  floor: number;
  date: string;
  priceManwon: number | null;
  depositManwon: number | null;
  monthlyRentManwon: number | null;
};

type MonthlyPoint = {
  ymd: string;
  label: string;
  avgPriceManwon: number | null;
  count: number;
};

type TxDetail = { ymd: number; dateLabel: string; priceManwon: number; floor: number };

type TrendResponse = {
  regionName: string;
  complex: string;
  dong: string | null;
  buildYear: number | null;
  age: number | null;
  points: MonthlyPoint[];
  history: TxDetail[];
  stats: {
    highSale: TxDetail | null;
    lowSale: TxDetail | null;
  };
};

/** 비교 목록에 담긴 한 칸 */
type Item = {
  id: string; // 지역코드|단지명|전용면적
  regionCode: string;
  regionName: string;
  complex: string;
  areaM2: number;
  loading: boolean;
  error: string | null;
  data: TrendResponse | null;
};

// 가로로 넓고 낮은 비율. 화면이 넓어져도 그래프가 세로로 길어지지 않도록
// 감싸는 상자의 최대 너비를 CSS에서 함께 제한합니다.
const W = 620;
const H = 250;
const PAD = { top: 16, right: 16, bottom: 28, left: 56 };
/** 클릭했을 때 그래프 위에 띄우는 값 라벨의 최소 세로 간격 */
const LABEL_GAP = 17;

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
    d += ` C ${p1.x + (p2.x - p0.x) / 6} ${clamp(p1.y + (p2.y - p0.y) / 6)}, ${
      p2.x - (p3.x - p1.x) / 6
    } ${clamp(p2.y - (p3.y - p1.y) / 6)}, ${p2.x} ${p2.y}`;
  }
  return d;
}

function itemId(regionCode: string, complex: string, areaM2: number): string {
  return `${regionCode}|${complex}|${areaM2}`;
}

export default function ComparePanel() {
  const [dealType, setDealType] = useState<DealType>("sale");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  // 이미 담은 단지를 거래유형만 바꿔 다시 받아올 때 쓰는 표시
  const itemsRef = useRef<Item[]>([]);
  itemsRef.current = items;

  // --- 검색 ---
  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const timer = setTimeout(() => {
      let cancelled = false;
      fetch(`/api/search?q=${encodeURIComponent(q)}&dealType=${dealType}`)
        .then(async (res) => {
          const json = await res.json();
          if (!cancelled) setResults(res.ok ? (json.results ?? []) : []);
        })
        .catch(() => {
          if (!cancelled) setResults([]);
        })
        .finally(() => {
          if (!cancelled) setSearching(false);
        });
      return () => {
        cancelled = true;
      };
    }, 300);
    return () => clearTimeout(timer);
  }, [query, dealType]);

  // --- 한 칸의 추이 자료 받아오기 ---
  const loadItem = useCallback(
    async (id: string, regionCode: string, complex: string, areaM2: number, type: DealType) => {
      try {
        const res = await fetch(
          `/api/complex-trend?code=${regionCode}&complex=${encodeURIComponent(
            complex
          )}&dealType=${type}&area=${areaM2}`
        );
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? `요청 실패 (${res.status})`);
        setItems((prev) =>
          prev.map((it) => (it.id === id ? { ...it, loading: false, error: null, data: json } : it))
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setItems((prev) =>
          prev.map((it) => (it.id === id ? { ...it, loading: false, error: message, data: null } : it))
        );
      }
    },
    []
  );

  const addItem = useCallback(
    (r: SearchResult) => {
      const id = itemId(r.regionCode, r.complex, r.areaM2);
      if (itemsRef.current.some((it) => it.id === id)) return; // 이미 담음
      if (itemsRef.current.length >= MAX_ITEMS) return;
      setItems((prev) => [
        ...prev,
        {
          id,
          regionCode: r.regionCode,
          regionName: r.regionName,
          complex: r.complex,
          areaM2: r.areaM2,
          loading: true,
          error: null,
          data: null,
        },
      ]);
      setQuery("");
      setResults([]);
      void loadItem(id, r.regionCode, r.complex, r.areaM2, dealType);
    },
    [dealType, loadItem]
  );

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
    setActiveIdx(null);
  }, []);

  // 거래유형을 바꾸면 담아둔 단지를 모두 그 유형으로 다시 받아옵니다.
  const changeDealType = useCallback(
    (type: DealType) => {
      setDealType(type);
      setActiveIdx(null);
      const current = itemsRef.current;
      if (current.length === 0) return;
      setItems(current.map((it) => ({ ...it, loading: true, error: null, data: null })));
      for (const it of current) void loadItem(it.id, it.regionCode, it.complex, it.areaM2, type);
    },
    [loadItem]
  );

  // --- 그래프 ---
  const ready = items.filter((it) => it.data && it.data.points.length > 0);
  const monthLabels = ready[0]?.data?.points.map((p) => p.label) ?? [];
  const monthCount = monthLabels.length;

  const allValues = ready.flatMap(
    (it) => it.data!.points.map((p) => p.avgPriceManwon).filter((v): v is number => v !== null)
  );

  let chart: React.ReactNode = null;
  if (allValues.length > 0 && monthCount > 1) {
    const min = Math.min(...allValues);
    const max = Math.max(...allValues);
    const pad = max === min ? Math.max(min * 0.1, 1) : (max - min) * 0.15;
    const lo = min - pad;
    const hi = max + pad;
    const innerW = W - PAD.left - PAD.right;
    const innerH = H - PAD.top - PAD.bottom;
    const xOf = (i: number) => PAD.left + (innerW * i) / (monthCount - 1);
    const yOf = (v: number) => PAD.top + innerH - ((v - lo) / (hi - lo)) * innerH;
    const grid = [0, 0.5, 1].map((t) => lo + (hi - lo) * t);

    // 클릭한 달의 값을 그래프 위에 바로 띄웁니다.
    // 값이 비슷하면 라벨이 겹치므로, 위에서부터 훑으며 최소 간격만큼 밀어냅니다.
    let activeLabels: { y: number; text: string; color: string; count: number }[] = [];
    let labelsOnLeft = false;
    if (activeIdx !== null) {
      labelsOnLeft = xOf(activeIdx) > PAD.left + innerW * 0.62;
      activeLabels = ready
        .map((it, si) => {
          const p = it.data!.points[activeIdx];
          if (!p || p.avgPriceManwon === null) return null;
          return {
            y: yOf(p.avgPriceManwon),
            text: fmtManwonShort(p.avgPriceManwon),
            color: SERIES[si % SERIES.length].color,
            count: p.count,
          };
        })
        .filter((x): x is NonNullable<typeof x> => x !== null)
        .sort((a, b) => a.y - b.y);
      for (let i = 1; i < activeLabels.length; i++) {
        const prev = activeLabels[i - 1];
        if (activeLabels[i].y - prev.y < LABEL_GAP) activeLabels[i].y = prev.y + LABEL_GAP;
      }
      // 아래로 밀려 그래프 밖으로 나가면 전체를 위로 당깁니다
      const last = activeLabels[activeLabels.length - 1];
      if (last && last.y > H - PAD.bottom - 4) {
        const shift = last.y - (H - PAD.bottom - 4);
        for (const l of activeLabels) l.y -= shift;
      }
    }

    chart = (
      <svg className="cmp-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="단지별 가격 추이 비교">
        {grid.map((v, i) => (
          <g key={i}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={yOf(v)}
              y2={yOf(v)}
              stroke="var(--line)"
              strokeWidth={1}
              strokeDasharray="3 4"
              opacity={0.8}
            />
            <text x={PAD.left - 10} y={yOf(v) + 4} textAnchor="end" className="cmp-axis-label">
              {fmtManwonShort(v)}
            </text>
          </g>
        ))}

        {monthLabels.map((label, i) =>
          i % 2 === 0 || i === monthCount - 1 ? (
            <text key={i} x={xOf(i)} y={H - 10} textAnchor="middle" className="cmp-axis-label">
              {label}
            </text>
          ) : null
        )}

        {ready.map((it, si) => {
          const s = SERIES[si % SERIES.length];
          const pts = it
            .data!.points.map((p, i) => ({ p, i }))
            .filter(({ p }) => p.avgPriceManwon !== null)
            .map(({ p, i }) => ({ x: xOf(i), y: yOf(p.avgPriceManwon as number) }));
          return (
            <g key={it.id}>
              <path
                d={smoothPath(pts)}
                fill="none"
                stroke={s.color}
                strokeWidth={2.6}
                strokeDasharray={s.dash || undefined}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {pts.map((pt, i) => (
                <circle
                  key={i}
                  cx={pt.x}
                  cy={pt.y}
                  r={3.6}
                  fill={s.color}
                  stroke="var(--surface)"
                  strokeWidth={1.4}
                />
              ))}
            </g>
          );
        })}

        {/* 세로줄을 눌러 그 달의 값들을 한꺼번에 볼 수 있게 합니다 */}
        {monthLabels.map((_, i) => (
          <rect
            key={`hit${i}`}
            x={xOf(i) - (W - PAD.left - PAD.right) / (monthCount - 1) / 2}
            y={PAD.top}
            width={(W - PAD.left - PAD.right) / (monthCount - 1)}
            height={H - PAD.top - PAD.bottom}
            fill="transparent"
            style={{ cursor: "pointer" }}
            onClick={() => setActiveIdx((prev) => (prev === i ? null : i))}
          />
        ))}
        {activeIdx !== null && (
          <line
            x1={xOf(activeIdx)}
            x2={xOf(activeIdx)}
            y1={PAD.top}
            y2={H - PAD.bottom}
            stroke="var(--line-strong)"
            strokeWidth={1.2}
            strokeDasharray="3 3"
          />
        )}

        {/* 클릭한 달의 가격을 그래프 위에 직접 표시 */}
        {activeIdx !== null &&
          activeLabels.map((l, i) => {
            const w = l.text.length * 7.6 + 14;
            const x = labelsOnLeft ? xOf(activeIdx) - 9 - w : xOf(activeIdx) + 9;
            return (
              <g key={i}>
                <rect
                  x={x}
                  y={l.y - 9}
                  width={w}
                  height={18}
                  rx={5}
                  fill="var(--surface)"
                  stroke={l.color}
                  strokeWidth={1.3}
                  opacity={0.97}
                />
                <text
                  x={x + w / 2}
                  y={l.y + 4}
                  textAnchor="middle"
                  className="cmp-value-label"
                  fill={l.color}
                >
                  {l.text}
                </text>
              </g>
            );
          })}
        {activeIdx !== null && (
          <text
            x={xOf(activeIdx)}
            y={PAD.top - 4}
            textAnchor="middle"
            className="cmp-axis-label"
            fontWeight={700}
          >
            {monthLabels[activeIdx]}
          </text>
        )}
      </svg>
    );
  }

  const valueName = dealType === "sale" ? "매매가" : dealType === "jeonse" ? "보증금" : "월세";

  // 표에 쓸 요약 — 최근 값, 12개월 최고/최저, 거래 건수
  const summary = useMemo(
    () =>
      ready.map((it) => {
        const pts = it.data!.points;
        const vals = pts.map((p) => p.avgPriceManwon).filter((v): v is number => v !== null);
        const latest = [...pts].reverse().find((p) => p.avgPriceManwon !== null) ?? null;
        const first = pts.find((p) => p.avgPriceManwon !== null) ?? null;
        const changePct =
          latest && first && first.avgPriceManwon
            ? (((latest.avgPriceManwon as number) - first.avgPriceManwon) / first.avgPriceManwon) * 100
            : null;
        return {
          it,
          latest: latest?.avgPriceManwon ?? null,
          latestLabel: latest?.label ?? "-",
          high: vals.length ? Math.max(...vals) : null,
          low: vals.length ? Math.min(...vals) : null,
          count: pts.reduce((sum, p) => sum + p.count, 0),
          changePct,
        };
      }),
    [ready]
  );

  return (
    <div className="wrap">
      <SiteHeader current="compare" />

      <section className="block">
        <h2>아파트 실거래가 비교</h2>
        <p className="section-note">
          단지를 <strong>최대 {MAX_ITEMS}개</strong>까지 담아 최근 1년 {valueName} 흐름을 한 그래프에서
          견줘볼 수 있습니다. 같은 단지라도 평형마다 가격이 달라, 평형(타입)별로 담깁니다.
        </p>

        <div className="hero-range-tabs" style={{ marginBottom: 12 }}>
          {DEAL_TABS.map((t) => (
            <button
              key={t.key}
              className="hero-range-tab"
              aria-pressed={dealType === t.key}
              onClick={() => changeDealType(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <input
          className="search-input"
          type="text"
          inputMode="search"
          placeholder={
            items.length >= MAX_ITEMS
              ? `${MAX_ITEMS}개까지 담을 수 있어요 — 하나를 빼고 추가하세요`
              : "비교할 아파트 이름을 입력하세요 (예: 광안자이)"
          }
          value={query}
          disabled={items.length >= MAX_ITEMS}
          onChange={(e) => setQuery(e.target.value)}
        />

        {query.trim() && (
          <div className="search-results">
            {searching ? (
              <div className="empty-note">찾는 중…</div>
            ) : results.length === 0 ? (
              <div className="empty-note">
                &quot;{query}&quot; {DEAL_TABS.find((t) => t.key === dealType)?.label} 거래를 찾지 못했습니다.
              </div>
            ) : (
              results.map((r, i) => {
                const id = itemId(r.regionCode, r.complex, r.areaM2);
                const already = items.some((it) => it.id === id);
                return (
                  <button
                    key={`${id}-${i}`}
                    className="search-result-row"
                    disabled={already}
                    onClick={() => addItem(r)}
                  >
                    <div className="recent-main">
                      <span className="recent-loc">
                        {r.regionName} · {r.dong}
                      </span>
                      <span className="recent-complex">
                        {r.complex} · {areaDetail(r.areaM2)}
                      </span>
                    </div>
                    <div className="recent-side">
                      <span className="recent-price">
                        {r.priceManwon !== null
                          ? fmtManwon(r.priceManwon)
                          : r.monthlyRentManwon !== null
                          ? `${fmtManwon(r.depositManwon ?? 0)} / 월 ${fmtManwon(r.monthlyRentManwon)}`
                          : r.depositManwon !== null
                          ? fmtManwon(r.depositManwon)
                          : "-"}
                      </span>
                      <span className="recent-date">{already ? "이미 담음" : "＋ 담기"}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        )}
      </section>

      {items.length > 0 && (
        <section className="block">
          <div className="cmp-chips">
            {items.map((it, i) => {
              const s = SERIES[ready.findIndex((r) => r.id === it.id) % SERIES.length];
              const known = ready.some((r) => r.id === it.id);
              return (
                <span className="cmp-chip" key={it.id}>
                  <span
                    className="cmp-swatch"
                    style={{
                      borderTopColor: known ? s.color : "var(--line-strong)",
                      borderTopStyle: known && s.dash ? "dashed" : "solid",
                    }}
                  />
                  <span className="cmp-chip-name">
                    {it.complex} <span className="cmp-chip-area">{Math.round(it.areaM2)}㎡</span>
                  </span>
                  <button
                    className="cmp-remove"
                    aria-label={`${it.complex} 비교에서 빼기`}
                    onClick={() => removeItem(it.id)}
                  >
                    ✕
                  </button>
                </span>
              );
            })}
          </div>

          {items.some((it) => it.loading) && <div className="empty-note">불러오는 중…</div>}
          {items.filter((it) => it.error).map((it) => (
            <div className="banner error" key={it.id} style={{ margin: "8px 0 0" }}>
              <strong>{it.complex}</strong> — {it.error}
            </div>
          ))}

          {chart ? (
            <div className="cmp-chart-wrap">
              {chart}
            </div>
          ) : (
            !items.some((it) => it.loading) && (
              <div className="empty-note">
                담은 단지에 최근 1년 {valueName} 거래가 없어 그래프를 그릴 수 없습니다.
              </div>
            )
          )}

          {summary.length > 0 && (
            <div className="top5-table-wrap" style={{ marginTop: 14 }}>
              <table className="top5-table cmp-table">
                <thead>
                  <tr>
                    <th className="c-name">단지 · 평형</th>
                    <th className="c-price">최근 {valueName}</th>
                    <th className="c-price">1년 최고</th>
                    <th className="c-price">1년 최저</th>
                    <th className="c-area">거래</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.map((s, si) => (
                    <tr key={s.it.id}>
                      <td className="c-name">
                        <span className="t5-complex">
                          <span
                            className="cmp-swatch"
                            style={{
                              borderTopColor: SERIES[si % SERIES.length].color,
                              borderTopStyle: SERIES[si % SERIES.length].dash ? "dashed" : "solid",
                            }}
                          />
                          {s.it.complex}
                        </span>
                        <span className="t5-loc">
                          {s.it.regionName} · 전용 {s.it.areaM2}㎡
                          {s.it.data?.age ? ` · ${s.it.data.age}년차` : ""}
                        </span>
                      </td>
                      <td className="c-price">
                        {s.latest !== null ? fmtManwon(s.latest) : "-"}
                        {s.changePct !== null && (
                          <span className={`cmp-delta ${s.changePct >= 0 ? "up" : "down"}`}>
                            {s.changePct >= 0 ? "▲" : "▼"} {Math.abs(s.changePct).toFixed(1)}%
                          </span>
                        )}
                      </td>
                      <td className="c-price">{s.high !== null ? fmtManwon(s.high) : "-"}</td>
                      <td className="c-price">{s.low !== null ? fmtManwon(s.low) : "-"}</td>
                      <td className="c-area">{s.count}건</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p className="section-note" style={{ marginTop: 10 }}>
            그래프의 값은 <strong>그 달에 거래된 가격의 평균</strong>입니다. 같은 평형이라도 층·향에
            따라 실제 가격은 달라질 수 있어요. 증감률은 1년 전 첫 거래 달과 견준 값입니다.
          </p>
        </section>
      )}
    </div>
  );
}
