import type { Metadata } from "next";
import Link from "next/link";
import { SITE_NAME, SITE_URL, CONTACT_EMAIL, TERMS_EFFECTIVE_DATE } from "@/lib/site";

export const metadata: Metadata = {
  alternates: { canonical: "/terms" },
  title: `이용약관 | ${SITE_NAME}`,
  description: `${SITE_NAME} 이용약관 — 정보의 성격과 한계, 이용자가 지켜야 할 사항, 저작권과 책임의 범위를 안내합니다.`,
};

export default function TermsPage() {
  return (
    <div className="wrap static-page">
      <Link href="/" className="back-link">
        ← 홈으로
      </Link>
      <h1>이용약관</h1>
      <p className="muted-small">시행일 {TERMS_EFFECTIVE_DATE}</p>

      <section>
        <h2>제1조 (목적)</h2>
        <p>
          이 약관은 {SITE_NAME}({SITE_URL}, 이하 &quot;사이트&quot;)가 제공하는 부산·울산 아파트 실거래가 정보 서비스를
          이용하는 데 필요한 사항을 정합니다. 사이트를 이용하시면 이 약관에 동의한 것으로 봅니다.
        </p>
      </section>

      <section>
        <h2>제2조 (서비스의 내용)</h2>
        <p>
          사이트는 국토교통부가 공개하는 아파트 매매·전월세 실거래 자료를 정리해 보여주고, 이를 바탕으로 한 통계·해설·
          주간 리포트·부동산 상식 글과 청약·재개발 정리 자료를 무료로 제공합니다. 회원가입 없이 누구나 이용할 수
          있습니다. 관심 단지 저장 기능은 이용자의 브라우저에만 저장되며 사이트 서버로 전송되지 않습니다.
        </p>
      </section>

      <section>
        <h2>제3조 (정보의 성격과 한계)</h2>
        <ul>
          <li>사이트의 모든 정보는 참고용이며, 매수·매도·임대차·투자를 권유하거나 가격을 보장하지 않습니다.</li>
          <li>
            실거래 자료는 신고 시점의 차이, 해제(취소), 원자료 오류 등으로 실제와 다를 수 있습니다. 중요한 결정 전에는
            국토교통부 실거래가 공개시스템, 등기부등본, 공인중개사 등을 통해 반드시 다시 확인해 주세요.
          </li>
          <li>
            청약·재개발 정보는 공고와 보도를 운영자가 정리한 것으로, 일정과 내용이 바뀔 수 있습니다. 최종 기준은 청약홈과
            해당 기관·조합의 공식 공고입니다.
          </li>
          <li>리포트와 해설의 해석은 운영자의 의견이며, 사실과 추정을 구분해 적도록 노력합니다.</li>
        </ul>
      </section>

      <section>
        <h2>제4조 (책임의 범위)</h2>
        <p>
          사이트는 정확한 정보를 제공하려고 노력하지만, 이용자가 사이트의 정보를 바탕으로 한 판단이나 거래로 입은
          손해에 대해서는 사이트에 고의 또는 중대한 과실이 없는 한 책임을 지지 않습니다. 원자료 제공 기관의 사정,
          서버·통신 장애 등으로 서비스가 일시 중단될 수 있습니다.
        </p>
      </section>

      <section>
        <h2>제5조 (저작권과 이용 방법)</h2>
        <ul>
          <li>실거래가 원자료는 국토교통부의 공공데이터이며, 공공데이터 이용 조건을 따릅니다.</li>
          <li>
            사이트가 직접 만든 글(리포트·상식·해설), 그래프, 이미지, 화면 구성의 저작권은 {SITE_NAME}에 있습니다.
            출처(&quot;{SITE_NAME}&quot;와 해당 페이지 링크)를 밝히면 일부를 인용하거나 공유할 수 있으나, 전체를 복제하거나
            상업적으로 재배포하려면 미리 문의해 주세요.
          </li>
          <li>
            자동화된 프로그램으로 사이트를 대량으로 수집하거나 서버에 과도한 부하를 주는 행위, 사이트의 정보를
            조작하거나 다른 사람을 속이는 데 쓰는 행위는 금지합니다.
          </li>
        </ul>
      </section>

      <section>
        <h2>제6조 (광고와 외부 링크)</h2>
        <p>
          사이트에는 광고와 외부 사이트 링크가 포함될 수 있습니다. 광고나 외부 사이트에서 이루어지는 거래와 그 내용은
          해당 광고주·사이트의 책임이며, 광고 여부는 실거래 자료를 보여주는 방식에 영향을 주지 않습니다. 개인정보와
          쿠키에 관한 내용은 <Link href="/privacy">개인정보처리방침</Link>을 따릅니다.
        </p>
      </section>

      <section>
        <h2>제7조 (약관의 변경과 문의)</h2>
        <p>
          약관을 바꿀 때에는 이 페이지에 시행일과 함께 알립니다. 약관이나 서비스에 관한 문의는{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> 또는 <Link href="/contact">문의 페이지</Link>로
          보내 주세요.
        </p>
      </section>
    </div>
  );
}
