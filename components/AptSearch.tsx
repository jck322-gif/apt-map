"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { complexHref } from "@/lib/complex";
import { fmtManwon, pickJosa } from "@/lib/format";

/**
 * 단지 목록 페이지(/apt)의 "단지명으로 찾기" 검색창.
 *
 * 구·군을 몰라도 단지 이름(또는 동 이름) 일부만 치면 부산·울산 전체에서 찾아 줍니다.
 * 결과는 단지 페이지로 가는 링크라, 누르면 바로 그 단지의 실거래가 페이지가 열립니다.
 * 이미 있는 /api/search(비교 화면에서 쓰는 검색)를 그대로 씁니다.
 */

type SearchRow = {
  regionCode: string;
  regionName: string;
  group: string;
  dong: string;
  complex: string;
  areaM2: number;
  dealYmd: number;
  priceManwon: number | null;
  depositManwon: number | null;
};

type Found = {
  key: string;
  regionCode: string;
  regionName: string;
  group: string;
  dong: string;
  complex: string;
  /** 최근 매매 (없으면 전세) 한 건 */
  latest: { label: string; price: number; areaM2: number } | null;
};

const MAX_RESULTS = 20;

export default function AptSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Found[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      setLoading(false);
      setError(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    // 글자를 칠 때마다 요청하지 않도록 잠깐 기다렸다가 찾습니다.
    const timer = setTimeout(async () => {
      try {
        // 매매가 없는 단지도 찾을 수 있게 매매·전세를 함께 찾습니다.
        const [sale, jeonse] = await Promise.all(
          (["sale", "jeonse"] as const).map((t) =>
            fetch(`/api/search?q=${encodeURIComponent(q)}&dealType=${t}`, { cache: "no-store" })
              .then((r) => (r.ok ? r.json() : { results: [] }))
              .then((j) => (j.results ?? []) as SearchRow[])
          )
        );
        if (cancelled) return;

        const map = new Map<string, Found>();
        const add = (r: SearchRow, kind: "매매" | "전세") => {
          const key = `${r.regionCode}|${r.complex}`;
          const price = kind === "매매" ? r.priceManwon : r.depositManwon;
          const cur = map.get(key);
          if (!cur) {
            map.set(key, {
              key,
              regionCode: r.regionCode,
              regionName: r.regionName,
              group: r.group,
              dong: r.dong,
              complex: r.complex,
              latest: price ? { label: kind, price, areaM2: r.areaM2 } : null,
            });
          } else if (!cur.latest && price) {
            cur.latest = { label: kind, price, areaM2: r.areaM2 };
          }
        };
        sale.forEach((r) => add(r, "매매"));
        jeonse.forEach((r) => add(r, "전세"));

        // 이름이 검색어로 시작하는 단지를 먼저, 나머지는 가나다순으로 보여줍니다.
        const list = [...map.values()].sort((a, b) => {
          const as = a.complex.startsWith(q) ? 0 : 1;
          const bs = b.complex.startsWith(q) ? 0 : 1;
          return as - bs || a.complex.localeCompare(b.complex, "ko");
        });
        setResults(list.slice(0, MAX_RESULTS));
        setError(false);
      } catch {
        if (!cancelled) {
          setResults([]);
          setError(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  const q = query.trim();

  return (
    <section className="apt-search">
      <label className="apt-search-label" htmlFor="apt-search-input">
        단지명으로 찾기
      </label>
      <div className="complex-search">
        <input
          id="apt-search-input"
          type="search"
          className="complex-search-input"
          placeholder="예: 남천자이, 삼익비치, 레이카운티, 우동"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoComplete="off"
        />
      </div>

      {q && (
        <div className="apt-search-results">
          {loading && results.length === 0 ? (
            <p className="empty-note">찾는 중…</p>
          ) : error ? (
            <p className="empty-note">검색을 하지 못했습니다. 잠시 후 다시 시도해 주세요.</p>
          ) : results.length === 0 ? (
            <p className="empty-note">
              &quot;{q}&quot;{pickJosa(q, "이", "가")} 들어간 단지를 찾지 못했습니다. 이름의 일부만(예: &quot;삼익&quot;) 넣어 보세요.
            </p>
          ) : (
            <ul className="apt-search-list">
              {results.map((r) => (
                <li key={r.key}>
                  <Link href={complexHref(r.regionCode, r.complex)} className="apt-search-item">
                    <span className="apt-search-name">{r.complex}</span>
                    <span className="apt-search-meta">
                      {r.group} {r.regionName} · {r.dong}
                      {r.latest &&
                        ` · 최근 ${r.latest.label} ${fmtManwon(r.latest.price)} (${Math.round(r.latest.areaM2)}㎡)`}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
