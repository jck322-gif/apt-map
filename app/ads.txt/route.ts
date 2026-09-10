import { ADSENSE_CLIENT } from "@/lib/site";

/**
 * /ads.txt — "이 사이트의 광고는 누가 팔 수 있는가"를 선언하는 파일.
 *
 * 광고 업계 표준입니다. 이 파일이 없으면 다른 사람이 우리 사이트 이름을 도용해
 * 가짜 광고 자리를 팔 수 있고, 광고주들은 그게 무서워서 ads.txt 없는 사이트에
 * 입찰을 잘 넣지 않습니다. 즉 없어도 승인은 되지만 단가가 깎입니다.
 *
 * 한 줄의 뜻:
 *   google.com        — 광고를 파는 회사 (구글)
 *   pub-XXXXXXXX      — 정찬교님의 애드센스 게시자 ID
 *   DIRECT            — 중간 업체 없이 구글과 직접 계약했다는 표시
 *   f08c47fec0942fa0  — 구글의 고정 인증번호. 모든 애드센스 사이트가 같은 값을 씁니다
 *
 * 여기 들어가는 값은 전부 공개되어도 되는 값입니다. 비밀번호가 아닙니다.
 * (오히려 누구나 읽을 수 있어야 제 역할을 합니다.)
 */

// 게시자 ID는 "ca-pub-..." 형태로 저장돼 있는데, ads.txt에는 "pub-..." 만 씁니다.
const PUBLISHER_ID = ADSENSE_CLIENT.replace(/^ca-/, "");

export const dynamic = "force-static";
export const revalidate = 86400;

export function GET(): Response {
  const body = ADSENSE_CLIENT
    ? `google.com, ${PUBLISHER_ID}, DIRECT, f08c47fec0942fa0\n`
    : "";

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
