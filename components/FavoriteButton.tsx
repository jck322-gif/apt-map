"use client";

import { useEffect, useState } from "react";
import { isFavorite, toggleFavorite, subscribeFavorites } from "@/lib/favorites";

/**
 * 단지 페이지에 붙는 "☆ 즐겨찾기" 버튼.
 * 로그인 없이, 이 브라우저에만 저장됩니다 (lib/favorites.ts 참고).
 *
 * 서버에서 그려질 때는 항상 "찜 전"(☆) 상태로 나오고, 브라우저에 그려진 뒤
 * useEffect에서 localStorage를 읽어 실제 상태로 바꿔치기합니다. 그래야 서버가
 * 만든 HTML과 브라우저가 처음 그리는 화면이 같아서 화면이 깜빡이지 않습니다.
 */
export default function FavoriteButton({
  code,
  complex,
  regionName,
  group,
  href,
  compact = false,
  stopPropagation = false,
}: {
  code: string;
  complex: string;
  regionName: string;
  group: string;
  href: string;
  /** true면 글자 없이 별 아이콘만 (목록 줄 안에 넣을 때) */
  compact?: boolean;
  /** true면 클릭이 부모 요소(목록 줄 클릭 등)로 전파되지 않게 막습니다 */
  stopPropagation?: boolean;
}) {
  const [saved, setSaved] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setSaved(isFavorite(href));
    setReady(true);
    return subscribeFavorites(() => setSaved(isFavorite(href)));
  }, [href]);

  return (
    <button
      type="button"
      className={`fav-btn${saved ? " is-saved" : ""}${compact ? " fav-btn-compact" : ""}`}
      aria-pressed={saved}
      aria-label={saved ? `${complex} 즐겨찾기 해제` : `${complex} 즐겨찾기`}
      onClick={(e) => {
        if (stopPropagation) e.stopPropagation();
        const nowSaved = toggleFavorite({ code, complex, regionName, group, href });
        setSaved(nowSaved);
      }}
      // 아직 localStorage를 못 읽은 첫 렌더에는 눌러도 어색하지 않도록 살짝 흐리게
      style={ready ? undefined : { opacity: 0.6 }}
    >
      <span aria-hidden="true">{saved ? "★" : "☆"}</span>
      {!compact && (saved ? "즐겨찾기 됨" : "즐겨찾기")}
    </button>
  );
}
