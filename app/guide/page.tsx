import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import { GUIDES, GUIDE_CATEGORIES } from "@/lib/guides";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: `부동산 상식 | ${SITE_NAME}`,
  description:
    "실거래가 읽는 법, 아파트 매매 절차와 기한, 전월세 신고제와 전세가율, 청약과 재개발까지. 부산·울산 실거래 자료를 다루며 정리한 부동산 기초 지식입니다.",
};

/** 각 묶음이 무엇을 다루는지 한 줄 설명 */
const CATEGORY_DESC: Record<string, string> = {
  "실거래 읽기": "표에 적힌 숫자가 무슨 뜻인지, 무엇을 조심해야 하는지",
  매매: "집을 살 때의 절차와 기한, 확인할 서류",
  "전세·월세": "보증금을 지키는 법과 전세·월세 고르는 기준",
  "청약·재개발": "새 아파트를 얻는 두 가지 길",
  "지역 이야기": "부산과 울산, 동네마다 다른 시장",
};

export default function Page() {
  return (
    <div className="wrap">
      <SiteHeader current="guide" />

      <section className="block">
        <h2>부동산 상식</h2>
        <p className="section-note">
          실거래가 자료를 매일 다루면서 정리한 글 {GUIDES.length}편입니다. 궁금한 묶음을 눌러보세요.
        </p>

        <div className="cat-stack">
          {GUIDE_CATEGORIES.map((cat, i) => {
            const list = GUIDES.filter((g) => g.category === cat);
            if (list.length === 0) return null;
            return (
              // <details>를 쓰면 자바스크립트 없이도 열리고, 검색엔진도 안쪽 글을 다 읽습니다.
              <details className="cat-box" key={cat}>
                <summary className="cat-summary">
                  <span className="cat-no">{i + 1}</span>
                  <span className="cat-text">
                    <span className="cat-name">{cat}</span>
                    <span className="cat-desc">{CATEGORY_DESC[cat]}</span>
                  </span>
                  <span className="cat-count">{list.length}편</span>
                  <span className="cat-chev" aria-hidden="true">
                    ▾
                  </span>
                </summary>

                <div className="cat-inner">
                  {list.map((g) => (
                    <Link className="cat-item" href={`/guide/${g.slug}`} key={g.slug}>
                      <span className="cat-item-title">{g.title}</span>
                      <span className="cat-item-summary">{g.summary}</span>
                      <span className="cat-item-meta">{g.readMinutes}분 읽기</span>
                    </Link>
                  ))}
                </div>
              </details>
            );
          })}
        </div>
      </section>
    </div>
  );
}
