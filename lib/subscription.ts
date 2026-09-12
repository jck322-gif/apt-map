// 청약 계획 달력 — 한국부동산원 청약홈(공공데이터포털) "APT 분양정보" API 연동.
//
// ⚠️ 국토부 실거래가 API(apis.data.go.kr)와 달리, 이 API는 다른 서버(api.odcloud.kr)에서
// 제공되고 응답 형식도 다릅니다(odcloud 공통 포맷: data/page/perPage/totalCount).
// 인증키는 사장님이 data.go.kr에서 "한국부동산원_청약홈 분양정보 조회 서비스"를
// 별도로 활용신청해서 받은 것을 그대로 씁니다(실거래가 키와 같은 계정, 다른 서비스).
//
// 공식 문서에 응답 항목 전체가 표로 나와 있지 않아, 실제로 널리 쓰이는 필드 이름들을
// 기준으로 최대한 관대하게 읽습니다(모르는 필드는 그냥 비워 두고, 아는 필드만 채웁니다).
// 나중에 실제 응답을 보고 필드 이름이 다르면 이 파일의 candidates 배열에 이름만 추가하면 됩니다.
//
// 실거래가와 마찬가지로, 방문자가 페이지를 열 때마다 이 외부 API를 직접 부르지 않고
// Supabase의 subscriptions 테이블에 미리 저장해둔 결과만 읽습니다(빠르게 뜨도록).
// 실제로 외부 API를 불러와 테이블을 채우는 건 /api/subscription-sync 입니다
// (supabase-migration-10.sql로 테이블을 먼저 만들어야 합니다).

import type { SupabaseClient } from "@supabase/supabase-js";

const BASE_URL = "https://api.odcloud.kr/api/ApplyhomeInfoDetailSvc/v1/getAPTLttotPblancDetail";

export type SubscriptionEntry = {
  pblancNo: string; // 공고번호 (고유 식별자로 사용)
  houseName: string; // 단지명
  regionName: string; // 공급지역(시·도) — 예: "부산광역시"
  address: string; // 공급위치 (구·군까지 나오는 경우가 많음)
  houseType: string; // 국민/민영 등 구분
  totalHouseholds: number | null; // 총 공급세대수
  noticeDate: string | null; // 모집공고일 YYYY-MM-DD
  specialSupplyStart: string | null; // 특별공급 접수 시작일
  specialSupplyEnd: string | null;
  rank1Start: string | null; // 1순위 접수 시작일
  rank1End: string | null;
  rank2Start: string | null; // 2순위 접수 시작일
  rank2End: string | null;
  winnerAnnounceDate: string | null; // 당첨자 발표일
  homepageUrl: string | null;
};

function pick(item: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const v = item[k];
    if (v !== undefined && v !== null) {
      const s = String(v).trim();
      if (s !== "" && s !== "-") return s;
    }
  }
  return "";
}

function pickDate(item: Record<string, unknown>, keys: string[]): string | null {
  const raw = pick(item, keys);
  if (!raw) return null;
  // "20260803" 또는 "2026-08-03" 둘 다 받아서 "2026-08-03"로 통일
  const digits = raw.replace(/[^0-9]/g, "");
  if (digits.length !== 8) return null;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
}

function pickNumber(item: Record<string, unknown>, keys: string[]): number | null {
  const raw = pick(item, keys).replace(/,/g, "");
  const n = Number(raw);
  return Number.isFinite(n) && raw !== "" ? n : null;
}

