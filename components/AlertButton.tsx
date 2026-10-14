"use client";

import { useEffect, useState } from "react";

/**
 * 단지 페이지의 "🔔 알림 받기" 버튼.
 * - 로그인 전: 로그인 페이지로 보냅니다(로그인 후 이 단지 페이지로 돌아옴).
 * - 로그인 후: 누르면 관심 단지(신고가 알림)로 담고, 다시 누르면 뺍니다.
 * 로그인 여부는 내용 없는 표시용 쿠키(bu_li)로만 판단하고, 실제 저장은 서버가 세션을 확인합니다.
 */
export default function AlertButton({ code, complex, here }: { code: string; complex: string; here: string }) {
  const [loggedIn, setLoggedIn] = useState(false);
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const li = document.cookie.split("; ").some((c) => c === "bu_li=1");
    setLoggedIn(li);
    if (!li) return;
    fetch("/api/me/watches", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) setOn(j.watches.some((w: { region_code: string; complex: string }) => w.region_code === code && w.complex === complex));
        else setLoggedIn(false);
      })
      .catch(() => {});
  }, [code, complex]);

  async function click() {
    if (!loggedIn) {
      window.location.href = `/login?next=${encodeURIComponent(here)}`;
      return;
    }
    setBusy(true);
    const res = await fetch("/api/me/watches", {
      method: on ? "DELETE" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ regionCode: code, complex, notifyRecord: true }),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.status === 401) {
      window.location.href = `/login?next=${encodeURIComponent(here)}`;
      return;
    }
    if (!j.ok) {
      window.alert(j.error || "저장하지 못했어요.");
      return;
    }
    setOn(!on);
  }

  return (
    <button
      type="button"
      className={`fav-btn alert-btn${on ? " is-saved" : ""}`}
      aria-pressed={on}
      onClick={click}
      disabled={busy}
      title={on ? "알림 끄기" : "이 단지에 신고가·새 실거래가 나오면 메일로 알려드려요"}
    >
      <span aria-hidden="true">🔔</span>
      {on ? "알림 받는 중" : "알림 받기"}
    </button>
  );
}
