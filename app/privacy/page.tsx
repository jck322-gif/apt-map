import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "개인정보처리방침 | 부울산 아파트 실거래",
  description: "부울산 아파트 실거래 서비스의 개인정보처리방침 및 쿠키·광고 이용 안내.",
};

// TODO: 시행일자와 문의 이메일을 실제 값으로 바꿔주세요 (문의 이메일은 app/contact/page.tsx와 동일하게 맞춰주세요).
const EFFECTIVE_DATE = "2026년 8월 28일";
const CONTACT_EMAIL = "contact@example.com";

export default function PrivacyPage() {
  return (
    <div className="wrap static-page">
      <Link href="/" className="back-link">
        ← 홈으로
      </Link>
      <h1>개인정보처리방침</h1>
      <p className="empty-note" style={{ padding: "0 0 8px" }}>
        시행일자: {EFFECTIVE_DATE}
      </p>

      <section>
        <h2>1. 수집하는 개인정보 항목 및 목적</h2>
        <p>
          부울산 아파트 실거래(이하 &quot;사이트&quot;)는 회원가입이나 로그인 기능을 운영하지
          않으며, 이용자가 별도로 이름·연락처 등을 입력하는 절차가 없습니다. 다만 이용자가 문의
          페이지의 이메일 주소로 직접 연락하는 경우, 그 과정에서 이용자가 자발적으로 제공한 이메일
          주소와 문의 내용이 문의 응대 목적으로만 수집·이용됩니다.
        </p>
      </section>

      <section>
        <h2>2. 개인정보의 보유 및 이용 기간</h2>
        <p>
          문의를 통해 수집된 이메일 및 문의 내용은 문의 응대가 완료된 후 합리적인 기간 내에
          파기하며, 관계 법령에 따라 보존할 필요가 있는 경우 해당 법령에서 정한 기간 동안
          보관합니다.
        </p>
      </section>

      <section>
        <h2>3. 개인정보의 제3자 제공</h2>
        <p>
          사이트는 이용자의 개인정보를 원칙적으로 외부에 제공하지 않습니다. 다만 법령에 근거가
          있거나 수사기관이 적법한 절차에 따라 요청하는 경우는 예외로 합니다.
        </p>
      </section>

      <section>
        <h2>4. 쿠키(Cookie) 및 광고 서비스 이용 안내</h2>
        <p>
          사이트는 이용자에게 맞춤형 서비스를 제공하기 위해 쿠키를 사용할 수 있습니다. 또한 사이트는
          Google AdSense를 비롯한 광고 서비스를 통해 광고를 게재할 수 있으며, Google 등 제3자
          광고 공급업체는 쿠키를 사용하여 이용자의 이전 방문(이 사이트 및 다른 사이트 방문 이력
          포함) 정보를 기반으로 맞춤 광고를 게재할 수 있습니다.
        </p>
        <p>
          이용자는 웹브라우저 설정을 통해 쿠키 저장을 거부하거나 삭제할 수 있으며, Google 광고
          설정(adssettings.google.com)에서 맞춤 광고 게재를 비활성화할 수 있습니다. 다만 쿠키 저장을
          거부할 경우 일부 서비스 이용에 어려움이 있을 수 있습니다.
        </p>
      </section>

      <section>
        <h2>5. 실거래가 데이터의 출처 및 정확성</h2>
        <p>
          사이트에 표시되는 아파트 실거래가 정보는 국토교통부 공공데이터포털(data.go.kr)에서 제공하는
          오픈API 자료를 그대로 가져와 보여드리는 것으로, 사이트 운영자가 임의로 생성하거나 수정한
          정보가 아닙니다. 원본 데이터의 지연·오류로 인한 정보 차이에 대해 사이트는 책임을 지지
          않으며, 정확한 정보는 국토교통부 실거래가 공개시스템(rt.molit.go.kr)에서 다시 확인하시기
          바랍니다.
        </p>
      </section>

      <section>
        <h2>6. 이용자의 권리</h2>
        <p>
          이용자는 언제든지 자신이 사이트에 제공한 개인정보(문의 시 남긴 이메일 등)에 대해
          열람·정정·삭제를 요청할 수 있습니다. 아래 문의처로 연락 주시면 지체 없이 조치하겠습니다.
        </p>
      </section>

      <section>
        <h2>7. 문의처</h2>
        <p>
          개인정보 관련 문의는 아래 이메일로 연락 주세요.
          <br />
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        </p>
      </section>

      <section>
        <h2>8. 개정 안내</h2>
        <p>이 개인정보처리방침은 관련 법령이나 서비스 변경에 따라 수정될 수 있으며, 변경 시 이 페이지를 통해 공지합니다.</p>
      </section>
    </div>
  );
}
