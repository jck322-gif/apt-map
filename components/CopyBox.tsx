"use client";

import { useState } from "react";

/** 글 상자 + [복사] 버튼. 휴대폰에서도 한 번에 복사되게 합니다. */
export default function CopyBox({ label, text, hint }: { label: string; text: string; hint?: string }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // 오래된 브라우저: 임시 입력칸을 만들어 복사합니다.
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setDone(true);
    setTimeout(() => setDone(false), 1500);
  };
  return (
    <div className="copy-box">
      <div className="copy-box-head">
        <strong>{label}</strong>
        {hint && <span className="muted-small">{hint}</span>}
        <button type="button" className="copy-btn" onClick={copy}>
          {done ? "복사됨 ✓" : "복사"}
        </button>
      </div>
      <pre className="copy-box-text">{text}</pre>
    </div>
  );
}
