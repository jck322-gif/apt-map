import type { DailyBrief, DailyDeal, RecordHigh } from "@/lib/daily";
import { koDate } from "@/lib/daily";
import { complexHref } from "@/lib/complex";
import { trackedUrl } from "@/lib/shareSet";

/**
 * 카페·블로그에 붙여 넣는 "단지 링크가 달린 순위표".
 *
 * 인스타·X용 TOP 이미지와 같은 모양(청록 머리말, 순위 동그라미, 1위 주황, 오른쪽 가격)을 표로 만들고,
 * 단지 이름을 누르면 부울아파트 단지 상세 페이지로 가게 합니다.
 * 네이버 카페·블로그 편집기는 웹페이지에서 복사한 표를 붙여 넣으면 표 모양·색·링크를 대부분 살립니다.
 * 편집기가 지우는 스타일(그라데이션, 둥근 모서리 등)은 쓰지 않고 단순한 인라인 스타일만 씁니다.
 *
 * 개수 규칙(운영자 지정): 신고가 순위는 TOP5, 매매가 순위는 TOP10.
 */

type Source = "cafe" | "naver_blog";

const RECORD_TOP = 5;
const DEAL_TOP = 10;

const C = { deep: "#144951", teal: "#1f6f78", coral: "#d9663f", red: "#c23b30", muted: "#5b6b66", line: "#d7dfdc", soft: "#eef3f2" };

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const md = (d: string) => `${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))}`;

/** 만원 → "13.7억", "9,500만" (이미지와 같은 짧은 표기) */
function eok(manwon: number): string {
  if (manwon < 10000) return `${manwon.toLocaleString()}만`;
  return `${Math.round((manwon / 10000) * 100) / 100}억`;
}

function link(code: string, complex: string, source: Source): string {
  const url = trackedUrl(complexHref(code, complex), source);
  return `<a href="${esc(url)}" target="_blank" style="color:${C.deep};font-weight:bold;font-size:17px;text-decoration:underline;">${esc(complex)}</a>`;
}

function rankCell(i: number): string {
  const first = i === 0;
  return `<td style="width:44px;text-align:center;vertical-align:middle;padding:10px 4px;border-bottom:1px solid ${C.line};"><span style="display:inline-block;width:30px;height:30px;line-height:30px;border-radius:15px;font-weight:bold;font-size:15px;background:${
    first ? C.coral : C.soft
  };color:${first ? "#ffffff" : C.deep};">${i + 1}</span></td>`;
}

/** 이미지의 청록 머리말과 같은 표 제목 줄 */
function headRow(tag: string, title: string, sub: string): string {
  return `<tr><td colspan="3" style="background:${C.deep};color:#ffffff;padding:14px 16px;">
<span style="display:inline-block;background:${C.coral};color:#ffffff;font-weight:bold;font-size:13px;padding:3px 10px;border-radius:12px;">${esc(tag)}</span><br>
<b style="font-size:20px;line-height:1.6;">${esc(title)}</b><br>
<span style="font-size:13px;color:#d6e6e3;">${esc(sub)}</span></td></tr>`;
}

function wrap(rows: string): string {
  return `<table style="border-collapse:collapse;width:100%;max-width:640px;background:#ffffff;border:1px solid ${C.line};font-family:sans-serif;">
${rows}
</table>`;
}

function footRow(dateLabel: string, allUrl: string): string {
  return `<tr><td colspan="3" style="padding:10px 16px;background:${C.soft};font-size:13px;color:${C.muted};">국토교통부 실거래가 · ${dateLabel} 신고분 · <a href="${esc(
    allUrl
  )}" target="_blank" style="color:${C.teal};font-weight:bold;">부울아파트 buulapt.com</a></td></tr>`;
}

function dealTable(rows: DailyDeal[], tag: string, title: string, dateLabel: string, allUrl: string, source: Source): string {
  const body = rows
    .map(
      (d, i) => `<tr>${rankCell(i)}
<td style="padding:10px 8px;border-bottom:1px solid ${C.line};vertical-align:middle;">${link(d.regionCode, d.complex, source)}<br><span style="font-size:13px;color:${C.muted};">${esc(
        d.regionName
      )} ${esc(d.dong)} · ${Math.round(d.areaM2)}㎡</span></td>
<td style="padding:10px 12px;border-bottom:1px solid ${C.line};text-align:right;vertical-align:middle;white-space:nowrap;"><b style="font-size:18px;color:${C.deep};">${eok(
        d.priceManwon
      )}</b><br><span style="font-size:13px;color:${C.muted};font-weight:bold;">${d.floor}층 · ${md(d.dealDate)} 계약</span></td></tr>`
    )
    .join("\n");
  return wrap(headRow(tag, title, "단지 이름을 누르면 거래 이력·가격 그래프를 볼 수 있어요") + "\n" + body + "\n" + footRow(dateLabel, allUrl));
}

