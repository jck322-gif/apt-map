import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import DailyBriefView from "@/components/DailyBrief";
import { getBriefDates, getDailyBrief, getLatestBriefDate, koDate } from "@/lib/daily";
import { SITE_NAME } from "@/lib/site";

// 이 페이지는 "가장 최근 브리핑"이라 내용이 바뀝니다. 그래서 만들어둔 화면을 10분만 씁니다.
//
// 예전에는 1시간이었는데 두 번 문제가 됐습니다. 새벽에 새 실거래가 들어와도, 또 새 기능을
// 배포해도, 그 전에 만들어진 화면이 한 시간 동안 그대로 나왔습니다. 화면은 조금 느려져도
// "오늘 자료가 오늘 보이는" 쪽이 이 사이트에는 훨씬 중요합니다.
// (지난 날짜 브리핑 /daily/[날짜]는 내용이 안 바뀌니 그쪽은 길게 둬도 됩니다.)
export const revalidate = 600;

export const metadata: Metadata = {
   alternates: { canonical: "/daily" },
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
