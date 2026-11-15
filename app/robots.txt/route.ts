import { SITE_URL } from "@/lib/site";

/**
 * 검색엔진 안내 파일 (/robots.txt).
 * 어떤 페이지를 긁어가도 되는지, 사이트맵이 어디 있는지 알려줍니다.
 *
 * 예전에는 app/robots.ts(Next.js 기본 방식)로 만들었는데, 그 방식은 주석 줄을 넣을 수 없어서
 * 다음(Daum) 웹마스터도구 인증 문구를 넣으려고 직접 글자로 내보내는 방식으로 바꿨습니다.
 *
 * /api/ 는 사람이 보는 페이지가 아니라 자료를 주고받는 통로라서 색인에서 제외합니다.
 * (특히 /api/sync 는 비밀 열쇠가 붙는 주소라 검색에 노출되면 안 됩니다.)
 */

// 다음 웹마스터도구 사이트 소유 확인 문구 — 지우면 다음 인증이 풀립니다.
const DAUM_VERIFY = "#DaumWebMasterTool:cb63416ca32a1a8275fe041ad5c78d3b67bc4005f82c7b55aa42d669736e0d29:u1KY4V8+6gddZ3NiGzwUZw==";

const DISALLOW = ["/api/", "/share", "/account", "/login", "/signup", "/reset"];

// 사이트 전체를 막는 수집봇 — 검색 노출과 상관없이 서버 계산만 잡아먹는 봇들입니다.
// (구글·네이버·다음·빙 검색 로봇은 여기에 넣지 않습니다. Google-Extended 는 구글 검색이 아니라 AI 학습용 표시라 막아도 검색에는 영향 없음)
// robots.txt 는 "지켜 주는" 봇에게만 통하므로, 무시하는 봇은 Vercel 방화벽에서 따로 막습니다.
const BLOCKED_BOTS = [
  // AI 학습·수집
  "GPTBot", "ChatGPT-User", "OAI-SearchBot", "ClaudeBot", "Claude-Web", "anthropic-ai", "CCBot",
  "Google-Extended", "PerplexityBot", "Bytespider", "Amazonbot", "meta-externalagent", "FacebookBot",
  "Applebot-Extended", "cohere-ai", "Diffbot", "Omgilibot", "ImagesiftBot", "YouBot",
  // SEO 분석·광고 수집 (방문자 유입과 무관)
  "AhrefsBot", "SemrushBot", "MJ12bot", "DotBot", "PetalBot", "BLEXBot", "DataForSeoBot", "serpstatbot", "barkrowler",
];

// 내용이 바뀌지 않으니 빌드할 때 한 번만 만들어 두고(서버 계산 없음) 그대로 내보냅니다.
export const dynamic = "force-static";

export function GET() {
  const body = [
    ...BLOCKED_BOTS.flatMap((b) => [`User-Agent: ${b}`, "Disallow: /", ""]),
    "User-Agent: *",
    "Allow: /",
    ...DISALLOW.map((p) => `Disallow: ${p}`),
    "",
    `Sitemap: ${SITE_URL}/sitemap.xml`,
    "",
    DAUM_VERIFY,
    "",
  ].join("\n");
  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" },
  });
}
