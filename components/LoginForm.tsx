"use client";

import { useState } from "react";
import Link from "next/link";

/** 이메일 로그인 폼 — 이메일을 넣으면 로그인 링크가 메일로 갑니다(비밀번호 없음). */
export default function LoginForm({ next, expired }: { next: string; expired: boolean }) {
  const [email, setEmail] = useState("");
  const [agree, setAgree] = useState(false);
  const [age, setAge] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(expired ? "로그인 링크가 만료됐거나 이미 사용됐어요. 다시 요청해 주세요." : null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!agree || !age) {
      setError("필수 항목에 모두 동의해 주세요.");
      return;
    }
    setState("sending");
    try {
      const res = await fetch("/api/auth/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, agree: true, marketing, next }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.ok) {
        setError(j.error || "잠시 후 다시 시도해 주세요.");
        setState("idle");
        return;
      }
      setState("sent");
    } catch {
      setError("연결이 불안정해요. 잠시 후 다시 시도해 주세요.");
      setState("idle");
    }
  }

  if (state === "sent") {
    return (
      <div className="login-sent">
        <p className="login-sent-title">📮 메일을 보냈어요</p>
        <p>
          <b>{email}</b> 받은편지함에서 <b>[부울아파트] 로그인 링크</b> 메일의 버튼을 눌러 주세요. 링크는 15분 동안 한 번만
          쓸 수 있어요.
        </p>
        <p className="login-help">메일이 안 보이면 스팸함·프로모션함도 확인해 주세요.</p>
        <button type="button" className="login-link-btn" onClick={() => setState("idle")}>
          다른 주소로 다시 받기
        </button>
      </div>
    );
  }

  return (
    <form className="login-form" onSubmit={submit}>
      <label className="calc-label" htmlFor="login-email">
        이메일
      </label>
      <input
        id="login-email"
        className="login-input"
        type="email"
        inputMode="email"
        autoComplete="email"
        required
        placeholder="name@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <div className="login-agree">
        <label className="calc-check">
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
          <span>
            [필수] 개인정보 수집·이용 동의
            <small>
              항목: 이메일 주소 · 목적: 로그인, 관심 단지 실거래·신고가 알림 발송 · 보유: 회원 탈퇴 시까지 (
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
            <small>새 리포트·서비스 소식 등. 동의하지 않아도 알림 기능은 그대로 쓸 수 있어요.</small>
          </span>
        </label>
      </div>

      {error && <p className="login-error">{error}</p>}

      <button type="submit" className="login-submit" disabled={state === "sending"}>
        {state === "sending" ? "보내는 중…" : "로그인 링크 받기"}
      </button>
      <p className="login-help">비밀번호 없이, 메일로 받은 링크를 누르면 로그인돼요. 처음이면 자동으로 가입됩니다.</p>
    </form>
  );
}
