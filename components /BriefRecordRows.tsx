"use client";

import { useState } from "react";
import ComplexTrendModal from "@/components/ComplexTrendModal";
import { complexHref } from "@/lib/complex";
import { fmtManwon } from "@/lib/format";
import type { RecordHigh } from "@/lib/daily";

/**
 * "오늘의 신고가" 표 — 줄을 누르면 그 단지 팝업이 열립니다.
 *
 * 단지명은 진짜 링크(<a href>)로 두고 클릭만 가로챕니다.
 * 사람은 화면을 벗어나지 않고 바로 보고, 검색엔진은 단지 페이지로 가는 링크를 그대로 읽어갑니다.
 */
export default function BriefRecordRows({ rows }: { rows: RecordHigh[] }) {
  const [target, setTarget] = useState<{
    code: string;
    regionName: string;
    complex: string;
    areaM2?: number;
  } | null>(null);

  const open = (d: RecordHigh) =>
    setTarget({ code: d.regionCode, regionName: d.regionName, complex: d.complex, areaM2: d.areaM2 });

  /** 새 탭으로 열려는 클릭(Ctrl·⌘·Shift·가운데 버튼)은 그대로 두고, 평범한 클릭만 팝업으로 바꿉니다. */
  const isPlainClick = (e: React.MouseEvent) =>
    !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey && e.button === 0;

  return (
    <>
      <div className="top5-table-wrap">
        <table className="top5-table">
          <thead>
            <tr>
              <th className="c-rank">#</th>
              <th className="c-name">아파트</th>
              <th className="c-area">전용</th>
              <th className="c-price">신고가</th>
              <th className="c-date">계약일</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((d, i) => (
              <tr
                key={`${d.regionCode}-${d.complex}-${d.priceManwon}-${i}`}
                className="t5-row"
                onClick={(e) => {
                  if (!isPlainClick(e)) return;
                  e.preventDefault();
                  open(d);
                }}
                title={`${d.complex} 실거래 이력 보기`}
              >
                <td className="c-rank">
                  <span className={`rank-badge${i === 0 ? " first" : ""}`}>{i + 1}</span>
                </td>
                <td className="c-name">
                  <span className="t5-complex">
                    <a
                      href={complexHref(d.regionCode, d.complex)}
                      className="t5-complex-link"
                      onClick={(e) => {
                        if (!isPlainClick(e)) return;
                        e.preventDefault();
                        open(d);
                      }}
                    >
                      {d.complex}
                    </a>
                    <span className="flag high">신고가</span>
                  </span>
                  <span className="t5-loc">
                    {d.regionName} · {d.dong} · {d.floor}층
                  </span>
                </td>
                <td className="c-area">{Math.round(d.areaM2)}㎡</td>
                <td className="c-price">
                  {fmtManwon(d.priceManwon)}
                  <span className="rec-prev">
                    직전 {fmtManwon(d.prevPriceManwon)} · <b>+{fmtManwon(d.gainManwon)}</b>
                  </span>
                </td>
                <td className="c-date">{d.dealDate.slice(5).replace("-", "/")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {target && (
        <ComplexTrendModal
          code={target.code}
          regionName={target.regionName}
          complex={target.complex}
          areaM2={target.areaM2}
          dealType="sale"
          onClose={() => setTarget(null)}
        />
      )}
    </>
  );
}
