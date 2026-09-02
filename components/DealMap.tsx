"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { REGIONS } from "@/lib/regions";
import { loadKakaoSdk } from "@/lib/kakaoSdk";
import { fmtManwon, typeLabel } from "@/lib/format";
import { kstTodayYmdInt, kstYmdIntAgo, ymdIntToKoLabel } from "@/lib/kst";
import ComplexTrendModal from "@/components/ComplexTrendModal";
import Logo from "@/components/Logo";
import { SITE_NAME } from "@/lib/site";

type DealType = "sale" | "jeonse" | "monthly";
type Area = "부산" | "울산";
type Range = "today" | "week" | "month";

const DEAL_TABS: { key: DealType; label: string }[] = [
  { key: "sale", label: "매매" },
  { key: "jeonse", label: "전세" },
  { key: "monthly", label: "월세" },
];
const RANGE_TABS: { key: Range; label: string; daysBack: number }[] = [
  { key: "today", label: "오늘 등록", daysBack: 0 },
  { key: "week", label: "지난 7일", daysBack: 6 },
  { key: "month", label: "지난 1개월", daysBack: 29 },
];

/** 지오코딩(주소→좌표) 결과를 브라우저에 저장해 두는 열쇠. 형식을 바꾸면 v를 올립니다. */
const COORD_CACHE_KEY = "buulapt.dongCoords.v1";
/** 한 번에 동시에 요청할 지오코딩 수 (카카오 쪽 부담을 줄이기 위해 조금씩 나눠 보냅니다) */
const GEOCODE_CONCURRENCY = 5;

type Listing = {
  dong: string;
  complex: string;
  areaM2: number;
  floor: number;
  date: string;
  dealYmd: number;
  registeredYmd: number | null;
  isCancelled: boolean;
  isDirect: boolean;
  priceManwon: number | null;
  depositManwon: number | null;
  monthlyRentManwon: number | null;
};

type RegionSummary = {
  code: string;
  name: string;
  group: Area;
  lat: number;
  lng: number;
  listings: Listing[];
};

type ApiResponse = { updatedAt: string; regions: RegionSummary[] };

/** 한 동에 모인 거래들 */
type DongGroup = {
  key: string; // 지역코드|동
  regionCode: string;
  regionName: string;
  group: Area;
  dong: string;
  listings: Listing[];
};

function priceLabel(l: Listing): string {
  if (l.priceManwon !== null) return fmtManwon(l.priceManwon);
  if (l.monthlyRentManwon !== null) {
    return `${fmtManwon(l.depositManwon ?? 0)} / 월 ${fmtManwon(l.monthlyRentManwon)}`;
  }
  if (l.depositManwon !== null) return fmtManwon(l.depositManwon);
  return "-";
}

function sortValue(l: Listing): number {
  return l.priceManwon ?? l.monthlyRentManwon ?? l.depositManwon ?? 0;
}

function readCoordCache(): Record<string, [number, number]> {
  try {
    const raw = localStorage.getItem(COORD_CACHE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, [number, number]>) : {};
  } catch {
    // 브라우저가 저장을 막아둔 경우에도 지도는 그냥 동작해야 합니다 (매번 다시 찾을 뿐).
    return {};
  }
}

function writeCoordCache(map: Record<string, [number, number]>) {
  try {
    localStorage.setItem(COORD_CACHE_KEY, JSON.stringify(map));
  } catch {
    /* 저장 못 해도 무시 */
  }
}

