import type { Metadata } from "next";
import Link from "next/link";
import { SITE_NAME, CONTACT_EMAIL, PRIVACY_EFFECTIVE_DATE } from "@/lib/site";

export const metadata: Metadata = {
  alternates: { canonical: "/privacy" },
  title: `개인정보처리방침 | ${SITE_NAME}`,
  description: `${SITE_NAME} 서비스의 개인정보처리방침 및 쿠키·광고 이용 안내.`,
};

export default function PrivacyPage() {
  return (
    <div className="wrap static-page">
      <Link href="/" className="back-link">
        ← 홈으로
      </Link>
      <h1>개인정보처리방침</h1>
      <p className="empty-note" style={{ padding: "0 0 8px" }}>
        시행일자: {PRIVACY_EFFECTIVE_DATE}
      </p>

      <section>
        <h2>1. 수집하는 개인정보 항목 및 목적</h2>
        <p>
          {SITE_NAME}(이하 &quot;사이트&quot;)는 실거래가 조회 등 대부분의 기능을 회원가입 없이 제공합니다. 다만 이용자가
          선택적으로 <strong>회원가입·로그인</strong>(아이디·비밀번호 또는 카카오·구글 계정)을 하고 <strong>관심 단지 알림</strong>을 이용하는 경우 아래 정보를 수집·이용합니다.
        </p>
        <ul>
          <li>
            <strong>아이디(이메일)로 가입:</strong> 이메일 주소, 비밀번호(복원할 수 없는 방식으로 암호화해 저장) — 회원 식별,
            로그인, 관심 단지 알림 메일 발송
          </li>
          <li>
            <strong>카카오·구글로 로그인:</strong> 해당 회사가 제공하는 회원 식별번호, 이메일 주소(제공에 동의한 경우),
            이름 또는 닉네임 — 회원 식별, 로그인, 알림 메일 발송. 비밀번호는 받지 않습니다.
          </li>
          <li>
            <strong>서비스 이용 과정에서 생성:</strong> 관심 단지 목록과 알림 설정, 로그인 시각·로그인 시도 기록(보안 목적),
            알림 발송 기록, 로그인 유지용 쿠키(세션 식별값)
          </li>
          <li>
            <strong>선택:</strong> 광고성 정보 수신 동의 여부 — 동의한 경우에만 새 리포트·서비스 소식 등을 보낼 수 있으며,
            동의하지 않아도 알림 기능은 그대로 이용할 수 있습니다.
          </li>
        </ul>
        <p>
          또한 이용자가 문의 페이지의 이메일 주소로 직접 연락하는 경우, 이용자가 자발적으로 제공한 이메일 주소와 문의
          내용이 문의 응대 목적으로만 이용됩니다. 만 14세 미만은 관심 단지 알림에 가입할 수 없습니다.
        </p>
      </section>

      <section>
        <h2>2. 개인정보의 보유 및 이용 기간</h2>
        <p>
          관심 단지 알림 정보(이메일·관심 단지·설정)는 <strong>회원 탈퇴 시 지체 없이 삭제</strong>합니다. 알림 설정 화면의
          「회원 탈퇴」로 언제든 직접 지울 수 있습니다. 이메일 확인·비밀번호 재설정 링크와 로그인 시도 기록은 보안 목적으로 짧게 보관 후 삭제하며, 1년 이상
          로그인하지 않은 계정은 미리 안내한 뒤 삭제할 수 있습니다. 문의 메일은 응대 완료 후 합리적인 기간 내에 파기하며,
          관계 법령에 따라 보존이 필요한 경우 해당 기간 동안 보관합니다.
        </p>
      </section>

      <section>
        <h2>2-1. 개인정보 처리 위탁</h2>
        <p>
          사이트는 서비스 운영을 위해 아래 업체에 개인정보 처리를 맡깁니다. 위탁 업체는 맡은 업무 외 목적으로 정보를 쓰지
          않습니다.
        </p>
        <ul>
          <li>Supabase Inc. — 회원·관심 단지 정보 저장(데이터베이스)</li>
          <li>Resend (Plus Five Five Inc.) — 로그인·알림 메일 발송</li>
          <li>Vercel Inc. — 웹사이트 호스팅</li>
        </ul>
        <p>위 업체의 서버는 국외(미국 등)에 있을 수 있으며, 서비스 이용 시점에 암호화된 통신으로 전송·보관됩니다.</p>
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
          설정(
          <a href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer">
            adssettings.google.com
          </a>
          )에서 맞춤 광고 게재를 비활성화할 수 있습니다. 다만 쿠키 저장을 거부할 경우 일부 서비스
          이용에 어려움이 있을 수 있습니다.
        </p>
        <p>
          Google이 광고에 쿠키를 사용하는 방식은{" "}
          <a href="https://policies.google.com/technologies/ads" target="_blank" rel="noopener noreferrer">
            Google 광고 정책
          </a>
          과{" "}
          <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">
            Google 개인정보처리방침
          </a>
          에서 확인할 수 있습니다. 제3자 광고 공급업체의 맞춤 광고는{" "}
          <a href="https://www.aboutads.info/choices" target="_blank" rel="noopener noreferrer">
            aboutads.info
          </a>
          에서도 거부할 수 있습니다.
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
          이용자는 언제든지 자신이 사이트에 제공한 개인정보(알림용 이메일, 문의 시 남긴 이메일 등)에 대해
          열람·정정·삭제·처리정지를 요청할 수 있습니다. 알림 메일은 메일 하단 「수신 거부」 링크나 알림 설정 화면에서 바로
          멈출 수 있고, 「회원 탈퇴」로 모든 정보를 직접 삭제할 수 있습니다. 아래 문의처로 연락 주시면 지체 없이 조치하겠습니다.
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
