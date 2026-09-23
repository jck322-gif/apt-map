import Link from "next/link";
import { INSIGHT_PAGES } from "@/lib/insightPages";

/** 분석 페이지 아래 "다른 분석 보기" 링크 */
export default function InsightNav({ current }: { current: string }) {
  const others = INSIGHT_PAGES.filter((p) => p.slug !== current);
  return (
    <section className="brief-section">
      <h2 className="brief-h2">다른 분석 보기</h2>
      <ul className="nearby-list">
        {others.map((p) => (
          <li key={p.slug}>
            <Link href={`/insight/${p.slug}`}>{p.title}</Link>
          </li>
        ))}
        <li>
          <Link href="/rank">최근 3개월 신고가·평당가·거래량 랭킹</Link>
        </li>
      </ul>
      <p className="section-note">
        모든 숫자는 국토교통부 실거래가 공개시스템 자료를 그대로 계산한 것이며, 투자 판단을 권유하는 정보가
        아닙니다.
      </p>
    </section>
  );
}
