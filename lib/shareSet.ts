import type { DailyBrief, Group } from "@/lib/daily";
import { koDate } from "@/lib/daily";
import { fmtManwon, aptLabel } from "@/lib/format";
import { SITE_URL } from "@/lib/site";
import { complexHref } from "@/lib/complex";
import { REPORTS } from "@/lib/reports";

/**
 * "오늘의 공유 세트" — 그날 신고분으로 인스타·X·블로그·카페에 올릴 이미지와 글을 한 번에 만듭니다.
 * (/share 페이지와 /api/og/share 이미지가 같은 자료를 씁니다.)
 */

export type ShareItem = {
  regionCode: string;
  complex: string;
  regionName: string;
  group: Group;
  dong: string;
  areaM2: number;
  floor: number;
  dealDate: string;
  priceManwon: number;
  /** 신고가면 직전 최고가보다 오른 금액(만원), 신고가가 아니면 null */
  gainManwon: number | null;
};

export type ShareSet = {
  date: string;
  dateLabel: string; // "9월 24일"
  md: string; // "9/24"
  saleCount: number;
  recordCount: Record<Group, number>;
  busan: ShareItem[];
  ulsan: ShareItem[];
};

export const TOP_N = 5;

/** 13억 / 6.87억 / 9,500만 — SNS용 짧은 금액 */
export function eok(manwon: number): string {
  if (manwon < 10000) return `${manwon.toLocaleString()}만`;
  const v = Math.round((manwon / 10000) * 100) / 100;
  return `${v}억`;
}

/** +2,000만 / +2.5억 — 오른 금액 */
export function gainShort(manwon: number): string {
  return manwon >= 10000 ? `+${eok(manwon)}` : `+${manwon.toLocaleString()}만`;
}

function pick(brief: DailyBrief, group: Group): ShareItem[] {
  // 1) 그날 신고가를 비싼 순으로
  const records: ShareItem[] = brief.records
    .filter((r) => r.group === group)
    .sort((a, b) => b.priceManwon - a.priceManwon)
    .map((r) => ({
      regionCode: r.regionCode,
      complex: r.complex,
      regionName: r.regionName,
      group: r.group,
      dong: r.dong,
      areaM2: r.areaM2,
      floor: r.floor,
      dealDate: r.dealDate,
      priceManwon: r.priceManwon,
      gainManwon: r.gainManwon > 0 ? r.gainManwon : null,
    }));
  const seen = new Set(records.map((r) => r.complex));
  const out = records.slice(0, TOP_N);
  // 2) 신고가가 5개가 안 되면 그날 비싼 거래로 채웁니다 (신고가 표시 없이)
  const top = brief.groups.find((g) => g.group === group)?.top ?? [];
  for (const d of top) {
    if (out.length >= TOP_N) break;
    if (seen.has(d.complex)) continue;
    seen.add(d.complex);
    out.push({
      regionCode: d.regionCode,
      complex: d.complex,
      regionName: d.regionName,
      group: d.group,
      dong: d.dong,
      areaM2: d.areaM2,
      floor: d.floor,
      dealDate: d.dealDate,
      priceManwon: d.priceManwon,
      gainManwon: null,
    });
  }
  return out;
}

export function buildShareSet(brief: DailyBrief): ShareSet {
  const [, m, d] = brief.date.split("-").map(Number);
  return {
    date: brief.date,
    dateLabel: koDate(brief.date),
    md: `${m}/${d}`,
    saleCount: brief.totals.sale,
    recordCount: {
      부산: brief.records.filter((r) => r.group === "부산").length,
      울산: brief.records.filter((r) => r.group === "울산").length,
    },
    busan: pick(brief, "부산"),
    ulsan: pick(brief, "울산"),
  };
}

/** 채널별로 방문을 구분해 셀 수 있게 링크 끝에 꼬리표(UTM)를 붙입니다. */
export function trackedUrl(path: string, source: "x" | "instagram" | "naver_blog" | "cafe"): string {
  const medium = source === "naver_blog" || source === "cafe" ? "content" : "social";
  return `${SITE_URL}${path}?utm_source=${source}&utm_medium=${medium}&utm_campaign=daily_${new Date()
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, "")}`;
}

