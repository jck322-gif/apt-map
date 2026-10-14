"use client";

import { useState } from "react";
import Link from "next/link";

/**
 * 알림을 받기 전에 필요한 것 두 가지:
 *  1) 필수 동의 (구글·카카오로 처음 가입한 경우)
 *  2) 확인된 이메일 (카카오가 이메일을 안 줬거나, 가입 후 아직 확인 메일을 안 누른 경우)
 */
export default function AccountSetup({
  needConsent,
  email,
  emailVerified,
}: {
  needConsent: boolean;
  email: string | null;
  emailVerified: boolean;
}) {
  const [agree, setAgree] = useState(false);
  const [age, setAge] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [consentDone, setConsentDone] = useState(!needConsent);
  const [addr, setAddr] = useState(email ?? "");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function consent() {
    setErr(null);
    if (!agree || !age) return setErr("필수 항목에 모두 동의해 주세요.");
    const res = await fetch("/api/me/consent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agree, age, marketing }),
    });
    if (res.ok) setConsentDone(true);
    else setErr("저장하지 못했어요. 다시 시도해 주세요.");
  }

  async function sendVerify() {
    setErr(null);
    setMsg(null);
    const res = await fetch("/api/me/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: addr }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok || !j.ok) return setErr(j.error || "메일을 보내지 못했어요.");
    setMsg(`${addr} 로 확인 메일을 보냈어요. 메일의 버튼을 누르면 알림 준비가 끝나요.`);
  }

  if (consentDone && emailVerified) return null;

  return (
    <div className="acct-setup">
      {!consentDone && (
        <div className="acct-setup-box">
          <p className="acct-setup-title">① 서비스 이용 동의</p>
          <label className="calc-check">
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
            <span>
              [필수] 개인정보 수집·이용 동의
              <small>
                항목: 이메일, 로그인 계정 식별값 · 목적: 회원 식별, 관심 단지 알림 · 보유: 탈퇴 시까지 (
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
            <span>[선택] 광고성 정보 수신 동의</span>
          </label>
          <button type="button" className="login-submit" onClick={consent}>
            동의하고 계속하기
          </button>
        </div>
      )}

      {!emailVerified && (
        <div className="acct-setup-box">
          <p className="acct-setup-title">{consentDone ? "알림 받을 이메일 확인" : "② 알림 받을 이메일 확인"}</p>
          <p className="login-help">
            {email
              ? "가입 때 보낸 확인 메일의 버튼을 눌러 주세요. 메일이 없으면 다시 보낼 수 있어요."
              : "알림을 받을 이메일 주소를 넣고 확인 메일의 버튼을 눌러 주세요."}
          </p>
          <div className="acct-email-row">
            <input
              className="login-input"
              type="email"
              inputMode="email"
              value={addr}
              placeholder="name@example.com"
              onChange={(e) => setAddr(e.target.value)}
            />
            <button type="button" className="login-link-btn" onClick={sendVerify}>
              확인 메일 보내기
            </button>
          </div>
        </div>
      )}
      {msg && <p className="acct-msg">{msg}</p>}
      {err && <p className="login-error">{err}</p>}
    </div>
  );
}
