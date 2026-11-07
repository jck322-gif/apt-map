"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { getFavorites } from "@/lib/favorites";
import { complexHref } from "@/lib/complex";
import { aptLabel, fmtManwon } from "@/lib/format";
import AreaChips, { roundAreas } from "@/components/AreaChips";

type Watch = {
  region_code: string;
  complex: string;
  region_name: string | null;
  grp: string | null;
  notify_record: boolean;
  notify_all: boolean;
  target_price_manwon: number | null;
  target_area_m2: number | null;
};

/** 알림 설정 화면 — 관심 단지 목록·알림 종류·일시중지·로그아웃·탈퇴 */
export default function AccountPanel({
  email,
  via,
  emailPaused: pausedInit,
  marketing: marketingInit,
}: {
  email: string;
  via: string;
  emailPaused: boolean;
  marketing: boolean;
}) {
  const [watches, setWatches] = useState<Watch[] | null>(null);
  const [paused, setPaused] = useState(pausedInit);
  const [marketing, setMarketing] = useState(marketingInit);
  const [msg, setMsg] = useState<string | null>(null);
  const [favCount, setFavCount] = useState(0);

  const load = useCallback(async () => {
    const res = await fetch("/api/me/watches", { cache: "no-store" });
    const j = await res.json().catch(() => ({}));
    setWatches(j.ok ? j.watches : []);
  }, []);

  useEffect(() => {
    load();
    setFavCount(getFavorites().length);
  }, [load]);

  async function save(w: Watch, patch: Partial<Pick<Watch, "notify_record" | "notify_all">>) {
    const next = { ...w, ...patch };
    setWatches((list) => (list ?? []).map((x) => (x.region_code === w.region_code && x.complex === w.complex ? next : x)));
    await fetch("/api/me/watches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        regionCode: w.region_code,
        complex: w.complex,
        notifyRecord: next.notify_record,
        notifyAll: next.notify_all,
      }),
    });
  }

  async function setTarget(w: Watch, eok: string, area: string) {
    const v = Number(eok.replace(/[^\d.]/g, ""));
    const price = v >= 0.1 && v <= 300 ? Math.round(v * 10000) : null;
    const a = Number(area) >= 10 && Number(area) <= 400 ? Math.round(Number(area)) : null;
    setWatches((list) =>
      (list ?? []).map((x) =>
        x.region_code === w.region_code && x.complex === w.complex
          ? { ...x, target_price_manwon: price, target_area_m2: price ? a : null }
          : x
      )
    );
    await fetch("/api/me/watches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ regionCode: w.region_code, complex: w.complex, targetPrice: price, targetArea: price ? a : null }),
    });
  }

  async function remove(w: Watch) {
    setWatches((list) => (list ?? []).filter((x) => !(x.region_code === w.region_code && x.complex === w.complex)));
    await fetch("/api/me/watches", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ regionCode: w.region_code, complex: w.complex }),
    });
  }

  async function importFavorites() {
    const favs = getFavorites();
    if (favs.length === 0) return;
    const res = await fetch("/api/me/watches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: favs.map((f) => ({ regionCode: f.code, complex: f.complex, notifyRecord: true })) }),
    });
    const j = await res.json().catch(() => ({}));
    setMsg(j.ok ? `즐겨찾기 ${favs.length}곳을 관심 단지로 담았어요.` : j.error || "담지 못했어요.");
    load();
  }

  async function setting(patch: { emailPaused?: boolean; marketing?: boolean }) {
    if (patch.emailPaused !== undefined) setPaused(patch.emailPaused);
    if (patch.marketing !== undefined) setMarketing(patch.marketing);
    await fetch("/api/me/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  }

  async function withdraw() {
    if (!window.confirm("탈퇴하면 관심 단지와 알림 설정이 모두 지워지고 되돌릴 수 없어요. 탈퇴할까요?")) return;
    await fetch("/api/me/settings", { method: "DELETE" });
    window.location.href = "/";
  }

  return (
    <div className="acct">
      <p className="acct-email">
        <b>{email}</b> 로 로그인됨{via ? ` (${via})` : ""}
      </p>

      <section className="brief-section">
        <h2 className="brief-h2">
          관심 단지 <span className="brief-count">{watches ? `${watches.length}곳` : ""}</span>
        </h2>
        <p className="chart-basis-note">
          매일 아침 실거래가 갱신되면, 관심 단지에 새로 신고된 거래를 모아 <strong>하루 한 통</strong> 보내드려요. 알림 종류는
          단지마다 고를 수 있고, <strong>🎯 희망가</strong>를 넣어 두면 그 가격 이하로 거래됐을 때 알려드려요.
        </p>

        {favCount > 0 && (
          <button type="button" className="acct-import" onClick={importFavorites}>
            ★ 이 브라우저의 즐겨찾기 {favCount}곳을 관심 단지로 담기
          </button>
        )}
        {msg && <p className="acct-msg">{msg}</p>}

        {watches === null ? (
          <p className="empty-note">불러오는 중…</p>
        ) : watches.length === 0 ? (
          <p className="empty-note">
            아직 관심 단지가 없어요. 단지 페이지에서 <b>🔔 알림 받기</b>를 누르거나, 위 버튼으로 즐겨찾기를 가져오세요.{" "}
            <Link href="/apt">단지 찾으러 가기</Link>
          </p>
        ) : (
          <ul className="acct-list">
            {watches.map((w) => (
              <li key={`${w.region_code}|${w.complex}`} className="acct-item">
                <div className="acct-item-head">
                  <Link href={complexHref(w.region_code, w.complex)} className="acct-item-name">
                    {aptLabel(w.complex)}
                  </Link>
                  <span className="acct-item-where">
                    {w.grp} {w.region_name}
                  </span>
                  <button type="button" className="acct-remove" onClick={() => remove(w)} aria-label={`${w.complex} 삭제`}>
                    삭제
                  </button>
                </div>
                <div className="acct-toggles">
                  <label className="calc-check">
                    <input
                      type="checkbox"
                      checked={w.notify_record}
                      onChange={(e) => save(w, { notify_record: e.target.checked })}
                    />
                    <span>🔥 신고가 알림</span>
                  </label>
                  <label className="calc-check">
                    <input type="checkbox" checked={w.notify_all} onChange={(e) => save(w, { notify_all: e.target.checked })} />
                    <span>모든 매매 실거래 알림</span>
                  </label>
                </div>
                <TargetRow w={w} onSave={setTarget} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="brief-section">
        <h2 className="brief-h2">메일 설정</h2>
        <label className="calc-check">
          <input type="checkbox" checked={paused} onChange={(e) => setting({ emailPaused: e.target.checked })} />
          <span>
            알림 메일 잠시 멈추기
            <small>관심 단지는 그대로 두고 메일만 멈춰요.</small>
          </span>
        </label>
        <label className="calc-check" style={{ marginTop: 10 }}>
          <input type="checkbox" checked={marketing} onChange={(e) => setting({ marketing: e.target.checked })} />
          <span>
            [선택] 광고성 정보 수신 동의
            <small>새 리포트·서비스 소식 등</small>
          </span>
        </label>
      </section>

      <div className="acct-actions">
        <button type="button" className="login-link-btn" onClick={logout}>
          로그아웃
        </button>
        <button type="button" className="acct-withdraw" onClick={withdraw}>
          회원 탈퇴
        </button>
      </div>
    </div>
  );
}

/** 관심 단지 한 줄의 "🎯 희망가" 칸 — 평형은 버튼으로 고르고 가격(억)을 넣어 저장, 가격을 비우고 저장하면 끄기 */
function TargetRow({ w, onSave }: { w: Watch; onSave: (w: Watch, eok: string, area: string) => void }) {
  const [eok, setEok] = useState(w.target_price_manwon ? String(w.target_price_manwon / 10000) : "");
  const [area, setArea] = useState(w.target_area_m2 ? String(w.target_area_m2) : "");
  const [areas, setAreas] = useState<number[]>([]);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // 이 단지의 평형 목록 (단지 페이지와 같은 자료)
    const q = new URLSearchParams({ code: w.region_code, complex: w.complex, dealType: "sale" });
    fetch(`/api/complex-trend?${q}`)
      .then((r) => r.json())
      .then((j) => setAreas(roundAreas(Array.isArray(j.types) ? j.types : [])))
      .catch(() => {});
  }, [w.region_code, w.complex]);

  return (
    <div className="acct-target">
      <span className="acct-target-label">🎯 희망가 알림</span>
      {areas.length > 1 && (
        <AreaChips
          areas={areas}
          value={area}
          onChange={(v) => {
            setArea(v);
            setDone(false);
          }}
        />
      )}
      <form
        className="acct-target-form"
        onSubmit={(e) => {
          e.preventDefault();
          onSave(w, eok, area);
          setDone(true);
        }}
      >
        <input
          className="acct-target-in"
          inputMode="decimal"
          value={eok}
          onChange={(e) => {
            setEok(e.target.value);
            setDone(false);
          }}
          placeholder="예: 9.5"
          aria-label="희망가(억)"
        />
        <span className="acct-target-label">억 이하로 거래되면</span>
        <button type="submit" className="acct-target-btn">
          저장
        </button>
        {done && (
          <span className="acct-target-done">
            {w.target_price_manwon ? `${fmtManwon(w.target_price_manwon)} 이하로 저장됨` : "희망가 알림 꺼짐"}
          </span>
        )}
      </form>
    </div>
  );
}