function parseEntry(item: Record<string, unknown>): SubscriptionEntry | null {
  const houseName = pick(item, ["HOUSE_NM", "houseNm"]);
  const pblancNo = pick(item, ["PBLANC_NO", "pblancNo"]);
  if (!houseName || !pblancNo) return null;

  // 실제 응답에는 "SUBSCRPT_AREA_CODE_NM" 같은 시·도 전용 필드가 없었습니다(debug로 확인).
  // 대신 공급위치 주소(HSSPLY_ADRES)가 항상 "부산광역시 남구 ..." 처럼 시·도로 시작하므로,
  // 그 첫 단어를 지역명으로 씁니다. (전용 필드가 나중에 생기면 그것도 우선 시도합니다.)
  const address = pick(item, ["HSSPLY_ADRES", "hssplyAdres", "HSSPLY_ZIP", "PBLANC_ADRES"]);
  const regionFromField = pick(item, ["SUBSCRPT_AREA_CODE_NM", "subscrptAreaCodeNm"]);
  const regionName = regionFromField || address.split(/\s+/)[0] || "";

  return {
    pblancNo,
    houseName,
    regionName,
    address,
    houseType: pick(item, ["HOUSE_SECD_NM", "houseSecdNm", "HOUSE_DTL_SECD_NM"]),
    totalHouseholds: pickNumber(item, ["TOT_SUPLY_HSHLDCO", "totSuplyHshldco"]),
    noticeDate: pickDate(item, ["RCRIT_PBLANC_DE", "rcritPblancDe"]),
    specialSupplyStart: pickDate(item, ["SPSPLY_RCEPT_BGNDE", "spsplyRceptBgnde"]),
    specialSupplyEnd: pickDate(item, ["SPSPLY_RCEPT_ENDDE", "spsplyRceptEndde"]),
    rank1Start: pickDate(item, [
      "GNRL_RNK1_CRSPAREA_RCPTDE",
      "GNRL_RNK1_CRSPAREA_RCEPT_BGNDE",
      "RCEPT_BGNDE",
      "rceptBgnde",
    ]),
    rank1End: pickDate(item, [
      "GNRL_RNK1_CRSPAREA_ENDDE",
      "GNRL_RNK1_CRSPAREA_RCEPT_ENDDE",
      "RCEPT_ENDDE",
      "rceptEndde",
    ]),
    rank2Start: pickDate(item, ["GNRL_RNK2_CRSPAREA_RCPTDE", "GNRL_RNK2_CRSPAREA_RCEPT_BGNDE"]),
    rank2End: pickDate(item, ["GNRL_RNK2_CRSPAREA_ENDDE", "GNRL_RNK2_CRSPAREA_RCEPT_ENDDE"]),
    winnerAnnounceDate: pickDate(item, ["PRZWNER_PRESNATN_DE", "przwnerPresnatnDe"]),
    homepageUrl: pick(item, ["HMPG_ADRES", "hmpgAdres"]) || null,
  };
}

async function fetchPage(
  serviceKey: string,
  page: number,
  perPage: number
): Promise<{ data: Record<string, unknown>[]; totalCount: number; rawText: string }> {
  const qs = new URLSearchParams({
    page: String(page),
    perPage: String(perPage),
    serviceKey, // odcloud는 보통 Authorization 헤더를 쓰지만, 혹시 몰라 쿼리로도 함께 보냅니다.
  });
  const res = await fetch(`${BASE_URL}?${qs.toString()}`, {
    headers: { Authorization: `Infuser ${serviceKey}` },
    cache: "no-store",
  });
  const rawText = await res.text();
  if (!res.ok) {
    throw new Error(`청약홈 API HTTP ${res.status} (page ${page}) — ${rawText.slice(0, 300)}`);
  }
  let json: unknown;
  try {
    json = JSON.parse(rawText);
  } catch {
    throw new Error(`청약홈 API 응답이 JSON이 아닙니다 (page ${page}) — ${rawText.slice(0, 300)}`);
  }
  const data = Array.isArray((json as Record<string, unknown>)?.data)
    ? ((json as Record<string, unknown>).data as Record<string, unknown>[])
    : [];
  const totalCount = Number((json as Record<string, unknown>)?.totalCount ?? data.length) || data.length;
  return { data, totalCount, rawText };
}

/**
 * 부산·울산 청약 일정을 가져옵니다. 페이지를 넘겨가며 최대 MAX_PAGES까지 읽고,
 * 지역명에 "부산"·"울산"이 들어간 항목만 남깁니다.
 * (odcloud 응답이 최신순인지 확정할 수 없어, 넉넉히 읽은 뒤 우리 쪽에서 필터링합니다.)
 *
 * 1페이지가 실패하면(키·엔드포인트 문제일 가능성이 커서) 바로 예외를 던져 원인을 드러내고,
 * 2페이지부터의 실패는 이미 모은 데이터라도 보여주기 위해 조용히 멈춥니다.
 */
