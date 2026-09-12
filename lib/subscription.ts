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

  return {
    pblancNo,
    houseName,
    regionName: pick(item, ["SUBSCRPT_AREA_CODE_NM", "subscrptAreaCodeNm"]),
    address: pick(item, ["HSSPLY_ADRES", "hssplyAdres", "HSSPLY_ZIP", "PBLANC_ADRES"]),
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
): Promise<{ data: Record<string, unknown>[]; totalCount: number }> {
  const qs = new URLSearchParams({
    page: String(page),
    perPage: String(perPage),
    serviceKey, // odcloud는 보통 Authorization 헤더를 쓰지만, 혹시 몰라 쿼리로도 함께 보냅니다.
  });
  const res = await fetch(`${BASE_URL}?${qs.toString()}`, {
    headers: { Authorization: `Infuser ${serviceKey}` },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`청약홈 API HTTP ${res.status} (page ${page})`);
  }
  const json = await res.json();
  const data = Array.isArray(json?.data) ? json.data : [];
  const totalCount = Number(json?.totalCount ?? data.length) || data.length;
  return { data, totalCount };
}

/**
 * 부산·울산 청약 일정을 가져옵니다. 페이지를 넘겨가며 최대 MAX_PAGES까지 읽고,
 * 지역명에 "부산"·"울산"이 들어간 항목만 남깁니다.
 * (odcloud 응답이 최신순인지 확정할 수 없어, 넉넉히 읽은 뒤 우리 쪽에서 필터링합니다.)
 */
export async function getBusanUlsanSubscriptions(serviceKey: string): Promise<SubscriptionEntry[]> {
  const PER_PAGE = 100;
  const MAX_PAGES = 5;
  const seen = new Map<string, SubscriptionEntry>();

  for (let page = 1; page <= MAX_PAGES; page++) {
    let batch: Record<string, unknown>[] = [];
    let totalCount = 0;
    try {
      const result = await fetchPage(serviceKey, page, PER_PAGE);
      batch = result.data;
      totalCount = result.totalCount;
    } catch {
      break; // 이번 페이지 실패해도, 이미 모은 것까지는 화면에 보여줍니다.
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
