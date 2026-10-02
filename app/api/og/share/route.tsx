import { ImageResponse } from "next/og";
import { getDailyBrief, getLatestBriefDate, isValidDate } from "@/lib/daily";
import { buildShareSet, eok, gainShort, type ShareItem, type ShareSet } from "@/lib/shareSet";
import { loadKoreanFonts } from "@/lib/ogFonts";
import { aptLabel } from "@/lib/format";

/**
 * 인스타그램·X에 올릴 카드뉴스 이미지.
 *
 *   /api/og/share?slide=cover   표지         (1080×1350, 인스타 피드 4:5)
 *   /api/og/share?slide=busan   부산 TOP5
 *   /api/og/share?slide=ulsan   울산 TOP5
 *   /api/og/share?slide=end     마무리(프로필 링크 안내)
 *   /api/og/share?slide=story   스토리용 한 장 (1080×1920, 9:16)
 *   &date=2026-09-24            특정 날짜 (없으면 가장 최근 신고일)
 *
 * 디자인은 찬교님이 쓰던 "오늘의 신고가 TOP5" 카드와 같은 틀입니다.
 */
export const dynamic = "force-dynamic";

const C = {
  bg: "#f3f5f4",
  ink: "#1b2430",
  muted: "#6b7773",
  gold: "#c08a00",
  tile: "#e8ebea",
  track: "#e2e5e4",
  teal: "#1f6f78",
  red: "#e34b3f",
  line: "#dde2e0",
};

const LOGO_SRC = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0MCA0MCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIj4KICA8ZGVmcz48Y2xpcFBhdGggaWQ9ImMiPjxyZWN0IHg9IjAiIHk9IjAiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcng9IjkiLz48L2NsaXBQYXRoPjwvZGVmcz4KICA8cmVjdCB4PSIwIiB5PSIwIiB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHJ4PSI5IiBmaWxsPSIjZWFmMWY0Ii8+CiAgPGcgY2xpcC1wYXRoPSJ1cmwoI2MpIj4KICAgIDxnIHN0cm9rZT0iI2Q5NjYzZiIgc3Ryb2tlLXdpZHRoPSIyLjMiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgZmlsbD0ibm9uZSI+CiAgICAgIDxwYXRoIGQ9Ik03LjUgMTEuNSBRIDEwLjUgNy44IDEzLjUgMTEuNSIvPgogICAgICA8cGF0aCBkPSJNMTMuNSAxMS41IFEgMTYuNSA3LjggMTkuNSAxMS41Ii8+CiAgICA8L2c+CiAgICA8ZyBmaWxsPSIjMTQ0OTUxIj4KICAgICAgPHBhdGggZD0iTTI1IDI4LjUgQyAyNy41IDI0IDMxIDIwLjYgMzUuNiAxOC42IEMgMzYuNCAyMi42IDM1LjggMjcgMzMuOCAzMC42IEMgMzAuNiAzMC42IDI3LjQgMzAgMjUgMjguNSBaIi8+CiAgICAgIDxwYXRoIGQ9Ik00LjUgMzEuNSBDIDMuOCAyNCA5LjYgMTkuNCAxNi4yIDIwIEMgMjIgMjAuNSAyNiAyNC42IDI3IDMwLjUgTCAyNyAzMiBMIDQuNSAzMiBaIi8+CiAgICA8L2c+CiAgICA8Y2lyY2xlIGN4PSIxMC40IiBjeT0iMjUuMiIgcj0iMS4xNSIgZmlsbD0iI2VhZjFmNCIvPgogICAgPHBhdGggZD0iTS0yIDI5LjYgUSA0IDI2LjEgMTAgMjkuNiBUIDIyIDI5LjYgVCAzNCAyOS42IFQgNDYgMjkuNiBMIDQ2IDQyIEwgLTIgNDIgWiIgZmlsbD0iIzVhYTlkNiIgb3BhY2l0eT0iMC41NSIvPgogICAgPHBhdGggZD0iTS0yIDMxLjQgUSA0IDI3LjkgMTAgMzEuNCBUIDIyIDMxLjQgVCAzNCAzMS40IFQgNDYgMzEuNCBMIDQ2IDQyIEwgLTIgNDIgWiIgZmlsbD0iIzFmNmZiMCIvPgogIDwvZz4KPC9zdmc+Cg==";

