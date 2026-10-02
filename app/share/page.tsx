import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import CopyBox from "@/components/CopyBox";
import RichCopy from "@/components/RichCopy";
import { shareTablesHtml } from "@/lib/shareTables";
import { getBriefDates, getDailyBrief, getLatestBriefDate, isValidDate } from "@/lib/daily";
import {
  buildShareSet,
  xText,
  xReply,
  xWeight,
  instaCaption,
  blogTitle,
  blogIntro,
  cafeText,
  trackedUrl,
} from "@/lib/shareSet";
import { SITE_NAME } from "@/lib/site";

/**
 * 오늘의 공유 세트 — 운영자(찬교님)용 페이지.
 * 매일 아침 이 페이지 하나만 열면 인스타 카드뉴스 이미지, X 글, 블로그·카페 글이 한 번에 준비됩니다.
 * 검색엔진에는 보이지 않게 하고(noindex), 메뉴·사이트맵에도 넣지 않습니다.
 */
export const metadata: Metadata = {
  title: `오늘의 공유 세트 | ${SITE_NAME}`,
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const SLIDES: { key: string; label: string; file: string }[] = [
  { key: "cover", label: "1. 표지", file: "01_표지" },
  { key: "busan", label: "2. 부산 TOP5", file: "02_부산" },
  { key: "ulsan", label: "3. 울산 TOP5", file: "03_울산" },
  { key: "end", label: "4. 마무리", file: "04_마무리" },
];

export default async function SharePage({ searchParams }: { searchParams: { date?: string } }) {
  let date: string;
  let brief;
  let dates: { date: string; count: number }[] = [];
  try {
    date = searchParams.date && isValidDate(searchParams.date) ? searchParams.date : await getLatestBriefDate();
    [brief, dates] = await Promise.all([getDailyBrief(date), getBriefDates().catch(() => [])]);
  } catch {
    return (
      <div className="wrap">
        <SiteHeader />
        <section className="block">
          <h1 className="guide-title">오늘의 공유 세트</h1>
          <p className="empty-note">자료를 불러오지 못했습니다. 잠시 후 새로고침해 주세요.</p>
        </section>
      </div>
    );
  }
  const s = buildShareSet(brief);
  const q = `date=${s.date}`;
  const x = xText(s);

  return (
    <div className="wrap">
      <SiteHeader />
      <article className="block share-page">
        <h1 className="guide-title">오늘의 공유 세트 · {s.dateLabel} 신고분</h1>
        <p className="guide-summary">
          매매 {s.saleCount}건 · 신고가 부산 {s.recordCount["부산"]}건, 울산 {s.recordCount["울산"]}건. 이미지를 저장하고
          글을 복사해서 인스타·X·블로그·카페에 올리세요. (운영자용 페이지라 검색에는 나오지 않습니다.)
        </p>

        {dates.length > 0 && (
          <p className="section-note">
            다른 날짜:{" "}
            {dates.slice(0, 7).map((d) => (
              <Link key={d.date} href={`/share?date=${d.date}`} className="share-date">
                {Number(d.date.slice(5, 7))}/{Number(d.date.slice(8, 10))}
              </Link>
            ))}
          </p>
        )}

        <section className="brief-section">
          <h2 className="brief-h2">① 인스타그램 게시물 (카드뉴스 4장, 4:5)</h2>
          <p className="section-note">이미지를 길게 눌러 저장하거나 [저장] 버튼을 누르세요. 1→4 순서로 올리면 됩니다.</p>
          <div className="share-grid">
            {SLIDES.map((sl) => (
              <figure key={sl.key} className="share-fig">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/og/share?slide=${sl.key}&${q}`} alt={sl.label} loading="lazy" />
                <figcaption>
                  {sl.label}{" "}
                  <a href={`/api/og/share?slide=${sl.key}&${q}`} download={`${s.date}_${sl.file}.png`}>
                    저장
                  </a>
                </figcaption>
              </figure>
            ))}
          </div>
          <CopyBox label="인스타 본문(캡션)" text={instaCaption(s)} hint="해시태그 포함" />
        </section>

        <section className="brief-section">
          <h2 className="brief-h2">② 인스타 스토리 (9:16) — 링크 스티커용</h2>
          <div className="share-grid story">
            <figure className="share-fig">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/og/share?slide=story&${q}`} alt="스토리" loading="lazy" />
              <figcaption>
                스토리{" "}
                <a href={`/api/og/share?slide=story&${q}`} download={`${s.date}_스토리.png`}>
                  저장
                </a>
              </figcaption>
            </figure>
          </div>
          <CopyBox label="링크 스티커에 넣을 주소" text={trackedUrl(`/daily/${s.date}`, "instagram")} />
        </section>

        <section className="brief-section">
          <h2 className="brief-h2">③ X (이미지 1장 + 글, 링크는 첫 댓글)</h2>
          <p className="section-note">이미지는 ①의 부산 TOP5나 표지를 쓰면 됩니다.</p>
          <CopyBox label="X 본문" text={x} hint={`${xWeight(x)}/280자`} />
          <CopyBox label="X 첫 댓글" text={xReply(s)} />
        </section>

        <section className="brief-section">
          <h2 className="brief-h2">④ 네이버 블로그 (제목 + 도입부)</h2>
          <CopyBox label="블로그 제목" text={blogTitle(s)} />
          <CopyBox label="블로그 도입부" text={blogIntro(s)} hint="본문은 이어서 직접 쓰기" />
        </section>

        <section className="brief-section">
          <h2 className="brief-h2">⑤ 부동산 카페 (정보글)</h2>
          <p className="section-note">카페마다 표현을 조금씩 바꿔 올리고, 링크가 금지된 카페에서는 마지막 줄 주소를 지우세요.</p>
          <CopyBox label="카페 글" text={cafeText(s)} />
        </section>

        <section className="brief-section">
          <h2 className="brief-h2">⑥ 단지 링크 달린 순위표 (카페·블로그 붙여넣기용)</h2>
          <p className="section-note">
            [표 복사]를 누르고 카페·블로그 글쓰기 화면에 붙여 넣으면, 표 모양과 단지별 링크가 그대로 들어갑니다. 단지
            이름을 누르면 부울아파트 단지 페이지로 갑니다.
          </p>
          <RichCopy label="카페용 순위표" html={shareTablesHtml(brief, "cafe")} hint="링크 꼬리표: 카페" />
          <RichCopy label="블로그용 순위표" html={shareTablesHtml(brief, "naver_blog")} hint="링크 꼬리표: 블로그" />
        </section>
      </article>
    </div>
  );
}
