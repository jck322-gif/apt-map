import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import DailyBriefView from "@/components/DailyBrief";
import { getBriefDates, getDailyBrief, getLatestBriefDate, koDate } from "@/lib/daily";
import { SITE_NAME } from "@/lib/site";

// 하루에 한 번 바뀌는 내용이라 1시간마다 새로 만들어 둡니다
// (방문할 때마다 DB를 다시 읽지 않아 화면이 빠릅니다).
export const revalidate = 3600;

export const metadata: Metadata = {
  title: `오늘의 실거래 브리핑 | ${SITE_NAME}`,
  description:
    "부산·울산에 오늘 새로 신고된 아파트 실거래를 하루 단위로 정리합니다. 최고가 거래, 구·군별 신고 건수를 한눈에 확인하세요.",
};

export default async function Page() {
  let brief, dates;
  try {
    const date = await getLatestBriefDate();
    [brief, dates] = await Promise.all([getDailyBrief(date), getBriefDates()]);
  } catch {
    return (
      <div className="wrap">
        <SiteHeader current="daily" />
        <section className="block">
          <h2>오늘의 실거래 브리핑</h2>
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
