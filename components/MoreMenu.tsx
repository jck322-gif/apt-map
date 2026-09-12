"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

/**
 * 상단 메뉴 중 "매매 · 전세 · 월세"만 남기고 나머지를 모은 드롭다운.
 *
 * 항목을 여기 배열에 추가하기만 하면 메뉴가 늘어나도 좁은 화면에서 줄바꿈될 걱정이 없습니다
 * (예전에는 메뉴가 8개가 되면 휴대폰에서 두 줄로 넘어가는 문제 때문에 항목 개수를 아껴 써야
 * 했는데, 이제는 여기 목록에만 추가하면 됩니다).
 */
const MORE_ITEMS: { key: string; label: string; desc: string; href: string }[] = [
  { key: "daily", label: "브리핑", desc: "오늘의 실거래 요약", href: "/daily" },
  { key: "apt", label: "단지", desc: "단지별 실거래가·시세", href: "/apt" },
  { key: "rank", label: "랭킹", desc: "신고가·상승률 순위", href: "/rank" },
  { key: "guide", label: "상식", desc: "실거래가 읽는 법 등", href: "/guide" },
  { key: "interior", label: "집구경", desc: "내부 구조·인테리어 참고", href: "/interior" },
];

export default function MoreMenu({ current }: { current?: string }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const activeItem = MORE_ITEMS.find((i) => i.key === current);

  return (
    <div className="more-menu" ref={wrapRef}>
      <button
        type="button"
        className={`more-menu-btn${activeItem ? " is-active" : ""}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span aria-hidden="true">☰</span> {activeItem ? activeItem.label : "더보기"}
      </button>
      {open && (
        <div className="more-menu-list" role="menu">
          {MORE_ITEMS.map((i) => (
            <Link
              key={i.key}
              href={i.href}
              className="more-menu-item"
              role="menuitem"
              aria-current={current === i.key ? "page" : undefined}
              onClick={() => setOpen(false)}
            >
              <span className="more-menu-item-label">{i.label}</span>
              <span className="more-menu-item-desc">{i.desc}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
