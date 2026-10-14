/** 구글·카카오 로그인 버튼 (서버로 이동하는 일반 링크) */
export default function SocialLogin({ next }: { next: string }) {
  const q = `?next=${encodeURIComponent(next)}`;
  return (
    <div className="social-login">
      <a className="social-btn social-kakao" href={`/api/auth/oauth/kakao${q}`}>
        <span aria-hidden="true" className="social-ico">💬</span> 카카오로 계속하기
      </a>
      <a className="social-btn social-google" href={`/api/auth/oauth/google${q}`}>
        <span aria-hidden="true" className="social-ico social-g">G</span> 구글로 계속하기
      </a>
    </div>
  );
}
