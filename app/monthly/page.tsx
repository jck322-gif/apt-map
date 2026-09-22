import type { Metadata } from "next";
import Dashboard from "@/components/Dashboard";
import { REGIONS } from "@/lib/regions";
import { SITE_NAME } from "@/lib/site";
import { getDashboardData } from "@/lib/dashboardData";

export const metadata: Metadata = {
  alternates: { canonical: "/monthly" },
  title: `부산 · 울산 아파트 월세 실거래가 | ${SITE_NAME}`,
  description: "부산 16개 구·군, 울산 5개 구·군의 아파트 월세 실거래가를 국토교통부 자료로 확인하세요.",
};

export const revalidate = 300;

export default async function Page() {
  let initialData = null;
  try {
    initialData = await getDashboardData("monthly");
  } catch {
    // Dashboard가 initialData 없이도 뜨고, 브라우저에서 한 번 더 시도합니다.
  }

  return <Dashboard staticRegions={REGIONS} mode="monthly" initialData={initialData} />;
}