/*
 * 링크는 홈이 아니라 "그 글에 나온 단지 페이지"와 "그날 날짜 브리핑"으로 겁니다.
 * 블로그·카페 글은 오래 남기 때문에, 내용이 바뀌지 않는 주소(단지 페이지, /daily/날짜, 리포트)를 걸어야
 * 나중에 누르는 사람도 같은 내용을 보고, 구글도 그 페이지를 중요한 페이지로 봅니다.
 */
export function complexUrl(i: ShareItem, source: Parameters<typeof trackedUrl>[1]): string {
  return trackedUrl(complexHref(i.regionCode, i.complex), source);
}

export function dailyUrl(s: ShareSet, source: Parameters<typeof trackedUrl>[1]): string {
  return trackedUrl(`/daily/${s.date}`, source);
}

/** 이 날짜 기준 10일 안에 발행한 주간 리포트가 있으면 그 리포트 */
export function recentReport(s: ShareSet): { title: string; slug: string } | null {
  const r = REPORTS[0];
  if (!r) return null;
  const days = (Date.parse(s.date) - Date.parse(r.published)) / 86400000;
  return days >= 0 && days <= 10 ? { title: r.title, slug: r.slug } : null;
}

/** X 글자 수 — 한글·한자 등은 2자로, 링크는 23자로 셉니다 (X 규칙). 280이 한도입니다. */
export function xWeight(text: string): number {
  let n = 0;
  const withoutUrls = text.replace(/https?:\/\/\S+/g, (u) => {
    n += 23;
    return "";
  });
  for (const ch of withoutUrls) {
    const c = ch.codePointAt(0) ?? 0;
    n += c <= 0x10ff || (c >= 0x2000 && c <= 0x200d) || (c >= 0x2010 && c <= 0x201f) || (c >= 0x2032 && c <= 0x2037) ? 1 : 2;
  }
  return n;
}

function line(i: ShareItem): string {
  const g = i.gainManwon ? ` (${gainShort(i.gainManwon)})` : "";
  return `${aptLabel(i.complex)} ${Math.round(i.areaM2)}㎡ ${eok(i.priceManwon)}${g}`;
}

/** X 본문 — 280 한도 안에 들어가도록 줄 수를 줄여 가며 맞춥니다. 링크는 첫 댓글로 따로 답니다. */
export function xText(s: ShareSet): string {
  const total = s.recordCount["부산"] + s.recordCount["울산"];
  // 네이버·X 검색에서 "아파트 순위", "TOP"으로 찾는 사람이 많아 머리말에 넣습니다.
  const head = `🏢 ${s.md} 부산·울산 아파트 실거래 TOP5${total > 0 ? ` · 신고가 ${total}건` : ""}`;
  const tags = "#부산아파트 #울산아파트 #아파트순위 #실거래가";
  const all = [...s.busan.map((i) => ({ i, g: "부산" })), ...s.ulsan.map((i) => ({ i, g: "울산" }))];
  for (let n = Math.min(all.length, 5); n >= 1; n--) {
    const body = all
      .slice(0, n)
      .map(({ i }) => `· ${line(i)}`)
      .join("\n");
    const text = `${head}\n\n${body}\n\n${tags}`;
    if (xWeight(text) <= 280) return text;
  }
  return `${head}\n\n${tags}`;
}

