import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { kstToday } from "@/lib/kst";
import { REGIONS } from "@/lib/regions";
import { complexHref } from "@/lib/complex";
import { fmtManwon, aptLabel } from "@/lib/format";
import { SITE_URL } from "@/lib/site";
import { sendMail, mailLayout, escapeHtml } from "@/lib/mail";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * 관심 단지 이메일 알림 — 매일 아침(실거래 갱신 뒤) Vercel Cron이 부릅니다.
 *
 * 그날 새로 신고된(first_seen_at = 오늘) 매매 중
 *   - notify_record: 신고가(record_highs)
 *   - notify_all:    모든 매매 실거래
 * 를 관심 단지별로 모아 한 사람에게 하루 한 통만 보냅니다(notification_log로 중복 방지).
 *
 * 수동 실행: /api/notify?secret=CRON_SECRET  (date=2026-10-14 로 날짜 지정, dry=1 이면 보내지 않고 결과만)
 */

type Watch = { user_id: string; region_code: string; complex: string; notify_record: boolean; notify_all: boolean };
type Deal = { region_code: string; complex: string; dong: string; area_m2: number | string; floor: number; price_manwon: number; deal_date: string };
type Rec = Deal & { prev_price_manwon: number; prev_deal_date: string | null; gain_manwon: number };

