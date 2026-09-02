"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Region } from "@/lib/regions";
import { fmtManwon, typeLabel, areaDetail } from "@/lib/format";
import KakaoMap from "@/components/KakaoMap";
import ComplexTrendModal from "@/components/ComplexTrendModal";
import Logo from "@/components/Logo";
import { SITE_NAME } from "@/lib/site";
import { kstTodayYmdInt, kstYmdIntAgo, ymdIntToKoLabel } from "@/lib/kst";

type Listing = {
  dong: string;
  complex: string;
  areaM2: number;
  pyeong: number;
  floor: number;
  date: string;
  dealYmd: number; // YYYYMMDD 정수 — 계약일
  registeredYmd: number | null; // 국토부에 신고(등록)된 날 — 우리가 처음 받아온 날 기준
  isCancelled: boolean; // 거래 취소(해제)된 건
  isDirect: boolean; // 직거래
  priceManwon: number | null;
  depositManwon: number | null;
  monthlyRentManwon: number | null;
};

type RecentListing = Listing & { regionName: string; regionCode: string; group: "부산" | "울산" };

// /api/search 응답 — 단지 × 평형(타입)별 최신 거래 1건
type SearchResult = {
  regionCode: string;
  regionName: string;
  group: "부산" | "울산";
  dong: string;
  complex: string;
  areaM2: number;
  pyeong: number;
  floor: number;
  date: string;
  dealYmd: number;
  priceManwon: number | null;
  depositManwon: number | null;
  monthlyRentManwon: number | null;
};

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

const DEAL_TABS: { key: DealType; label: string; href: string; desc: string }[] = [
  { key: "sale", label: "매매", href: "/sale", desc: "아파트를 사고판 실거래가" },
  { key: "jeonse", label: "전세", href: "/jeonse", desc: "보증금만 내는 전세 실거래가" },
  { key: "monthly", label: "월세", href: "/monthly", desc: "보증금 + 매달 내는 월세" },
];

function dealLabel(dealType: DealType): string {
  return DEAL_TABS.find((t) => t.key === dealType)?.label ?? "매매";
}

/** 가격 계산에 필요한 최소 정보 (검색 결과처럼 일부 항목만 있는 데이터에도 쓸 수 있게) */
type PriceLike = {
  priceManwon: number | null;
  depositManwon: number | null;
  monthlyRentManwon: number | null;
};

/** 거래 한 건의 가격 표시 문구(매매가 / 보증금 / 보증금+월세)를 만듭니다. */
function listingPriceLabel(l: PriceLike): string {
  if (l.priceManwon !== null) return fmtManwon(l.priceManwon);
  if (l.monthlyRentManwon !== null) {
    return `${fmtManwon(l.depositManwon ?? 0)} / 월 ${fmtManwon(l.monthlyRentManwon)}`;
  }
  if (l.depositManwon !== null) return fmtManwon(l.depositManwon);
  return "-";
}

/** 정렬용 금액값 — 매매는 매매가, 전세는 보증금, 월세는 월세금액 기준으로 높은순 정렬합니다. */
function listingSortValue(l: PriceLike): number {
  return l.priceManwon ?? l.monthlyRentManwon ?? l.depositManwon ?? 0;
}

/** 오늘 날짜(한국 시간)를 "8월 28일" 형태로 표시합니다. */
function todayLabel(now = new Date()): string {
  return ymdIntToKoLabel(kstTodayYmdInt(now));
}

/** 계약일과 신고일의 차이를 "· 3일 후 등록" 형태로 만듭니다. */
function regDelayLabel(l: { dealYmd: number; registeredYmd: number | null }): string {
  if (!l.registeredYmd) return "";
  const toDate = (n: number) =>
    new Date(Math.floor(n / 10000), Math.floor((n % 10000) / 100) - 1, n % 100);
  const days = Math.round(
    (toDate(l.registeredYmd).getTime() - toDate(l.dealYmd).getTime()) / 86400000
  );
  if (!Number.isFinite(days) || days < 0) return "";
  return days === 0 ? " · 당일 등록" : ` · ${days}일 후 등록`;
}