export function xReply(s: ShareSet): string {
  const a = s.busan[0];
  return [
    a ? `${aptLabel(a.complex)} 거래 이력·가격 흐름 👉 ${complexUrl(a, "x")}` : "",
    `오늘 신고된 전체 실거래 👉 ${dailyUrl(s, "x")}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function instaCaption(s: ShareSet): string {
  const total = s.recordCount["부산"] + s.recordCount["울산"];
  const top = [...s.busan.slice(0, 3), ...s.ulsan.slice(0, 2)];
  return [
    `${s.dateLabel} 부산·울산 아파트 실거래 순위 TOP5 🏢`,
    total > 0 ? `국토부에 새로 뜬 매매 ${s.saleCount}건 중 신고가만 ${total}건!` : `국토부에 새로 뜬 매매 ${s.saleCount}건`,
    "",
    ...top.map((i) => `📍 ${line(i)} · ${i.regionName}`),
    "",
    "단지별 가격 흐름·전체 거래는 프로필 링크 👉 부울아파트",
    "",
    "#부산아파트 #울산아파트 #부산아파트순위 #울산아파트순위 #부산실거래가 #울산실거래가 #아파트신고가 #부산부동산 #울산부동산 #부울아파트",
  ].join("\n");
}

/**
 * 블로그 제목 — 네이버에서 실제로 많이 찾는 "부산 아파트 순위", "실거래가 TOP"을 맨 앞에 두고,
 * 뒤에 그날 가장 눈에 띄는 단지를 붙입니다. (네이버 서치어드바이저 검색어 1·2위가 "울산 아파트 순위",
 * "부산 아파트 거래량 순위"였습니다.)
 * 예: "부산 아파트 실거래가 순위 TOP5 (9월 30일) | 더샵센텀파크1차 18.6억, 신고가 10건"
 */
export function blogTitle(s: ShareSet): string {
  const a = s.busan[0];
  const total = s.recordCount["부산"] + s.recordCount["울산"];
  const lead = `부산 아파트 실거래가 순위 TOP5 (${s.dateLabel})`;
  const tail = [
    a ? `${aptLabel(a.complex)} ${eok(a.priceManwon)}${a.gainManwon ? " 신고가" : ""}` : "",
    total > 0 ? `신고가 ${total}건` : "",
  ]
    .filter(Boolean)
    .join(", ");
  return tail ? `${lead} | ${tail}` : lead;
}

export function blogIntro(s: ShareSet): string {
  const total = s.recordCount["부산"] + s.recordCount["울산"];
  const a = s.busan[0];
  return [
    `${s.dateLabel} 부산·울산 아파트 실거래가 순위 TOP5 정리`,
    `부산·울산 합쳐서 매매만 ${s.saleCount}건${total > 0 ? `, 신고가도 ${total}건이나 떴다` : ""}.`,
    a
      ? `가장 눈에 띈 건 ${aptLabel(a.complex)}(${a.regionName} ${a.dong}) ${Math.round(a.areaM2)}㎡ ${a.floor}층 ${fmtManwon(
          a.priceManwon
        )}${a.gainManwon ? `. 직전 최고가보다 ${fmtManwon(a.gainManwon)} 올랐다` : ""}.`
      : "",
    "",
    ...linkLines(s, "naver_blog"),
  ]
    .filter((l, idx, arr) => !(l === "" && arr[idx - 1] === ""))
    .join("\n");
}

export function cafeText(s: ShareSet): string {
  const total = s.recordCount["부산"] + s.recordCount["울산"];
  return [
    `[${s.dateLabel} 신고분] 부산·울산 아파트 실거래 순위 TOP5${total > 0 ? ` · 신고가 ${total}건` : ""}`,
    "",
    `국토부 실거래가 공개시스템에 오늘 새로 올라온 매매 ${s.saleCount}건 중${total > 0 ? ` 신고가(3년 내 최고가 경신) ${total}건` : ""}을 정리했습니다.`,
    "",
    "■ 부산 TOP5",
    ...s.busan.map((i) => `- ${i.regionName} ${i.dong} ${line(i)}, ${i.floor}층`),
    "",
    "■ 울산 TOP5",
    ...s.ulsan.map((i) => `- ${i.regionName} ${i.dong} ${line(i)}, ${i.floor}층`),
    "",
    "※ 계약일 기준 자료이며, 해제(취소)된 거래는 뺐습니다. 투자 권유가 아닌 정보 공유입니다.",
    "",
    ...linkLines(s, "cafe"),
    "",
    "출처: 국토교통부 실거래가 · 정리: 부울아파트",
  ].join("\n");
}

/** 블로그·카페 글 끝에 붙이는 링크 묶음 — 부산·울산 1위 단지 페이지, 그날 브리핑, (있으면) 이번 주 리포트 */
function linkLines(s: ShareSet, source: "naver_blog" | "cafe"): string[] {
  const out: string[] = [];
  const a = s.busan[0];
  const b = s.ulsan[0];
  if (a) out.push(`📍 ${aptLabel(a.complex)} 실거래가·가격 흐름 👉 ${complexUrl(a, source)}`);
  if (b) out.push(`📍 ${aptLabel(b.complex)} 실거래가·가격 흐름 👉 ${complexUrl(b, source)}`);
  out.push(`📋 ${s.dateLabel} 신고된 전체 실거래 👉 ${dailyUrl(s, source)}`);
  const r = recentReport(s);
  if (r) out.push(`📝 이번 주 시장 정리(주간 리포트) 👉 ${trackedUrl(`/report/${r.slug}`, source)}`);
  return out;
}
