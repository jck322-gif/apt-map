import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SubscriptionCalendar from "@/components/SubscriptionCalendar";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: `청약 계획 달력 | ${SITE_NAME}`,
  description:
    "부산·울산 아파트 청약(분양) 일정을 달력으로 모아봅니다. 모집공고일, 특별공급·1순위·2순위 접수일, 당첨자 발표일을 한눈에 확인하세요.",
  alternates: { canonical: "/subscription" },
};

const REGION_TABS: { key: "all" | "busan" | "ulsan"; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "busan", label: "부산" },
  { key: "ulsan", label: "울산" },
];

function monthGrid(year: number, month0: number): (string | null)[][] {
  const first = new Date(year, month0, 1);
  const startDow = first.getDay(); // 0=일요일
  const daysInMonth = new Date(year, month0 + 1, 0).getDate();

  const cells: (string | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(`${year}-${String(month0 + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

// 달력 틀(요일·날짜 칸)은 외부 데이터 없이 그릴 수 있어서 이 페이지는 즉시 렌더링됩니다.
// 느릴 수 있는 청약홈 공공데이터는 화면이 뜬 뒤 SubscriptionCalendar(클라이언트 컴포넌트)가
// 따로 불러옵니다 — 실거래가 화면이 /api/update로 데이터를 나중에 불러오는 것과 같은 방식입니다.
export default function SubscriptionPage({
  searchParams,
}: {
  searchParams: { m?: string; region?: string };
}) {
  const offset = Number(searchParams?.m ?? "0") || 0;
  const now = new Date();
  const base = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const year = base.getFullYear();
  const month0 = base.getMonth();

  const regionKey = REGION_TABS.some((t) => t.key === searchParams?.region)
    ? (searchParams!.region as "all" | "busan" | "ulsan")
    : "all";

  const weeks = monthGrid(year, month0);

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

        <div className="subscription-region-tabs">
          {REGION_TABS.map((t) => (
            <Link
              key={t.key}
              href={`/subscription?m=${offset}${t.key === "all" ? "" : `&region=${t.key}`}`}
              className="subscription-region-tab"
              aria-current={regionKey === t.key ? "page" : undefined}
            >
              {t.label}
            </Link>
          ))}
        </div>

        <div className="subscription-nav">
          <Link
            href={`/subscription?m=${offset - 1}${regionKey === "all" ? "" : `&region=${regionKey}`}`}
            className="subscription-nav-btn"
            aria-label="이전 달"
          >
            ‹
          </Link>
          <span className="subscription-month">
            {year}년 {month0 + 1}월
          </span>
          <Link
            href={`/subscription?m=${offset + 1}${regionKey === "all" ? "" : `&region=${regionKey}`}`}
            className="subscription-nav-btn"
            aria-label="다음 달"
          >
            ›
          </Link>
        </div>

        <SubscriptionCalendar weeks={weeks} regionKey={regionKey} />

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
