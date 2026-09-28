"use client";

import { useEffect, useMemo, useState } from "react";
import { calcAcquisitionTax, pct, won, wonKo, type HouseCount } from "@/lib/calc";
import { Check, Choice, ManwonField, readQueryNumber } from "./fields";

export default function AcqTaxCalc() {
  const [price, setPrice] = useState(50000); // 만원
  const [over85, setOver85] = useState(false);
  const [houses, setHouses] = useState<HouseCount>("1");
  const [regulated, setRegulated] = useState(false);
  const [cheapLocal, setCheapLocal] = useState(false);
  const [firstHome, setFirstHome] = useState(false);

  // 단지 페이지의 "취득세 계산" 링크로 들어오면 가격·면적을 채워 둡니다.
  useEffect(() => {
    const p = readQueryNumber("price");
    const a = readQueryNumber("area");
    if (p) setPrice(Math.round(p));
    if (a) setOver85(a > 85);
  }, []);

  const r = useMemo(
    () => calcAcquisitionTax({ price: price * 10000, over85, houses, regulated, cheapLocal, firstHome }),
    [price, over85, houses, regulated, cheapLocal, firstHome]
  );
  const multi = houses === "2" || houses === "3" || houses === "4+";

  return (
    <div className="calc-box">
      <div className="calc-form">
        <ManwonField id="acq-price" label="매매가(취득가액)" value={price} onChange={setPrice} />
        <Choice
          label="전용면적"
          value={over85 ? "over" : "under"}
          onChange={(v) => setOver85(v === "over")}
          options={[
            { value: "under", label: "85㎡ 이하" },
            { value: "over", label: "85㎡ 초과" },
          ]}
        />
        <Choice
          label="이 집을 산 뒤 우리 세대 주택 수"
          value={houses}
          onChange={setHouses}
          options={[
            { value: "1", label: "1주택" },
            { value: "temp2", label: "일시적 2주택" },
            { value: "2", label: "2주택" },
            { value: "3", label: "3주택" },
            { value: "4+", label: "4주택 이상" },
          ]}
        />
        {multi && (
          <>
            <Check
              label="조정대상지역의 집이에요"
              desc="2026년 9월 현재 부산·울산에는 조정대상지역이 없습니다."
              checked={regulated}
              onChange={setRegulated}
            />
            <Check
              label="비수도권, 공시가격 2억원 이하 집이에요"
              desc="이런 집은 주택 수와 상관없이 중과하지 않습니다."
              checked={cheapLocal}
              onChange={setCheapLocal}
            />
          </>
        )}
        {houses === "1" && (
          <Check
            label="생애최초 주택 구입이에요"
            desc="본인·배우자 모두 집을 가진 적이 없고, 12억원 이하 — 취득세 최대 200만원 감면"
            checked={firstHome}
            onChange={setFirstHome}
          />
        )}
      </div>

      <div className="calc-result" aria-live="polite">
        <p className="calc-result-label">내야 할 세금 합계</p>
        <p className="calc-result-big">{wonKo(r.total)}</p>
        <p className="calc-result-sub">{won(r.total)} · 매매가의 {pct(price > 0 ? r.total / (price * 10000) : 0)}</p>

        <table className="calc-table">
          <tbody>
            <tr>
              <th>취득세 ({pct(r.rate)})</th>
              <td>{won(r.acqTax)}</td>
            </tr>
            {r.firstHomeRelief > 0 && (
              <tr className="calc-minus">
                <th>생애최초 감면</th>
                <td>−{won(r.firstHomeRelief)}</td>
              </tr>
            )}
            <tr>
              <th>지방교육세</th>
              <td>{won(r.eduTax)}</td>
            </tr>
            <tr>
              <th>농어촌특별세</th>
              <td>{r.ruralTax > 0 ? won(r.ruralTax) : "비과세 (85㎡ 이하)"}</td>
            </tr>
          </tbody>
        </table>
        {r.notes.length > 0 && (
          <ul className="calc-notes">
            {r.notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
