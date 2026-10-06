import type { Metadata } from "next";
import Link from "next/link";
import { SITE_NAME, SITE_TAGLINE, CONTACT_EMAIL, OPERATOR_NAME, ABOUT_UPDATED } from "@/lib/site";
import { GUIDES } from "@/lib/guides";
import { REPORTS } from "@/lib/reports";

export const metadata: Metadata = {
  alternates: { canonical: "/about" },
  title: `사이트 소개·운영자·편집 원칙 | ${SITE_NAME}`,
  description: `${SITE_NAME}를 누가, 어떤 자료로, 어떤 원칙으로 만드는지 안내합니다. 자료 출처와 갱신 주기, 신고가·해제 거래를 세는 기준, 정정 요청 방법을 적어 두었습니다.`,
};

export default function AboutPage() {
  return (
    <div className="wrap static-page">
      <Link href="/" className="back-link">
        ← 홈으로
      </Link>
      <h1>사이트 소개</h1>
      <p className="muted-small">최종 수정 {ABOUT_UPDATED}</p>

      <section>
        <h2>부울아파트는</h2>
        <p>
          {SITE_NAME}({SITE_TAGLINE})는 부산광역시 16개 구·군과 울산광역시 5개 구·군의 아파트 매매·전세·월세
          실거래가를 한곳에서 보고, 그 숫자가 무슨 뜻인지까지 읽을 수 있게 만든 무료 정보 사이트입니다. 전국 단위
          서비스에서는 부산·울산이 여러 지역 중 하나로 묻히기 쉬워서, 이 두 도시만 깊게 다루는 것을 목표로 합니다.
        </p>
        <p>
          실거래 표만 늘어놓지 않고, 단지마다 가격 흐름과 거래량을 풀어 쓴 해설, 구·군별 거래 요약, 매주 사람이
          직접 쓰는 <Link href="/report">주간 리포트</Link>({REPORTS.length}편), 실거래 자료를 읽는 데 필요한{" "}
          <Link href="/guide">부동산 상식</Link>({GUIDES.length}편)을 함께 싣습니다.
        </p>
      </section>

      <section>
        <h2>운영자</h2>
        <p>
          {SITE_NAME}는 부산·울산에 사는 개인 운영자 <strong>{OPERATOR_NAME}</strong>가 만들고 운영합니다. 흩어져 있는
          부산·울산 실거래 자료를 한 화면에서 보고, 숫자에 해석까지 붙여 보자는 생각으로 만들었습니다. 자료를 모으는
          프로그램과 화면은 운영자가 직접 만들고 고치며, 주간 리포트와 상식 글도 운영자가 씁니다.
        </p>
        <p>
          운영자는 공인중개사나 투자 전문가가 아닙니다. 같은 지역에 사는 실수요자의 눈으로 국토교통부 실거래 자료를
          정리하고 해설합니다.
        </p>
        <ul>
          <li>
            연락처: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
          </li>
          <li>문의·정정 요청: <Link href="/contact">문의 페이지</Link></li>
        </ul>
        <p>
          {SITE_NAME}는 부동산 중개업소가 아니며, 매물을 알선하거나 특정 지역·단지에 대한 투자를 권유하지 않습니다.
        </p>
      </section>

      <section>
        <h2>자료 출처와 갱신 주기</h2>
        <ul>
          <li>
            <strong>실거래가</strong> — 국토교통부 공공데이터포털(data.go.kr)의 &quot;아파트 매매 실거래 상세 자료&quot;,
            &quot;아파트 전월세 실거래가 자료&quot;. 매일 새벽 5시 무렵 자동으로 새 신고분을 받아 반영합니다. 운영자가
            가격을 손으로 입력하거나 고치지 않습니다.
          </li>
          <li>
            <strong>반영 시차</strong> — 실거래는 계약 후 30일 안에만 신고하면 되기 때문에, 계약일과 사이트에 보이는
            날 사이에 보통 며칠에서 한 달의 차이가 있습니다. 공휴일·연휴에는 신고 처리가 멈춰 그 기간 신고분이 비어
            있을 수 있습니다.
          </li>
          <li>
            <strong>청약·재개발</strong> — 청약홈과 각 구청·조합 공고, 언론 보도를 운영자가 확인해 손으로 정리합니다.
            공식 공고가 아닌 자료(보도·SNS)는 화면에 그렇게 표시하고, 확인한 날짜를 함께 적습니다.
          </li>
          <li>
            <strong>지도 위치</strong> — 구·동 중심 부근의 참고 좌표로, 실제 행정구역 경계와 다를 수 있습니다.
          </li>
        </ul>
      </section>

      <section id="editorial">
        <h2>편집 원칙 — 숫자를 이렇게 셉니다</h2>
        <ul>
          <li>
            <strong>날짜</strong> — 가격 흐름·거래량은 계약일 기준입니다. &quot;오늘의 실거래&quot;처럼 새로 올라온 거래를
            보여주는 화면만 신고(공개)일 기준이며, 두 날짜를 함께 적습니다.
          </li>
          <li>
            <strong>해제(취소) 거래</strong> — 나중에 해제된 거래는 목록에는 &quot;해제&quot; 표시와 함께 남기지만, 최고가·
            최저가·중간값·신고가·거래량 계산에서는 모두 뺍니다.
          </li>
          <li>
            <strong>신고가</strong> — 같은 단지, 같은 평형(전용면적 반올림 기준)의 최근 3년 거래 중 가장 높은 값을 넘은
            매매입니다. 직전 최고가가 1년 반 넘게 지난 거래라 오른 폭이 부풀어 보일 수 있으면 &quot;오랜만의 거래&quot;로
            따로 표시하고 요약에서 뺍니다.
          </li>
          <li>
            <strong>평형 비교</strong> — 직전 거래·최고가·최저가는 같은 평형끼리만 비교합니다. 평형이 다른 거래와
            견주어 &quot;올랐다·내렸다&quot;고 쓰지 않습니다.
          </li>
          <li>
            <strong>거래량 비교</strong> — 이번 달은 아직 신고가 덜 들어와 있으므로, 끝난 달끼리만 비교합니다.
          </li>
          <li>
            <strong>해석과 사실 구분</strong> — 리포트·해설에서 원인을 추정할 때는 &quot;확인되지 않았다&quot;, &quot;단정할 수
            없다&quot;처럼 추정임을 밝히고, 확인한 사실과 섞어 쓰지 않습니다. 참고한 외부 자료는 글 끝에 출처를 답니다.
          </li>
          <li>
            <strong>거래가 적은 페이지</strong> — 3년 동안 거래가 몇 건 없는 단지·평형 페이지는 열람은 되지만 검색엔진에는
            올리지 않습니다. 한두 건으로는 시세를 말하기 어렵기 때문입니다.
          </li>
        </ul>
      </section>

      <section>
        <h2>정정 요청</h2>
        <p>
          잘못된 숫자, 단지 이름·위치 오류, 오래된 청약·재개발 정보를 발견하시면{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>로 페이지 주소와 함께 알려주세요. 확인되는 대로
          고치고, 글(리포트·상식)에서 내용이 바뀐 경우에는 글의 갱신일을 새로 적습니다. 국토교통부 원자료
          자체의 오류는 원자료가 고쳐지면 다음 날 자동으로 반영됩니다.
        </p>
      </section>

      <section>
        <h2>광고와 운영비</h2>
        <p>
          이용자에게 요금을 받지 않으며, 서버·도메인 등 운영비는 사이트에 게재되는 광고 수익으로 충당할 계획입니다.
          광고는 본문과 구분되게 표시하며, 광고 여부가 실거래 자료를 보여주는 방식이나 글의 내용에 영향을 주지
          않습니다.
        </p>
        <p>
          실거래가는 과거에 체결된 거래 기록일 뿐 앞으로의 가격을 보장하지 않습니다. 실제 거래나 투자 판단은
          공인중개사·금융기관·세무사 등 전문가와 상담한 뒤 결정하시기 바랍니다. 자세한 내용은{" "}
          <Link href="/terms">이용약관</Link>과 <Link href="/privacy">개인정보처리방침</Link>을 참고해 주세요.
        </p>
      </section>
    </div>
  );
}
