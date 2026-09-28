import type { Metadata } from "next";
import Link from "next/link";
import CalcShell from "@/components/calc/CalcShell";
import LoanCalc from "@/components/calc/LoanCalc";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: `주택담보대출 이자·한도 계산기 — 부산·울산 LTV·DSR | ${SITE_NAME}`,
  description:
    "대출 금액·금리·기간으로 원리금균등·원금균등·만기일시 월 상환액과 총 이자를 계산하고, 부산·울산 기준 LTV 70%와 스트레스 DSR 40% 한도를 함께 확인합니다.",
  alternates: { canonical: "/calc/loan" },
};

const FAQS = [
  {
    q: "3억을 연 4%, 30년으로 빌리면 한 달에 얼마인가요?",
    a: "원리금균등 상환이면 매달 약 143만 2천원이고, 30년 동안 내는 이자는 약 2억 1,560만원입니다. 원금균등 상환이면 첫 달 약 183만원에서 시작해 점점 줄어들고, 총 이자는 약 1억 8,050만원으로 더 적습니다.",
  },
  {
    q: "부산·울산에서 주담대는 집값의 몇 %까지 되나요?",
    a: "부산·울산은 규제지역이 아니라서 LTV 70%, 생애최초 구입이면 80%까지입니다. 다만 소득에 따른 DSR 한도(은행 40%)가 더 낮으면 그쪽이 실제 한도가 됩니다.",
  },
  {
    q: "스트레스 DSR은 무엇인가요?",
    a: "앞으로 금리가 오를 수 있다고 보고, 실제 금리에 가산금리를 더해 DSR 한도를 계산하는 제도입니다. 수도권 밖 주담대는 2026년 12월 31일까지 0.75%p를 더하고, 고정금리 기간이 길수록 덜 반영합니다(혼합형 60%, 주기형 30%).",
  },
  {
    q: "원리금균등과 원금균등 중 무엇이 유리한가요?",
    a: "총 이자는 원금균등이 적지만 초반 상환액이 큽니다. 원리금균등은 매달 금액이 같아 계획 세우기가 쉽습니다. 초반 여유가 있으면 원금균등, 매달 부담을 일정하게 하고 싶으면 원리금균등이 맞습니다.",
  },
];

const SOURCES = [
  { label: "금융위원회 — 스트레스 DSR 3단계 시행", url: "https://www.fsc.go.kr/no010101/84617" },
  { label: "머니투데이 — 지방 주담대 스트레스 DSR 유예 연장 (2026.6)", url: "https://www.mt.co.kr/finance/2026/06/18/2026061817015748988" },
  { label: "아시아경제 — 지역별 LTV·대출 규제 정리 (2026.9)", url: "https://view.asiae.co.kr/article/2026092012404565300" },
];

export default function Page() {
  return (
    <CalcShell
      slug="loan"
      lead="대출 금액과 금리, 기간을 넣으면 상환 방법별로 매달 갚을 돈과 총 이자를 보여줍니다. 아래에서는 집값과 소득으로 부산·울산 기준 대출 한도를 대략 계산할 수 있습니다."
      calculator={<LoanCalc />}
      faqs={FAQS}
      sources={SOURCES}
    >
      <h2>세 가지 상환 방법</h2>
      <ul>
        <li>
          <strong>원리금균등</strong> — 원금과 이자를 합친 금액을 매달 똑같이 냅니다. 초반에는 이자 비중이 크고, 갈수록
          원금 비중이 커집니다. 가장 흔한 방식입니다.
        </li>
        <li>
          <strong>원금균등</strong> — 원금을 매달 똑같이 나눠 갚고, 이자는 남은 원금에만 붙습니다. 첫 달 부담이 가장 크고
          점점 줄어들며, 총 이자는 가장 적습니다.
        </li>
        <li>
          <strong>만기일시</strong> — 매달 이자만 내고 원금은 만기에 한 번에 갚습니다. 주택담보대출에서는 거의 쓰지 않고,
          비교용으로 넣었습니다.
        </li>
      </ul>

      <h2>부산·울산 대출 한도 — LTV와 DSR</h2>
      <p>
        주택담보대출 한도는 두 가지 중 작은 쪽으로 정해집니다. <strong>LTV</strong>는 집값의 몇 %까지 빌릴 수 있는지,{" "}
        <strong>DSR</strong>은 1년 소득 중 모든 대출의 원리금 상환액이 몇 %를 넘으면 안 되는지입니다.
      </p>
      <div className="top5-table-wrap">
        <table className="top5-table guide-table nowrap-table">
          <thead>
            <tr>
              <th>구분</th>
              <th>부산·울산 (비규제지역)</th>
              <th>서울·경기 규제지역</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>LTV (일반)</td>
              <td>70%</td>
              <td>40%</td>
            </tr>
            <tr>
              <td>LTV (생애최초)</td>
              <td>80%</td>
              <td>70%</td>
            </tr>
            <tr>
              <td>DSR (은행)</td>
              <td>40%</td>
              <td>40%</td>
            </tr>
            <tr>
              <td>스트레스 금리 (주담대)</td>
              <td>0.75%p (2026년 말까지)</td>
              <td>1.5%p 이상</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        예를 들어 연소득 6,000만원인 사람이 다른 대출 없이 연 4% 변동금리·30년으로 빌리면, 스트레스 금리를 더한
        4.75%로 계산해 DSR 한도는 약 3억 8천만원입니다. 5억원 아파트라면 LTV 70% 한도가 3억 5천만원이라 실제 한도는
        3억 5천만원이 됩니다.
      </p>
      <p>
        지방 주담대의 스트레스 금리 유예는 2026년 12월 31일에 끝날 예정이라, 2027년부터는 가산금리가 1.5%p로 올라 같은
        소득이어도 한도가 줄어들 수 있습니다. 정책이 바뀌면 이 계산기에 반영하겠습니다.
      </p>
      <p>
        집값은 <Link href="/apt">단지별 실거래가</Link>에서, 전세를 끼고 사는 경우의 부담은{" "}
        <Link href="/insight/jeonse-rate">전세가율</Link>에서 함께 확인해 보세요.
      </p>
    </CalcShell>
  );
}
