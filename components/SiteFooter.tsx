import Link from "next/link";
import { SITE_NAME, CONTACT_EMAIL } from "@/lib/site";

/**
 * 모든 페이지 맨 아래에 붙는 공통 바닥글 (app/layout.tsx에서 한 번만 넣습니다).
 * 누가 운영하는지, 자료가 어디서 오는지, 약관·개인정보처리방침이 어디 있는지를
 * 어느 페이지에서든 바로 찾을 수 있게 합니다.
 */
export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <nav className="site-footer-links" aria-label="사이트 정보">
          <Link href="/about">사이트 소개·운영자</Link>
          <Link href="/about#editorial">편집 원칙</Link>
          <Link href="/report">주간 리포트</Link>
          <Link href="/terms">이용약관</Link>
          <Link href="/privacy">
            <strong>개인정보처리방침</strong>
          </Link>
          <Link href="/contact">문의·정정 요청</Link>
        </nav>
        <p>
          자료 출처: 국토교통부 아파트 매매·전월세 실거래 자료(공공데이터포털), 매일 새벽 갱신. 실거래는 계약 후 30일
          안에 신고되므로 최근 거래는 늦게 반영될 수 있으며, 해제된 거래는 가격 계산에서 뺍니다.
        </p>
        <p>
          {SITE_NAME}는 개인이 운영하는 정보 사이트로 중개·투자 권유를 하지 않습니다. 문의{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        </p>
        <p className="site-footer-copy">© {new Date().getFullYear()} {SITE_NAME}</p>
      </div>
    </footer>
  );
}
