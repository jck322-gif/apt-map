import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import { SITE_NAME } from "@/lib/site";
import { fmtManwon, typeLabel } from "@/lib/format";
import { complexHref } from "@/lib/complex";
import {
  getRanking,
  byGroup,
  type Group,
  type Ranking,
  type RecordRank,
  type PriceRank,
  type VolumeRank,
} from "@/lib/ranking";

// 랭킹은 하루에 한 번만 다시 계산합니다. 실거래 자료가 하루 단위로 들어오기 때문에
// 더 자주 계산해봐야 같은 결과가 나옵니다.
export const revalidate = 86400;

const MONTHS = 3;

export const metadata: Metadata = {
  title: `부산 · 울산 아파트 순위 — 신고가 · 평당가 · 거래량 TOP | ${SITE_NAME}`,
  description:
    "최근 3개월 부산·울산 아파트 실거래 순위입니다. 신고가를 가장 많이 경신한 단지, 국민평형 최고가, 평당가 TOP, 거래량이 많은 단지를 국토교통부 자료로 정리했습니다.",
  alternates: { canonical: "/rank" },
};

/** "2026-09-11" → "9/11" */
function md(date: string): string {
  return date.slice(5).replace("-", "/");
}

/** "2026-09-11" → "26년 9월" */
function ym(date: string): string {
  const [y, m] = date.split("-");
  return `${y.slice(2)}년 ${Number(m)}월`;
}

function Rank({ n }: { n: number }) {
  return <span className={`rank-badge${n === 1 ? " first" : ""}`}>{n}</span>;
}

/** 단지 이름 + 그 아래 작은 글씨로 위치. 이름은 단지 페이지로 가는 링크입니다. */
function Where({ r }: { r: { regionCode: string; complex: string; regionName: string; dong: string } }) {
  return (
    <>
      <span className="t5-complex">
        <Link href={complexHref(r.regionCode, r.complex)} className="t5-complex-link">
          {r.complex}
        </Link>
      </span>
      <span className="t5-loc">
        {r.regionName} · {r.dong}
      </span>
    </>
  );
}

