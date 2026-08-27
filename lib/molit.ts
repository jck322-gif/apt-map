import { XMLParser } from "fast-xml-parser";

// 국토교통부 아파트매매 실거래 상세 자료 (RTMSDataSvcAptTradeDev) 클라이언트
// 공식 문서: https://www.data.go.kr/data/15126468/openapi.do

export type TradeRow = {
  dong: string;
  complex: string;
  areaM2: number;
  floor: number;
  priceManwon: number; // 만원 단위
  buildYear: number | null;
  dealYear: number;
  dealMonth: number;
  dealDay: number;
};

const BASE_URL =
  "https://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev";

const parser = new XMLParser({ ignoreAttributes: true, trimValues: true });

function num(v: unknown): number {
  if (v === undefined || v === null) return NaN;
  const s = String(v).replace(/,/g, "").trim();
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

/**
 * 특정 지역(LAWD_CD, 5자리)의 특정 계약월(YYYYMM) 실거래 목록을 가져옵니다.
 * 네트워크/API 오류는 예외로 던지지 않고 빈 배열을 반환합니다(호출부에서 지역별로 독립 처리되도록).
 */
export async function fetchTrades(
  lawdCd: string,
  dealYmd: string,
  serviceKey: string
): Promise<TradeRow[]> {
  const qs = new URLSearchParams({
    serviceKey,
    LAWD_CD: lawdCd,
    DEAL_YMD: dealYmd,
    numOfRows: "1000",
    pageNo: "1",
  });

  const res = await fetch(`${BASE_URL}?${qs.toString()}`, {
    // 공공데이터포털 API는 매 요청마다 최신 데이터를 봐야 하므로 캐시하지 않음
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`MOLIT API HTTP ${res.status} (지역 ${lawdCd}, ${dealYmd})`);
  }

  const xml = await res.text();
  const json = parser.parse(xml);
  const response = json?.response;
  const resultCodeRaw = response?.header?.resultCode;
  // fast-xml-parser는 "0"처럼 숫자로 보이는 텍스트를 자동으로 숫자 0으로 바꿔버리므로
  // 문자열로 통일해서 비교합니다. 국토부 API는 API마다 성공 코드가 "000"/"00"/"0"으로
  // 제각각이라, 알려진 성공 코드이거나 resultMsg가 "OK"/"NORMAL SERVICE" 계열이면
  // 성공으로 간주합니다.
  const resultCode = resultCodeRaw === undefined || resultCodeRaw === null ? undefined : String(resultCodeRaw);
  const resultMsg = response?.header?.resultMsg;
  const SUCCESS_CODES = new Set(["0", "00", "000"]);
  const looksSuccessful =
    resultCode === undefined ||
    SUCCESS_CODES.has(resultCode) ||
    (typeof resultMsg === "string" && /^(ok|normal service\.?)$/i.test(resultMsg.trim()));

  if (!looksSuccessful) {
    throw new Error(`MOLIT API 오류 [${resultCode}] ${resultMsg ?? "알 수 없는 오류"} (지역 ${lawdCd}, ${dealYmd})`);
  }

  const rawItems = response?.body?.items?.item;
  if (!rawItems) return []; // 해당 지역·월에 거래가 없는 경우

  const items = Array.isArray(rawItems) ? rawItems : [rawItems];

  return items
    .map((it: Record<string, unknown>): TradeRow | null => {
      const priceManwon = num(it.dealAmount);
      const areaM2 = num(it.excluUseAr);
      const floor = num(it.floor);
      const dealYear = num(it.dealYear);
      const dealMonth = num(it.dealMonth);
      const dealDay = num(it.dealDay);
      if (!Number.isFinite(priceManwon) || !Number.isFinite(areaM2)) return null;
      return {
        dong: String(it.umdNm ?? "").trim(),
        complex: String(it.aptNm ?? "").trim(),
        areaM2,
        floor: Number.isFinite(floor) ? floor : 0,
        priceManwon,
        buildYear: Number.isFinite(num(it.buildYear)) ? num(it.buildYear) : null,
        dealYear,
        dealMonth,
        dealDay,
      };
    })
    .filter((row): row is TradeRow => row !== null);
}

/** "YYYYMM" 문자열 계산 (0 = 이번 달, -1 = 지난 달, ...) */
export function yyyymm(offsetMonths: number, base = new Date()): string {
  const d = new Date(base.getFullYear(), base.getMonth() + offsetMonths, 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}${m}`;
}
