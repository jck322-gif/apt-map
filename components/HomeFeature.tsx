import Link from "next/link";
import { REPORTS } from "@/lib/reports";

/**
 * 홈(매매·전세·월세) 화면 가운데에 끼우는 "이번 주 리포트" 카드와 바로가기.
 *
 * 서버에서 그려서 Dashboard(브라우저 컴포넌트)에 끼워 넣기 때문에, 리포트 본문 같은 큰 자료가
 * 브라우저로 내려가지 않고 제목·요약만 HTML에 들어갑니다. 새 리포트를 lib/reports.ts 맨 위에
 * 추가하면 여기도 자동으로 바뀝니다.
 */
export default function HomeFeature() {
  const latest = REPORTS[0];
  return (
    <section className="block home-feature" aria-label="주간 리포트와 바로가기">
      {latest && (
        <Link href={`/report/${latest.slug}`} className="home-report-card">
          <span className="home-report-tag">이번 주 리포트 · {latest.period}</span>
          <strong className="home-report-title">{latest.title}</strong>
          <span className="home-report-summary">{latest.summary}</span>
          <span className="home-report-more">리포트 읽기 →</span>
        </Link>
      )}
      <nav className="home-shortcuts" aria-label="바로가기">
        <Link href="/insight/weekly-records">
          <strong>이번 주 신고가</strong>
          <span>매일 자동 집계</span>
        </Link>
        <Link href="/calc/acquisition-tax">
          <strong>취득세 계산기</strong>
          <span>생애최초 감면까지</span>
        </Link>
        <Link href="/calc/loan">
          <strong>대출 한도 계산</strong>
          <span>부산·울산 LTV·DSR</span>
        </Link>
        <Link href="/report">
          <strong>리포트 전체</strong>
          <span>매주 월요일 발행</span>
        </Link>
      </nav>
    </section>
  );
}
