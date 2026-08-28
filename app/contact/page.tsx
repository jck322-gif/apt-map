import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "문의 | 부울산 아파트 실거래",
  description: "부울산 아파트 실거래 서비스 문의 및 광고 제휴 안내.",
};

// TODO: 아래 CONTACT_EMAIL을 실제로 사용하실 문의용 이메일 주소로 바꿔주세요.
const CONTACT_EMAIL = "jck322@gmail.com";

export default function ContactPage() {
  return (
    <div className="wrap static-page">
      <Link href="/" className="back-link">
        ← 홈으로
      </Link>
      <h1>문의</h1>

      <section>
        <h2>서비스 문의</h2>
        <p>
          데이터 오류 신고, 기능 제안, 기타 궁금한 점이 있으시면 아래 이메일로 편하게 연락주세요.
          가능한 빠르게 확인 후 답변드리겠습니다.
        </p>
        <p className="contact-email">
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        </p>
      </section>

      <section>
        <h2>광고 · 제휴 문의</h2>
        <p>
          광고 게재나 제휴를 원하시는 경우에도 위 이메일로 문의해주세요. 제목에 &quot;광고문의&quot;를
          붙여주시면 확인에 도움이 됩니다.
        </p>
      </section>

      <section>
        <h2>데이터 관련 안내</h2>
        <p>
          이 사이트의 실거래가 데이터는 국토교통부 공공데이터포털에서 제공하는 자료를 그대로
          가져와 보여드립니다. 특정 거래 건에 대한 문의는 국토교통부 실거래가 공개시스템
          (rt.molit.go.kr)에서도 함께 확인하실 수 있습니다.
        </p>
      </section>

      <p className="empty-note" style={{ padding: "10px 0 0" }}>
        더 궁금하신 점은{" "}
        <Link href="/about">사이트 소개</Link> 또는 <Link href="/privacy">개인정보처리방침</Link>
        페이지도 참고해주세요.
      </p>
    </div>
  );
}
