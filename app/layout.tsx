import type { Metadata } from "next";
import { SITE_NAME, SITE_TAGLINE, SITE_URL, ADSENSE_CLIENT } from "@/lib/site";
import "./globals.css";

const TITLE = `${SITE_NAME} — ${SITE_TAGLINE}`;
const DESCRIPTION =
  "부산 16개 구·군, 울산 5개 구·군의 아파트 매매·전세·월세 실거래가를 국토교통부 자료로 매일 확인하세요. 오늘의 실거래, 단지별 가격 추이, 지역 지도를 제공합니다.";

export const metadata: Metadata = {
  // 각 페이지의 주소를 절대 주소로 만들 때 기준이 됩니다 (공유 미리보기·검색엔진용)
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  keywords: ["부산 아파트 실거래가", "울산 아파트 실거래가", "부산 집값", "울산 집값", "아파트 시세"],
  openGraph: {
    title: TITLE,
    description: "부산·울산 아파트 매매·전세·월세 실거래가를 국토교통부 자료로 매일 확인하세요.",
    type: "website",
    locale: "ko_KR",
    url: SITE_URL,
    siteName: SITE_NAME,
  },
  robots: { index: true, follow: true },
  // Google Search Console 소유권 확인용 값입니다. 비밀번호가 아니라 공개되어도 되는 값이며,
  // 이 값이 사라지면 소유권 확인이 풀리므로 지우지 마세요.
  verification: {
    google: "3pKYt4r2Bf7NyDUswSzEzhIWCh3ypFsvABPzRau8WCA",
    // 네이버 서치어드바이저 소유확인. 네이버는 1년마다 재인증이 필요하니 내년에 한 번 더 받아야 합니다.
    other: { "naver-site-verification": "cff243ffb55da0672ad284d5b2b80beaa235da2b" },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@700&family=Noto+Sans+KR:wght@400;500;700&family=IBM+Plex+Mono:wght@400;600;700&display=swap"
        />
        {/*
          구글 애드센스 — lib/site.ts의 ADSENSE_CLIENT에 게시자 ID를 넣으면 켜집니다.
          심사 단계에서는 이 한 줄만 있으면 되고, 광고 위치 지정은 승인 후에 따로 합니다.
        */}
        {ADSENSE_CLIENT && (
          <script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
            crossOrigin="anonymous"
          />
        )}
      </head>
      <body>{children}</body>
    </html>
  );
}
