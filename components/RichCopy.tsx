"use client";

import { useRef, useState } from "react";

/**
 * 표·링크가 살아 있는 상태로 복사하는 상자.
 * 네이버 카페·블로그 편집기에 붙여 넣으면 표 모양과 단지 링크가 그대로 들어갑니다.
 * (글자만 복사하는 CopyBox와 달리, 화면에 보이는 모양 그대로 복사합니다.)
 */
export default function RichCopy({ label, html, hint }: { label: string; html: string; hint?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [done, setDone] = useState(false);

  const copy = async () => {
    const el = ref.current;
    if (!el) return;
    let ok = false;
    try {
      if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
        await navigator.clipboard.write([
          new ClipboardItem({
            "text/html": new Blob([html], { type: "text/html" }),
            "text/plain": new Blob([el.innerText], { type: "text/plain" }),
          }),
        ]);
        ok = true;
      }
    } catch {
      ok = false;
    }
    if (!ok) {
      // 휴대폰 등: 화면의 표를 선택해서 복사합니다 (모양이 그대로 복사됩니다).
      const sel = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(el);
      sel?.removeAllRanges();
      sel?.addRange(range);
      try {
        document.execCommand("copy");
      } finally {
        sel?.removeAllRanges();
      }
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
          {done ? "복사됨 ✓" : "표 복사"}
        </button>
      </div>
      <div ref={ref} className="rich-copy-preview" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}