export default function DealMap({ initialArea }: { initialArea: Area }) {
  const [area, setArea] = useState<Area>(initialArea);
  const [dealType, setDealType] = useState<DealType>("sale");
  const [range, setRange] = useState<Range>("week");
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [mapError, setMapError] = useState(false);
  const [coords, setCoords] = useState<Record<string, [number, number]>>({});
  const [geocoding, setGeocoding] = useState(false);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [trendTarget, setTrendTarget] = useState<
    { code: string; regionName: string; complex: string; areaM2?: number } | null
  >(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const overlaysRef = useRef<any[]>([]);
  const sdkReadyRef = useRef(false);

  const todayYmd = useMemo(() => kstTodayYmdInt(), []);

  // --- 거래 자료 받아오기 ---
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    fetch(`/api/update?dealType=${dealType}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? `요청 실패 (${res.status})`);
        if (!cancelled) setData(json as ApiResponse);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [dealType]);

  // --- 기간 안에 든 거래를 동별로 묶기 ---
  const fromYmd = useMemo(() => {
    const days = RANGE_TABS.find((r) => r.key === range)?.daysBack ?? 6;
    return days === 0 ? todayYmd : kstYmdIntAgo(days);
  }, [range, todayYmd]);

  const dongGroups = useMemo<DongGroup[]>(() => {
    if (!data) return [];
    const map = new Map<string, DongGroup>();
    for (const r of data.regions) {
      if (r.group !== area) continue;
      for (const l of r.listings) {
        // 신고(등록)일 기준입니다 — 계약일로 거르면 "오늘 등록"이 거의 항상 비어 있습니다.
        const reg = l.registeredYmd ?? l.dealYmd;
        if (reg < fromYmd || reg > todayYmd) continue;
        const key = `${r.code}|${l.dong}`;
        let g = map.get(key);
        if (!g) {
          g = { key, regionCode: r.code, regionName: r.name, group: r.group, dong: l.dong, listings: [] };
          map.set(key, g);
        }
        g.listings.push(l);
      }
    }
    for (const g of map.values()) g.listings.sort((a, b) => sortValue(b) - sortValue(a));
    return Array.from(map.values()).sort((a, b) => b.listings.length - a.listings.length);
  }, [data, area, fromYmd, todayYmd]);

  // --- 동 이름 → 좌표 (카카오 주소 검색). 한 번 찾은 값은 브라우저에 저장해 다시 찾지 않습니다. ---
  useEffect(() => {
    const appkey = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
    if (!appkey || dongGroups.length === 0) return;
    let cancelled = false;

    (async () => {
      try {
        await loadKakaoSdk(appkey);
      } catch {
        if (!cancelled) setMapError(true);
        return;
      }
      if (cancelled) return;
      window.kakao.maps.load(async () => {
        if (cancelled) return;
        const cache = readCoordCache();
        const missing = dongGroups.filter((g) => !cache[g.key]);
        if (missing.length === 0) {
          setCoords((prev) => ({ ...prev, ...cache }));
          return;
        }
        setGeocoding(true);
        const geocoder = new window.kakao.maps.services.Geocoder();
        const lookup = (g: DongGroup) =>
          new Promise<void>((resolve) => {
            const address = `${g.group}광역시 ${g.regionName} ${g.dong}`;
            geocoder.addressSearch(address, (result: any[], status: string) => {
              if (status === window.kakao.maps.services.Status.OK && result[0]) {
                cache[g.key] = [Number(result[0].y), Number(result[0].x)];
              }
              resolve();
            });
          });

        // 한꺼번에 다 보내지 않고 조금씩 나눠 보냅니다.
        for (let i = 0; i < missing.length; i += GEOCODE_CONCURRENCY) {
          if (cancelled) return;
          await Promise.all(missing.slice(i, i + GEOCODE_CONCURRENCY).map(lookup));
        }
        if (cancelled) return;
        writeCoordCache(cache);
        setCoords({ ...cache });
        setGeocoding(false);
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [dongGroups]);

  // --- 지도 만들기 ---
  useEffect(() => {
    const appkey = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
    if (!appkey) {
      setMapError(true);
      return;
    }
    let cancelled = false;
    loadKakaoSdk(appkey)
      .then(() => {
        if (cancelled) return;
        window.kakao.maps.load(() => {
          if (cancelled || !containerRef.current || mapRef.current) return;
          try {
            const list = REGIONS.filter((r) => r.group === area);
            const lats = list.map((r) => r.lat);
            const lngs = list.map((r) => r.lng);
            const map = new window.kakao.maps.Map(containerRef.current, {
              center: new window.kakao.maps.LatLng(
                (Math.min(...lats) + Math.max(...lats)) / 2,
                (Math.min(...lngs) + Math.max(...lngs)) / 2
              ),
              level: 8,
            });
            mapRef.current = map;
            sdkReadyRef.current = true;
          } catch {
            if (!cancelled) setMapError(true);
          }
        });
      })
      .catch(() => {
        if (!cancelled) setMapError(true);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 부산 ↔ 울산을 바꾸면 지도 중심을 옮깁니다
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !window.kakao?.maps) return;
    const list = REGIONS.filter((r) => r.group === area);
    const lats = list.map((r) => r.lat);
    const lngs = list.map((r) => r.lng);
    map.setLevel(8);
    map.setCenter(
      new window.kakao.maps.LatLng(
        (Math.min(...lats) + Math.max(...lats)) / 2,
        (Math.min(...lngs) + Math.max(...lngs)) / 2
      )
    );
  }, [area]);

  // --- 동 표식 그리기 ---
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !window.kakao?.maps) return;

    overlaysRef.current.forEach((ov) => ov.setMap(null));
    overlaysRef.current = [];

    for (const g of dongGroups) {
      const pos = coords[g.key];
      if (!pos) continue; // 좌표를 아직 못 찾은 동은 건너뜁니다
      const selected = openKey === g.key;

      const wrap = document.createElement("div");
      wrap.style.cssText = `
        display:flex;flex-direction:column;align-items:center;gap:2px;cursor:pointer;
        ${selected ? "z-index:6;" : ""}
      `;

      const box = document.createElement("div");
      box.style.cssText = `
        padding:4px 9px;border-radius:8px;white-space:nowrap;line-height:1.35;
        font-family:'Noto Sans KR',sans-serif;font-size:12px;font-weight:700;text-align:center;
        background:${selected ? "#d9663f" : "#26404f"};color:#fff;
        border:2px solid rgba(255,255,255,0.9);
        box-shadow:0 2px 6px rgba(0,0,0,0.3);
      `;
      box.innerHTML = `${g.dong}<br><span style="font-family:'IBM Plex Mono',monospace;font-size:11px">${g.listings.length}건 보기</span>`;

      const tail = document.createElement("div");
      tail.style.cssText = `
        width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;
        border-top:6px solid ${selected ? "#d9663f" : "#26404f"};
      `;

      wrap.appendChild(box);
      wrap.appendChild(tail);
      wrap.onclick = () => setOpenKey((prev) => (prev === g.key ? null : g.key));

      const overlay = new window.kakao.maps.CustomOverlay({
        position: new window.kakao.maps.LatLng(pos[0], pos[1]),
        content: wrap,
        yAnchor: 1,
      });
      overlay.setMap(map);
      overlaysRef.current.push(overlay);
    }
  }, [dongGroups, coords, openKey]);

  const openGroup = dongGroups.find((g) => g.key === openKey) ?? null;
  const totalCount = dongGroups.reduce((sum, g) => sum + g.listings.length, 0);
  const rangeLabel = RANGE_TABS.find((r) => r.key === range)?.label ?? "";
  const placed = dongGroups.filter((g) => coords[g.key]).length;

  const closePanel = useCallback(() => setOpenKey(null), []);

  return (
    <div className="dealmap-page">
      <div className="dealmap-bar">
        <Link href="/" className="dealmap-brand" aria-label={`${SITE_NAME} 홈으로`}>
          <Logo size={26} />
          <span>{SITE_NAME}</span>
        </Link>

        <div className="dealmap-tabs">
          {(["부산", "울산"] as const).map((a) => (
            <button key={a} className="chip" aria-pressed={area === a} onClick={() => setArea(a)}>
              {a}
            </button>
          ))}
        </div>
        <div className="dealmap-tabs">
          {DEAL_TABS.map((t) => (
            <button
              key={t.key}
              className="chip"
              aria-pressed={dealType === t.key}
              onClick={() => {
                setDealType(t.key);
                setOpenKey(null);
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="dealmap-tabs">
          {RANGE_TABS.map((t) => (
            <button
              key={t.key}
              className="chip"
              aria-pressed={range === t.key}
              onClick={() => {
                setRange(t.key);
                setOpenKey(null);
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <span className="dealmap-count">
          {loading
            ? "불러오는 중…"
            : `${ymdIntToKoLabel(fromYmd)}~${ymdIntToKoLabel(todayYmd)} 신고 ${totalCount}건`}
          {geocoding && " · 위치 찾는 중…"}
        </span>
      </div>

      {loadError && (
        <div className="banner error" style={{ margin: "10px 16px" }}>
          <strong>불러오기 실패</strong> — {loadError}
        </div>
      )}

      <div className="dealmap-body">
        {mapError ? (
          <div className="dealmap-fallback">
            <p>
              카카오 지도를 불러오지 못했습니다. 카카오 개발자 사이트에서 이 도메인이 등록돼 있는지
              확인해 주세요.
            </p>
            <Link href="/sale" className="entry-card-go">
              지역별 실거래 목록으로 보기 →
            </Link>
          </div>
        ) : (
          <div ref={containerRef} className="dealmap-canvas" />
        )}

        {/* 표식을 누르면 그 동의 거래가 아래(모바일) / 오른쪽(넓은 화면)에 펼쳐집니다 */}
        {openGroup && (
          <aside className="dealmap-panel">
            <div className="dealmap-panel-head">
              <div>
                <strong>
                  {openGroup.regionName} {openGroup.dong}
                </strong>
                <span className="dealmap-panel-sub">
                  {rangeLabel} · {openGroup.listings.length}건
                </span>
              </div>
              <button className="modal-close" onClick={closePanel} aria-label="닫기">
                ✕
              </button>
            </div>
            <div className="dealmap-panel-list">
              {openGroup.listings.map((l, i) => (
                <button
                  key={`${l.complex}-${l.dealYmd}-${i}`}
                  className="recent-row"
                  onClick={() =>
                    setTrendTarget({
                      code: openGroup.regionCode,
                      regionName: openGroup.regionName,
                      complex: l.complex,
                      areaM2: l.areaM2,
                    })
                  }
                >
                  <div className="recent-main">
                    <span className="recent-complex">
                      {l.isCancelled && <span className="flag cancel">취소</span>}
                      {l.isDirect && <span className="flag direct">직거래</span>}
                      {l.complex}
                    </span>
                    <span className="recent-loc">
                      {typeLabel(l.areaM2)} · {l.floor}층
                    </span>
                  </div>
                  <div className="recent-side">
                    <span className={`recent-price${l.isCancelled ? " struck" : ""}`}>
                      {priceLabel(l)}
                    </span>
                    <span className="recent-date">{l.date} 계약</span>
                  </div>
                </button>
              ))}
            </div>
          </aside>
        )}
      </div>

      {!loading && !mapError && dongGroups.length === 0 && (
        <div className="dealmap-hint">
          {rangeLabel} 안에 {area}에 신고된 거래가 없습니다. 기간을 넓혀서 보세요.
        </div>
      )}
      {!loading && !mapError && dongGroups.length > 0 && placed === 0 && (
        <div className="dealmap-hint">동 위치를 찾는 중입니다. 잠시만 기다려 주세요…</div>
      )}

      {trendTarget && (
        <ComplexTrendModal
          code={trendTarget.code}
          regionName={trendTarget.regionName}
          complex={trendTarget.complex}
          areaM2={trendTarget.areaM2}
          dealType={dealType}
          onClose={() => setTrendTarget(null)}
        />
      )}
    </div>
  );
}
