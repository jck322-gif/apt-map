import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import ResetForm from "@/components/ResetForm";
import { SITE_NAME } from "@/lib/site";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: `비밀번호 찾기 | ${SITE_NAME}`, robots: { index: false, follow: false } };

export default function ResetPage({ searchParams }: { searchParams: { token?: string } }) {
  const token = typeof searchParams?.token === "string" ? searchParams.token : null;
  return (
    <div className="wrap">
      <SiteHeader />
      <article className="block login-page">
        <h1 className="guide-title">{token ? "새 비밀번호 정하기" : "비밀번호 찾기"}</h1>
        {!token && <p className="guide-summary">가입한 이메일을 넣으면 비밀번호를 다시 정할 수 있는 링크를 보내드려요.</p>}
        <ResetForm token={token} />
      </article>
    </div>
  );
}
