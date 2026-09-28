import type { Metadata } from "next";
import Link from "next/link";
import CalcShell from "@/components/calc/CalcShell";
import BrokerFeeCalc from "@/components/calc/BrokerFeeCalc";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: `부동산 중개수수료 계산기 — 매매·전세·월세 복비 | ${SITE_NAME}`,
  description:
    "아파트 매매·전세·월세 중개수수료(복비)를 법정 상한요율로 바로 계산합니다. 월세 환산 방법, 구간별 한도액, 부가세 10%까지 반영했습니다.",
  alternates: { canonical: "/calc/brokerage-fee" },
};

const FAQS = [
  {
    q: "5억 아파트 매매 복비는 얼마인가요?",
    a: "2억~9억 구간이라 상한요율 0.4%가 적용돼 200만원입니다. 일반과세자인 중개사무소라면 부가세 10%를 더해 220만원이며, 매도인과 매수인이 각각 이 금액까지 냅니다.",
  },
  {
    q: "월세 중개수수료는 어떻게 계산하나요?",
    a: "보증금에 월세×100을 더한 금액을 거래금액으로 봅니다. 이 금액이 5천만원 미만이면 월세×70으로 다시 계산합니다. 보증금 1,000만원·월세 50만원이면 6,000만원으로 보고 0.4%인 24만원이 상한입니다.",
  },
  {
    q: "상한요율보다 적게 낼 수 있나요?",
    a: "네. 표의 요율은 '이 이상 받을 수 없다'는 상한입니다. 실제 수수료는 중개사와 협의해서 정하고, 계약 전에 금액을 정해 두는 것이 좋습니다.",
  },
  {
    q: "부가세는 꼭 내야 하나요?",
    a: "중개보수 상한에는 부가세가 들어 있지 않습니다. 중개사무소가 일반과세자면 10%, 간이과세자면 그보다 적은 금액(대략 4%)을 더 낼 수 있습니다. 현금영수증을 받으면 확인할 수 있습니다.",
  },
];

const SOURCES = [
  { label: "찾기쉬운 생활법령 — 주택 중개보수 요율", url: "https://www.easylaw.go.kr/CSP/CnpClsMain.laf?csmSeq=649&ccfNo=2&cciNo=2&cnpClsNo=2" },
  { label: "공인중개사법 시행규칙 [별표 1]", url: "https://www.law.go.kr/법령/공인중개사법시행규칙" },
];

function RateTable({ rows }: { rows: [string, string, string][] }) {
  return (
    <div className="top5-table-wrap">
      <table className="top5-table guide-table nowrap-table">
        <thead>
          <tr>
            <th>거래금액</th>
            <th>상한요율</th>
            <th>한도액</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r[0]}>
              <td>{r[0]}</td>
              <td>{r[1]}</td>
              <td>{r[2]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Page() {
  return (
    <CalcShell
      slug="brokerage-fee"
      lead="거래 종류와 금액만 넣으면 공인중개사에게 줄 수 있는 중개보수의 법정 상한을 계산합니다. 부산·울산 조례도 전국 기준표와 같은 요율을 씁니다."
      calculator={<BrokerFeeCalc />}
      faqs={FAQS}
      sources={SOURCES}
    >
      <h2>매매·교환 상한요율</h2>
      <RateTable
        rows={[
          ["5천만원 미만", "0.6%", "25만원"],
          ["5천만원 ~ 2억원 미만", "0.5%", "80만원"],
          ["2억원 ~ 9억원 미만", "0.4%", "없음"],
          ["9억원 ~ 12억원 미만", "0.5%", "없음"],
          ["12억원 ~ 15억원 미만", "0.6%", "없음"],
          ["15억원 이상", "0.7%", "없음"],
        ]}
      />

      <h2>전세·월세(임대차) 상한요율</h2>
      <RateTable
        rows={[
          ["5천만원 미만", "0.5%", "20만원"],
          ["5천만원 ~ 1억원 미만", "0.4%", "30만원"],
          ["1억원 ~ 6억원 미만", "0.3%", "없음"],
          ["6억원 ~ 12억원 미만", "0.4%", "없음"],
          ["12억원 ~ 15억원 미만", "0.5%", "없음"],
          ["15억원 이상", "0.6%", "없음"],
        ]}
      />
      <p>
        이 요율은 2021년 10월 19일부터 적용된 기준입니다. 그 전에는 6억원 이상 매매가 0.5% 이하, 9억원 이상이 0.9%
        이하 협의였는데, 집값이 오르면서 고가 구간 부담이 크다는 지적에 따라 구간이 잘게 나뉘었습니다.
      </p>

      <h2>부산 아파트로 보면</h2>
      <p>
        최근 부산에서 많이 거래되는 84㎡ 아파트 가격대(3억~7억원)는 대부분 0.4% 구간입니다. 5억원이면 200만원, 7억원이면
        280만원이 상한이고, 부가세를 더하면 각각 220만원, 308만원입니다. 해운대·수영구의 9억원이 넘는 거래부터는 0.5%로
        올라가서, 10억원이면 500만원(부가세 포함 550만원)이 됩니다.
      </p>
      <p>
        지역별 84㎡ 가격대는 <Link href="/insight/region-trend">구·군별 거래량과 84㎡ 가격</Link>에서, 수수료율이 정해진
        배경은 <Link href="/guide/real-estate-agent-commission-rates">중개수수료 요율 정리</Link> 글에서 볼 수 있습니다.
      </p>
    </CalcShell>
  );
}
