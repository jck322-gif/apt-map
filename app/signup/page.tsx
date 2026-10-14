import type { Metadata } from "next";
import { redirect } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import AuthForm from "@/components/AuthForm";
import SocialLogin from "@/components/SocialLogin";
import { getCurrentUser, safeNextPath } from "@/lib/auth";
import { SITE_NAME } from "@/lib/site";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: `회원가입 | ${SITE_NAME}`, robots: { index: false, follow: true } };

export default async function SignupPage({ searchParams }: { searchParams: { next?: string } }) {
  const next = safeNextPath(searchParams?.next);
  if (await getCurrentUser()) redirect(next);
  return (
    <div className="wrap">
      <SiteHeader />
      <article className="block login-page">
        <h1 className="guide-title">회원가입</h1>
        <p className="guide-summary">카카오·구글 계정으로 바로 시작하거나, 이메일을 아이디로 가입할 수 있어요.</p>
        <SocialLogin next={next} />
        <p className="login-or">또는 아이디(이메일)로 가입</p>
        <AuthForm mode="signup" next={next} />
      </article>
    </div>
  );
}
