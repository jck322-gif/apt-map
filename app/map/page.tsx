import type { Metadata } from "next";
import DealMap from "@/components/DealMap";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: `실거래 지도 | ${SITE_NAME}`,
  description:
    "부산·울산에 오늘 신고된 아파트 실거래를 지도에서 동 단위로 확인하세요. 국토교통부 실거래 자료 기준입니다.",
};

export default function Page({ searchParams }: { searchParams: { area?: string } }) {
  const area = searchParams?.area === "울산" ? "울산" : "부산";
  return <DealMap initialArea={area} />;
}
