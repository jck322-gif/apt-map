"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import type { Region } from "@/lib/regions";
import KakaoMap from "@/components/KakaoMap";

type Listing = {
  dong: string;
  complex: string;
  areaM2: number;
  pyeong: number;
  floor: number;
  date: string;
  dealDay: number;
  priceManwon: number | null;
  depositManwon: number | null;
  monthlyRentManwon: number | null;
};

type RecentListing = Listing & { regionName: string; group: "부산" | "울산" };

type RegionSummary = Region & {
  count: number;
  trendPct: number | null;
  avgValueManwon: number | null;
  listings: Listing[];
};

type DealType = "sale" | "jeonse" | "monthly";

type ApiResponse = {
  updatedAt: string;
  dealType: DealType;
  dealYmd: string;
  prevYmd: string;
  regions: RegionSummary[];
  errors: { region: string; message: string }[];
};

const DEAL_TABS: { key: DealType; label: string }[] = [
  { key: "sale", label: "매매" },
  { key: "jeonse", label: "전세" },
  { key: "monthly", label: "월세" },
];

function dealLabel(dealType: DealType): string {
  return DEAL_TABS.find((t) => t.key === dealType)?.label ?? "매매";
}

/** 만원 단위 금액을 "5억 1,400만원" 같은 한국식 표기로 바꿉니다. */
function fmtManwon(manwon: number): string {
  const sign = manwon < 0 ? "-" : "";
  const abs = Math.abs(Math.round(manwon));
  const eok = Math.floor(abs / 10000);
  const rest = abs % 10000;
  if (eok === 0) return `${sign}${rest.toLocaleString()}만원`;
  if (rest === 0) return `${sign}${eok}억원`;
  return `${sign}${eok}억 ${rest.toLocaleString()}만원`;
}

