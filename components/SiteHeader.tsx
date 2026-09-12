import Link from "next/link";
import Logo from "@/components/Logo";
import FavoritesLink from "@/components/FavoritesLink";
import MoreMenu from "@/components/MoreMenu";
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
  // 상단에는 매매·전세·월세만 남기고, 나머지(브리핑/단지/랭킹/상식)는 오른쪽 "☰ 더보기"
  // 드롭다운(MoreMenu)에 모아 둡니다. 항목이 늘어나도 이 세 개만 항상 한 줄에 남기 때문에
  // 휴대폰에서 줄바꿈될 걱정 없이 메뉴를 계속 추가할 수 있습니다.
  const tabs: { key: string; label: string; href: string }[] = [
    { key: "sale", label: "매매", href: "/" },
    { key: "jeonse", label: "전세", href: "/jeonse" },
    { key: "monthly", label: "월세", href: "/monthly" },
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
        <FavoritesLink />
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
        <MoreMenu current={current} />
      </nav>
    </header>
  );
}
