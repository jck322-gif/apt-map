/**
 * 메일 보내기 — Resend(resend.com) API를 그대로 호출합니다 (추가 패키지 없음).
 *
 * Vercel 환경변수:
 *   RESEND_API_KEY  — Resend에서 만든 API 키 (re_로 시작)
 *   MAIL_FROM       — 보내는 사람. 예: 부울아파트 <alert@buulapt.com>
 *                     (Resend에서 buulapt.com 도메인 인증을 마쳐야 이 주소로 보낼 수 있습니다)
 */
export async function sendMail(opts: {
  to: string;
  subject: string;
  html: string;
  text: string;
  headers?: Record<string, string>;
}): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM || "부울아파트 <alert@buulapt.com>";
  if (!key) {
    console.error("[mail] RESEND_API_KEY 가 설정되지 않았습니다.");
    return false;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [opts.to],
        subject: opts.subject,
        html: opts.html,
        text: opts.text,
        ...(opts.headers ? { headers: opts.headers } : {}),
      }),
    });
    if (!res.ok) {
      console.error("[mail] 발송 실패", res.status, (await res.text()).slice(0, 300));
      return false;
    }
    return true;
  } catch (err) {
    console.error("[mail] 발송 오류", err);
    return false;
  }
}

export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** 메일 공통 틀 — 청록 머리말 + 본문 + 하단 안내 */
export function mailLayout(title: string, bodyHtml: string, footerHtml: string): string {
  return `<!doctype html><html lang="ko"><body style="margin:0;background:#f3f6f5;font-family:-apple-system,'Apple SD Gothic Neo','Malgun Gothic',sans-serif;color:#1b2430">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f6f5;padding:24px 0"><tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#fff;border-radius:14px;overflow:hidden">
<tr><td style="background:#144951;color:#fff;padding:18px 24px;font-size:18px;font-weight:800">부울아파트 <span style="font-weight:400;font-size:14px;opacity:.85">· ${escapeHtml(title)}</span></td></tr>
<tr><td style="padding:22px 24px;font-size:15px;line-height:1.7">${bodyHtml}</td></tr>
<tr><td style="padding:14px 24px 20px;font-size:12px;line-height:1.6;color:#5b6b66;border-top:1px solid #e3ebe9">${footerHtml}</td></tr>
</table></td></tr></table></body></html>`;
}