export async function getBusanUlsanSubscriptions(serviceKey: string): Promise<SubscriptionEntry[]> {
  // 전국 공고가 한 번에 (지금 기준 약 2,875건) 들어있고 지역별 정렬을 보장하지 않아서,
  // 부산·울산을 놓치지 않으려면 전체를 다 훑어야 합니다. 하루 한 번(크론)만 도는 작업이라
  // 넉넉히 잡아도 괜찮습니다.
  const PER_PAGE = 500;
  const MAX_PAGES = 20; // 500 × 20 = 최대 10,000건까지 커버
  const seen = new Map<string, SubscriptionEntry>();

  for (let page = 1; page <= MAX_PAGES; page++) {
    let batch: Record<string, unknown>[] = [];
    let totalCount = 0;
    try {
      const result = await fetchPage(serviceKey, page, PER_PAGE);
      batch = result.data;
      totalCount = result.totalCount;
    } catch (err) {
      if (page === 1) throw err;
      break;
    }
    if (batch.length === 0) break;

    for (const raw of batch) {
      const entry = parseEntry(raw);
      if (!entry) continue;
      if (!/부산|울산/.test(entry.regionName)) continue;
      seen.set(entry.pblancNo, entry);
    }

    if (page * PER_PAGE >= totalCount) break;
  }

  return Array.from(seen.values());
}

/** 문제 진단용 — 1페이지를 있는 그대로(가공 없이) 가져와 상태코드·원문 일부·파싱 결과를 함께 돌려줍니다. */
export async function debugFetchSubscriptions(
  serviceKey: string
): Promise<{ rawSample: string; totalCount: number; parsedCount: number; sampleParsed: SubscriptionEntry | null }> {
  const { data, totalCount, rawText } = await fetchPage(serviceKey, 1, 3);
  const parsed = data.map(parseEntry).filter((e): e is SubscriptionEntry => e !== null);
  return {
    rawSample: rawText.slice(0, 1500),
    totalCount,
    parsedCount: parsed.length,
    sampleParsed: parsed[0] ?? null,
  };
}

// ── Supabase 저장/조회 ─────────────────────────────────────────────

type SubscriptionRow = {
  pblanc_no: string;
  house_name: string;
  region_name: string;
  address: string | null;
  house_type: string | null;
  total_households: number | null;
  notice_date: string | null;
  special_supply_start: string | null;
  special_supply_end: string | null;
  rank1_start: string | null;
  rank1_end: string | null;
  rank2_start: string | null;
  rank2_end: string | null;
  winner_announce_date: string | null;
  homepage_url: string | null;
};

function toRow(e: SubscriptionEntry): SubscriptionRow {
  return {
    pblanc_no: e.pblancNo,
    house_name: e.houseName,
    region_name: e.regionName,
    address: e.address || null,
    house_type: e.houseType || null,
    total_households: e.totalHouseholds,
    notice_date: e.noticeDate,
    special_supply_start: e.specialSupplyStart,
    special_supply_end: e.specialSupplyEnd,
    rank1_start: e.rank1Start,
    rank1_end: e.rank1End,
    rank2_start: e.rank2Start,
    rank2_end: e.rank2End,
    winner_announce_date: e.winnerAnnounceDate,
    homepage_url: e.homepageUrl,
  };
}

function fromRow(r: SubscriptionRow): SubscriptionEntry {
  return {
    pblancNo: r.pblanc_no,
    houseName: r.house_name,
    regionName: r.region_name,
    address: r.address ?? "",
    houseType: r.house_type ?? "",
    totalHouseholds: r.total_households,
    noticeDate: r.notice_date,
    specialSupplyStart: r.special_supply_start,
    specialSupplyEnd: r.special_supply_end,
    rank1Start: r.rank1_start,
    rank1End: r.rank1_end,
    rank2Start: r.rank2_start,
    rank2End: r.rank2_end,
    winnerAnnounceDate: r.winner_announce_date,
    homepageUrl: r.homepage_url,
  };
}

/** 청약홈에서 새로 받아온 목록을 subscriptions 테이블에 upsert(있으면 갱신, 없으면 추가)합니다. */
export async function saveSubscriptions(db: SupabaseClient, entries: SubscriptionEntry[]): Promise<void> {
  const rows = entries.map((e) => ({ ...toRow(e), updated_at: new Date().toISOString() }));
  const CHUNK = 200;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    const { error } = await db.from("subscriptions").upsert(slice, { onConflict: "pblanc_no" });
    if (error) throw new Error(`subscriptions 저장 실패: ${error.message}`);
  }
}

/** 우리 DB(subscriptions 테이블)에 저장해둔 부산·울산 청약 일정을 읽어옵니다. 빠릅니다. */
export async function getStoredSubscriptions(db: SupabaseClient): Promise<SubscriptionEntry[]> {
  const { data, error } = await db
    .from("subscriptions")
    .select("*")
    .or("region_name.ilike.%부산%,region_name.ilike.%울산%")
    .limit(1000);
  if (error) throw new Error(`subscriptions 조회 실패: ${error.message}`);
  return (data ?? []).map((r) => fromRow(r as SubscriptionRow));
}