const W = 1080;
const H_FEED = 1350;
const H_STORY = 1920;

function Tiles({ tiles }: { tiles: [string, string][] }) {
  return (
    <div style={{ display: "flex", flexShrink: 0, width: "100%", gap: 16, marginBottom: 30 }}>
      {tiles.map(([k, v]) => (
        <div
          key={k}
          style={{ display: "flex", flexDirection: "column", flex: 1, background: C.tile, borderRadius: 18, padding: "22px 24px" }}
        >
          <div style={{ display: "flex", fontSize: 22, color: C.muted, fontWeight: 400, marginBottom: 10 }}>{k}</div>
          <div style={{ display: "flex", fontSize: 38, fontWeight: 800, color: C.ink }}>{v}</div>
        </div>
      ))}
    </div>
  );
}

function Rows({ items, rowGap }: { items: ShareItem[]; rowGap: number }) {
  const max = Math.max(...items.map((i) => i.priceManwon), 1);
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {items.map((i, idx) => {
        const w = Math.max(18, Math.round((i.priceManwon / max) * 100));
        const first = idx === 0;
        const label = `${eok(i.priceManwon)}원${i.gainManwon ? ` (▲${gainShort(i.gainManwon).slice(1)})` : ""}`;
        const inside = w > 62;
        return (
          <div key={idx} style={{ display: "flex", flexShrink: 0, flexDirection: "column", marginBottom: rowGap }}>
            <div style={{ display: "flex", alignItems: "center" }}>
              <div
                style={{
                  display: "flex",
                  width: 46,
                  height: 46,
                  borderRadius: 23,
                  background: first ? C.red : C.teal,
                  color: "white",
                  fontSize: 24,
                  fontWeight: 700,
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 18,
                }}
              >
                {idx + 1}
              </div>
              <div style={{ display: "flex", fontSize: 34, fontWeight: 800, color: C.ink }}>{aptLabel(i.complex)}</div>
            </div>
            <div style={{ display: "flex", fontSize: 22, color: C.muted, margin: "4px 0 12px 64px" }}>
              {`${i.group} ${i.regionName} ${i.dong} · ${Math.round(i.areaM2)}m² · ${i.floor}층 · ${Number(
                i.dealDate.slice(5, 7)
              )}/${Number(i.dealDate.slice(8, 10))} 계약`}
            </div>
            <div style={{ display: "flex", position: "relative", height: 44, background: C.track, borderRadius: 22 }}>
              <div
                style={{
                  display: "flex",
                  width: `${w}%`,
                  height: 44,
                  borderRadius: 22,
                  background: first ? C.red : C.teal,
                  justifyContent: "flex-end",
                  alignItems: "center",
                  paddingRight: 20,
                }}
              >
                {inside && <div style={{ display: "flex", color: "white", fontSize: 26, fontWeight: 800 }}>{label}</div>}
              </div>
              {!inside && (
                <div
                  style={{
                    display: "flex",
                    position: "absolute",
                    left: `${w}%`,
                    top: 0,
                    height: 44,
                    alignItems: "center",
                    paddingLeft: 16,
                    fontSize: 26,
                    fontWeight: 800,
                    color: C.ink,
                  }}
                >
                  {label}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Frame({ children, eyebrow }: { children: React.ReactNode; eyebrow: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        background: C.bg,
        padding: "64px 64px 44px",
        fontFamily: "Noto Sans KR",
        color: C.ink,
      }}
    >
      <div style={{ display: "flex", fontSize: 26, fontWeight: 700, color: C.gold, marginBottom: 22 }}>{eyebrow}</div>
      {children}
      <div style={{ display: "flex", flexGrow: 1 }} />
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          borderTop: `2px solid ${C.line}`,
          paddingTop: 20,
          fontSize: 22,
          color: C.muted,
        }}
      >
        <div style={{ display: "flex" }}>부울아파트 · buulapt.com</div>
        <div style={{ display: "flex" }}>국토교통부 실거래가 · 신고일 기준</div>
      </div>
    </div>
  );
}

function avgLabel(items: ShareItem[]): string {
  if (!items.length) return "-";
  const avg = items.reduce((n, i) => n + i.priceManwon, 0) / items.length;
  return `${(avg / 10000).toFixed(2)}억원`;
}

function groupSlide(s: ShareSet, group: "부산" | "울산") {
  const items = group === "부산" ? s.busan : s.ulsan;
  const rec = s.recordCount[group];
  // 신고가만으로 칸을 다 채웠을 때만 "신고가 TOP"이라고 부르고, 모자라 비싼 거래로 채웠으면 "실거래 TOP"이라고 합니다.
  const title =
    rec >= items.length ? `${group} 오늘의 신고가 TOP${items.length}` : `${group} 오늘의 실거래 TOP${items.length}`;
  return (
    <Frame eyebrow={`BUULAPT · ${s.md} 신고분`}>
      <div style={{ display: "flex", flexShrink: 0, fontSize: 58, fontWeight: 800, lineHeight: 1.25, marginBottom: 10 }}>{title}</div>
      <div style={{ display: "flex", flexShrink: 0, fontSize: 24, color: C.muted, marginBottom: 28 }}>
        {`${s.md} 신고분 · ${group} · 국토교통부 실거래가`}
      </div>
      {items.length === 0 ? (
        <div style={{ display: "flex", fontSize: 32, color: C.muted, marginTop: 60 }}>오늘 새로 신고된 매매가 없습니다</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" }}>
          <Tiles
            tiles={[
              [`최고가 (${items[0].complex.slice(0, 7)})`, `${eok(items[0].priceManwon)}원`],
              ["평균가", avgLabel(items)],
              ["오늘 신고가", `${rec}건`],
            ]}
          />
          <Rows items={items} rowGap={24} />
        </div>
      )}
    </Frame>
  );
}

function coverSlide(s: ShareSet) {
  const total = s.recordCount["부산"] + s.recordCount["울산"];
  const best = [...s.busan, ...s.ulsan].sort((a, b) => b.priceManwon - a.priceManwon)[0];
  return (
    <Frame eyebrow="BUULAPT · 오늘의 실거래">
      <div style={{ display: "flex", flexDirection: "column", marginTop: 30, marginBottom: 44 }}>
        <div style={{ display: "flex", fontSize: 60, fontWeight: 800, color: C.teal, lineHeight: 1.25 }}>{s.dateLabel}</div>
        <div style={{ display: "flex", fontSize: 88, fontWeight: 800, lineHeight: 1.2, marginTop: 10 }}>부산·울산</div>
        <div style={{ display: "flex", fontSize: 88, fontWeight: 800, lineHeight: 1.2 }}>
          {total > 0 ? `신고가 ${total}건` : `실거래 ${s.saleCount}건`}
        </div>
      </div>
      <div style={{ display: "flex", width: "100%" }}>
        <Tiles
          tiles={[
            ["오늘 신고된 매매", `${s.saleCount}건`],
            ["부산 신고가", `${s.recordCount["부산"]}건`],
            ["울산 신고가", `${s.recordCount["울산"]}건`],
          ]}
        />
      </div>
      {best && (
        <div style={{ display: "flex", flexDirection: "column", background: "white", borderRadius: 22, padding: "30px 34px" }}>
          <div style={{ display: "flex", fontSize: 24, color: C.muted }}>오늘 가장 비싼 거래</div>
          <div style={{ display: "flex", fontSize: 44, fontWeight: 800, marginTop: 8 }}>{aptLabel(best.complex)}</div>
          <div style={{ display: "flex", alignItems: "baseline", marginTop: 6 }}>
            <div style={{ display: "flex", fontSize: 64, fontWeight: 800, color: C.red }}>{`${eok(best.priceManwon)}원`}</div>
            <div style={{ display: "flex", fontSize: 26, color: C.muted, marginLeft: 18 }}>
              {`${best.regionName} ${best.dong} · ${Math.round(best.areaM2)}m² · ${best.floor}층`}
            </div>
          </div>
        </div>
      )}
      <div style={{ display: "flex", fontSize: 28, color: C.muted, marginTop: 30 }}>옆으로 넘겨서 부산·울산 TOP5 보기 →</div>
    </Frame>
  );
}

function endSlide(s: ShareSet) {
  return (
    <Frame eyebrow="BUULAPT · 부울아파트">
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: 150 }}>
        {/* 부울아파트 로고 (app/icon.svg와 같은 그림) */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={LOGO_SRC} width={200} height={200} alt="" />
        <div style={{ display: "flex", fontSize: 60, fontWeight: 800, marginTop: 50, textAlign: "center" }}>
          단지별 가격 흐름 · 전체 실거래는
        </div>
        <div style={{ display: "flex", fontSize: 60, fontWeight: 800, color: C.teal, marginTop: 10 }}>프로필 링크에서</div>
        <div style={{ display: "flex", fontSize: 30, color: C.muted, marginTop: 40 }}>
          부산·울산 아파트 실거래가 · 매일 아침 업데이트
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 50,
            padding: "20px 44px",
            borderRadius: 999,
            background: C.teal,
            color: "white",
            fontSize: 36,
            fontWeight: 800,
          }}
        >
          buulapt.com
        </div>
      </div>
      <div style={{ display: "flex", fontSize: 22, color: C.muted, marginTop: 60, justifyContent: "center" }}>
        {`${s.dateLabel} 신고분 기준 · 해제(취소)된 거래 제외`}
      </div>
    </Frame>
  );
}

