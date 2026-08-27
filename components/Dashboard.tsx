"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import type { Region } from "@/lib/regions";
import KakaoMap from "@/components/KakaoMap";

type Listing = {
  dong: string;
  complex: string;
  areaM2: number;
  floor: number;
  priceManwon: number;
  date: string;
};

type RegionSummary = Region & {
  count: number;
  trendPct: number | null;
  avgPriceManwon: number | null;
  listings: Listing[];
};

type ApiResponse = {
  updatedAt: string;
  dealYmd: string;
  prevYmd: string;
  regions: RegionSummary[];
  errors: { region: string; message: string }[];
};

function fmtPrice(manwon: number): string {
  return (manwon / 10000).toFixed(1) + "억";
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "방금 전";
  if (mins < 60) return `${mins}분 전`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}시간 전`;
}

function TrendBadge({ trendPct }: { trendPct: number | null }) {
  if (trendPct === null) return <span className="trend flat">데이터 부족</span>;
  const up = trendPct >= 0;
  return (
    <span className={`trend ${up ? "up" : "down"}`}>
      {up ? "▲" : "▼"} {Math.abs(trendPct).toFixed(1)}%
    </span>
  );
}

export default function Dashboard({ staticRegions }: { staticRegions: Region[] }) {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"전체" | "부산" | "울산">("전체");
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [openCode, setOpenCode] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [kakaoFailed, setKakaoFailed] = useState(false);
  const kakaoKey = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;

  async function load() {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/update");
      const json = (await res.json()) as ApiResponse & { error?: string };
      if (!res.ok) throw new Error(json.error ?? `요청 실패 (${res.status})`);
      setData(json);
      const changed = json.regions.length;
      setToast(`업데이트 완료 · ${changed}개 지역 반영${json.errors.length ? ` · ${json.errors.length}개 지역 실패` : ""}`);
      setTimeout(() => setToast(null), 3000);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const regions: RegionSummary[] = useMemo(() => {
    // 각 지역별로 API 결과가 있으면 그 값을, 없으면(아직 로딩 전이거나 그 지역만 실패했으면)
    // 0건짜리 뼈대를 사용합니다 — 일부/전체 지역이 실패해도 목록 자체는 항상 21개가 보이도록.
    const byCode = new Map(data?.regions.map((r) => [r.code, r]) ?? []);
    return staticRegions.map(
      (r) => byCode.get(r.code) ?? { ...r, count: 0, trendPct: null, avgPriceManwon: null, listings: [] }
    );
  }, [data, staticRegions]);

  const filtered = useMemo(
    () => (filter === "전체" ? regions : regions.filter((r) => r.group === filter)),
    [regions, filter]
  );
  const sortedList = useMemo(() => filtered.slice().sort((a, b) => b.count - a.count), [filtered]);
  const top5 = useMemo(() => regions.slice().sort((a, b) => b.count - a.count).slice(0, 5), [regions]);
  const maxCount = useMemo(() => Math.max(1, ...regions.map((r) => r.count)), [regions]);

  const selectRegion = useCallback((code: string) => {
    setSelectedCode(code);
    setOpenCode((prev) => (prev === code ? null : code));
  }, []);

  return (
    <div className="wrap">
      <header className="app-header">
        <div className="title-row">
          <h1>우리동네 실거래</h1>
          <span className="live-badge">실시간 연동</span>
        </div>
        <div className="controls">
          <div className="chips">
            {(["전체", "부산", "울산"] as const).map((g) => (
              <button
                key={g}
                className="chip"
                aria-pressed={filter === g}
                onClick={() => setFilter(g)}
              >
                {g}
              </button>
            ))}
          </div>
          <button className="update-btn" disabled={loading} onClick={load}>
            <span className={loading ? "spin" : ""}>↻</span>
            {loading ? "업데이트 중…" : "지금 업데이트"}
          </button>
        </div>
        <p className="last-updated">
          {data ? `마지막 업데이트: ${timeAgo(data.updatedAt)} · 계약월 ${data.dealYmd}` : "아직 업데이트한 적이 없습니다"}
        </p>
      </header>

      {loadError && (
        <div className="banner error">
          <strong>업데이트 실패</strong> — {loadError}
        </div>
      )}
      {!loadError && data && data.errors.length > 0 && (
        <div className="banner info">
          <strong>일부 지역 데이터를 가져오지 못했습니다 ({data.errors.length}개 지역)</strong>
          <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
            {data.errors.slice(0, 3).map((e, i) => (
              <li key={i} style={{ fontSize: 13, wordBreak: "break-all" }}>
                {e.region}: {e.message}
              </li>
            ))}
          </ul>
          {data.errors.length > 3 && (
            <p style={{ margin: "4px 0 0", fontSize: 12 }}>
              (나머지 {data.errors.length - 3}개 지역도 같은 원인일 가능성이 높습니다)
            </p>
          )}
        </div>
      )}

      <section className="block">
        <h2>거래 많은 지역 TOP 5</h2>
        <div className="rank-scroll">
          {top5.map((r, i) => (
            <div className="rank-card" key={r.code} onClick={() => selectRegion(r.code)}>
              <div className="rank-no">TOP {i + 1} · {r.group}</div>
              <div className="rank-name">{r.name}</div>
              <div>
                <span className="rank-count">{r.count}</span>
                <span className="rank-unit">건</span>
              </div>
              <div style={{ marginTop: 6 }}>
                <TrendBadge trendPct={r.trendPct} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="block">
        <h2>지역 지도</h2>
        <div className="map-card">
          {kakaoKey && !kakaoFailed ? (
            <KakaoMap
              regions={regions}
              selectedCode={selectedCode}
              filter={filter}
              onSelect={selectRegion}
              onError={() => setKakaoFailed(true)}
            />
          ) : (
            <svg className="map" viewBox="0 0 760 480" role="img" aria-label="부산·울산 지역 개념도">
              {regions.map((r) => {
                const dimmed = filter !== "전체" && r.group !== filter;
                const radius = 9 + (r.count / maxCount) * 17;
                const color =
                  r.trendPct === null ? "var(--muted)" : r.trendPct >= 0 ? "var(--rise)" : "var(--fall)";
                return (
                  <g
                    key={r.code}
                    className={`node${dimmed ? " dim" : ""}${selectedCode === r.code ? " selected" : ""}`}
                    onClick={() => selectRegion(r.code)}
                  >
                    <circle cx={r.x} cy={r.y} r={radius} fill={color} opacity={0.85} />
                    <text
                      x={r.x}
                      y={r.y + 3.5}
                      textAnchor="middle"
                      fontFamily="IBM Plex Mono, monospace"
                      fontSize={Math.max(9, radius * 0.55)}
                      fontWeight={700}
                      fill="#fff"
                    >
                      {r.count}
                    </text>
                    <text className="node-label" x={r.x} y={r.y + radius + 12} textAnchor="middle">
                      {r.name}
                    </text>
                  </g>
                );
              })}
            </svg>
          )}
          <div className="legend">
            <span><span className="dot" style={{ background: "var(--rise)" }} />상승</span>
            <span><span className="dot" style={{ background: "var(--fall)" }} />하락</span>
            <span>원 크기 = 거래량</span>
          </div>
        </div>
        {kakaoKey && (
          <p className="empty-note" style={{ padding: "8px 2px 0" }}>
            지도가 비어 보이면 카카오 개발자센터 → 앱 설정 → 플랫폼에서 이 사이트 도메인이
            등록되어 있는지 확인하세요 (로컬 테스트 시 http://localhost:3000 추가).
          </p>
        )}
      </section>

      <section className="block">
        <h2>{filter === "전체" ? "전체 지역" : `${filter} 지역`} ({sortedList.length})</h2>
        <div className="region-list">
          {sortedList.map((r) => (
            <div
              key={r.code}
              className={`region-row${selectedCode === r.code ? " selected" : ""}${openCode === r.code ? " open" : ""}`}
            >
              <button className="region-head" onClick={() => selectRegion(r.code)}>
                <span className="grp">{r.group}</span>
                <span className="nm">{r.name}</span>
                <TrendBadge trendPct={r.trendPct} />
                <span className="cnt">{r.count}건</span>
                <span className="chev">▾</span>
              </button>
              <div className="listing-panel">
                {r.listings.length === 0 ? (
                  <div className="empty-note">이번 달 거래 데이터가 없습니다.</div>
                ) : (
                  r.listings.map((l, i) => (
                    <div className="listing" key={i}>
                      <div className="l-top">
                        <span>{l.dong} · {l.complex}</span>
                        <span className="l-price">{fmtPrice(l.priceManwon)}</span>
                      </div>
                      <div className="l-meta">
                        <span>{l.areaM2.toFixed(0)}㎡</span>
                        <span>{l.floor}층</span>
                        <span>{l.date} 계약</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer className="end">
        데이터 출처: 국토교통부 아파트매매 실거래 상세 자료(공공데이터포털). 개념도는 실제 행정구역 경계와 다를 수 있는 단순화된 표시입니다.
      </footer>

      <div className={`toast${toast ? " show" : ""}`}>{toast}</div>
    </div>
  );
}
