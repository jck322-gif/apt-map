import { ImageResponse } from "next/og";
import { getDailyBrief, getLatestBriefDate, isValidDate, koDateLong } from "@/lib/daily";
import { fmtManwon } from "@/lib/format";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/site";
import { loadComplexTrend, type MonthlyPoint } from "@/lib/complex";

/**
 * "오늘 신고가 OOO 외 N곳" 스타일 썸네일을 그날 실거래 자료로 자동 생성합니다.
 *
 * 쓰는 곳
 *   1) /daily 페이지의 공유 미리보기 이미지 (카카오톡·인스타 등에 링크 붙여넣을 때 뜨는 사진)
 *   2) 이 주소 자체를 열어서 이미지를 저장해 인스타그램 등에 올리는 용도
 *      /api/og/daily            → 자료가 있는 가장 최근 날짜
 *      /api/og/daily?date=2026-09-13 → 특정 날짜
 *
 * DB 조회·폰트 요청 중 어느 하나가 실패해도 절대 500을 내지 않고, 그 단계만 건너뛴
 * (내용이 조금 단순해진) 이미지를 대신 내려줍니다. 이미지 한 장 때문에 페이지 공유가
 * 통째로 깨지면 안 되기 때문입니다.
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

// ⚠️ satori(이미지를 그리는 엔진)는 style에 fontFamily: undefined 처럼 "키는 있지만 값이 undefined"인
// 경우를 만나면 그 자리에서 죽어버립니다(내부적으로 undefined.split(',')를 호출). 그래서 폰트를 못
// 불러왔을 때는 fontFamily 자체를 아예 안 넣어야 합니다. 이 함수가 그 조건부 처리를 담당합니다.
function fontStyle(family: string | null): { fontFamily: string } | Record<string, never> {
  return family ? { fontFamily: family } : {};
}

type LoadedFonts = { name: string; data: ArrayBuffer; weight: 800; style: "normal" }[];

// 제목·가격·본문 모두 굵은 고딕(Noto Sans KR)만 씁니다 — 경쟁 사이트의 두꺼운 고딕 느낌에 맞췄습니다.
async function loadFonts(text: string): Promise<{ sansFamily: string | null; fonts: LoadedFonts }> {
  const sans = await loadGoogleFont("Noto Sans KR", 800, text).catch(() => null);
  const fonts: LoadedFonts = [];
  let sansFamily: string | null = null;
  if (sans) {
    fonts.push({ name: "Noto Sans KR", data: sans, weight: 800, style: "normal" });
    sansFamily = "Noto Sans KR";
  }
  return { sansFamily, fonts };
}

/** 뭔가 크게 잘못됐을 때 내려주는 최후의 이미지 — 한글도, 커스텀 폰트도 안 쓰므로 이 자체가 실패할 일은 없습니다. */
function fallbackImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0b1f22 0%, #144951 55%, #1f6f78 100%)",
          color: "white",
          fontSize: 56,
          fontWeight: 700,
        }}
      >
        BUULAPT.COM
      </div>
    ),
    { width: SIZE, height: SIZE, headers: { "Cache-Control": "public, s-maxage=60" } }
  );
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date");
    let date: string;
    try {
      date = dateParam && isValidDate(dateParam) ? dateParam : await getLatestBriefDate();
    } catch {
      date = dateParam && isValidDate(dateParam) ? dateParam : new Date().toISOString().slice(0, 10);
    }

    let badgeGroup = "부산";
    let badgeKind = "오늘 최고가 거래";
    let title = SITE_NAME;
    let moreLabel = "";
    let priceLabel = "";
    let detailLabel = "";
    let hasContent = false;
    let trendPoints: MonthlyPoint[] = [];
    let regionCode = "";

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
        // ㎡(U+33A1) 글자는 구글 폰트 서브셋에 없을 때가 있어 빈 네모로 깨지므로, 이 이미지에서는 "m²"로 씁니다.
        detailLabel = `${top.dong} · 전용 ${Math.round(top.areaM2)}m² · ${top.floor}층 · ${top.dealDate} 계약`;
        regionCode = top.regionCode;
      } else if (brief.highlight) {
        hasContent = true;
        const h = brief.highlight;
        badgeGroup = h.group;
        badgeKind = "오늘 최고가 거래";
        title = h.complex;
        priceLabel = fmtManwon(h.priceManwon);
        detailLabel = `${h.dong} · 전용 ${Math.round(h.areaM2)}m² · ${h.floor}층 · ${h.dealDate} 계약`;
        regionCode = h.regionCode;
      }
    } catch {
      // DB 조회가 실패해도 아래에서 기본 브랜드 이미지를 내려줍니다.
    }

    // 사이트에서 단지를 눌렀을 때 뜨는 팝업과 같은 "가격 추이 곡선"을 카드 배경에 그립니다.
    // (예전에는 건물 실루엣만 그렸는데, 실제 서비스 화면과 느낌이 다르다는 피드백을 반영했습니다.)
    // 이 조회가 실패해도 카드 자체는 그대로 나가야 하므로 별도로 감쌉니다.
    if (hasContent && regionCode) {
      try {
        const trend = await loadComplexTrend({ code: regionCode, complex: title, dealType: "sale" });
        trendPoints = trend.points;
      } catch {
        trendPoints = [];
      }
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

    const { sansFamily, fonts } = await loadFonts(allText);

    // 사이트에서 단지를 눌렀을 때 뜨는 팝업과 같은 "가격 추이 곡선"을 카드 배경에 그립니다.
    // (예전에는 건물 실루엣만 그렸는데, 실제로 눌러서 보는 화면과 느낌이 다르다는 피드백을 받아
    //  실제 12개월 시세 흐름을 그대로 옮겨 그립니다.)
    const CW = SIZE; // 차트 폭 — 카드 전체 너비
    const CH = 430; // 차트 높이 — 카드 하단부 (아래쪽 글자 자리는 비워둡니다)
    const CPAD = { top: 50, bottom: 30, left: 20, right: 20 };
    const withValue = trendPoints.filter(
      (p): p is MonthlyPoint & { avgPriceManwon: number } => p.avgPriceManwon !== null
    );
    let chartPath = "";
    let chartAreaPath = "";
    let chartDotX = 0;
    let chartDotY = 0;
    if (withValue.length >= 2) {
      const values = withValue.map((p) => p.avgPriceManwon);
      const min = Math.min(...values);
      const max = Math.max(...values);
      const span = max - min || Math.max(1, max * 0.05);
      const scaleMin = min - span * 0.15;
      const scaleMax = max + span * 0.15;
      const innerW = CW - CPAD.left - CPAD.right;
      const innerH = CH - CPAD.top - CPAD.bottom;
      const xOf = (i: number) =>
        CPAD.left + (withValue.length === 1 ? innerW / 2 : (innerW * i) / (withValue.length - 1));
      const yOf = (v: number) => CPAD.top + innerH - ((v - scaleMin) / (scaleMax - scaleMin)) * innerH;
      const pts = withValue.map((p, i) => ({ x: xOf(i), y: yOf(p.avgPriceManwon) }));
      chartPath = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
      const baseY = CPAD.top + innerH;
      chartAreaPath = `M${pts[0].x.toFixed(1)},${baseY} ` + pts.map((p) => `L${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ") + ` L${pts[pts.length - 1].x.toFixed(1)},${baseY} Z`;
      chartDotX = pts[pts.length - 1].x;
      chartDotY = pts[pts.length - 1].y;
    }

    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            position: "relative",
            background: "linear-gradient(180deg, #030f13 0%, #0a2530 55%, #123a42 100%)",
            ...fontStyle(sansFamily),
          }}
        >
          {/* 은은한 달빛/글로우 */}
          <div
            style={{
              position: "absolute",
              top: -140,
              right: -120,
              width: 520,
              height: 520,
              borderRadius: 9999,
              background: "rgba(255,255,255,0.05)",
              display: "flex",
            }}
          />

          {/* 단지 팝업과 같은 스타일의 12개월 가격 추이 곡선 (화면 하단) */}
          {chartPath && (
            <svg
              width={CW}
              height={CH}
              viewBox={`0 0 ${CW} ${CH}`}
              style={{ position: "absolute", left: 0, bottom: 90 }}
            >
              <defs>
                <linearGradient id="ogTrendFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#5cb8bf" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#5cb8bf" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d={chartAreaPath} fill="url(#ogTrendFill)" />
              <path d={chartPath} fill="none" stroke="#5cb8bf" strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
              <circle cx={chartDotX} cy={chartDotY} r={10} fill="#5cb8bf" />
              <circle cx={chartDotX} cy={chartDotY} r={16} fill="none" stroke="#5cb8bf" strokeOpacity={0.4} strokeWidth={4} />
            </svg>
          )}
          {/* 곡선 위 옅은 그림자 — 위쪽 글자가 배경 곡선과 겹쳐도 잘 읽히게 합니다 */}
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: 0,
              height: 360,
              display: "flex",
              background: "linear-gradient(180deg, rgba(3,15,19,0.55) 0%, rgba(3,15,19,0) 100%)",
            }}
          />

          {/* 실제 내용 */}
          <div style={{ display: "flex", flexDirection: "column", height: "100%", width: "100%", padding: "70px" }}>
            <div style={{ display: "flex", width: "100%", justifyContent: "space-between", alignItems: "center" }}>
              <div
                style={{
                  display: "flex",
                  background: "rgba(6,14,17,0.6)",
                  border: "1px solid rgba(255,255,255,0.22)",
                  color: "white",
                  padding: "14px 32px",
                  borderRadius: 999,
                  fontSize: 32,
                  fontWeight: 700,
                  ...fontStyle(sansFamily),
                }}
              >
                {badgeGroup} {badgeKind}
              </div>
              <div style={{ display: "flex", color: "rgba(255,255,255,0.55)", fontSize: 24, ...fontStyle(sansFamily) }}>
                {dateLabel}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", marginTop: 64 }}>
              <div
                style={{
                  display: "flex",
                  color: "white",
                  fontSize: title.length > 8 ? 58 : 68,
                  fontWeight: 800,
                  lineHeight: 1.25,
                  ...fontStyle(sansFamily),
                }}
              >
                {hasContent ? title : "오늘 실거래 소식"}
              </div>
              {moreLabel && (
                <div
                  style={{
                    display: "flex",
                    color: "rgba(255,255,255,0.6)",
                    fontSize: 32,
                    fontWeight: 700,
                    marginTop: 10,
                    ...fontStyle(sansFamily),
                  }}
                >
                  {moreLabel}
                </div>
              )}
            </div>

            {hasContent && (
              <div
                style={{
                  display: "flex",
                  color: "#ff7a4d",
                  fontSize: 138,
                  fontWeight: 800,
                  marginTop: 20,
                  lineHeight: 1.05,
                  ...fontStyle(sansFamily),
                }}
              >
                {priceLabel}
              </div>
            )}

            {hasContent && (
              <div
                style={{
                  display: "flex",
                  color: "rgba(255,255,255,0.78)",
                  fontSize: 28,
                  marginTop: 16,
                  ...fontStyle(sansFamily),
                }}
              >
                {detailLabel}
              </div>
            )}

            {!hasContent && (
              <div
                style={{
                  display: "flex",
                  color: "rgba(255,255,255,0.75)",
                  fontSize: 34,
                  marginTop: 30,
                  ...fontStyle(sansFamily),
                }}
              >
                {fallbackLabel}
              </div>
            )}

            <div style={{ display: "flex", flexGrow: 1 }} />

            <div
              style={{
                display: "flex",
                alignSelf: "flex-start",
                background: "rgba(3,15,19,0.55)",
                borderRadius: 10,
                padding: "6px 16px 6px 0",
                color: "rgba(255,255,255,0.7)",
                fontSize: 26,
                ...fontStyle(sansFamily),
              }}
            >
              {SITE_NAME} · BUULAPT.COM
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
  } catch (e) {
    console.error("[og/daily] 이미지 생성 실패:", e instanceof Error ? e.message : e);
    return fallbackImage();
  }
}