/** 거래 한 건의 가격 표시 문구(매매가 / 보증금 / 보증금+월세)를 만듭니다. */
function listingPriceLabel(l: Listing): string {
  if (l.priceManwon !== null) return fmtManwon(l.priceManwon);
  if (l.monthlyRentManwon !== null) {
    return `${fmtManwon(l.depositManwon ?? 0)} / 월 ${fmtManwon(l.monthlyRentManwon)}`;
  }
  if (l.depositManwon !== null) return fmtManwon(l.depositManwon);
  return "-";
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

/** 지역의 거래 목록을 동 → 단지 순으로 묶습니다 (구 선택 → 동 선택 → 단지 선택 흐름을 위한 준비 작업). */
function groupByDong(listings: Listing[]) {
  const dongOrder: string[] = [];
  const dongMap = new Map<string, Map<string, Listing[]>>();
  for (const l of listings) {
    if (!dongMap.has(l.dong)) {
      dongMap.set(l.dong, new Map());
      dongOrder.push(l.dong);
    }
    const complexMap = dongMap.get(l.dong)!;
    if (!complexMap.has(l.complex)) complexMap.set(l.complex, []);
    complexMap.get(l.complex)!.push(l);
  }
  return dongOrder.map((dong) => {
    const complexMap = dongMap.get(dong)!;
    return {
      dong,
      complexes: Array.from(complexMap.entries()).map(([complex, items]) => ({ complex, items })),
    };
  });
}

export default function Dashboard({ staticRegions }: { staticRegions: Region[] }) {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [dealType, setDealType] = useState<DealType>("sale");
  const [filter, setFilter] = useState<"전체" | "부산" | "울산">("전체");
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [openCode, setOpenCode] = useState<string | null>(null);
  const [openComplex, setOpenComplex] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [kakaoFailed, setKakaoFailed] = useState(false);
  const kakaoKey = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;

  const load = useCallback(async (type: DealType) => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(`/api/update?dealType=${type}`);
      const json = (await res.json()) as ApiResponse & { error?: string };
      if (!res.ok) throw new Error(json.error ?? `요청 실패 (${res.status})`);
      setData(json);
      const changed = json.regions.length;
      setToast(
        `업데이트 완료 · ${dealLabel(type)} ${changed}개 지역 반영${
          json.errors.length ? ` · ${json.errors.length}개 지역 실패` : ""
        }`
      );
      setTimeout(() => setToast(null), 3000);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(dealType);
    setOpenComplex(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dealType]);

  const regions: RegionSummary[] = useMemo(() => {
    // 각 지역별로 API 결과가 있으면 그 값을, 없으면(아직 로딩 전이거나 그 지역만 실패했으면)
    // 0건짜리 뼈대를 사용합니다 — 일부/전체 지역이 실패해도 목록 자체는 항상 21개가 보이도록.
    const byCode = new Map(data?.regions.map((r) => [r.code, r]) ?? []);
    return staticRegions.map(
      (r) => byCode.get(r.code) ?? { ...r, count: 0, trendPct: null, avgValueManwon: null, listings: [] }
    );
  }, [data, staticRegions]);

  const busanList = useMemo(
    () => regions.filter((r) => r.group === "부산").sort((a, b) => b.count - a.count),
    [regions]
  );
  const ulsanList = useMemo(
    () => regions.filter((r) => r.group === "울산").sort((a, b) => b.count - a.count),
    [regions]
  );
  // 부산/울산이 뒤섞이지 않도록, 화면 아래 리스트는 항상 부산 그룹 · 울산 그룹으로 나눠서 보여줍니다.
  // 칩("전체"/"부산"/"울산")으로 필터링하면 해당 그룹 섹션만 남습니다.
  const groupSections = useMemo(() => {
    const sections: { group: "부산" | "울산"; list: RegionSummary[] }[] = [];
    if (filter === "전체" || filter === "부산") sections.push({ group: "부산", list: busanList });
    if (filter === "전체" || filter === "울산") sections.push({ group: "울산", list: ulsanList });
    return sections;
  }, [filter, busanList, ulsanList]);
  const top5 = useMemo(() => regions.slice().sort((a, b) => b.count - a.count).slice(0, 5), [regions]);
  const maxCount = useMemo(() => Math.max(1, ...regions.map((r) => r.count)), [regions]);

  // 첫 화면 맨 위에 보여줄 "오늘의 실거래" 피드 — 전체 지역의 개별 거래를 계약일(dealDay) 기준
  // 최신순으로 모아서 상위 N건만 보여줍니다. 부산/울산 칩으로 필터링하면 이 피드도 같이 걸러집니다.
  // 참고: 국토부 실거래가는 계약 후 최대 30일 이내에 신고하면 되는 제도라, "오늘 신고된" 것이
  // 반드시 "오늘 계약된" 것은 아닐 수 있습니다 — 그래도 이번 달 데이터 중 가장 최근 계약일 순입니다.
  const RECENT_FEED_LIMIT = 30;
  const recentSourceRegions = useMemo(
    () => (filter === "전체" ? regions : regions.filter((r) => r.group === filter)),
    [regions, filter]
  );
  const recentListings = useMemo(() => {
    const flat: RecentListing[] = recentSourceRegions.flatMap((r) =>
      r.listings.map((l) => ({ ...l, regionName: r.name, group: r.group }))
    );
    return flat.sort((a, b) => b.dealDay - a.dealDay).slice(0, RECENT_FEED_LIMIT);
  }, [recentSourceRegions]);

  const selectRegion = useCallback((code: string) => {
    setSelectedCode(code);
    setOpenCode((prev) => (prev === code ? null : code));
  }, []);

  return (
    <div className="wrap">
      <header className="app-header">
        <div className="title-row">
          <h1>부울산 아파트 실거래</h1>
          <span className="live-badge">실시간 연동</span>
        </div>

        <div className="deal-tabs">
          {DEAL_TABS.map((t) => (
            <button
              key={t.key}
              className="deal-tab"
              aria-pressed={dealType === t.key}
              onClick={() => setDealType(t.key)}
            >
              {t.label}
            </button>
          ))}
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
          <button className="update-btn" disabled={loading} onClick={() => load(dealType)}>
            <span className={loading ? "spin" : ""}>↻</span>
            {loading ? "업데이트 중…" : "지금 업데이트"}
          </button>
        </div>
        <p className="last-updated">
          {data
            ? `마지막 업데이트: ${timeAgo(data.updatedAt)} · ${dealLabel(dealType)} · 계약월 ${data.dealYmd}`
            : "아직 업데이트한 적이 없습니다"}
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

      <section className="block hero-block">
        <h2>오늘의 실거래 · {dealLabel(dealType)}</h2>
        <p className="empty-note" style={{ padding: "0 0 10px" }}>
          이번 달 계약 중 최근 계약일 순으로 모았어요 (국토부 신고 기준 최대 30일 지연될 수 있어요).
        </p>
        {recentListings.length === 0 ? (
          <div className="empty-note">표시할 거래가 없습니다. 지금 업데이트를 눌러보세요.</div>
        ) : (
          <div className="recent-feed">
            {recentListings.map((l, i) => (
              <div className="recent-row" key={`${l.regionName}-${l.complex}-${l.dealDay}-${i}`}>
                <div className="recent-main">
                  <span className="recent-loc">
                    {l.group} · {l.regionName} · {l.dong}
                  </span>
                  <span className="recent-complex">
                    {l.complex} · {Math.round(l.pyeong)}평 · {l.floor}층
                  </span>
                </div>
                <div className="recent-side">
                  <span className="recent-price">{listingPriceLabel(l)}</span>
                  <span className="recent-date">{l.date} 계약</span>
                </div>
              </div>
            ))}
          </div>
        )}
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
        <h2>거래 많은 지역 TOP 5 · {dealLabel(dealType)}</h2>
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
        <h2>지역별 실거래 리스트 · {dealLabel(dealType)}</h2>
        <p className="empty-note" style={{ padding: "0 0 10px" }}>
          구를 눌러 펼친 뒤, 동 → 단지 순서로 눌러보면 해당 단지의 개별 거래 내역이 나옵니다.
        </p>
        {groupSections.map(({ group, list }) => (
          <div className="group-section" key={group}>
            <h3 className="group-heading">
              {group} <span className="group-count">({list.length})</span>
            </h3>
            <div className="region-list">
              {list.map((r) => {
                const dongGroups = groupByDong(r.listings);
                return (
                  <div
                    key={r.code}
                    className={`region-row${selectedCode === r.code ? " selected" : ""}${
                      openCode === r.code ? " open" : ""
                    }`}
                  >
                    <button className="region-head" onClick={() => selectRegion(r.code)}>
                      <span className="nm">{r.name}</span>
                      <TrendBadge trendPct={r.trendPct} />
                      <span className="cnt">{r.count}건</span>
                      <span className="chev">▾</span>
                    </button>
                    <div className="listing-panel">
                      {dongGroups.length === 0 ? (
                        <div className="empty-note">
                          이번 달 {dealLabel(dealType)} 거래 데이터가 없습니다.
                        </div>
                      ) : (
                        dongGroups.map(({ dong, complexes }) => (
                          <div className="dong-group" key={dong}>
                            <div className="dong-heading">
                              {dong} <span className="dong-count">단지 {complexes.length}곳</span>
                            </div>
                            <div className="complex-chip-row">
                              {complexes.map(({ complex, items }) => {
                                const key = `${r.code}::${dong}::${complex}`;
                                const open = openComplex === key;
                                return (
                                  <button
                                    key={key}
                                    className={`complex-chip${open ? " open" : ""}`}
                                    onClick={() =>
                                      setOpenComplex((prev) => (prev === key ? null : key))
                                    }
                                  >
                                    {complex} <span className="complex-chip-count">{items.length}</span>
                                  </button>
                                );
                              })}
                            </div>
                            {complexes.map(({ complex, items }) => {
                              const key = `${r.code}::${dong}::${complex}`;
                              if (openComplex !== key) return null;
                              return (
                                <div className="complex-detail" key={`${key}-detail`}>
                                  {items.map((l, i) => (
                                    <div className="listing" key={i}>
                                      <div className="l-top">
                                        <span>
                                          {l.complex} · {Math.round(l.pyeong)}평 ({l.areaM2.toFixed(0)}
                                          ㎡)
                                        </span>
                                        <span className="l-price">{listingPriceLabel(l)}</span>
                                      </div>
                                      <div className="l-meta">
                                        <span>{l.floor}층</span>
                                        <span>{l.date} 계약</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              );
                            })}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </section>

      <footer className="end">
        데이터 출처: 국토교통부 아파트매매/전월세 실거래 상세 자료(공공데이터포털). 개념도는 실제
        행정구역 경계와 다를 수 있는 단순화된 표시입니다.
      </footer>

      <div className={`toast${toast ? " show" : ""}`}>{toast}</div>
    </div>
  );
}
