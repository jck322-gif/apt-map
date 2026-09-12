import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import FavoritesList from "@/components/FavoritesList";
import { SITE_NAME } from "@/lib/site";

// 이 페이지 내용은 방문자의 브라우저 안에만 있어서(서버는 내용을 모릅니다),
// 검색엔진에 노출할 이유가 없습니다. 그래서 색인은 막아 둡니다.
export const metadata: Metadata = {
  title: `즐겨찾기한 단지 | ${SITE_NAME}`,
  description: "내가 즐겨찾기한 아파트 단지 목록입니다.",
  robots: { index: false, follow: true },
};

export default function FavoritesPage() {
  return (
    <div className="wrap">
      <SiteHeader current="apt" />
      <article className="block">
        <h1 className="guide-title">즐겨찾기한 단지</h1>
        <p className="guide-summary">
          회원가입 없이, 이 브라우저에만 저장되는 목록입니다. 다른 기기나 다른 브라우저에서는 보이지
          않고, 브라우저 데이터(방문 기록·저장 공간)를 지우면 함께 사라집니다.
        </p>
        <FavoritesList />
      </article>
    </div>
  );
}
