"use client";

import { useState } from "react";

/** 비밀번호 찾기(메일 요청) / 새 비밀번호 정하기(메일 링크로 들어온 경우) */
export default function ResetForm({ token }: { token: string | null }) {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (token && pw !== pw2) return setError("비밀번호 확인이 일치하지 않아요.");
    setBusy(true);
    const res = await fetch(token ? "/api/auth/reset" : "/api/auth/reset-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(token ? { token, password: pw } : { email }),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok || !j.ok) return setError(j.error || "잠시 후 다시 시도해 주세요.");
    if (token) window.location.href = "/account";
    else setDone(true);
  }

  if (done) {
    return (
      <div className="login-sent">
        <p className="login-sent-title">📮 메일을 확인해 주세요</p>
        <p>가입된 주소라면 비밀번호 재설정 링크를 보냈어요. 30분 안에 눌러 주세요. 스팸함도 확인해 주세요.</p>
      </div>
    );
  }

  return (
    <form className="login-form" onSubmit={submit}>
      {token ? (
        <>
          <label className="calc-label" htmlFor="rs-pw">
            새 비밀번호
          </label>
          <input id="rs-pw" className="login-input" type="password" autoComplete="new-password" required placeholder="영문+숫자 8자 이상" value={pw} onChange={(e) => setPw(e.target.value)} />
          <label className="calc-label" htmlFor="rs-pw2">
            새 비밀번호 확인
          </label>
          <input id="rs-pw2" className="login-input" type="password" autoComplete="new-password" required value={pw2} onChange={(e) => setPw2(e.target.value)} />
        </>
      ) : (
        <>
          <label className="calc-label" htmlFor="rs-email">
            가입한 이메일
          </label>
          <input id="rs-email" className="login-input" type="email" inputMode="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </>
      )}
      {error && <p className="login-error">{error}</p>}
      <button type="submit" className="login-submit" disabled={busy}>
        {busy ? "잠시만요…" : token ? "비밀번호 바꾸기" : "재설정 메일 받기"}
      </button>
    </form>
  );
}
