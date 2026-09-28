/**
 * 계산기(/calc/...)에서 쓰는 순수 계산 함수들.
 *
 * 화면(컴포넌트)과 떼어 둔 이유: 세율·요율이 바뀌면 이 파일 한 곳만 고치면 되고,
 * 숫자가 맞는지 따로 시험해 볼 수 있습니다.
 *
 * ★ 기준일: 2026년 9월. 법이 바뀌면 아래 RULES_AS_OF와 해당 표를 함께 고쳐 주세요.
 * 금액 단위는 모두 "원"입니다 (화면에서 만원으로 입력받아 ×10,000 해서 넘깁니다).
 */

export const RULES_AS_OF = "2026년 9월";

/* ───────────────────────── 1. 취득세 ───────────────────────── */

export type HouseCount = "1" | "temp2" | "2" | "3" | "4+";

export type AcqInput = {
  /** 취득가액(원) */
  price: number;
  /** 전용 85㎡ 초과 여부 (농어촌특별세) */
  over85: boolean;
  /** 이번 집을 사고 난 뒤 세대가 가진 주택 수 */
  houses: HouseCount;
  /** 살 집이 조정대상지역인지 (2026년 9월 현재 부산·울산은 없음) */
  regulated: boolean;
  /** 비수도권, 공시가격 2억원 이하 → 주택 수와 상관없이 중과 제외 */
  cheapLocal: boolean;
  /** 생애최초 주택 구입 감면 (취득가액 12억 이하, 최대 200만원) */
  firstHome: boolean;
};

export type AcqResult = {
  /** 적용 취득세율 (예: 0.0167) */
  rate: number;
  /** 중과세율이 적용됐는지 */
  heavy: boolean;
  acqTax: number;
  firstHomeRelief: number;
  eduTax: number;
  ruralTax: number;
  total: number;
  /** 화면에 보여줄 설명 한 줄씩 */
  notes: string[];
};

const EOK = 100_000_000;
export const FIRST_HOME_PRICE_LIMIT = 12 * EOK;
export const FIRST_HOME_RELIEF_CAP = 2_000_000;

/**
 * 1주택 기준 표준세율.
 * 6억~9억 구간은 지방세법 제11조 ①8나: (취득가액 × 2/3억원 − 3) × 1/100,
 * 소수점 이하 다섯째 자리에서 반올림해 넷째 자리까지 (예: 0.016666… → 0.0167).
 */
export function baseAcqRate(price: number): number {
  if (price <= 6 * EOK) return 0.01;
  if (price <= 9 * EOK) {
    const r = ((price * 2) / (3 * EOK) - 3) / 100;
    return Math.round(r * 10000) / 10000;
  }
  return 0.03;
}

/** 주택 수·조정대상지역에 따른 중과세율 (없으면 null → 표준세율) */
export function heavyAcqRate(houses: HouseCount, regulated: boolean): number | null {
  if (houses === "1" || houses === "temp2") return null;
  if (regulated) return houses === "2" ? 0.08 : 0.12;
  if (houses === "2") return null;
  return houses === "3" ? 0.08 : 0.12;
}

export function calcAcquisitionTax(i: AcqInput): AcqResult {
  const notes: string[] = [];
  const price = Math.max(0, Math.floor(i.price));
  let heavyRate = heavyAcqRate(i.houses, i.regulated);
  if (heavyRate !== null && i.cheapLocal) {
    notes.push("비수도권 공시가격 2억원 이하 주택이라 주택 수와 상관없이 중과하지 않았습니다.");
    heavyRate = null;
  }
  const heavy = heavyRate !== null;
  const rate = heavy ? (heavyRate as number) : baseAcqRate(price);

  const acqTax = Math.floor(price * rate);

  // 지방교육세: 표준세율일 때는 (취득세율 × 50%) × 20%, 중과(8%·12%)일 때는 0.4%
  const eduRate = heavy ? 0.004 : rate * 0.5 * 0.2;
  const eduTax = Math.floor(price * eduRate);

  // 농어촌특별세: 전용 85㎡ 이하는 비과세. 초과하면 표준 0.2%, 8% 중과 0.6%, 12% 중과 1.0%
  let ruralRate = 0;
  if (i.over85) ruralRate = !heavy ? 0.002 : heavyRate === 0.08 ? 0.006 : 0.01;
  const ruralTax = Math.floor(price * ruralRate);

  let firstHomeRelief = 0;
  if (i.firstHome) {
    if (i.houses !== "1") {
      notes.push("생애최초 감면은 이 집이 세대의 첫 주택일 때만 받을 수 있어 빼고 계산했습니다.");
    } else if (price > FIRST_HOME_PRICE_LIMIT) {
      notes.push("생애최초 감면은 취득가액 12억원 이하만 받을 수 있어 빼고 계산했습니다.");
    } else {
      firstHomeRelief = Math.min(acqTax, FIRST_HOME_RELIEF_CAP);
    }
  }

  if (heavy) notes.push(`다주택 중과세율 ${Math.round(rate * 100)}%를 적용했습니다.`);
  if (i.houses === "temp2")
    notes.push("일시적 2주택은 기존 집을 기한(보통 3년) 안에 팔아야 1주택 세율이 유지됩니다. 못 팔면 차액이 추징됩니다.");

  const total = acqTax - firstHomeRelief + eduTax + ruralTax;
  return { rate, heavy, acqTax, firstHomeRelief, eduTax, ruralTax, total, notes };
}

