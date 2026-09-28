import type { Metadata } from "next";
import Link from "next/link";
import CalcShell from "@/components/calc/CalcShell";
import AcqTaxCalc from "@/components/calc/AcqTaxCalc";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: `아파트 취득세 계산기 2026 — 부산·울산 기준 | ${SITE_NAME}`,
  description:
    "매매가만 넣으면 아파트 취득세·지방교육세·농어촌특별세를 바로 계산합니다. 6억~9억 구간 세율, 다주택 중과, 생애최초 200만원 감면까지 2026년 9월 기준으로 반영했습니다.",
  alternates: { canonical: "/calc/acquisition-tax" },
};

const FAQS = [
  {
    q: "7억 아파트 취득세는 얼마인가요?",
    a: "1주택, 전용 85㎡ 이하라면 취득세율은 1.67%로 취득세 1,169만원, 지방교육세 116만 9천원을 더해 약 1,285만원입니다. 85㎡를 넘으면 농어촌특별세 0.2%(140만원)가 더 붙습니다.",
  },
  {
    q: "부산·울산에서 2주택이면 취득세가 중과되나요?",
    a: "2026년 9월 현재 부산·울산에는 조정대상지역이 없습니다. 비조정대상지역에서 2주택이 되는 경우는 1주택과 같은 1~3% 세율이고, 3주택부터 8%, 4주택 이상은 12%가 적용됩니다.",
  },
  {
    q: "생애최초 감면은 얼마나 받나요?",
    a: "본인과 배우자 모두 집을 가진 적이 없고 취득가액이 12억원 이하이면 취득세를 최대 200만원까지 감면받습니다(2028년 말까지). 산 뒤 3개월 안에 전입하지 않거나 3년 안에 팔거나 임대하면 추징됩니다.",
  },
  {
    q: "취득세는 언제까지 내야 하나요?",
    a: "잔금을 치른 날(또는 등기일 중 빠른 날)부터 60일 안에 신고·납부해야 합니다. 늦으면 가산세가 붙습니다. 보통 법무사가 등기와 함께 처리합니다.",
  },
];

const SOURCES = [
  { label: "지방세법 제11조(부동산 취득의 세율)", url: "https://www.law.go.kr/법령/지방세법" },
  { label: "위택스 — 취득세 신고·납부", url: "https://www.wetax.go.kr" },
  { label: "정책브리핑 — 지방 저가주택 중과 제외 기준 공시가 2억원으로 상향", url: "https://www.korea.kr/news/policyNewsView.do?newsId=148942191" },
  { label: "아시아경제 — 생애최초 취득세 감면 2028년까지 연장", url: "https://www.asiae.co.kr/article/2025082811111574443" },
];

export default function Page() {
  return (
    <CalcShell
      slug="acquisition-tax"
      lead="매매가와 전용면적, 이 집을 산 뒤의 주택 수만 고르면 잔금 때 내야 할 세금을 바로 계산합니다. 단지 페이지의 '취득세 계산' 버튼으로 들어오면 그 단지 실거래가가 미리 들어갑니다."
      calculator={<AcqTaxCalc />}
      faqs={FAQS}
      sources={SOURCES}
    >
      <h2>취득세는 이렇게 계산합니다</h2>
      <p>
        아파트를 사면 취득세 본세에 지방교육세, 그리고 전용 85㎡를 넘으면 농어촌특별세가 함께 붙습니다. 세 가지를
        합친 금액을 잔금일로부터 60일 안에 한 번에 냅니다.
      </p>
      <div className="top5-table-wrap">
        <table className="top5-table guide-table nowrap-table">
          <thead>
            <tr>
              <th>매매가 (1주택 기준)</th>
              <th>취득세</th>
              <th>지방교육세</th>
              <th>농특세 (85㎡ 초과)</th>
              <th>합계</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>6억원 이하</td>
              <td>1%</td>
              <td>0.1%</td>
              <td>0.2%</td>
              <td>1.1% / 1.3%</td>
            </tr>
            <tr>
              <td>6억 초과 ~ 9억 이하</td>
              <td>1.01~2.99%</td>
              <td>세율의 1/10</td>
              <td>0.2%</td>
              <td>가격에 따라 달라짐</td>
            </tr>
            <tr>
              <td>9억원 초과</td>
              <td>3%</td>
              <td>0.3%</td>
              <td>0.2%</td>
              <td>3.3% / 3.5%</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        6억~9억 구간은 가격이 오를수록 세율이 조금씩 올라갑니다. 계산식은 <strong>(매매가 × 2/3억 − 3) ÷ 100</strong>
        이고, 7억원이면 1.67%, 7억 5천만원이면 2%, 8억 5천만원이면 2.67%입니다.
      </p>

      <h2>다주택자 중과 — 부산·울산은 3주택부터</h2>
      <div className="top5-table-wrap">
        <table className="top5-table guide-table nowrap-table">
          <thead>
            <tr>
              <th>이 집을 산 뒤 주택 수</th>
              <th>조정대상지역</th>
              <th>그 밖의 지역 (부산·울산)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>1주택 · 일시적 2주택</td>
              <td>1~3%</td>
              <td>1~3%</td>
            </tr>
            <tr>
              <td>2주택</td>
              <td>8%</td>
              <td>1~3%</td>
            </tr>
            <tr>
              <td>3주택</td>
              <td>12%</td>
              <td>8%</td>
            </tr>
            <tr>
              <td>4주택 이상</td>
              <td>12%</td>
              <td>12%</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        중과세율(8%·12%)이 붙으면 지방교육세는 0.4%로 고정되고, 85㎡ 초과 주택의 농어촌특별세는 8%일 때 0.6%, 12%일 때
        1.0%로 오릅니다. 다만 비수도권에서 공시가격 2억원 이하인 주택은 주택 수와 상관없이 중과하지 않습니다.
      </p>
      <p>
        조정대상지역은 2022년 9월 부산·울산에서 모두 풀렸고, 2025년 10·15 대책으로 새로 지정된 곳도 서울과 경기
        일부뿐입니다. 규제 지역이 다시 바뀌면 이 계산기도 고쳐 두겠습니다.
      </p>

      <h2>계산할 때 자주 틀리는 것</h2>
      <ul>
        <li>
          <strong>주택 수는 &quot;산 뒤&quot; 기준입니다.</strong> 집이 한 채 있는 사람이 한 채를 더 사면 2주택으로 계산합니다.
          기존 집을 3년 안에 팔 계획이면 일시적 2주택으로 1주택 세율을 받습니다.
        </li>
        <li>
          <strong>분양권·입주권, 주거용 오피스텔도 주택 수에 들어갈 수 있습니다</strong> (2020년 8월 12일 이후 취득분).
        </li>
        <li>
          <strong>세대 기준입니다.</strong> 같은 주민등록 세대의 배우자·자녀 집도 합쳐서 셉니다.
        </li>
      </ul>
      <p>
        실제 거래 가격이 궁금하면 <Link href="/apt">단지별 실거래가</Link>에서 단지를 찾은 뒤 &quot;취득세 계산&quot;을
        누르면 최근 매매가로 바로 계산됩니다. 취득세를 더 자세히 풀어 쓴 글은{" "}
        <Link href="/guide/acquisition-tax-when-buying">집 살 때 내는 취득세</Link>에, 사고파는 순서와 기한은{" "}
        <Link href="/guide/apartment-purchase-steps">아파트 매매 절차</Link> 글에 정리해 두었습니다.
      </p>
    </CalcShell>
  );
}
