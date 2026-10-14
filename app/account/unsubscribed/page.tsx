import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = { title: `알림 수신 거부 | ${SITE_NAME}`, robots: { index: false, follow: false } };

export default function Unsubscribed() {
  return (
    <div className="wrap">
      <SiteHeader />
      <article className="block">
        <h1 className="guide-title">알림 메일을 멈췄어요</h1>
        <p className="guide-summary">
          이제 관심 단지 알림 메일이 가지 않습니다. 다시 받으려면 로그인 후 <Link href="/account">알림 설정</Link>에서 켜 주세요.
          계정과 관심 단지를 완전히 지우려면 알림 설정 페이지 맨 아래 「회원 탈퇴」를 누르면 됩니다.
        </p>
      </article>
    </div>
  );
}