function storySlide(s: ShareSet) {
  const total = s.recordCount["부산"] + s.recordCount["울산"];
  const items = [...s.busan.slice(0, 3), ...s.ulsan.slice(0, 2)].sort((a, b) => b.priceManwon - a.priceManwon);
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        background: C.bg,
        padding: "150px 64px 120px",
        fontFamily: "Noto Sans KR",
        color: C.ink,
      }}
    >
      <div style={{ display: "flex", fontSize: 30, fontWeight: 700, color: C.gold }}>BUULAPT · 오늘의 실거래</div>
      <div style={{ display: "flex", fontSize: 54, fontWeight: 800, color: C.teal, marginTop: 30 }}>{s.dateLabel}</div>
      <div style={{ display: "flex", fontSize: 84, fontWeight: 800, lineHeight: 1.2, marginTop: 6 }}>
        {total > 0 ? `부산·울산 신고가 ${total}건` : `부산·울산 실거래 ${s.saleCount}건`}
      </div>
      <div style={{ display: "flex", flexDirection: "column", marginTop: 60 }}>
        <Rows items={items} rowGap={40} />
      </div>
      <div style={{ display: "flex", flexGrow: 1 }} />
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          fontSize: 34,
          fontWeight: 800,
          color: C.teal,
          border: `3px dashed ${C.teal}`,
          borderRadius: 24,
          padding: "30px 0",
        }}
      >
        ↓ 여기에 링크 스티커 · 전체 실거래 보기
      </div>
    </div>
  );
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slide = searchParams.get("slide") ?? "cover";
  const dateParam = searchParams.get("date");

  let s: ShareSet | null = null;
  try {
    const date = dateParam && isValidDate(dateParam) ? dateParam : await getLatestBriefDate();
    s = buildShareSet(await getDailyBrief(date));
  } catch {
    s = null;
  }
  if (!s) {
    return new Response("자료를 불러오지 못했습니다", { status: 503 });
  }

  const node =
    slide === "busan"
      ? groupSlide(s, "부산")
      : slide === "ulsan"
        ? groupSlide(s, "울산")
        : slide === "end"
          ? endSlide(s)
          : slide === "story"
            ? storySlide(s)
            : coverSlide(s);

  // 이 이미지에 들어가는 글자만 골라 폰트를 작게 받습니다.
  const text =
    JSON.stringify(s) +
    "BUULAPT·오늘의실거래신고분신고가최고가TOP평균가건원억만부산울산옆으로넘겨서보기→단지별가격흐름전체는프로필링크에서아파트매일아침업데이트부울아파트국토교통부신고일기준해제취소된거래제외여기에스티커↓가장비싼새로된매매가없습니다계약층m²▲()·/0123456789,.%";
  const fonts = await loadKoreanFonts(text);

  return new ImageResponse(node, {
    width: W,
    height: slide === "story" ? H_STORY : H_FEED,
    fonts: fonts.length ? fonts : undefined,
    headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600" },
  });
}
