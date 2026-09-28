"use client";

import { useEffect, useMemo, useState } from "react";
import {
  calcDsrLimit,
  calcLoan,
  ltvLimit,
  pct,
  STRESS_RATE_UNTIL,
  won,
  wonKo,
  wonMan,
  type RateKind,
  type RepayMethod,
} from "@/lib/calc";
import { Check, Choice, ManwonField, NumberField, readQueryNumber } from "./fields";

const METHOD_LABEL: Record<RepayMethod, string> = {
  equal: "원리금균등",
  principal: "원금균등",
  bullet: "만기일시",
};

export default function LoanCalc() {
  const [housePrice, setHousePrice] = useState(50000);
  const [principal, setPrincipal] = useState(30000);
  const [rate, setRate] = useState(4.0);
  const [years, setYears] = useState(30);
  const [method, setMethod] = useState<RepayMethod>("equal");
  const [firstHome, setFirstHome] = useState(false);
  const [income, setIncome] = useState(6000);
  const [otherAnnual, setOtherAnnual] = useState(0);
  const [rateKind, setRateKind] = useState<RateKind>("mixed");
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const p = readQueryNumber("price");
    if (p) {
      setHousePrice(Math.round(p));
      setPrincipal(Math.round(p * 0.6));
    }
  }, []);

  const valid = principal > 0 && rate >= 0 && years > 0 && years <= 50;
  const loan = useMemo(
    () => (valid ? calcLoan(principal * 10000, rate / 100, years, method) : null),
    [valid, principal, rate, years, method]
  );
  const dsr = useMemo(
    () =>
      calcDsrLimit({
        income: income * 10000,
        otherAnnual: otherAnnual * 10000,
        annualRate: rate / 100,
        years: Math.max(1, years),
        rateKind,
      }),
    [income, otherAnnual, rate, years, rateKind]
  );
  const ltv = ltvLimit(housePrice * 10000, firstHome);
  const maxLoan = Math.min(ltv, dsr.maxPrincipal);
  const rows = loan ? (showAll ? loan.years : loan.years.slice(0, 5)) : [];

  return (
    <>
      <div className="calc-box">
        <div className="calc-form">
          <ManwonField id="loan-principal" label="대출 금액" value={principal} onChange={setPrincipal} />
          <NumberField id="loan-rate" label="연 금리" value={rate} onChange={setRate} unit="%" step={0.05} max={20} />
          <NumberField id="loan-years" label="대출 기간" value={years} onChange={setYears} unit="년" step={1} min={1} max={50} />
          <Choice
            label="상환 방법"
            value={method}
            onChange={setMethod}
            options={(Object.keys(METHOD_LABEL) as RepayMethod[]).map((k) => ({ value: k, label: METHOD_LABEL[k] }))}
          />
        </div>

        <div className="calc-result" aria-live="polite">
          {loan ? (
            <>
              <p className="calc-result-label">
                {method === "bullet" ? "매달 내는 이자" : method === "principal" ? "첫 달 상환액 (점점 줄어듦)" : "매달 상환액"}
              </p>
              <p className="calc-result-big">{wonKo(Math.round(loan.firstMonth / 10) * 10)}</p>
              <p className="calc-result-sub">
                {method === "principal" && `마지막 달 ${wonKo(loan.lastMonth)} · `}
                {method === "bullet" && `만기에 원금 ${wonKo(principal * 10000)}을 한 번에 갚습니다 · `}
                총 이자 {wonMan(loan.totalInterest)}
              </p>
              <table className="calc-table calc-table-sm">
                <thead>
                  <tr>
                    <th>연차</th>
                    <th>갚은 원금</th>
                    <th>낸 이자</th>
                    <th>남은 원금</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((y) => (
                    <tr key={y.year}>
                      <th>{y.year}년</th>
                      <td>{wonMan(y.principal)}</td>
                      <td>{wonMan(y.interest)}</td>
                      <td>{wonMan(y.balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {loan.years.length > 5 && (
                <button type="button" className="calc-more" onClick={() => setShowAll((v) => !v)}>
                  {showAll ? "5년만 보기" : `${loan.years.length}년 전체 보기`}
                </button>
              )}
            </>
          ) : (
            <p className="calc-result-label">대출 금액·금리·기간을 넣어 주세요.</p>
          )}
        </div>
      </div>

      <h2 className="calc-h2">얼마까지 빌릴 수 있을까 (LTV·DSR)</h2>
      <div className="calc-box">
        <div className="calc-form">
          <ManwonField id="loan-house" label="살 집 가격" value={housePrice} onChange={setHousePrice} />
          <Check
            label="생애최초 주택 구입"
            desc="부산·울산(비규제지역) LTV 70% → 80%"
            checked={firstHome}
            onChange={setFirstHome}
          />
          <ManwonField id="loan-income" label="연소득 (세전)" value={income} onChange={setIncome} />
          <ManwonField
            id="loan-other"
            label="다른 대출 1년 원리금"
            value={otherAnnual}
            onChange={setOtherAnnual}
            hint="신용대출·자동차 할부 등이 있으면 1년 동안 갚는 돈을 넣으세요"
          />
          <Choice
            label="금리 유형"
            value={rateKind}
            onChange={setRateKind}
            options={[
              { value: "variable", label: "변동" },
              { value: "mixed", label: "혼합형" },
              { value: "periodic", label: "주기형" },
              { value: "fixed", label: "완전고정" },
            ]}
          />
        </div>
        <div className="calc-result" aria-live="polite">
          <p className="calc-result-label">은행 주담대 최대 한도 (대략)</p>
          <p className="calc-result-big">{wonKo(Math.floor(maxLoan / 1_000_000) * 1_000_000)}</p>
          <p className="calc-result-sub">LTV와 DSR 중 작은 쪽입니다.</p>
          <table className="calc-table">
            <tbody>
              <tr>
                <th>LTV {firstHome ? "80%" : "70%"} 한도</th>
                <td>{wonKo(Math.floor(ltv / 1_000_000) * 1_000_000)}</td>
              </tr>
              <tr>
                <th>DSR 40% 한도</th>
                <td>{wonKo(Math.floor(dsr.maxPrincipal / 1_000_000) * 1_000_000)}</td>
              </tr>
              <tr>
                <th>DSR 계산 금리</th>
                <td>
                  {pct(rate / 100)} + 스트레스 {pct(dsr.stressAdd, 3)} = {pct(dsr.stressRate, 3)}
                </td>
              </tr>
            </tbody>
          </table>
          <ul className="calc-notes">
            <li>
              지방 주담대 스트레스 금리는 {STRESS_RATE_UNTIL}까지 0.75%p입니다 (변동 100%, 혼합형 60%, 주기형 30% 반영).
              이후에는 1.5%p로 오를 예정입니다.
            </li>
            <li>DSR은 이번 대출을 {years}년 원리금균등으로 갚는다고 보고 계산했습니다. 실제 한도는 은행 심사로 정해집니다.</li>
          </ul>
        </div>
      </div>
    </>
  );
}