/* ───────────────────────── 2. 중개보수 ───────────────────────── */

export type BrokerKind = "sale" | "jeonse" | "monthly";
type Band = { upTo: number; rate: number; cap: number | null };

/** 공인중개사법 시행규칙 별표1 (2021.10.19 시행) — 부산·울산 조례도 같은 표를 씁니다. */
export const SALE_BANDS: Band[] = [
  { upTo: 50_000_000, rate: 0.006, cap: 250_000 },
  { upTo: 200_000_000, rate: 0.005, cap: 800_000 },
  { upTo: 900_000_000, rate: 0.004, cap: null },
  { upTo: 1_200_000_000, rate: 0.005, cap: null },
  { upTo: 1_500_000_000, rate: 0.006, cap: null },
  { upTo: Infinity, rate: 0.007, cap: null },
];

export const LEASE_BANDS: Band[] = [
  { upTo: 50_000_000, rate: 0.005, cap: 200_000 },
  { upTo: 100_000_000, rate: 0.004, cap: 300_000 },
  { upTo: 600_000_000, rate: 0.003, cap: null },
  { upTo: 1_200_000_000, rate: 0.004, cap: null },
  { upTo: 1_500_000_000, rate: 0.005, cap: null },
  { upTo: Infinity, rate: 0.006, cap: null },
];

export type BrokerInput = {
  kind: BrokerKind;
  /** 매매가 또는 보증금(원) */
  amount: number;
  /** 월세(원) — kind가 monthly일 때만 */
  rent?: number;
  /** 부가세: 일반과세자 10%, 간이과세자 약 4%, 없음 */
  vat: "general" | "simple" | "none";
};

export type BrokerResult = {
  /** 요율을 곱하는 거래금액 (월세는 환산금액) */
  base: number;
  rate: number;
  cap: number | null;
  fee: number;
  vat: number;
  total: number;
  notes: string[];
};

export function calcBrokerageFee(i: BrokerInput): BrokerResult {
  const notes: string[] = [];
  let base = Math.max(0, Math.floor(i.amount));
  if (i.kind === "monthly") {
    const rent = Math.max(0, Math.floor(i.rent ?? 0));
    const b100 = base + rent * 100;
    if (b100 < 50_000_000) {
      base = base + rent * 70;
      notes.push("보증금 + 월세×100이 5천만원 미만이라 월세×70으로 환산했습니다.");
    } else {
      base = b100;
      notes.push("월세는 보증금 + 월세×100으로 환산한 금액에 요율을 곱합니다.");
    }
  }
  const bands = i.kind === "sale" ? SALE_BANDS : LEASE_BANDS;
  const band = bands.find((b) => base < b.upTo) ?? bands[bands.length - 1];
  let fee = Math.floor(base * band.rate);
  if (band.cap !== null && fee > band.cap) {
    fee = band.cap;
    notes.push(`이 구간은 한도액 ${band.cap.toLocaleString()}원이 적용됩니다.`);
  }
  const vatRate = i.vat === "general" ? 0.1 : i.vat === "simple" ? 0.04 : 0;
  const vat = Math.floor(fee * vatRate);
  return { base, rate: band.rate, cap: band.cap, fee, vat, total: fee + vat, notes };
}

/* ───────────────────────── 3. 주택담보대출 ───────────────────────── */

export type RepayMethod = "equal" | "principal" | "bullet";
export type RateKind = "variable" | "mixed" | "periodic" | "fixed";

/** 지방(수도권 밖) 주담대 스트레스 금리 — 2026년 12월 31일까지 0.75%p (3단계 1.5%p 적용 유예) */
export const LOCAL_STRESS_RATE = 0.0075;
export const STRESS_RATE_UNTIL = "2026년 12월 31일";
/** 금리 유형별 스트레스 금리 반영 비율 */
export const STRESS_SHARE: Record<RateKind, number> = { variable: 1, mixed: 0.6, periodic: 0.3, fixed: 0 };
export const DSR_BANK = 0.4;

export type YearRow = { year: number; principal: number; interest: number; balance: number };

export type LoanResult = {
  /** 첫 달 상환액 */
  firstMonth: number;
  /** 마지막 달 상환액 */
  lastMonth: number;
  totalInterest: number;
  totalPaid: number;
  years: YearRow[];
};