function RecordTable({ rows }: { rows: RecordRank[] }) {
  if (rows.length === 0) return <p className="empty-note">이 기간에 신고가가 없습니다.</p>;
  return (
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
          {rows.map((r) => (
            <tr key={`${r.regionCode}-${r.complex}-${r.rank}`}>
              <td className="c-rank">
                <Rank n={r.rank} />
              </td>
              <td className="c-name">
                <Where r={r} />
              </td>
              <td className="c-area">{Math.round(r.areaM2)}㎡</td>
              <td className="c-price">
                {fmtManwon(r.priceManwon)}
                <span className="rec-prev">
                  종전 최고 {fmtManwon(r.prevPriceManwon)}
                  {r.prevDealDate && ` (${ym(r.prevDealDate)})`} · <b>+{fmtManwon(r.gainManwon)}</b>
                </span>
              </td>
              <td className="c-date">{md(r.dealDate)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PriceTable({ rows, mode }: { rows: PriceRank[]; mode: "price" | "pyeong" }) {
  if (rows.length === 0) return <p className="empty-note">이 기간에 해당하는 거래가 없습니다.</p>;
  return (
    <div className="top5-table-wrap">
      <table className="top5-table">
        <thead>
          <tr>
            <th className="c-rank">#</th>
            <th className="c-name">아파트</th>
            <th className="c-area">전용</th>
            <th className="c-price">{mode === "pyeong" ? "평당가" : "매매가"}</th>
            <th className="c-date">계약일</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={`${r.regionCode}-${r.complex}-${r.rank}`}>
              <td className="c-rank">
                <Rank n={r.rank} />
              </td>
              <td className="c-name">
                <Where r={r} />
              </td>
              <td className="c-area">{Math.round(r.areaM2)}㎡</td>
              <td className="c-price">
                {mode === "pyeong" ? (
                  <>
                    {fmtManwon(r.pyeongManwon)}
                    <span className="rec-prev">
                      {typeLabel(r.areaM2)} {fmtManwon(r.priceManwon)}
                    </span>
                  </>
                ) : (
                  <>
                    {fmtManwon(r.priceManwon)}
                    <span className="rec-prev">
                      {r.floor}층 · 평당 {fmtManwon(r.pyeongManwon)}
                    </span>
                  </>
                )}
              </td>
              <td className="c-date">{md(r.dealDate)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function VolumeTable({ rows }: { rows: VolumeRank[] }) {
  if (rows.length === 0) return <p className="empty-note">이 기간에 해당하는 거래가 없습니다.</p>;
  return (
    <div className="top5-table-wrap">
      <table className="top5-table">
        <thead>
          <tr>
            <th className="c-rank">#</th>
            <th className="c-name">아파트</th>
            <th className="c-price">거래 건수</th>
            <th className="c-price">평균 매매가</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={`${r.regionCode}-${r.complex}-${r.rank}`}>
              <td className="c-rank">
                <Rank n={r.rank} />
              </td>
              <td className="c-name">
                <Where r={r} />
              </td>
              <td className="c-price">{r.count}건</td>
              <td className="c-price">{fmtManwon(r.avgPriceManwon)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** 순위표 하나를 부산·울산 두 덩이로 나눠 그립니다. */
function Section({
  id,
  title,
  note,
  render,
}: {
  id: string;
  title: string;
  note: string;
  render: (group: Group) => React.ReactNode;
}) {
  return (
    <section className="block" id={id}>
      <h2 className="brief-h2">{title}</h2>
      <p className="chart-basis-note">{note}</p>
      {(["부산", "울산"] as const).map((g) => (
        <div className="rank-group" key={g}>
          <h3 className="rank-group-title">{g}</h3>
          {render(g)}
        </div>
      ))}
    </section>
  );
}

export default async function RankPage() {
  let data: Ranking;
  try {
    data = await getRanking(MONTHS);
  } catch {
    data = { from: "", to: "", records: [], kukpyeong: [], pyeong: [], volume: [] };
  }

  const period = data.from && data.to ? `${md(data.from)} ~ ${md(data.to)}` : `최근 ${MONTHS}개월`;
  const empty =
    data.records.length + data.kukpyeong.length + data.pyeong.length + data.volume.length === 0;

  return (
    <div className="wrap">
      <SiteHeader current="rank" />

      <article className="block">
        <h1 className="guide-title">부산 · 울산 아파트 순위</h1>
        <p className="guide-meta">
          최근 {MONTHS}개월 ({period}) 계약분 · 국토교통부 실거래가 기준
        </p>
        <p className="guide-summary">
          최근 {MONTHS}개월 동안 부산·울산에서 신고된 아파트 매매를 네 가지 기준으로 줄 세웠습니다.
          신고가를 가장 많이 경신한 단지, 국민평형(전용 84㎡) 최고가, 평당가, 거래량 순입니다. 순위표는
          한 단지가 여러 번 오르지 않도록 <strong>단지마다 한 건씩만</strong> 넣었습니다.
        </p>

        {empty && (
          <p className="empty-note">
            순위를 불러오지 못했습니다. 잠시 후 다시 확인해 주세요.
          </p>
        )}

        <nav className="rank-nav">
          <a href="#records">신고가</a>
          <a href="#kukpyeong">국평 최고가</a>
          <a href="#pyeong">평당가</a>
          <a href="#volume">거래량</a>
        </nav>
      </article>

      <Section
        id="records"
        title="신고가 많이 오른 단지 TOP 20"
        note="그 단지 같은 평형에서 이전까지 나온 가장 비싼 값을 넘어선 거래입니다. 종전 최고가보다 많이 오른 순으로 줄 세웠습니다."
        render={(g) => <RecordTable rows={byGroup(data.records, g)} />}
      />

      <Section
        id="kukpyeong"
        title="국민평형(전용 83~86㎡) 최고가 TOP 20"
        note="가장 흔한 평형이라 단지끼리 값을 비교하기 좋습니다. 대형 평형이 섞이면 비교가 안 되기 때문에 따로 뽑았습니다."
        render={(g) => <PriceTable rows={byGroup(data.kukpyeong, g)} mode="price" />}
      />

      <Section
        id="pyeong"
        title="평당가 TOP 20"
        note="거래금액을 평수로 나눈 값입니다(1평 = 3.3058㎡). 평형이 다른 단지끼리 비싼 정도를 견줄 때 씁니다."
        render={(g) => <PriceTable rows={byGroup(data.pyeong, g)} mode="pyeong" />}
      />

      <Section
        id="volume"
        title="거래량 TOP 20"
        note="매매가 가장 많이 신고된 단지입니다. 세대수가 많은 대단지가 위로 올라오는 편입니다."
        render={(g) => <VolumeTable rows={byGroup(data.volume, g)} />}
      />

      <article className="block">
        <p className="section-note">
          이 순위의 모든 숫자는 국토교통부 실거래가 공개시스템에 신고된 자료입니다.{" "}
          <strong>계약일 기준</strong>이며, 해제(취소)된 거래는 제외했습니다. 아파트 매매는 계약 후 30일
          이내에 신고하면 되기 때문에 최근 며칠치는 아직 반영되지 않았을 수 있습니다. 실거래가를 읽는
          방법은 <Link href="/guide/how-to-read-real-transaction-data">실거래가 읽는 법</Link>에 정리해
          두었습니다.
        </p>
        <p className="section-note">
          <Link href="/daily">오늘의 실거래 브리핑</Link>
          {" · "}
          <Link href="/apt">지역·단지별 실거래가</Link>
          {" · "}
          <Link href="/compare">단지 비교하기</Link>
        </p>
      </article>
    </div>
  );
}
