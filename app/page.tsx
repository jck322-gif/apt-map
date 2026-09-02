import type { Metadata } from "next";
import Dashboard from "@/components/Dashboard";
import { REGIONS } from "@/lib/regions";
import { SITE_NAME } from "@/lib/site";

// 첫 화면은 매매입니다. 예전에는 홈과 매매 페이지가 따로 있었는데 내용이 거의 같아
// (검색 엔진이 싫어하는 중복 페이지이기도 해서) 하나로 합쳤습니다.
export const metadata: Metadata = {
  title: `${SITE_NAME} — 부산 · 울산 아파트 실거래가 포털`,
  description:
    "부산 16개 구·군, 울산 5개 구·군의 아파트 매매·전세·월세 실거래가를 국토교통부 자료로 매일 확인하세요. 지도, 단지별 가격 추이, 단지 비교까지 무료로 제공합니다.",
};

export default function Page() {
  return <Dashboard staticRegions={REGIONS} mode="sale" />;
}