/** YYYYMMDD 정수를 "8월 22일" 형태로 표시합니다. */
/** "오늘의 실거래"에서 볼 수 있는 기간 */
type RecentRange = "today" | "week" | "month";
/** 각 기간이 오늘로부터 며칠 전까지인지 (오늘 포함) */
const RANGE_DAYS_BACK: Record<Exclude<RecentRange, "today">, number> = { week: 6, month: 29 };
/** 버튼과 안내 문구에 쓰는 기간 이름 */
function rangeName(r: RecentRange): string {
  if (r === "today") return "오늘";
  return r === "week" ? "지난 7일" : "지난 1개월";
}

function ymdIntToLabel(ymd: number): string {
  const m = Math.floor((ymd % 10000) / 100);
  const d = ymd % 100;
  return `${m}월 ${d}일`;
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

/** 개념도(SVG) 폴백에서, 주어진 지역 목록의 좌표 범위에 딱 맞춰 확대된 viewBox를 계산합니다. */
function svgViewBoxFor(list: { x: number; y: number }[]): string {
  if (list.length === 0) return "0 0 400 300";
  const pad = 46;
  const xs = list.map((r) => r.x);
  const ys = list.map((r) => r.y);
  const minX = Math.min(...xs) - pad;
  const minY = Math.min(...ys) - pad;
  const w = Math.max(...xs) - Math.min(...xs) + pad * 2;
  const h = Math.max(...ys) - Math.min(...ys) + pad * 2;
  return `${minX} ${minY} ${w} ${h}`;
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

/**
 * mode="home"  → 홈 화면 (오늘의 실거래 + 진입 카드 + 지도 + 검색)
 * mode="sale" | "jeonse" | "monthly" → 해당 거래유형 전용 페이지 (지역별 목록·TOP5까지 전부)
 */
export default function Dashboard({
  staticRegions,
  mode,
}: {
  staticRegions: Region[];
  mode: "home" | DealType;
}) {
  const isHome = mode === "home";
  // 홈에서도 "오늘의 실거래"와 지도는 매매 기준으로 보여줍니다.
  const dealType: DealType = isHome ? "sale" : mode;
  const router = useRouter();

  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"전체" | "부산" | "울산">("전체");
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [openCode, setOpenCode] = useState<string | null>(null);
  const [openComplex, setOpenComplex] = useState<string | null>(null);
  const [kakaoFailed, setKakaoFailed] = useState(false);
  // "오늘의 실거래" 조회 범위 — 기본은 오늘 하루, 버튼을 눌렀을 때만 최근 7일까지 넓혀서 봅니다.
  const [recentRange, setRecentRange] = useState<RecentRange>("today");
  // "지역별 실거래 리스트" 정렬 기준 — 기본은 최신순(이미 이 순서로 내려옴), 가격순으로도 볼 수 있음
  const [listSort, setListSort] = useState<"recent" | "price">("recent");
  // 단지/동 이름으로 바로 찾는 검색창 (DB 전체 검색)
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  // 검색 결과 또는 단지 상세에서 "추이 보기"를 눌렀을 때 열리는 모달 대상
  const [trendTarget, setTrendTarget] = useState<
    { code: string; regionName: string; complex: string; areaM2?: number } | null
  >(
    null
  );
  const kakaoKey = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;

  const load = useCallback(async (type: DealType) => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(`/api/update?dealType=${type}`);
      const json = (await res.json()) as ApiResponse & { error?: string };
      if (!res.ok) throw new Error(json.error ?? `요청 실패 (${res.status})`);
      setData(json);
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

  // 단지/동 이름 검색 — 화면에 불러온 최근 목록이 아니라 DB 전체를 찾습니다.
  // 같은 단지라도 평형(타입)이 다르면 따로 보여줘서, 29평·33평 같은 타입을 모두 확인할 수 있습니다.
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }
    setSearchLoading(true);
    // 글자를 칠 때마다 요청하지 않도록 잠깐 기다렸다가 보냅니다.
    const timer = setTimeout(() => {
      let cancelled = false;
      fetch(`/api/search?q=${encodeURIComponent(q)}&dealType=${dealType}`)
        .then(async (res) => {
          const json = await res.json();
          if (cancelled) return;
          setSearchResults(res.ok ? (json.results ?? []) : []);
          setSearchLoading(false);
        })
        .catch(() => {
          if (!cancelled) {
            setSearchResults([]);
            setSearchLoading(false);
          }
        });
      return () => {
        cancelled = true;
      };
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, dealType]);

  // 첫 화면 맨 위에 보여줄 "오늘의 실거래" 피드 — 기본은 오늘 계약일 거래만, "지난 7일" 버튼을
  // 누르면 오늘부터 6일 전까지(총 7일) 계약일 거래까지 넓혀서 보여줍니다. 부산/울산 각각
  // 가격 높은순으로 모아서 두 열로 보여주고, 부산/울산 칩으로 필터링하면 해당 열만 남습니다.
  // (국토부 API는 "계약일"만 제공하고 별도의 "등록일"은 주지 않기 때문에, 여기서 말하는
  // 날짜는 계약일 기준입니다.)
  const RECENT_FEED_LIMIT = 30;
  const todayYmdInt = useMemo(() => kstTodayYmdInt(), []);

  // 자료에 들어 있는 "가장 최근 신고일". 신고는 평일에만 올라오기 때문에
  // 주말·공휴일이나 아직 갱신 전이면 오늘 신고분이 아예 없을 수 있습니다.
  const latestRegYmd = useMemo(() => {
    let max = 0;
    for (const r of regions) {
      for (const l of r.listings) {
        const reg = l.registeredYmd;
        if (reg !== null && reg <= todayYmdInt && reg > max) max = reg;
      }
    }
    return max || null;
  }, [regions, todayYmdInt]);

  // "오늘" 탭인데 오늘 신고분이 없으면 화면을 비워두지 않고 가장 최근 신고일로 대신 보여줍니다.
  // (빈 화면보다 "9월 1일 신고분"이라도 보이는 편이 훨씬 낫습니다)
  const isFallbackDay =
    recentRange === "today" && latestRegYmd !== null && latestRegYmd < todayYmdInt;
  const feedDayYmd = recentRange === "today" ? latestRegYmd ?? todayYmdInt : todayYmdInt;

  const rangeStartYmdInt = useMemo(() => {
    if (recentRange === "today") return feedDayYmd;
    return kstYmdIntAgo(RANGE_DAYS_BACK[recentRange]); // 오늘 포함 7일 / 30일
  }, [recentRange, feedDayYmd]);
  const rangeEndYmdInt = recentRange === "today" ? feedDayYmd : todayYmdInt;

  const toRecentListings = useCallback(
    (list: RegionSummary[]): RecentListing[] => {
      const flat: RecentListing[] = list.flatMap((r) =>
        r.listings
          // 계약일이 아니라 "국토부에 신고된 날" 기준입니다.
          // 계약 후 최대 30일까지 신고할 수 있어, 계약일로 거르면 목록이 거의 항상 비어요.
          .filter((l) => {
            const reg = l.registeredYmd;
            return reg !== null && reg >= rangeStartYmdInt && reg <= rangeEndYmdInt;
          })
          .map((l) => ({ ...l, regionName: r.name, regionCode: r.code, group: r.group }))
      );
      return flat.sort((a, b) => listingSortValue(b) - listingSortValue(a)).slice(0, RECENT_FEED_LIMIT);
    },
    [rangeStartYmdInt, rangeEndYmdInt]
  );
  const recentBusan = useMemo(() => toRecentListings(busanList), [busanList, toRecentListings]);
  const recentUlsan = useMemo(() => toRecentListings(ulsanList), [ulsanList, toRecentListings]);
  const recentColumns = useMemo(() => {
    const cols: { group: "부산" | "울산"; list: RecentListing[] }[] = [];
    if (filter === "전체" || filter === "부산") cols.push({ group: "부산", list: recentBusan });
    if (filter === "전체" || filter === "울산") cols.push({ group: "울산", list: recentUlsan });
    return cols;
  }, [filter, recentBusan, recentUlsan]);

  // 지도(또는 TOP5 카드)에서 지역을 누르면 아래 "지역별 실거래 리스트"의 해당 구를 펼치고
  // 그 위치로 화면을 부드럽게 스크롤해 바로 내용을 볼 수 있게 합니다.
  const regionRowRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const selectRegion = useCallback(
    (code: string) => {
      // 홈 화면에는 지역별 목록이 없습니다. 그래서 지도에서 구를 누르면
      // 매매 페이지의 그 구로 이동시켜, 바로 거래 내역을 볼 수 있게 합니다.
      if (isHome) {
        router.push(`/sale?region=${code}`);
        return;
      }
      const willOpen = openCode !== code; // 같은 구를 다시 누르면 접히고, 다른 구를 누르면 펼쳐짐
      setSelectedCode(code);
      setOpenCode(willOpen ? code : null);
      if (!willOpen) return; // 접는 경우엔 스크롤하지 않음
      // 펼쳐진 뒤(=DOM이 갱신된 뒤)에 위치를 계산하도록 다음 프레임에 스크롤합니다.
      requestAnimationFrame(() => {
        regionRowRefs.current[code]?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    },
    [openCode, isHome, router]
  );

  // 홈 지도에서 넘어온 경우(/sale?region=26350) 그 구를 자동으로 펼치고 그 위치로 스크롤합니다.
  // 주소창의 값은 한 번만 쓰고 지워, 새로고침해도 계속 끌려다니지 않게 합니다.
  const jumpedRef = useRef(false);
  useEffect(() => {
    if (isHome || jumpedRef.current || !data) return;
    const code = new URLSearchParams(window.location.search).get("region");
    if (!code) return;
    jumpedRef.current = true;
    setSelectedCode(code);
    setOpenCode(code);
    window.history.replaceState(null, "", window.location.pathname);
    // 목록이 그려진 뒤에 위치를 계산하도록 두 프레임 뒤에 스크롤합니다.
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        regionRowRefs.current[code]?.scrollIntoView({ behavior: "smooth", block: "center" });
      })
    );
  }, [data, isHome]);

  return (
    <div className="wrap">
      <header className="app-header">
        <div className="brand-row">
          <Link href="/" className="brand" aria-label={`${SITE_NAME} 홈으로`}>
            <Logo size={34} />
            <h1>{SITE_NAME}</h1>
          </Link>
          <p className="brand-tagline">
            부산 · 울산 아파트 <span className="accent">실거래가</span> 포털
          </p>
          <span className="live-badge">실시간 연동</span>
        </div>

        <nav className="deal-tabs">
          <Link href="/" className="deal-tab" aria-current={isHome ? "page" : undefined}>
            홈
          </Link>
          {DEAL_TABS.map((t) => (
            <Link
              key={t.key}
              href={t.href}
              className="deal-tab"
              aria-current={!isHome && dealType === t.key ? "page" : undefined}
            >
              {t.label}
            </Link>
          ))}
        </nav>

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
        </div>
        <p className="last-updated">
          {loading
            ? "불러오는 중…"
            : data
            ? `국토교통부 자료 기준 · ${dealLabel(dealType)} · 계약월 ${data.dealYmd} · 매일 새벽 자동 갱신`
            : "데이터를 불러오지 못했습니다"}
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
        <div className="hero-heading">
          <h2>오늘의 실거래 · {dealLabel(dealType)}</h2>
          <span className="hero-date">
            {recentRange === "today"
              ? `${ymdIntToKoLabel(feedDayYmd)} 신고분`
              : `${ymdIntToLabel(rangeStartYmdInt)} ~ ${todayLabel()} 신고분`}
          </span>
        </div>
        <div className="hero-range-tabs">
          {(["today", "week", "month"] as const).map((r) => (
            <button
              key={r}
              className="hero-range-tab"
              aria-pressed={recentRange === r}
              onClick={() => setRecentRange(r)}
            >
              {rangeName(r)}
            </button>
          ))}
        </div>
        <p className="empty-note" style={{ padding: "0 0 10px" }}>
          {recentRange === "today"
            ? isFallbackDay
              ? `오늘(${todayLabel()})은 아직 새로 신고된 거래가 없어, 가장 최근 신고일인 ${ymdIntToKoLabel(
                  feedDayYmd
                )} 신고분을 보여드려요`
              : `오늘(${todayLabel()}) 국토부에 새로 신고된 거래예요`
            : `최근 ${rangeName(recentRange).replace("지난 ", "")}(${ymdIntToLabel(
                rangeStartYmdInt
              )}~${todayLabel()}) 국토부에 신고된 거래예요`}{" "}
          — 계약일과 신고일은 다릅니다 (계약 후 최대 30일까지 신고). 가격 높은순
          {recentRange === "today" ? "" : " 상위 30건씩"}으로 정렬했어요.
        </p>
        <div className="recent-table">
          {recentColumns.map(({ group, list }) => (
            <div className="recent-col" key={group}>
              <div className="recent-col-heading">{group}</div>
              {list.length === 0 ? (
                <div className="empty-note">
                  {recentRange === "today"
                    ? `${ymdIntToKoLabel(feedDayYmd)}에는`
                    : `최근 ${rangeName(recentRange).replace("지난 ", "")}간`}{" "}
                  이 지역에 새로 신고된 거래가 없습니다.
                  {recentRange !== "month" && " 신고는 보통 평일에 올라와요 — 기간을 넓혀서 보세요."}
                </div>
              ) : (
                <div className="recent-feed">
                  {list.map((l, i) => (
                    <button
                      className="recent-row"
                      key={`${l.regionName}-${l.complex}-${l.dealYmd}-${i}`}
                      onClick={() =>
                        setTrendTarget({ code: l.regionCode, regionName: l.regionName, complex: l.complex, areaM2: l.areaM2 })
                      }
                    >
                      <div className="recent-main">
                        <span className="recent-loc">
                          {l.regionName} · {l.dong}
                        </span>
                        <span className="recent-complex">
                          {l.isCancelled && <span className="flag cancel">취소</span>}
                          {l.isDirect && <span className="flag direct">직거래</span>}
                          {l.complex} · {typeLabel(l.areaM2)} · {l.floor}층
                        </span>
                      </div>
                      <div className="recent-side">
                        <span className={`recent-price${l.isCancelled ? " struck" : ""}`}>
                          {listingPriceLabel(l)}
                        </span>
                        <span className="recent-date">
                          {l.date} 계약{regDelayLabel(l)}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="block">
        <h2>지역 지도</h2>
        <p className="section-note">
          지도의 숫자는 <strong>이번 달 {dealLabel(dealType)} 거래 건수</strong>입니다. 색은 지난달 평균
          가격과 비교한 등락이에요.
          {isHome && " 구를 누르면 그 지역의 매매 내역으로 이동합니다."}
        </p>
        <div className="map-grid">
          {groupSections.map(({ group, list }) => (
            <div className="map-col" key={group}>
              <div className="map-col-heading">{group}</div>
              <div className="map-card">
                {kakaoKey && !kakaoFailed ? (
                  <KakaoMap
                    regions={list}
                    selectedCode={selectedCode}
                    filter={filter}
                    onSelect={selectRegion}
                    onError={() => setKakaoFailed(true)}
                  />
                ) : (
                  <svg
                    className="map"
                    viewBox={svgViewBoxFor(list)}
                    role="img"
                    aria-label={`${group} 지역 개념도`}
                  >
                    {list.map((r) => {
                      const radius = 9 + (r.count / maxCount) * 17;
                      const color =
                        r.trendPct === null
                          ? "var(--muted)"
                          : r.trendPct >= 0
                          ? "var(--rise)"
                          : "var(--fall)";
                      return (
                        <g
                          key={r.code}
                          className={`node${selectedCode === r.code ? " selected" : ""}`}
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
              </div>
            </div>
          ))}
        </div>
        <div className="legend">
          <span><span className="dot" style={{ background: "var(--rise)" }} />평균가 상승</span>
          <span><span className="dot" style={{ background: "var(--fall)" }} />평균가 하락</span>
          <span>숫자 · 원 크기 = 이번 달 {dealLabel(dealType)} 건수</span>
        </div>
      </section>

      <section className="block">
        <h2>단지 · 동 검색</h2>
        <input
          className="search-input"
          type="text"
          inputMode="search"
          placeholder="동 이름이나 아파트 단지명을 입력하세요 (예: 우동, 해운대자이)"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery.trim() && (
          <div className="search-results">
            {searchLoading ? (
              <div className="empty-note">찾는 중…</div>
            ) : searchResults.length === 0 ? (
              <div className="empty-note">
                &quot;{searchQuery}&quot; {dealLabel(dealType)} 거래를 찾지 못했습니다. 다른 거래 유형
                탭에는 있을 수 있어요.
              </div>
            ) : (
              <>
                <div className="search-count">
                  {searchResults.length}개 평형(타입) · 각 평형의 가장 최근 {dealLabel(dealType)} 거래예요
                </div>
                {searchResults.map((l, i) => (
                  <button
                    key={`${l.regionCode}-${l.complex}-${l.areaM2}-${i}`}
                    className="search-result-row"
                    onClick={() =>
                      setTrendTarget({
                        code: l.regionCode,
                        regionName: l.regionName,
                        complex: l.complex,
                        areaM2: l.areaM2,
                      })
                    }
                  >
                    <div className="recent-main">
                      <span className="recent-loc">
                        {l.group} {l.regionName} · {l.dong}
                      </span>
                      <span className="recent-complex">{l.complex}</span>
                      <span className="search-type">
                        <span className="type-badge">{typeLabel(l.areaM2)}</span>
                        {areaDetail(l.areaM2)} · {l.floor}층
                      </span>
                    </div>
                    <div className="recent-side">
                      <span className="recent-price">{listingPriceLabel(l)}</span>
                      <span className="recent-date">{l.date} 계약 · 추이 보기</span>
                    </div>
                  </button>
                ))}
              </>
            )}
          </div>
        )}
      </section>

      <section className="block" hidden={isHome}>
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

      <section className="block" hidden={isHome}>
        <h2>지역별 실거래 리스트 · {dealLabel(dealType)}</h2>
        <p className="empty-note" style={{ padding: "0 0 10px" }}>
          구를 눌러 펼친 뒤, 동 → 단지 순서로 눌러보면 해당 단지의 개별 거래 내역이 나옵니다.
        </p>
        <div className="hero-range-tabs" style={{ marginBottom: 14 }}>
          <button
            className="hero-range-tab"
            aria-pressed={listSort === "recent"}
            onClick={() => setListSort("recent")}
          >
            최신순
          </button>
          <button
            className="hero-range-tab"
            aria-pressed={listSort === "price"}
            onClick={() => setListSort("price")}
          >
            가격순
          </button>
        </div>
        {groupSections.map(({ group, list }) => (
          <div className="group-section" key={group}>
            <h3 className="group-heading">
              {group} <span className="group-count">({list.length})</span>
            </h3>
            <div className="region-list">
              {list.map((r) => {
                // 서버에서 계약일 순 목록과 신고일 순 목록을 합쳐 내려주므로 여기서 다시 정렬합니다.
                const sortedListings =
                  listSort === "price"
                    ? [...r.listings].sort((a, b) => listingSortValue(b) - listingSortValue(a))
                    : [...r.listings].sort((a, b) => b.dealYmd - a.dealYmd);
                const dongGroups = groupByDong(sortedListings);
                return (
                  <div
                    key={r.code}
                    ref={(el) => {
                      regionRowRefs.current[r.code] = el;
                    }}
                    className={`region-row${selectedCode === r.code ? " selected" : ""}${
                      openCode === r.code ? " open" : ""
                    }`}
                  >
                    <button className="region-head" onClick={() => selectRegion(r.code)}>
                      <span className="region-name-wrap">
                        <span className="nm">{r.name}</span>
                        {selectedCode === r.code && <span className="picked-badge">선택한 지역</span>}
                      </span>
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
                                  <button
                                    className="trend-open-btn"
                                    onClick={() =>
                                      setTrendTarget({ code: r.code, regionName: r.name, complex })
                                    }
                                  >
                                    {complex} 가격 추이 보기 (최근 6개월)
                                  </button>
                                  {items.map((l, i) => (
                                    <div className="listing" key={i}>
                                      <div className="l-top">
                                        <span>
                                          <span className="type-badge">{typeLabel(l.areaM2)}</span>
                                          {l.complex}
                                        </span>
                                        <span className="l-price">{listingPriceLabel(l)}</span>
                                      </div>
                                      <div className="l-meta">
                                        <span>{areaDetail(l.areaM2)}</span>
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
        <p>
          데이터 출처: 국토교통부 아파트매매/전월세 실거래 상세 자료(공공데이터포털). 개념도는 실제
          행정구역 경계와 다를 수 있는 단순화된 표시입니다.
        </p>
        <nav className="footer-links">
          <Link href="/about">사이트 소개</Link>
          <Link href="/privacy">개인정보처리방침</Link>
          <Link href="/contact">문의</Link>
        </nav>
      </footer>

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
