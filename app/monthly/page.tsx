import type { Metadata } from "next";
import Dashboard from "@/components/Dashboard";
import { REGIONS } from "@/lib/regions";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: `부산 · 울산 아파트 월세 실거래가 | ${SITE_NAME}`,
  description: "부산 16개 구·군, 울산 5개 구·군의 아파트 월세 실거래가를 국토교통부 자료로 확인하세요.",
};

export default function Page() {
  return <Dashboard staticRegions={REGIONS} mode="monthly" />;
}
