import type { Metadata } from "next";
import Dashboard from "@/components/Dashboard";
import { REGIONS } from "@/lib/regions";
import { SITE_NAME } from "@/lib/site";
import { getDashboardData } from "@/lib/dashboardData";

// 첫 화면은 매매입니다. 예전에는 홈과 매매 페이지가 따로 있었는데 내용이 거의 같아
// (검색 엔진이 싫어하는 중복 페이지이기도 해서) 하나로 합쳤습니다.
export const metadata: Metadata = {
    alternates: { canonical: "/" },
  title: `${SITE_NAME} — 부산 · 울산 아파트 실거래가 포털`,
  description:
    "부산·울산 아파트 매매·전세·월세 실거래가를 국토교통부 자료로 매일 확인하세요. 단지별 시세·신고가·랭킹 제공.",
};

// 5분마다 새로 만듭니다. 이 시간 안에는 캐시된 페이지를 그대로 보여주고, 이번 조회가
// 실패하면(일시적 DB 오류 등) Next.js가 마지막으로 성공한 페이지를 계속 보여줍니다 —
// 그래서 구글 크롤러나 방문자가 빈 화면을 만날 일이 없습니다.
export const revalidate = 300;

export default async function Page() {
  // 실거래 데이터를 서버에서 직접 만들어 처음 HTML에 그대로 심습니다. 이전에는 브라우저가
  // /api/update를 다시 불러와야만 실제 단지명·거래표가 보였는데, 그 fetch 한 번이 실패하면
  // (구글 서치콘솔 실제 URL 테스트에서 실제로 발생) 화면에 "0건"만 남았습니다.
  let initialData = null;
  try {
    initialData = await getDashboardData("sale");
  } catch {
    // 실패해도 페이지 자체를 에러로 만들지 않습니다 — Dashboard가 initialData 없이도
    // 뜨고, 브라우저에서 한 번 더 시도합니다. (revalidate 덕분에 보통은 여기 오지 않습니다.)
  }

  return <Dashboard staticRegions={REGIONS} mode="sale" initialData={initialData} />;
}