const md = (d: string) => `${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))}`;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const ok =
      request.headers.get("authorization") === `Bearer ${cronSecret}` || searchParams.get("secret") === cronSecret;
    if (!ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const date = /^\d{4}-\d{2}-\d{2}$/.test(searchParams.get("date") ?? "") ? (searchParams.get("date") as string) : kstToday();
  const dry = searchParams.get("dry") === "1";
  const db = getDb();

  // 1) 알림 받는 사람과 관심 단지
  // 이메일 확인을 마쳤고, 필수 동의를 했고, 메일을 멈추지 않은 사람만
  const { data: users } = await db
    .from("app_users")
    .select("id, email, unsub_token")
    .eq("email_paused", false)
    .eq("email_verified", true)
    .not("email", "is", null)
    .not("terms_agreed_at", "is", null);
  if (!users || users.length === 0) return NextResponse.json({ date, users: 0, sent: 0 });
  const userById = new Map(users.map((u) => [u.id as string, u]));
  const { data: watchRows } = await db
    .from("user_watches")
    .select("user_id, region_code, complex, notify_record, notify_all")
    .in("user_id", Array.from(userById.keys()));
  const watches = ((watchRows ?? []) as Watch[]).filter((w) => w.notify_record || w.notify_all);
  if (watches.length === 0) return NextResponse.json({ date, users: users.length, watches: 0, sent: 0 });

  // 2) 그날 신고분 — 관심 단지가 있는 구·군만 읽어 옵니다
  const codes = Array.from(new Set(watches.map((w) => w.region_code)));
  const key = (c: string, n: string) => `${c}|${n.normalize("NFC")}`;
  const watched = new Set(watches.map((w) => key(w.region_code, w.complex)));

  const [dealsRes, recsRes] = await Promise.all([
    db
      .from("deals")
      .select("region_code, complex, dong, area_m2, floor, price_manwon, deal_date, cancel_date")
      .eq("first_seen_at", date)
      .eq("deal_type", "sale")
      .in("region_code", codes)
      .order("price_manwon", { ascending: false })
      .limit(3000),
    db
      .from("record_highs")
      .select("region_code, complex, dong, area_m2, floor, price_manwon, deal_date, prev_price_manwon, prev_deal_date, gain_manwon")
      .eq("first_seen_at", date)
      .in("region_code", codes)
      .limit(1000),
  ]);
  const deals = ((dealsRes.data ?? []) as (Deal & { cancel_date: string | null })[]).filter(
    (d) => !d.cancel_date && d.price_manwon && watched.has(key(d.region_code, d.complex))
  );
  const recs = ((recsRes.data ?? []) as Rec[]).filter((r) => watched.has(key(r.region_code, r.complex)));

  // 3) 이미 보낸 사람은 건너뜁니다
  const { data: logged } = await db.from("notification_log").select("user_id").eq("sent_date", date);
  const already = new Set((logged ?? []).map((l) => l.user_id as string));

  const byUser = new Map<string, Watch[]>();
  for (const w of watches) {
    if (already.has(w.user_id)) continue;
    byUser.set(w.user_id, [...(byUser.get(w.user_id) ?? []), w]);
  }

  let sent = 0;
  const preview: { email: string; items: number }[] = [];
  for (const [uid, ws] of Array.from(byUser.entries())) {
    const u = userById.get(uid);
    if (!u) continue;
    const blocks: { title: string; href: string; lines: string[]; textLines: string[] }[] = [];
    let total = 0;
    for (const w of ws) {
      const k = key(w.region_code, w.complex);
      const region = REGIONS.find((r) => r.code === w.region_code);
      const r = recs.filter((x) => key(x.region_code, x.complex) === k);
      const d = w.notify_all ? deals.filter((x) => key(x.region_code, x.complex) === k) : [];
      if (r.length === 0 && d.length === 0) continue;
      const lines: string[] = [];
      const textLines: string[] = [];
      for (const x of r) {
        const t = `🔥 신고가 ${Math.round(Number(x.area_m2))}㎡ ${x.floor}층 ${fmtManwon(x.price_manwon)} (종전 최고 ${fmtManwon(
          x.prev_price_manwon
        )}, +${fmtManwon(x.gain_manwon)}) · ${md(x.deal_date)} 계약`;
        lines.push(`<li style="margin:0 0 4px"><b style="color:#c23b30">🔥 신고가</b> ${escapeHtml(t.replace("🔥 신고가 ", ""))}</li>`);
        textLines.push(t);
      }
      const recKeys = new Set(r.map((x) => `${x.deal_date}|${x.floor}|${x.price_manwon}`));
      for (const x of d) {
        if (recKeys.has(`${x.deal_date}|${x.floor}|${x.price_manwon}`)) continue; // 신고가로 이미 적은 거래
        const t = `매매 ${Math.round(Number(x.area_m2))}㎡ ${x.floor}층 ${fmtManwon(x.price_manwon)} · ${md(x.deal_date)} 계약`;
        lines.push(`<li style="margin:0 0 4px">${escapeHtml(t)}</li>`);
        textLines.push(t);
      }
      total += lines.length;
      blocks.push({
        title: `${aptLabel(w.complex)} (${region?.group ?? ""} ${region?.name ?? ""})`,
        href: `${SITE_URL}${complexHref(w.region_code, w.complex)}?utm_source=email&utm_medium=alert&utm_campaign=alert_${date.replace(/-/g, "")}`,
        lines,
        textLines,
      });
    }
    if (blocks.length === 0) continue;

    const hasRecord = blocks.some((b) => b.lines.some((l) => l.includes("신고가")));
    const first = blocks[0].title.split(" (")[0];
    const subject = `[부울아파트] ${first}${blocks.length > 1 ? ` 외 ${blocks.length - 1}곳` : ""} ${hasRecord ? "신고가" : "새 실거래"} 알림 (${md(date)} 신고분)`;
    const unsub = `${SITE_URL}/api/unsubscribe?t=${u.unsub_token}`;
    const html = mailLayout(
      `${md(date)} 관심 단지 실거래`,
      `<p style="margin:0 0 16px">오늘 국토교통부에 새로 신고된 관심 단지 거래입니다.</p>` +
        blocks
          .map(
            (b) =>
              `<div style="margin:0 0 18px"><a href="${escapeHtml(b.href)}" style="font-size:16px;font-weight:800;color:#144951;text-decoration:none">${escapeHtml(
                b.title
              )} →</a><ul style="margin:6px 0 0;padding-left:18px">${b.lines.join("")}</ul></div>`
          )
          .join("") +
        `<p style="margin:8px 0 0"><a href="${SITE_URL}/daily/${date}?utm_source=email&utm_medium=alert" style="color:#1f6f78;font-weight:700">오늘의 부산·울산 실거래 전체 보기 →</a></p>`,
      `국토교통부 실거래가 기준(계약일, 해제 거래 제외)이며 투자 권유가 아닌 정보 안내입니다.<br>
<a href="${SITE_URL}/account" style="color:#1f6f78">알림 단지·종류 바꾸기</a> · <a href="${unsub}" style="color:#5b6b66">알림 메일 수신 거부</a><br>부울아파트 · buulapt.com`
    );
    const text =
      `${md(date)} 관심 단지 실거래 (부울아파트)\n\n` +
      blocks.map((b) => `■ ${b.title}\n${b.textLines.map((t) => `- ${t}`).join("\n")}\n${b.href}`).join("\n\n") +
      `\n\n알림 설정: ${SITE_URL}/account\n수신 거부: ${unsub}`;

    preview.push({ email: u.email as string, items: total });
    if (dry) continue;
    const ok = await sendMail({
      to: u.email as string,
      subject,
      html,
      text,
      headers: { "List-Unsubscribe": `<${unsub}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
    });
    if (ok) {
      sent += 1;
      await db.from("notification_log").insert({ user_id: uid, sent_date: date, item_count: total });
    }
  }

  return NextResponse.json({
    date,
    users: users.length,
    watches: watches.length,
    matchedDeals: deals.length,
    matchedRecords: recs.length,
    sent,
    ...(dry ? { preview } : {}),
  });
}
