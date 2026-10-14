"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/**
 * 헤더의 작은 "로그인" 버튼. 로그인하면 "🔔 내 알림"으로 바뀝니다.
 * 로그인 여부는 내용 없는 표시용 쿠키(bu_li)로만 판단합니다 (서버에 묻지 않아 빠름).
 */
export default function AccountLink() {
  const [loggedIn, setLoggedIn] = useState(false);
  useEffect(() => {
    setLoggedIn(document.cookie.split("; ").some((c) => c === "bu_li=1"));
  }, []);
  return loggedIn ? (
    <Link href="/account" className="fav-badge acct-badge" aria-label="내 알림 설정">
      🔔 내 알림
    </Link>
  ) : (
    <Link href="/login" className="fav-badge acct-badge" aria-label="로그인">
      로그인
    </Link>
  );
}