/** 원리금균등 월 상환액 */
export function equalPayment(principal: number, annualRate: number, months: number): number {
  const r = annualRate / 12;
  if (r === 0) return principal / months;
  return (principal * r) / (1 - Math.pow(1 + r, -months));
}

export function calcLoan(principal: number, annualRate: number, years: number, method: RepayMethod): LoanResult {
  const months = Math.max(1, Math.round(years * 12));
  const r = annualRate / 12;
  const pay = equalPayment(principal, annualRate, months);
  let balance = principal;
  let totalInterest = 0;
  let firstMonth = 0;
  let lastMonth = 0;
  const rows: YearRow[] = [];
  let yp = 0;
  let yi = 0;
  for (let m = 1; m <= months; m++) {
    const interest = balance * r;
    let prin: number;
    if (method === "equal") prin = pay - interest;
    else if (method === "principal") prin = principal / months;
    else prin = m === months ? balance : 0;
    prin = Math.min(prin, balance);
    balance -= prin;
    totalInterest += interest;
    yp += prin;
    yi += interest;
    const monthTotal = prin + interest;
    if (m === 1) firstMonth = monthTotal;
    if (m === months) lastMonth = monthTotal;
    if (m % 12 === 0 || m === months) {
      rows.push({ year: Math.ceil(m / 12), principal: yp, interest: yi, balance: Math.max(0, balance) });
      yp = 0;
      yi = 0;
    }
  }
  return {
    firstMonth: Math.round(firstMonth),
    lastMonth: Math.round(lastMonth),
    totalInterest: Math.round(totalInterest),
    totalPaid: Math.round(principal + totalInterest),
    years: rows.map((y) => ({
      year: y.year,
      principal: Math.round(y.principal),
      interest: Math.round(y.interest),
      balance: Math.round(y.balance),
    })),
  };
}

export type DsrInput = {
  /** 연소득(원) */
  income: number;
  /** 다른 대출의 1년 원리금 상환액(원) */
  otherAnnual: number;
  annualRate: number;
  years: number;
  rateKind: RateKind;
};

export type DsrResult = {
  stressAdd: number;
  stressRate: number;
  /** DSR 40% 안에서 이번 대출로 빌릴 수 있는 최대 원금(원) */
  maxPrincipal: number;
};

/**
 * DSR 40% 기준 최대 대출액 (대략).
 * 이번 주담대의 1년 원리금은 원리금균등 상환·스트레스 금리를 더한 금리로 계산합니다.
 */
export function calcDsrLimit(i: DsrInput): DsrResult {
  const stressAdd = LOCAL_STRESS_RATE * STRESS_SHARE[i.rateKind];
  const stressRate = i.annualRate + stressAdd;
  const room = Math.max(0, i.income * DSR_BANK - i.otherAnnual);
  const months = Math.max(1, Math.round(i.years * 12));
  const perWonAnnual = equalPayment(1, stressRate, months) * 12;
  const maxPrincipal = perWonAnnual > 0 ? Math.floor(room / perWonAnnual) : 0;
  return { stressAdd, stressRate, maxPrincipal };
}

/** 비규제지역(부산·울산) LTV — 일반 70%, 생애최초 80% */
export function ltvLimit(price: number, firstHome: boolean): number {
  return Math.floor(price * (firstHome ? 0.8 : 0.7));
}

/* ───────────────────────── 표시용 ───────────────────────── */

/** 원 → "1,234,567원" */
export function won(n: number): string {
  return `${Math.round(n).toLocaleString("ko-KR")}원`;
}

/** 원 → "7억 5,000만원" / "385만 2,000원" 처럼 읽기 쉬운 한글 금액 */
export function wonKo(n: number): string {
  const v = Math.round(n);
  if (v === 0) return "0원";
  const sign = v < 0 ? "-" : "";
  let a = Math.abs(v);
  const eok = Math.floor(a / EOK);
  a %= EOK;
  const man = Math.floor(a / 10000);
  const rest = a % 10000;
  const parts: string[] = [];
  if (eok) parts.push(`${eok.toLocaleString()}억`);
  if (man) parts.push(`${man.toLocaleString()}만`);
  if (rest) parts.push(rest.toLocaleString());
  return `${sign}${parts.join(" ")}원`;
}

/** 원 → 만원 단위로 반올림한 "2억 1,561만원" (큰 금액 요약용) */
export function wonMan(n: number): string {
  const man = Math.round(n / 10000);
  if (man === 0) return "0원";
  const eok = Math.floor(Math.abs(man) / 10000);
  const rest = Math.abs(man) % 10000;
  const sign = man < 0 ? "-" : "";
  if (!eok) return `${sign}${rest.toLocaleString()}만원`;
  return `${sign}${eok.toLocaleString()}억${rest ? ` ${rest.toLocaleString()}만` : ""}원`;
}

export function pct(rate: number, digits = 2): string {
  return `${(rate * 100).toFixed(digits).replace(/\.?0+$/, "")}%`;
}
