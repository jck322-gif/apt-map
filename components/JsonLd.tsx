/**
 * 구조화 데이터(JSON-LD)를 안전하게 <script> 태그로 심어주는 작은 부품.
 *
 * 구글이 페이지 내용을 "글", "탐색 경로" 같은 걸로 이해하게 도와주는 태그입니다.
 * 화면에는 아무것도 안 보이고, 검색엔진만 읽습니다.
 *
 * data 안에 사람이 입력한 문자열(단지명 등)이 들어갈 수 있어서, "<" 를 그대로 두면
 * 태그가 중간에 끊길 위험이 있습니다. 그래서 "<" 를 전부 이스케이프해서 내보냅니다.
 */
export default function JsonLd({ data }: { data: object }) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  // eslint-disable-next-line react/no-danger
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
