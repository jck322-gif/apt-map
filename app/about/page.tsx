import type { Metadata } from "next";
import Link from "next/link";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/site";

export const metadata: Metadata = {
  title: `사이트 소개 | ${SITE_NAME}`,
  description: `${SITE_NAME} 서비스 소개 — 어떤 데이터를 어떻게 보여주는지 안내합니다.`,
};

export default function AboutPage() {
  return (
    <div className="wrap static-page">
      <Link href="/" className="back-link">
        ← 홈으로
      </Link>
      <h1>사이트 소개</h1>

      <section>
        <h2>{SITE_NAME}이란?</h2>
        <p>
          {SITE_NAME}({SITE_TAGLINE})은 부산광역시 16개 구·군과 울산광역시 5개 구·군의 아파트
          매매·전세·월세 실거래가 정보를 한눈에 볼 수 있도록 만든 무료 정보 서비스입니다. 지역별
          거래 현황과 가격 흐름을 쉽고 빠르게 확인할 수 있도록 하는 것을 목표로 합니다.
        </p>
      </section>

      <section>
        <h2>데이터 출처</h2>
        <p>
          이 사이트에 표시되는 모든 실거래가 데이터는 국토교통부가 운영하는 공공데이터포털
          (data.go.kr)의 &quot;아파트 매매 실거래 자료&quot;, &quot;아파트 전월세 실거래가 자료&quot;
          오픈API를 통해 실시간으로 받아옵니다. 사이트 운영자가 임의로 가격을 입력하거나 수정하지
          않으며, 국토교통부에 신고된 원본 자료를 그대로 보여드립니다.
        </p>
        <p>
          다만 국토교통부 실거래 신고 제도상 계약 후 최대 30일 이내에 신고하면 되기 때문에, 실제
          계약일과 이 사이트에 데이터가 반영되는 시점 사이에 차이가 있을 수 있습니다. 또한 지도에
          표시되는 지역 위치는 구 중심 부근의 참고 좌표로, 실제 행정구역 경계와 다를 수 있습니다.
        </p>
      </section>

      <section>
        <h2>이런 기능을 제공합니다</h2>
        <p>
          매매·전세·월세 탭 전환, 오늘 / 지난 7일 실거래 모아보기, 부산·울산 지도에서 지역별 거래량과
          등락 확인, 구 → 동 → 단지 순서의 상세 탐색, 단지명·동 이름 검색, 가격순·최신순 정렬,
          단지별 최근 6개월 가격 추이 그래프와 3년 최고·최저가, 직전 거래 대비 등락, 전세 갭 정보
          등을 제공합니다. 계속해서 기능을 보완해 나가고 있습니다.
        </p>
      </section>

      <section>
        <h2>운영 안내</h2>
        <p>
          이 사이트는 개인이 운영하는 비영리 정보 서비스이며, 특정 부동산 거래를 중개하거나
          투자를 권유하지 않습니다. 실제 거래나 투자 판단은 반드시 공인중개사, 금융기관 등 전문가와
          상담 후 신중하게 결정하시기 바랍니다. 문의사항은{" "}
          <Link href="/contact">문의 페이지</Link>를 이용해주세요.
        </p>
      </section>
    </div>
  );
}
