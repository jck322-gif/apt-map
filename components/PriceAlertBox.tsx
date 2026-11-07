"use client";

import { useEffect, useState } from "react";
import { fmtManwon, typeLabel } from "@/lib/format";

/**
 * 단지 페이지의 "🎯 희망가 알림" — 평형과 가격을 정해 두면,
 * 그 가격 이하 매매가 새로 신고된 날 아침 메일로 알려드립니다 (/api/notify).
 * 로그인 전에는 설정 버튼을 누르면 로그인 페이지로 보냅니다(로그인 후 이 페이지로 돌아옴).
 */
export default function PriceAlertBox({
  code,
  complex,
  here,
  types,
  defaultArea,
  latestPrice,
}: {
  code: string;
  complex: string;
  here: string;
  /** 이 단지의 전용면적 타입(㎡) */
  types: number[];
  /** 처음 골라 둘 평형 */
  defaultArea?: number;
  /** 최근 매매가(만원) — 입력 칸 안내용 */
  latestPrice?: number;
}) {
  const areas = Array.from(new Set(types.map((a) => Math.round(a)))).sort((a, b) => a - b);
  const [loggedIn, setLoggedIn] = useState(false);
  const firstArea = defaultArea && areas.includes(Math.round(defaultArea)) ? Math.round(defaultArea) : areas.length === 1 ? areas[0] : null;
  const [area, setArea] = useState<string>(firstArea ? String(firstArea) : "");
  const [eok, setEok] = useState("");
  const [saved, setSaved] = useState<{ price: number; area: number | null } | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const li = document.cookie.split("; ").some((c) => c === "bu_li=1");
    setLoggedIn(li);
    if (!li) return;
    fetch("/api/me/watches", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (!j.ok) return setLoggedIn(false);
        const w = j.watches.find(
          (x: { region_code: string; complex: string }) => x.region_code === code && x.complex === complex
        ) as { target_price_manwon: number | null; target_area_m2: number | null } | undefined;
        if (w?.target_price_manwon) {
          setSaved({ price: w.target_price_manwon, area: w.target_area_m2 });
          setEok(String(w.target_price_manwon / 10000));
          setArea(w.target_area_m2 ? String(w.target_area_m2) : "");
        }
      })
      .catch(() => {});
  }, [code, complex]);

  async function send(targetPrice: number | null) {
    if (!loggedIn) {
      window.location.href = `/login?next=${encodeURIComponent(here)}`;
      return;
    }
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/me/watches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        regionCode: code,
        complex,
        targetPrice,
        targetArea: targetPrice && area ? Number(area) : null,
      }),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.status === 401) {
      window.location.href = `/login?next=${encodeURIComponent(here)}`;
      return;
    }
    if (!j.ok) {
      setMsg(j.error || "저장하지 못했어요.");
      return;
    }
    setSaved(targetPrice ? { price: targetPrice, area: area ? Number(area) : null } : null);
    setMsg(targetPrice ? "저장했어요. 이 가격 이하 거래가 신고되면 다음 날 아침 메일로 알려드려요." : "희망가 알림을 껐어요.");
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const v = Number(eok.replace(/[^\d.]/g, ""));
    if (!v || v < 0.1 || v > 300) {
      setMsg("희망가를 억 단위로 넣어주세요. 예: 9.5");
      return;
    }
    send(Math.round(v * 10000));
  }

  return (
    <section className="price-alert">
      <h2 className="price-alert-h">🎯 희망가 알림</h2>
      {saved && (
        <p className="price-alert-saved">
          설정됨: <b>{saved.area ? `${typeLabel(saved.area)}(${saved.area}㎡)` : "모든 평형"}</b>{" "}
          <b>{fmtManwon(saved.price)} 이하</b>
          <button type="button" className="price-alert-off" onClick={() => send(null)} disabled={busy}>
            끄기
          </button>
        </p>
      )}
      <form className="price-alert-form" onSubmit={submit}>
        {areas.length > 1 && (
          <select className="price-alert-sel" value={area} onChange={(e) => setArea(e.target.value)} aria-label="평형">
            <option value="">모든 평형</option>
            {areas.map((a) => (
              <option key={a} value={a}>
                {typeLabel(a)} ({a}㎡)
              </option>
            ))}
          </select>
        )}
        <label className="price-alert-price">
          <input
            inputMode="decimal"
            className="price-alert-input"
            value={eok}
            onChange={(e) => setEok(e.target.value)}
            placeholder={latestPrice ? String(Math.floor(latestPrice / 1000) / 10) : "9.5"}
            aria-label="희망가(억)"
          />
          <span>억 이하로 거래되면</span>
        </label>
        <button type="submit" className="price-alert-btn" disabled={busy}>
          {saved ? "바꾸기" : "메일로 알림 받기"}
        </button>
      </form>
      {msg && <p className="price-alert-msg">{msg}</p>}
      <p className="price-alert-note">
        {latestPrice ? `최근 매매 ${fmtManwon(latestPrice)} · ` : ""}국토교통부에 새로 신고된 매매 기준이에요(계약 후 신고까지 최대 30일).
        {!loggedIn && " 로그인하면 바로 설정할 수 있어요."}
      </p>
    </section>
  );
}
