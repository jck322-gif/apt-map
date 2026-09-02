import type { Metadata } from "next";
import ComparePanel from "@/components/ComparePanel";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: `아파트 실거래가 비교 | ${SITE_NAME}`,
  description:
    "부산·울산 아파트를 최대 4개까지 골라 최근 1년 실거래가 흐름을 한 그래프에서 비교해 보세요. 국토교통부 실거래 자료 기준입니다.",
};

export default function Page() {
  return <ComparePanel />;
}
