"use client";

import { useEffect, useState } from "react";
import { fmtManwon } from "@/lib/format";
import AreaChips, { roundAreas } from "@/components/AreaChips";

/**
 * 단지 페이지의 "🎯 가격 알림" — 평형을 고르고
 *   - "○억 이하로 거래되면" (사고 싶은 사람: 희망가 아래로 내려오면)
 *   - "○억 이상으로 거래되면" (파는 사람: 이 가격 위로 올라가면)
 * 둘 중 하나 또는 둘 다 넣어 두면, 그런 매매가 새로 신고된 날 아침 메일로 알려드립니다 (/api/notify).
 * 로그인 전에는 버튼을 누르면 로그인 페이지로 보냅니다(로그인 후 이 페이지로 돌아옴).
 */

/** "9.5" 같은 억 단위 입력 → 만원. 비었으면 null, 잘못된 값이면 NaN */
function toManwon(eok: string): number | null {
  const t = eok.replace(/[^\d.]/g, "");
  if (!t) return null;
  const v = Number(t);
  return v >= 0.1 && v <= 300 ? Math.round(v * 10000) : NaN;
}

type Saved = { below: number | null; above: number | null; area: number | null };

export function describeTarget(s: Saved): string {
  const parts = [s.below ? `${fmtManwon(s.below)} 이하` : "", s.above ? `${fmtManwon(s.above)} 이상` : ""].filter(Boolean);
  return `${s.area ? `전용 ${s.area}㎡` : "모든 평형"} · ${parts.join(" 또는 ")}`;
}

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
  const areas = roundAreas(types);
  const [loggedIn, setLoggedIn] = useState(false);
  const firstArea =
    defaultArea && areas.includes(Math.round(defaultArea)) ? Math.round(defaultArea) : areas.length === 1 ? areas[0] : null;
  const [area, setArea] = useState<string>(firstArea ? String(firstArea) : "");
  const [below, setBelow] = useState("");
  const [above, setAbove] = useState("");
  const [saved, setSaved] = useState<Saved | null>(null);
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
        ) as { target_price_manwon: number | null; target_above_manwon: number | null; target_area_m2: number | null } | undefined;
        if (w && (w.target_price_manwon || w.target_above_manwon)) {
          setSaved({ below: w.target_price_manwon, above: w.target_above_manwon, area: w.target_area_m2 });
          setBelow(w.target_price_manwon ? String(w.target_price_manwon / 10000) : "");
          setAbove(w.target_above_manwon ? String(w.target_above_manwon / 10000) : "");
          setArea(w.target_area_m2 ? String(w.target_area_m2) : "");
        }
      })
      .catch(() => {});
  }, [code, complex]);

  async function send(b: number | null, a: number | null) {
    if (!loggedIn) {
      window.location.href = `/login?next=${encodeURIComponent(here)}`;
      return;
    }
    setBusy(true);
    setMsg(null);
    const any = !!(b || a);
    const res = await fetch("/api/me/watches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        regionCode: code,
        complex,
        targetPrice: b,
        targetAbove: a,
        targetArea: any && area ? Number(area) : null,
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
    const next = any ? { below: b, above: a, area: area ? Number(area) : null } : null;
    setSaved(next);
    if (!any) {
      setBelow("");
      setAbove("");
    }
    setMsg(next ? `저장했어요 (${describeTarget(next)}). 그런 거래가 신고되면 다음 날 아침 메일로 알려드려요.` : "가격 알림을 껐어요.");
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const b = toManwon(below);
    const a = toManwon(above);
    if (Number.isNaN(b) || Number.isNaN(a)) {
      setMsg("가격을 억 단위로 넣어주세요. 예: 9.5");
      return;
    }
    if (!b && !a) {
      setMsg("'이하' 또는 '이상' 칸 중 하나에 가격을 넣어주세요.");
      return;
    }
    if (b && a && a <= b) {
      setMsg("'이상' 가격은 '이하' 가격보다 높게 넣어주세요.");
      return;
    }
    send(b, a);
  }

  const hint = latestPrice ? Math.floor(latestPrice / 1000) / 10 : null;

  return (
    <section className="price-alert">
      <h2 className="price-alert-h">🎯 가격 알림</h2>
      {saved && (
        <p className="price-alert-saved">
          설정됨: <b>{describeTarget(saved)}</b>
          <button type="button" className="price-alert-off" onClick={() => send(null, null)} disabled={busy}>
            끄기
          </button>
        </p>
      )}
      {areas.length > 1 && <AreaChips areas={areas} value={area} onChange={setArea} />}
      <form className="price-alert-form" onSubmit={submit}>
        <div className="price-alert-rows">
          <label className="price-alert-price">
            <input
              inputMode="decimal"
              className="price-alert-input"
              value={below}
              onChange={(e) => setBelow(e.target.value)}
              placeholder={hint ? String(Math.round(hint * 0.9 * 10) / 10) : "9.5"}
              aria-label="이 가격 이하(억)"
            />
            <span>
              억 <b className="price-alert-dn">이하</b>로 거래되면
            </span>
          </label>
          <label className="price-alert-price">
            <input
              inputMode="decimal"
              className="price-alert-input"
              value={above}
              onChange={(e) => setAbove(e.target.value)}
              placeholder={hint ? String(Math.round(hint * 1.1 * 10) / 10) : "12"}
              aria-label="이 가격 이상(억)"
            />
            <span>
              억 <b className="price-alert-up">이상</b>으로 거래되면
            </span>
          </label>
        </div>
        <button type="submit" className="price-alert-btn" disabled={busy}>
          {saved ? "바꾸기" : "메일로 알림 받기"}
        </button>
      </form>
      {msg && <p className="price-alert-msg">{msg}</p>}
      <p className="price-alert-note">
        {latestPrice ? `최근 매매 ${fmtManwon(latestPrice)} · ` : ""}한 칸만 넣어도 돼요. 국토교통부에 새로 신고된 매매
        기준이에요(계약 후 신고까지 최대 30일).
        {!loggedIn && " 로그인하면 바로 설정할 수 있어요."}
      </p>
    </section>
  );
}
