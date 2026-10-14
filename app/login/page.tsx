import type { Metadata } from "next";
import { redirect } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import AuthForm from "@/components/AuthForm";
import SocialLogin from "@/components/SocialLogin";
import { getCurrentUser, safeNextPath } from "@/lib/auth";
import { SITE_NAME } from "@/lib/site";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: `로그인 | ${SITE_NAME}`,
  description: "로그인하고 관심 단지 신고가·실거래 알림을 이메일로 받아보세요.",
  robots: { index: false, follow: true },
};

const ERRORS: Record<string, string> = {
  oauth: "구글·카카오 로그인 중 문제가 생겼어요. 다시 시도해 주세요.",
  oauth_unavailable: "이 로그인 방법은 아직 준비 중이에요. 이메일로 로그인해 주세요.",
};

export default async function LoginPage({ searchParams }: { searchParams: { next?: string; error?: string } }) {
  const next = safeNextPath(searchParams?.next);
  if (await getCurrentUser()) redirect(next);
  const err = searchParams?.error ? ERRORS[searchParams.error] : null;
  return (
    <div className="wrap">
      <SiteHeader />
      <article className="block login-page">
        <h1 className="guide-title">로그인</h1>
        <p className="guide-summary">
          로그인하면 관심 단지에 <strong>신고가</strong>나 <strong>새 매매 실거래</strong>가 신고될 때 다음 날 아침 이메일로
          알려드려요. 무료예요.
        </p>
        {err && <p className="login-error">{err}</p>}
        <SocialLogin next={next} />
        <p className="login-or">또는 아이디(이메일)로 로그인</p>
        <AuthForm mode="login" next={next} />
      </article>
    </div>
  );
}
