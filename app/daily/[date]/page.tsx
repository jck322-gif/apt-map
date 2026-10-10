import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import DailyBriefView from "@/components/DailyBrief";
import { getBriefDates, getDailyBrief, isValidDate, koDate, koDateLong } from "@/lib/daily";
import { SITE_NAME } from "@/lib/site";
import { NOINDEX, THIN_DAILY_MIN_SALES } from "@/lib/thin";

export const revalidate = 3600;

export async function generateMetadata({ params }: { params: { date: string } }): Promise<Metadata> {
  if (!isValidDate(params.date)) return { title: `실거래 브리핑 | ${SITE_NAME}` };
  // 주말·공휴일처럼 매매 신고가 몇 건 없는 날의 브리핑은 내용이 얇아 검색엔진에는 올리지 않습니다 (lib/thin.ts).
  let thin = false;
  try {
    const brief = await getDailyBrief(params.date);
    thin = brief.totals.sale < THIN_DAILY_MIN_SALES;
  } catch {
    thin = false;
  }
  return {
    title: `${koDate(params.date)} 부산·울산 아파트 실거래가 순위 TOP · 신고가 | ${SITE_NAME}`,
    description: `${koDateLong(params.date)} 국토교통부에 신고된 부산·울산 아파트 실거래를 정리했습니다. 가격 순위 TOP10, 신고가, 구·군별 신고 건수를 확인하세요.`,
    alternates: { canonical: `/daily/${params.date}` },
    ...(thin ? { robots: NOINDEX } : {}),
  };
}

export default async function Page({ params }: { params: { date: string } }) {
  if (!isValidDate(params.date)) notFound();

  let brief, dates;
  try {
    [brief, dates] = await Promise.all([getDailyBrief(params.date), getBriefDates()]);
  } catch {
    return (
      <div className="wrap">
        <SiteHeader current="daily" />
        <section className="block">
          <h2>실거래 브리핑</h2>
          <p className="empty-note">브리핑을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</p>
        </section>
      </div>
    );
  }

  return (
    <div className="wrap">
      <SiteHeader current="daily" />
      <DailyBriefView brief={brief} dates={dates} />
    </div>
  );
}
