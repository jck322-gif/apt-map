"use client";

import { useEffect, useMemo, useState } from "react";
import { calcBrokerageFee, pct, won, wonKo, type BrokerKind } from "@/lib/calc";
import { Choice, ManwonField, readQueryNumber } from "./fields";

export default function BrokerFeeCalc() {
  const [kind, setKind] = useState<BrokerKind>("sale");
  const [amount, setAmount] = useState(50000);
  const [rent, setRent] = useState(0);
  const [vat, setVat] = useState<"general" | "simple" | "none">("general");

  useEffect(() => {
    const p = readQueryNumber("price");
    if (p) setAmount(Math.round(p));
    const k = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("type") : null;
    if (k === "jeonse" || k === "monthly" || k === "sale") setKind(k);
  }, []);

  const r = useMemo(
    () => calcBrokerageFee({ kind, amount: amount * 10000, rent: rent * 10000, vat }),
    [kind, amount, rent, vat]
  );

  return (
    <div className="calc-box">
      <div className="calc-form">
        <Choice
          label="거래 종류"
          value={kind}
          onChange={setKind}
          options={[
            { value: "sale", label: "매매" },
            { value: "jeonse", label: "전세" },
            { value: "monthly", label: "월세" },
          ]}
        />
        <ManwonField
          id="broker-amount"
          label={kind === "sale" ? "매매가" : "보증금"}
          value={amount}
          onChange={setAmount}
        />
        {kind === "monthly" && <ManwonField id="broker-rent" label="월세" value={rent} onChange={setRent} />}
        <Choice
          label="중개사무소 부가세"
          value={vat}
          onChange={setVat}
          options={[
            { value: "general", label: "일반과세 10%" },
            { value: "simple", label: "간이과세 약 4%" },
            { value: "none", label: "빼고 보기" },
          ]}
        />
      </div>

      <div className="calc-result" aria-live="polite">
        <p className="calc-result-label">한쪽이 내는 중개보수 상한</p>
        <p className="calc-result-big">{wonKo(r.total)}</p>
        <p className="calc-result-sub">
          {won(r.total)}
          {r.vat > 0 ? ` (부가세 ${won(r.vat)} 포함)` : ""}
        </p>
        <table className="calc-table">
          <tbody>
            <tr>
              <th>{kind === "monthly" ? "환산 거래금액" : "거래금액"}</th>
              <td>{wonKo(r.base)}</td>
            </tr>
            <tr>
              <th>상한요율</th>
              <td>
                {pct(r.rate, 1)}
                {r.cap ? ` (한도 ${wonKo(r.cap)})` : ""}
              </td>
            </tr>
            <tr>
              <th>중개보수</th>
              <td>{won(r.fee)}</td>
            </tr>
            {r.vat > 0 && (
              <tr>
                <th>부가세</th>
                <td>{won(r.vat)}</td>
              </tr>
            )}
          </tbody>
        </table>
        <ul className="calc-notes">
          {r.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
          <li>
            {kind === "sale" ? "매도인과 매수인" : "임대인과 임차인"}이 각각 이 금액까지 냅니다. 상한이라 이보다 낮게
            협의할 수 있습니다.
          </li>
        </ul>
      </div>
    </div>
  );
}
