"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { complexHref, type ComplexListRow } from "@/lib/complex";

/**
 * 한 구·군의 단지 목록 — 동별로 묶고, 각 동 안에서는 가나다순으로 보여줍니다.
 *
 * 검색창은 화면에서 걸러 보여주기만 합니다(서버에 다시 묻지 않습니다).
 * 첫 화면에는 항상 전체 목록이 그려지므로, 검색엔진도 모든 단지 링크를 그대로 읽습니다.
 */
export default function ComplexBrowser({ rows }: { rows: ComplexListRow[] }) {
  const [query, setQuery] = useState("");

  const groups = useMemo(() => {
    const q = query.trim();
    const filtered = q
      ? rows.filter((r) => r.complex.includes(q) || (r.dong ?? "").includes(q))
      : rows;

    const map = new Map<string, ComplexListRow[]>();
    for (const r of filtered) {
      const key = r.dong ?? "기타";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    }
    return [...map.entries()]
      .sort((a, b) => a[0].localeCompare(b[0], "ko"))
      .map(([dong, list]) => ({
        dong,
        list: [...list].sort((a, b) => a.complex.localeCompare(b.complex, "ko")),
      }));
  }, [rows, query]);

  const shown = groups.reduce((n, g) => n + g.list.length, 0);

  return (
    <>
      <div className="complex-search">
        <input
          type="search"
          className="complex-search-input"
          placeholder="단지명 또는 동 이름으로 찾기"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="단지 검색"
        />
        <span className="complex-search-count">
          {query.trim() ? `${shown.toLocaleString()}개 찾음` : `전체 ${rows.length.toLocaleString()}개`}
        </span>
      </div>

      {groups.length === 0 ? (
        <p className="empty-note">‘{query}’와 이름이 맞는 단지가 없습니다.</p>
      ) : (
        groups.map((g) => (
          <section className="brief-section" key={g.dong}>
            <h2 className="brief-h2">
              {g.dong} <span className="brief-count">{g.list.length}개 단지</span>
            </h2>
            <div className="complex-grid">
              {g.list.map((c) => (
                <Link
                  key={`${c.dong}-${c.complex}`}
                  href={complexHref(c.regionCode, c.complex)}
                  className="complex-link"
                >
                  <span className="complex-link-name">{c.complex}</span>
                  <span className="complex-link-meta">
                    {c.buildYear ? `${c.buildYear}년 · ` : ""}
                    거래 {c.totalCount}건
                  </span>
                </Link>
              ))}
            </div>
          </section>
        ))
      )}
    </>
  );
}
