import type { Metadata } from "next";
import { redirect } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import AccountPanel from "@/components/AccountPanel";
import AccountSetup from "@/components/AccountSetup";
import { getCurrentUser } from "@/lib/auth";
import { SITE_NAME } from "@/lib/site";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: `내 알림 설정 | ${SITE_NAME}`, robots: { index: false, follow: false } };

const VERIFY_MSG: Record<string, string> = {
  ok: "이메일 확인이 끝났어요. 이제 관심 단지 알림을 받을 수 있어요.",
  expired: "확인 링크가 만료됐거나 이미 사용됐어요. 아래에서 다시 보내 주세요.",
  taken: "그 이메일은 이미 다른 계정에서 쓰고 있어요.",
};

export default async function AccountPage({ searchParams }: { searchParams: { welcome?: string; verify?: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/account");
  const via = [user.password_hash ? "이메일" : null, user.google_sub ? "구글" : null, user.kakao_id ? "카카오" : null]
    .filter(Boolean)
    .join(" · ");
  const vmsg = searchParams?.verify ? VERIFY_MSG[searchParams.verify] : null;
  return (
    <div className="wrap">
      <SiteHeader />
      <article className="block">
        <h1 className="guide-title">내 알림 설정</h1>
        {searchParams?.welcome && <p className="acct-welcome">환영해요! 관심 단지를 담으면 신고가·새 실거래를 메일로 알려드려요.</p>}
        {vmsg && <p className="acct-welcome">{vmsg}</p>}
        <AccountSetup needConsent={!user.terms_agreed_at} email={user.email} emailVerified={user.email_verified} />
        <AccountPanel
          email={user.email ?? user.display_name ?? "회원"}
          via={via}
          emailPaused={user.email_paused}
          marketing={user.marketing_opt_in}
        />
      </article>
    </div>
  );
}
