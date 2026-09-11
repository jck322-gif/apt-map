import Link from "next/link";
import Logo from "@/components/Logo";
import { SITE_NAME } from "@/lib/site";

/**
 * 사이트 상단 (로고 · 사이트명 · 문구 · 메뉴).
 * 대시보드가 아닌 페이지(비교 페이지 등)에서 같은 머리말을 쓰기 위한 컴포넌트입니다.
 * `current`는 지금 보고 있는 메뉴를 표시하는 데 씁니다.
 */
export default function SiteHeader({
  current,
}: {
  current?: "sale" | "jeonse" | "monthly" | "daily" | "apt" | "rank" | "compare" | "guide";
}) {
  // 메뉴는 일곱 개로 묶어 둡니다. 여덟 개가 되면 휴대폰에서 두 줄로 넘어가고,
  // 줄이 넘어가는 순간 메뉴가 아니라 목록처럼 보여서 아무도 안 누릅니다.
  //
  // 그래서 「비교」를 빼고 「랭킹」을 넣었습니다. 비교는 단지 두 곳을 이미 정해둔
  // 사람만 쓰는 기능이라 처음 온 사람에게는 쓸모가 없고, 랭킹은 처음 온 사람이
  // 제일 먼저 보고 싶어 하는 화면입니다. 비교 기능은 없어지지 않았고, 단지 페이지와
  // 랭킹 페이지 아래쪽 링크로 계속 들어갈 수 있습니다.
  const tabs: { key: string; label: string; href: string }[] = [
    { key: "sale", label: "매매", href: "/" },
    { key: "jeonse", label: "전세", href: "/jeonse" },
    { key: "monthly", label: "월세", href: "/monthly" },
    { key: "daily", label: "브리핑", href: "/daily" },
    { key: "apt", label: "단지", href: "/apt" },
    { key: "rank", label: "랭킹", href: "/rank" },
    { key: "guide", label: "상식", href: "/guide" },
  ];

  return (
    <header className="app-header">
      <div className="brand-row">
        <Link href="/" className="brand" aria-label={`${SITE_NAME} 홈으로`}>
          <Logo size={34} />
          <h1>{SITE_NAME}</h1>
        </Link>
        <p className="brand-tagline">
          부산 · 울산 아파트 <span className="accent">실거래가</span> 포털
        </p>
        <span className="live-badge">실시간 연동</span>
      </div>

      <nav className="deal-tabs">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={t.href}
            className="deal-tab"
            aria-current={current === t.key ? "page" : undefined}
          >
            {t.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
