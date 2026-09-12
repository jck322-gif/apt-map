import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import { SITE_NAME } from "@/lib/site";
import { getBusanUlsanSubscriptions, type SubscriptionEntry } from "@/lib/subscription";

// 외부 API를 매 요청마다 호출하지 않도록 1시간마다만 다시 가져옵니다.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: `청약 계획 달력 | ${SITE_NAME}`,
  description:
    "부산·울산 아파트 청약(분양) 일정을 달력으로 모아봅니다. 모집공고일, 특별공급·1순위·2순위 접수일, 당첨자 발표일을 한눈에 확인하세요.",
  alternates: { canonical: "/subscription" },
};

type CalEvent = {
  date: string; // YYYY-MM-DD
  label: string; // 배지에 보일 이름
  kind: "notice" | "special" | "rank1" | "rank2" | "winner";
  entry: SubscriptionEntry;
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
    if (e.noticeDate) events.push({ date: e.noticeDate, label: e.houseName, kind: "notice", entry: e });
    if (e.specialSupplyStart)
      events.push({ date: e.specialSupplyStart, label: e.houseName, kind: "special", entry: e });
    if (e.rank1Start) events.push({ date: e.rank1Start, label: e.houseName, kind: "rank1", entry: e });
    if (e.rank2Start) events.push({ date: e.rank2Start, label: e.houseName, kind: "rank2", entry: e });
    if (e.winnerAnnounceDate)
      events.push({ date: e.winnerAnnounceDate, label: e.houseName, kind: "winner", entry: e });
  }
  return events;
}

function monthGrid(year: number, month0: number): { date: Date | null }[][] {
  const first = new Date(year, month0, 1);
  const startDow = first.getDay(); // 0=일요일
  const daysInMonth = new Date(year, month0 + 1, 0).getDate();

  const cells: { date: Date | null }[] = [];
  for (let i = 0; i < startDow; i++) cells.push({ date: null });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ date: new Date(year, month0, d) });
  while (cells.length % 7 !== 0) cells.push({ date: null });

  const weeks: { date: Date | null }[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default async function SubscriptionPage({
  searchParams,
}: {
  searchParams: { m?: string };
}) {
  const offset = Number(searchParams?.m ?? "0") || 0;
  const now = new Date();
  const base = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const year = base.getFullYear();
  const month0 = base.getMonth();

  const serviceKey = process.env.APPLYHOME_SERVICE_KEY;

  let entries: SubscriptionEntry[] = [];
  let fetchError: string | null = null;
  if (!serviceKey) {
    fetchError = "APPLYHOME_SERVICE_KEY 환경변수가 설정되어 있지 않습니다.";
  } else {
    try {
      entries = await getBusanUlsanSubscriptions(serviceKey);
    } catch (e) {
      fetchError = e instanceof Error ? e.message : "청약 정보를 가져오지 못했습니다.";
    }
  }

  const events = buildEvents(entries);
  const eventsByDate = new Map<string, CalEvent[]>();
  for (const ev of events) {
    const list = eventsByDate.get(ev.date) ?? [];
    list.push(ev);
    eventsByDate.set(ev.date, list);
  }

  const weeks = monthGrid(year, month0);
  const weekdayLabels = ["일", "월", "화", "수", "목", "금", "토"];

  return (
    <div className="wrap">
      <SiteHeader current="subscription" />

      <article className="block">
        <h1 className="guide-title">청약 계획 달력</h1>
        <p className="guide-summary">
          부산·울산 아파트 청약(분양) 일정을 한국부동산원 청약홈 공공데이터로 모아 보여드립니다. 모집공고일부터
          특별공급·1순위·2순위 접수일, 당첨자 발표일까지 날짜별로 확인할 수 있어요. (공식 정보는 항상{" "}
          <a href="https://www.applyhome.co.kr/" target="_blank" rel="noopener noreferrer">
            청약홈
          </a>
          에서 다시 확인해주세요.)
        </p>

        {fetchError && (
          <p className="section-note" style={{ color: "#b45309" }}>
            청약 일정을 불러오는 데 문제가 있었습니다 ({fetchError}). 잠시 후 다시 시도해주세요.
          </p>
        )}

        <div className="subscription-legend">
          {(Object.keys(KIND_LABEL) as CalEvent["kind"][]).map((k) => (
            <span key={k} className={`subscription-badge subscription-badge-${k}`}>
              {KIND_LABEL[k]}
            </span>
          ))}
        </div>

        <div className="subscription-nav">
          <Link href={`/subscription?m=${offset - 1}`} className="subscription-nav-btn" aria-label="이전 달">
            ‹
          </Link>
          <span className="subscription-month">
            {year}년 {month0 + 1}월
          </span>
          <Link href={`/subscription?m=${offset + 1}`} className="subscription-nav-btn" aria-label="다음 달">
            ›
          </Link>
        </div>

        <div className="subscription-calendar">
          <div className="subscription-weekdays">
            {weekdayLabels.map((w, i) => (
              <span
                key={w}
                className={i === 0 ? "is-sun" : i === 6 ? "is-sat" : undefined}
              >
                {w}
              </span>
            ))}
          </div>
          {weeks.map((week, wi) => (
            <div className="subscription-week" key={wi}>
              {week.map((cell, ci) => {
                const key = cell.date ? ymd(cell.date) : `empty-${wi}-${ci}`;
                const dayEvents = cell.date ? eventsByDate.get(ymd(cell.date)) ?? [] : [];
                return (
                  <div
                    key={key}
                    className={`subscription-cell${cell.date ? "" : " is-empty"}${
                      ci === 0 ? " is-sun" : ci === 6 ? " is-sat" : ""
                    }`}
                  >
                    {cell.date && <span className="subscription-daynum">{cell.date.getDate()}</span>}
                    {dayEvents.slice(0, 4).map((ev, i) => (
                      <span
                        key={i}
                        className={`subscription-badge subscription-badge-${ev.kind}`}
                        title={`${ev.label} · ${KIND_LABEL[ev.kind]}`}
                      >
                        {ev.label}
                      </span>
                    ))}
                    {dayEvents.length > 4 && (
                      <span className="subscription-more">+{dayEvents.length - 4}</span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {!fetchError && entries.length === 0 && (
          <p className="section-note" style={{ marginTop: 16 }}>
            현재 부산·울산 지역의 청약 일정 데이터가 없습니다.
          </p>
        )}

        <p className="section-note" style={{ marginTop: 22 }}>
          이 달력은 참고용입니다. 실제 청약 자격·조건·정확한 일정은 반드시{" "}
          <a href="https://www.applyhome.co.kr/" target="_blank" rel="noopener noreferrer">
            청약홈
          </a>
          에서 확인해주세요.
        </p>
      </article>
    </div>
  );
}
