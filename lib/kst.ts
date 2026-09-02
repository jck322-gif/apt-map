/**
 * 한국 시간(KST) 기준 날짜 계산 도우미.
 *
 * Vercel 서버는 UTC로 돌아갑니다. 매일 새벽 5시(KST) 자동 갱신은 UTC로 보면
 * "전날 20시"라서, 서버 시각을 그대로 쓰면 "처음 본 날"이 하루씩 밀려 기록됩니다.
 * (그래서 오늘 새벽에 받아온 거래가 어제 신고분으로 찍혔습니다.)
 * 날짜를 다루는 곳은 전부 이 파일의 함수를 쓰도록 통일합니다.
 */

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** 기준 시각을 KST로 옮긴 Date. 값을 읽을 때는 반드시 getUTC*() 를 쓰세요. */
function shifted(base: Date): Date {
  return new Date(base.getTime() + KST_OFFSET_MS);
}

/** KST 기준 오늘 → "2026-09-02" */
export function kstToday(base = new Date()): string {
  const d = shifted(base);
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

/** KST 기준 오늘 → 20260902 (숫자) */
export function kstTodayYmdInt(base = new Date()): number {
  const d = shifted(base);
  return d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate();
}

/** KST 기준 오늘에서 days일 전 → 20260827 (숫자) */
export function kstYmdIntAgo(days: number, base = new Date()): number {
  return kstTodayYmdInt(new Date(base.getTime() - days * 86400000));
}

/** KST 기준으로 offsetMonths 만큼 이동한 달 → "202609" */
export function kstYyyymm(offsetMonths = 0, base = new Date()): string {
  const d = shifted(base);
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + offsetMonths, 1));
  return `${t.getUTCFullYear()}${pad2(t.getUTCMonth() + 1)}`;
}

/** 20260902 → "9월 2일" */
export function ymdIntToKoLabel(ymd: number): string {
  const m = Math.floor((ymd % 10000) / 100);
  const d = ymd % 100;
  return `${m}월 ${d}일`;
}
