"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getFavorites, subscribeFavorites } from "@/lib/favorites";

/**
 * 헤더에 들어가는 작은 "★ 즐겨찾기 N" 링크.
 * 메뉴 탭(매매/전세/…/상식)에는 안 끼워 넣습니다 — 8번째 탭이 되면 휴대폰에서
 * 두 줄로 넘어간다는 이유로 SiteHeader에서 「랭킹」을 넣은 자리(비교를 뺀 자리)를
 * 이미 신중하게 정해뒀기 때문입니다. 대신 로고 옆 배지 자리에 둡니다.
 */
export default function FavoritesLink() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const update = () => setCount(getFavorites().length);
    update();
    return subscribeFavorites(update);
  }, []);

  return (
    <Link href="/favorites" className="fav-badge" aria-label="즐겨찾기한 단지 보기">
      <span aria-hidden="true">★</span> 즐겨찾기{count > 0 ? ` ${count}` : ""}
    </Link>
  );
}
