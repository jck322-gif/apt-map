"use client";

import { useEffect, useState } from "react";
import type { SubscriptionEntry } from "@/lib/subscription";

type CalEvent = {
  date: string; // YYYY-MM-DD
  label: string;
  kind: "notice" | "special" | "rank1" | "rank2" | "winner";
  isManual?: boolean;
  sourceNote?: string;
};

const KIND_LABEL: Record<CalEvent["kind"], string> = {
  notice: "모집공고",
  special: "특별공급",
  rank1: "1순위",
  rank2: "2순위",
  winner: "당첨발표",
};

function buildEvents(entries: SubscriptionEntry[]): CalEvent[] {
  const events: CalEvent[] = [];
  for (const e of entries) {
    const base = { label: e.houseName, isManual: e.isManual, sourceNote: e.sourceNote };
    if (e.noticeDate) events.push({ ...base, date: e.noticeDate, kind: "notice" });
    if (e.specialSupplyStart) events.push({ ...base, date: e.specialSupplyStart, kind: "special" });
    if (e.rank1Start) events.push({ ...base, date: e.rank1Start, kind: "rank1" });
    if (e.rank2Start) events.push({ ...base, date: e.rank2Start, kind: "rank2" });
    if (e.winnerAnnounceDate) events.push({ ...base, date: e.winnerAnnounceDate, kind: "winner" });
  }
  return events;
}

/**
 * 달력 틀(요일·날짜 칸)은 서버에서 즉시 그려서 페이지 전환이 빠르게 느껴지도록 하고,
 * 청약홈 공공데이터(느릴 수 있음)는 화면에 뜬 뒤 따로 불러옵니다 — 실거래가 화면이
 * /api/update를 따로 불러오는 것과 같은 방식입니다.
 */
export default function SubscriptionCalendar({
  weeks,
  regionKey,
}: {
  weeks: (string | null)[][]; // 각 칸의 YYYY-MM-DD (빈 칸은 null)
  regionKey: "all" | "busan" | "ulsan";
}) {
  const [entries, setEntries] = useState<SubscriptionEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setEntries(null);
    setError(null);
    fetch("/api/subscription", { cache: "no-store" })
      .then((res) => res.json())
      .then((json: { entries: SubscriptionEntry[]; error: string | null }) => {
        if (cancelled) return;
        setEntries(json.entries ?? []);
        setError(json.error ?? null);
      })
      .catch(() => {
        if (cancelled) return;
        setEntries([]);
        setError("청약 정보를 가져오지 못했습니다.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = (entries ?? []).filter((e) => {
    if (regionKey === "busan") return e.regionName.includes("부산");
    if (regionKey === "ulsan") return e.regionName.includes("울산");
    return true;
  });

  const eventsByDate = new Map<string, CalEvent[]>();
  for (const ev of buildEvents(filtered)) {
    const list = eventsByDate.get(ev.date) ?? [];
    list.push(ev);
    eventsByDate.set(ev.date, list);
  }

  const loading = entries === null;
  const weekdayLabels = ["일", "월", "화", "수", "목", "금", "토"];

  return (
    <>
      <div className="subscription-legend">
        {(Object.keys(KIND_LABEL) as CalEvent["kind"][]).map((k) => (
          <span key={k} className={`subscription-badge subscription-badge-${k}`}>
            {KIND_LABEL[k]}
          </span>
        ))}
      </div>
      {filtered.some((e) => e.isManual) && (
        <p className="section-note" style={{ marginTop: 4 }}>
          점선 테두리 + &quot;(예정)&quot; 배지는 아직 청약홈에 공식 모집공고가 올라오지 않은, SNS 등에서 미리
          안내된 일정이에요. 날짜가 바뀔 수 있으니 참고만 해주세요.
        </p>
      )}

      {loading && <p className="section-note">청약 일정을 불러오는 중입니다…</p>}
      {!loading && error && (
        <p className="section-note" style={{ color: "#b45309" }}>
          청약 일정을 불러오는 데 문제가 있었습니다 ({error}). 잠시 후 다시 시도해주세요.
        </p>
      )}

      <div className="subscription-calendar">
        <div className="subscription-weekdays">
          {weekdayLabels.map((w, i) => (
            <span key={w} className={i === 0 ? "is-sun" : i === 6 ? "is-sat" : undefined}>
              {w}
            </span>
          ))}
        </div>
        {weeks.map((week, wi) => (
          <div className="subscription-week" key={wi}>
            {week.map((dateStr, ci) => {
              const dayEvents = dateStr ? eventsByDate.get(dateStr) ?? [] : [];
              const dayNum = dateStr ? Number(dateStr.slice(8, 10)) : null;
              return (
                <div
                  key={dateStr ?? `empty-${wi}-${ci}`}
                  className={`subscription-cell${dateStr ? "" : " is-empty"}${
                    ci === 0 ? " is-sun" : ci === 6 ? " is-sat" : ""
                  }`}
                >
                  {dayNum !== null && <span className="subscription-daynum">{dayNum}</span>}
                  {dayEvents.slice(0, 4).map((ev, i) => (
                    <span
                      key={i}
                      className={`subscription-badge subscription-badge-${ev.kind}${
                        ev.isManual ? " is-manual" : ""
                      }`}
                      title={`${ev.label} · ${KIND_LABEL[ev.kind]}${
                        ev.isManual ? ` · 예정(미확정)${ev.sourceNote ? " — " + ev.sourceNote : ""}` : ""
                      }`}
                    >
                      {ev.label}
                      {ev.isManual ? " (예정)" : ""}
                    </span>
                  ))}
                  {dayEvents.length > 4 && <span className="subscription-more">+{dayEvents.length - 4}</span>}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {!loading && !error && filtered.length === 0 && (
        <p className="section-note" style={{ marginTop: 16 }}>
          현재 이 지역의 청약 일정 데이터가 없습니다.
        </p>
      )}
    </>
  );
}