function recordTable(rows: RecordHigh[], tag: string, title: string, dateLabel: string, allUrl: string, source: Source): string {
  const body = rows
    .map(
      (r, i) => `<tr>${rankCell(i)}
<td style="padding:10px 8px;border-bottom:1px solid ${C.line};vertical-align:middle;">${link(r.regionCode, r.complex, source)}<br><span style="font-size:13px;color:${C.muted};">${esc(
        r.group
      )} ${esc(r.regionName)} ${esc(r.dong)} · ${Math.round(r.areaM2)}㎡</span></td>
<td style="padding:10px 12px;border-bottom:1px solid ${C.line};text-align:right;vertical-align:middle;white-space:nowrap;"><b style="font-size:18px;color:${C.deep};">${eok(
        r.priceManwon
      )}</b><br><span style="font-size:14px;color:${C.red};font-weight:bold;">+${eok(r.gainManwon)}</span></td></tr>`
    )
    .join("\n");
  return wrap(headRow(tag, title, "같은 평형 최근 3년 최고가를 넘은 거래 (가격순)") + "\n" + body + "\n" + footRow(dateLabel, allUrl));
}

/** 카페·블로그용 본문(HTML): 소개 → 신고가 TOP5 표 → 부산 매매가 TOP10 표 → 울산 매매가 TOP10 표 → 면책 */
export function shareTablesHtml(brief: DailyBrief, source: Source): string {
  const dateLabel = koDate(brief.date);
  const busan = brief.groups.find((g) => g.group === "부산");
  const ulsan = brief.groups.find((g) => g.group === "울산");
  const recordsAll = [...brief.records].sort((a, b) => b.priceManwon - a.priceManwon);
  const records = recordsAll.slice(0, RECORD_TOP);
  const bTop = busan?.top.slice(0, DEAL_TOP) ?? [];
  const uTop = ulsan?.top.slice(0, DEAL_TOP) ?? [];
  const allUrl = trackedUrl(`/daily/${brief.date}`, source);
  const busanRec = recordsAll.filter((r) => r.group === "부산").length;
  const gap = "<p><br></p>";

  const parts: string[] = [
    `<p style="font-size:16px;"><b>${dateLabel}</b> 국토교통부에 새로 신고된 부산·울산 아파트 실거래가 순위입니다. 표의 <b>단지 이름을 누르면</b> 부울아파트에서 그 단지의 거래 이력과 가격 그래프를 볼 수 있어요.</p>`,
    `<p><a href="${esc(allUrl)}" target="_blank" style="color:${C.teal};font-weight:bold;font-size:16px;">▶ 오늘의 실거래 매매 ${brief.totals.sale}건 전체보기</a></p>`,
  ];
  if (records.length > 0)
    parts.push(
      gap,
      recordTable(
        records,
        `신고가 ${recordsAll.length}건 · 부산 ${busanRec} · 울산 ${recordsAll.length - busanRec}`,
        `${dateLabel} 신고분 아파트 신고가 순위 TOP${records.length}`,
        dateLabel,
        allUrl,
        source
      )
    );
  if (bTop.length > 0)
    parts.push(gap, dealTable(bTop, `부산 매매 ${busan?.count ?? bTop.length}건`, `${dateLabel} 신고분 부산 아파트 매매가 TOP${bTop.length}`, dateLabel, allUrl, source));
  if (uTop.length > 0)
    parts.push(gap, dealTable(uTop, `울산 매매 ${ulsan?.count ?? uTop.length}건`, `${dateLabel} 신고분 울산 아파트 매매가 TOP${uTop.length}`, dateLabel, allUrl, source));
  parts.push(
    gap,
    `<p style="color:${C.muted};font-size:13px;">※ 국토교통부 실거래가 기준(계약일 기준, 해제 거래 제외). 신고가 = 같은 단지·같은 평형 최근 3년 최고가 경신. 투자 권유가 아닌 정보 공유입니다.</p>`
  );
  return parts.join("\n");
}
