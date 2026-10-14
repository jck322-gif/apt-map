"use client";

import { useState } from "react";
import Link from "next/link";

/** 아이디(이메일)·비밀번호 로그인 / 회원가입 폼 */
export default function AuthForm({ mode, next }: { mode: "login" | "signup"; next: string }) {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [agree, setAgree] = useState(false);
  const [age, setAge] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (mode === "signup") {
      if (pw !== pw2) return setError("비밀번호 확인이 일치하지 않아요.");
      if (!agree || !age) return setError("필수 항목에 모두 동의해 주세요.");
    }
    setBusy(true);
    try {
      const res = await fetch(mode === "login" ? "/api/auth/login" : "/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: pw, agree, age, marketing }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.ok) {
        setError(j.error || "잠시 후 다시 시도해 주세요.");
        setBusy(false);
        return;
      }
      window.location.href = mode === "signup" ? "/account?welcome=1" : next;
    } catch {
      setError("연결이 불안정해요. 잠시 후 다시 시도해 주세요.");
      setBusy(false);
    }
  }

  return (
    <form className="login-form" onSubmit={submit}>
      <label className="calc-label" htmlFor="auth-email">
        아이디 (이메일)
      </label>
      <input
        id="auth-email"
        className="login-input"
        type="email"
        inputMode="email"
        autoComplete="email"
        required
        placeholder="name@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <label className="calc-label" htmlFor="auth-pw">
        비밀번호
      </label>
      <input
        id="auth-pw"
        className="login-input"
        type="password"
        autoComplete={mode === "login" ? "current-password" : "new-password"}
        required
        placeholder={mode === "signup" ? "영문+숫자 8자 이상" : ""}
        value={pw}
        onChange={(e) => setPw(e.target.value)}
      />
      {mode === "signup" && (
        <>
          <label className="calc-label" htmlFor="auth-pw2">
            비밀번호 확인
          </label>
          <input
            id="auth-pw2"
            className="login-input"
            type="password"
            autoComplete="new-password"
            required
            value={pw2}
            onChange={(e) => setPw2(e.target.value)}
          />
          <div className="login-agree">
            <label className="calc-check">
              <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
              <span>
                [필수] 개인정보 수집·이용 동의
                <small>
                  항목: 이메일, 비밀번호(암호화 저장) · 목적: 회원 식별, 관심 단지 실거래·신고가 알림 · 보유: 탈퇴 시까지 (
                  <Link href="/privacy">개인정보처리방침</Link>)
                </small>
              </span>
            </label>
            <label className="calc-check">
              <input type="checkbox" checked={age} onChange={(e) => setAge(e.target.checked)} />
              <span>[필수] 만 14세 이상입니다</span>
            </label>
            <label className="calc-check">
              <input type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} />
              <span>
                [선택] 광고성 정보 수신 동의
                <small>새 리포트·서비스 소식. 동의하지 않아도 알림 기능은 그대로 쓸 수 있어요.</small>
              </span>
            </label>
          </div>
        </>
      )}

      {error && <p className="login-error">{error}</p>}

      <button type="submit" className="login-submit" disabled={busy}>
        {busy ? "잠시만요…" : mode === "login" ? "로그인" : "가입하기"}
      </button>

      {mode === "login" ? (
        <p className="login-help login-links">
          <Link href={`/signup?next=${encodeURIComponent(next)}`}>회원가입</Link> · <Link href="/reset">비밀번호 찾기</Link>
        </p>
      ) : (
        <p className="login-help login-links">
          이미 가입하셨나요? <Link href={`/login?next=${encodeURIComponent(next)}`}>로그인</Link>
        </p>
      )}
    </form>
  );
}
