"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getFavorites, removeFavorite, subscribeFavorites, type FavoriteItem } from "@/lib/favorites";

function formatSavedAt(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(
    2,
    "0"
  )} 저장`;
}

export default function FavoritesList() {
  const [items, setItems] = useState<FavoriteItem[] | null>(null); // null = 아직 안 읽음(첫 렌더)

  useEffect(() => {
    const update = () => setItems(getFavorites());
    update();
    return subscribeFavorites(update);
  }, []);

  if (items === null) {
    // 서버 렌더 결과와 동일하게, 브라우저에서 읽기 전에는 아무것도 안 보여줍니다.
    return null;
  }

  if (items.length === 0) {
    return (
      <p className="fav-empty">
        아직 즐겨찾기한 단지가 없습니다. 단지 페이지에서 <strong>☆ 즐겨찾기</strong> 버튼을 눌러 담아보세요.
        <br />
        <Link href="/apt">단지 목록 보러 가기</Link>
      </p>
    );
  }

  return (
    <ul className="fav-list">
      {items.map((f) => (
        <li key={f.href} className="fav-item">
          <Link href={f.href} className="fav-item-main">
            <span className="fav-item-name">{f.complex}</span>
            <span className="fav-item-where">
              {f.group}광역시 {f.regionName}
            </span>
          </Link>
          <span className="fav-item-meta">{formatSavedAt(f.savedAt)}</span>
          <button
            type="button"
            className="fav-item-remove"
            aria-label={`${f.complex} 즐겨찾기 해제`}
            onClick={() => removeFavorite(f.href)}
          >
            삭제
          </button>
        </li>
      ))}
    </ul>
  );
}
