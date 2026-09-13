import { ImageResponse } from "next/og";
import { getDailyBrief, getLatestBriefDate, isValidDate, koDateLong } from "@/lib/daily";
import { fmtManwon } from "@/lib/format";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/site";

/**
 * "오늘 신고가 OOO 외 N곳" 스타일 썸네일을 그날 실거래 자료로 자동 생성합니다.
 *
 * 쓰는 곳
 *   1) /daily 페이지의 공유 미리보기 이미지 (카카오톡·인스타 등에 링크 붙여넣을 때 뜨는 사진)
 *   2) 이 주소 자체를 열어서 이미지를 저장해 인스타그램 등에 올리는 용도
 *      /api/og/daily            → 자료가 있는 가장 최근 날짜
 *      /api/og/daily?date=2026-09-13 → 특정 날짜
 *
 * DB 조회가 실패하거나 그날 자료가 없어도 사이트 브랜드만 담긴 기본 이미지를 내려줍니다
 * (완전히 빈 화면·깨진 이미지보다는 낫습니다).
 */
export const dynamic = "force-dynamic";

const SIZE = 1080;

// 구글 폰트에 완성형 한글을 통째로 요청하면 파일이 몇 MB씩 되어 느립니다.
// text= 파라미터로 실제 이 이미지에 쓰는 글자만 넘기면 그 글자만 담긴 작은 파일을 받습니다.
// (최신 브라우저인 척하면 satori가 못 읽는 woff2를 주므로, 일부러 오래된 크롬인 척합니다.)
async function loadGoogleFont(family: string, weight: number, text: string): Promise<ArrayBuffer> {
  const cssUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(
    family
  )}:wght@${weight}&text=${encodeURIComponent(text)}`;
  const cssRes = await fetch(cssUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2228.0 Safari/537.36",
    },
  });
  const css = await cssRes.text();
  const match = css.match(/src: url\(([^)]+)\) format\('(?:opentype|truetype)'\)/);
  if (!match) throw new Error(`${family} 폰트 주소를 찾지 못했습니다`);
  const fontRes = await fetch(match[1]);
  if (!fontRes.ok) throw new Error(`${family} 폰트를 받지 못했습니다 (${fontRes.status})`);
  return fontRes.arrayBuffer();
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get("date");
  const date = dateParam && isValidDate(dateParam) ? dateParam : await getLatestBriefDate();

  let badgeGroup = "부산";
  let badgeKind = "오늘 최고가 거래";
  let title = SITE_NAME;
  let moreLabel = "";
  let priceLabel = "";
  let detailLabel = "";
  let hasContent = false;

  try {
    const brief = await getDailyBrief(date);
    const top = brief.records[0];
    if (top) {
      hasContent = true;
      badgeGroup = top.group;
      badgeKind = "오늘 신고가";
      title = top.complex;
      moreLabel = brief.records.length > 1 ? `외 ${brief.records.length - 1}곳` : "";
      priceLabel = fmtManwon(top.priceManwon);
      detailLabel = `${top.dong} · 전용 ${Math.round(top.areaM2)}㎡ · ${top.floor}층 · ${top.dealDate} 계약`;
    } else if (brief.highlight) {
      hasContent = true;
      const h = brief.highlight;
      badgeGroup = h.group;
      badgeKind = "오늘 최고가 거래";
      title = h.complex;
      priceLabel = fmtManwon(h.priceManwon);
      detailLabel = `${h.dong} · 전용 ${Math.round(h.areaM2)}㎡ · ${h.floor}층 · ${h.dealDate} 계약`;
    }
  } catch {
    // DB 조회가 실패해도 아래에서 기본 브랜드 이미지를 내려줍니다.
  }

  const dateLabel = koDateLong(date);
  const fallbackLabel = "신고된 거래가 아직 없습니다";
  const allText = Array.from(
    new Set(
      [
        badgeGroup,
        badgeKind,
        title,
        moreLabel,
        priceLabel,
        detailLabel,
        dateLabel,
        SITE_NAME,
        SITE_TAGLINE,
        fallbackLabel,
      ].join("")
    )
  ).join("");

  let serifBold: ArrayBuffer | null = null;
  let sansRegular: ArrayBuffer | null = null;
  try {
    [serifBold, sansRegular] = await Promise.all([
      loadGoogleFont("Noto Serif KR", 800, allText),
      loadGoogleFont("Noto Sans KR", 500, allText),
    ]);
  } catch {
    // 폰트를 못 받아와도(네트워크 문제 등) 이미지 자체는 내려줍니다. 한글이 깨져 보일 수 있습니다.
  }

  const fonts: { name: string; data: ArrayBuffer; weight: 500 | 800; style: "normal" }[] = [];
  if (serifBold) fonts.push({ name: "Noto Serif KR", data: serifBold, weight: 800, style: "normal" });
  if (sansRegular) fonts.push({ name: "Noto Sans KR", data: sansRegular, weight: 500, style: "normal" });

  const serifFamily = serifBold ? "Noto Serif KR" : undefined;
  const sansFamily = sansRegular ? "Noto Sans KR" : undefined;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: "72px",
          background: "linear-gradient(135deg, #0b1f22 0%, #144951 55%, #1f6f78 100%)",
          fontFamily: sansFamily,
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -120,
            right: -140,
            width: 480,
            height: 480,
            borderRadius: 9999,
            background: "rgba(255,255,255,0.06)",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -160,
            left: -100,
            width: 380,
            height: 380,
            borderRadius: 9999,
            background: "rgba(217,102,63,0.15)",
            display: "flex",
          }}
        />

        <div style={{ display: "flex", width: "100%", justifyContent: "space-between", alignItems: "center" }}>
          <div
            style={{
              display: "flex",
              background: "#d9663f",
              color: "white",
              padding: "16px 34px",
              borderRadius: 999,
              fontSize: 36,
              fontWeight: 700,
              fontFamily: sansFamily,
            }}
          >
            {badgeGroup} {badgeKind}
          </div>
          <div style={{ display: "flex", color: "rgba(255,255,255,0.75)", fontSize: 28, fontFamily: sansFamily }}>
            {dateLabel}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", marginTop: 56 }}>
          <div
            style={{
              display: "flex",
              color: "white",
              fontSize: title.length > 8 ? 76 : 108,
              fontWeight: 800,
              fontFamily: serifFamily,
              lineHeight: 1.2,
            }}
          >
            {hasContent ? title : "오늘 실거래 소식"}
          </div>
          {moreLabel && (
            <div
              style={{
                display: "flex",
                color: "rgba(255,255,255,0.85)",
                fontSize: 44,
                fontWeight: 700,
                fontFamily: sansFamily,
                marginTop: 14,
              }}
            >
              {moreLabel}
            </div>
          )}
        </div>

        {hasContent ? (
          <>
            <div
              style={{
                display: "flex",
                color: "#ffd9c9",
                fontSize: 76,
                fontWeight: 800,
                fontFamily: serifFamily,
                marginTop: 44,
              }}
            >
              {priceLabel}
            </div>
            <div
              style={{
                display: "flex",
                color: "rgba(255,255,255,0.7)",
                fontSize: 30,
                fontFamily: sansFamily,
                marginTop: 18,
              }}
            >
              {detailLabel}
            </div>
          </>
        ) : (
          <div
            style={{
              display: "flex",
              color: "rgba(255,255,255,0.75)",
              fontSize: 34,
              fontFamily: sansFamily,
              marginTop: 30,
            }}
          >
            {fallbackLabel}
          </div>
        )}

        <div style={{ display: "flex", flexGrow: 1 }} />

        <div
          style={{
            display: "flex",
            width: "100%",
            justifyContent: "space-between",
            alignItems: "flex-end",
            borderTop: "2px solid rgba(255,255,255,0.25)",
            paddingTop: 34,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", color: "white", fontSize: 42, fontWeight: 800, fontFamily: serifFamily }}>
              {SITE_NAME}
            </div>
            <div
              style={{
                display: "flex",
                color: "rgba(255,255,255,0.65)",
                fontSize: 24,
                fontFamily: sansFamily,
                marginTop: 6,
              }}
            >
              {SITE_TAGLINE}
            </div>
          </div>
          <div style={{ display: "flex", color: "rgba(255,255,255,0.85)", fontSize: 28, fontWeight: 700 }}>
            BUULAPT.COM
          </div>
        </div>
      </div>
    ),
    {
      width: SIZE,
      height: SIZE,
      fonts: fonts.length > 0 ? fonts : undefined,
      headers: {
        "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600",
      },
    }
  );
}
