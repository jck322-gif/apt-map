/**
 * 단지 카드 이미지 만들기.
 *
 * 팝업에서 보고 있는 단지 정보를 한 장의 PNG로 그려서, 카페·블로그에 바로 붙일 수 있게 합니다.
 * 브라우저의 <canvas>에 직접 그리기 때문에 서버가 할 일이 없고, 이미지 라이브러리도 필요 없습니다.
 *
 * 주의 — 이 카드는 남에게 보여주는 그림이라 다크모드를 따라가지 않습니다.
 * 색을 CSS 변수(var(--teal) 등)로 두면 캔버스에서는 적용되지 않으므로 전부 직접 적었습니다.
 */

export type CardRow = {
  label: string;
  value: string;
  /** 값 옆에 붙는 알약 모양 꼬리표 (회복율 93%, 갭 11억원 (89%) 등) */
  pill?: string;
  date?: string;
  tone?: "high" | "low" | "jeonse";
};

export type CardPayload = {
  complex: string;
  /** "부산광역시 수영구 남천동" */
  location: string;
  /** "1979년 준공 (48년차)" — 없으면 빈 문자열 */
  built: string;
  /** "매매" | "전세" | "월세" */
  dealLabel: string;
  /** "12억 3,000만원" */
  priceText: string;
  /** "▼ 8,500만원 (6.5%)" — 없으면 null */
  changeText: string | null;
  changeUp: boolean;
  /** ["12층", "전용 95.17㎡ · 28.8평", "계약일 26.08.28"] */
  chips: string[];
  rows: CardRow[];
  /** 최근 12개월 평균값 (거래 없는 달은 null) */
  spark: (number | null)[];
  siteName: string;
  /**
   * 카드에 사이트 주소를 함께 적을지 — 비워두면 이름만 나옵니다.
   *
   * 기본은 "적지 않음"입니다. 부동산 카페들은 대부분 홍보성 게시글을 금지하고,
   * 이미지 안의 도메인 주소는 운영자 눈에 가장 먼저 광고로 보입니다.
   * 브랜드는 이름만으로도 충분히 전달되고, 주소가 필요한 블로그에서는 본문에 링크를 걸면 됩니다.
   */
  siteUrl?: string;
};

const W = 880;
const SCALE = 2; // 고해상도 — 카페·블로그에 올려도 글자가 뭉개지지 않게

// 세로 길이는 표 줄 수에 따라 달라집니다 (아래쪽에 빈 공간이 남지 않도록).
const HEAD_H = 104;
const MID_TOP = HEAD_H + 26;
const CHIP_CY = MID_TOP + 168; // 요약 꼬리표 줄의 한가운데
const TABLE_TOP = CHIP_CY + 34;
const ROW_H = 46;
const FOOT_H = 56;

function cardHeight(rowCount: number): number {
  return TABLE_TOP + rowCount * ROW_H + FOOT_H;
}

const C = {
  bg: "#ffffff",
  headBg: "#eef6f5",
  line: "#d7dfdc",
  lineSoft: "#e8eeec",
  ink: "#1b2430",
  inkSoft: "#445059",
  muted: "#6b7975",
  teal: "#1f6f78",
  tealDeep: "#144951",
  rise: "#c23b30",
  fall: "#2f6f9e",
  riseSoft: "#f6ded9",
  fallSoft: "#dde8f0",
  rowAlt: "#f7faf9",
  pillBg: "#e6f1f0",
};

const SANS = '"Noto Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';
const SERIF = '"Noto Serif KR", "Apple SD Gothic Neo", serif';

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/** 글자가 정해진 폭을 넘으면 폰트 크기를 줄여 한 줄에 맞춥니다 (긴 단지명 대응). */
function fitFont(ctx: CanvasRenderingContext2D, text: string, maxW: number, size: number, font: string, weight = 700) {
  let s = size;
  ctx.font = `${weight} ${s}px ${font}`;
  while (ctx.measureText(text).width > maxW && s > 14) {
    s -= 1;
    ctx.font = `${weight} ${s}px ${font}`;
  }
  return s;
}

/** 알약 꼬리표를 그리고, 그린 폭을 돌려줍니다. */
function drawPill(ctx: CanvasRenderingContext2D, text: string, x: number, cy: number, bg: string, fg: string) {
  ctx.font = `700 14px ${SANS}`;
  const tw = ctx.measureText(text).width;
  const w = tw + 20;
  const h = 24;
  ctx.fillStyle = bg;
  roundRect(ctx, x, cy - h / 2, w, h, 12);
  ctx.fill();
  ctx.fillStyle = fg;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x + 10, cy + 1);
  return w;
}

/** 최근 12개월 흐름을 작은 선그래프로 그립니다. 거래 없는 달은 건너뛰고 이어 붙입니다. */
function drawSpark(ctx: CanvasRenderingContext2D, spark: (number | null)[], x: number, y: number, w: number, h: number) {
  const idx = spark.map((v, i) => ({ v, i })).filter((p) => p.v !== null) as { v: number; i: number }[];
  if (idx.length === 0) return;

  const values = idx.map((p) => p.v);
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (min === max) {
    min -= Math.max(min * 0.1, 1);
    max += Math.max(max * 0.1, 1);
  } else {
    const pad = (max - min) * 0.18;
    min -= pad;
    max += pad;
  }

  const n = Math.max(spark.length - 1, 1);
  const px = (i: number) => x + (w * i) / n;
  const py = (v: number) => y + h - ((v - min) / (max - min)) * h;
  const pts = idx.map((p) => ({ x: px(p.i), y: py(p.v) }));

  // 선 아래 옅은 채움 — 흐름이 한눈에 들어오게
  const grad = ctx.createLinearGradient(0, y, 0, y + h);
  grad.addColorStop(0, "rgba(31,111,120,0.20)");
  grad.addColorStop(1, "rgba(31,111,120,0)");

  const trace = () => {
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      // 중간점을 지나는 부드러운 곡선 — 값보다 튀어나가지 않게 조절점을 점 사이로만 둡니다
      const p0 = pts[i - 1];
      const p1 = pts[i];
      const mx = (p0.x + p1.x) / 2;
      ctx.bezierCurveTo(mx, p0.y, mx, p1.y, p1.x, p1.y);
    }
  };

  if (pts.length > 1) {
    trace();
    ctx.lineTo(pts[pts.length - 1].x, y + h);
    ctx.lineTo(pts[0].x, y + h);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    trace();
    ctx.strokeStyle = C.teal;
    ctx.lineWidth = 3;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.stroke();
  }

  // 마지막 거래가 있던 달을 점으로 강조
  const last = pts[pts.length - 1];
  ctx.beginPath();
  ctx.arc(last.x, last.y, 7, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(31,111,120,0.22)";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(last.x, last.y, 4.5, 0, Math.PI * 2);
  ctx.fillStyle = C.teal;
  ctx.fill();
}

/** 카드를 캔버스에 그립니다. 이미 만들어 둔 캔버스를 넘겨주면 그 위에 다시 그립니다. */
export function drawDealCard(p: CardPayload, canvas?: HTMLCanvasElement): HTMLCanvasElement {
  const cv = canvas ?? document.createElement("canvas");
  const H = cardHeight(p.rows.length);
  cv.width = W * SCALE;
  cv.height = H * SCALE;
  const ctx = cv.getContext("2d");
  if (!ctx) return cv;
  ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
  ctx.textBaseline = "alphabetic";

  // 바탕
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, W, H);

  // ── 머리말 ────────────────────────────────────────────
  ctx.fillStyle = C.headBg;
  ctx.fillRect(0, 0, W, HEAD_H);
  ctx.fillStyle = C.teal;
  ctx.fillRect(0, 0, 6, HEAD_H); // 왼쪽 세로 띠

  const PAD = 32;
  const brandW = 150; // 오른쪽 상단 사이트 표기 자리

  const nameSize = fitFont(ctx, p.complex, W - PAD * 2 - brandW, 36, SERIF);
  ctx.fillStyle = C.tealDeep;
  ctx.textAlign = "left";
  ctx.font = `700 ${nameSize}px ${SERIF}`;
  ctx.fillText(p.complex, PAD, 50);

  ctx.font = `500 15px ${SANS}`;
  ctx.fillStyle = C.inkSoft;
  const sub = [p.location, p.built].filter(Boolean).join("  ·  ");
  ctx.fillText(sub, PAD, 80);

  // 사이트 표기 — 크게 넣으면 카페에서 광고로 보입니다. 작고 조용하게.
  const url = (p.siteUrl ?? "").replace(/^https?:\/\//, "").trim();
  ctx.textAlign = "right";
  ctx.font = `700 15px ${SANS}`;
  ctx.fillStyle = C.teal;
  ctx.fillText(p.siteName, W - PAD, url ? 46 : 56);
  if (url) {
    ctx.font = `400 12px ${SANS}`;
    ctx.fillStyle = C.muted;
    ctx.fillText(url, W - PAD, 66);
  }

  ctx.strokeStyle = C.line;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, HEAD_H + 0.5);
  ctx.lineTo(W, HEAD_H + 0.5);
  ctx.stroke();

  // ── 가운데: 왼쪽 미니 그래프 · 오른쪽 최신 실거래가 ──────
  const midTop = MID_TOP;
  drawSpark(ctx, p.spark, PAD, midTop + 4, 250, 100);

  ctx.textAlign = "left";
  ctx.font = `400 12px ${SANS}`;
  ctx.fillStyle = C.muted;
  ctx.fillText("최근 12개월 흐름", PAD, midTop + 126);

  const rx = PAD + 296;

  // 거래유형 꼬리표
  ctx.textBaseline = "middle";
  const dealW = drawPill(ctx, p.dealLabel, rx, midTop + 14, C.teal, "#ffffff");
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  ctx.font = `500 14px ${SANS}`;
  ctx.fillStyle = C.muted;
  ctx.fillText("실거래가", rx + dealW + 10, midTop + 19);

  // 금액 — 카드에서 제일 먼저 눈에 들어와야 하는 값
  const priceSize = fitFont(ctx, p.priceText, 490, 48, SANS);
  ctx.font = `700 ${priceSize}px ${SANS}`;
  ctx.fillStyle = C.ink;
  ctx.fillText(p.priceText, rx, midTop + 78);

  if (p.changeText) {
    ctx.textBaseline = "middle";
    drawPill(
      ctx,
      p.changeText,
      rx,
      midTop + 108,
      p.changeUp ? C.riseSoft : C.fallSoft,
      p.changeUp ? C.rise : C.fall
    );
    ctx.textBaseline = "alphabetic";
  }

  // ── 요약 꼬리표 (층 · 전용 · 계약일) ────────────────────
  let cx = PAD;
  const chipY = CHIP_CY;
  ctx.textBaseline = "middle";
  for (const chip of p.chips) {
    ctx.font = `700 15px ${SANS}`;
    const tw = ctx.measureText(chip).width;
    const cw = tw + 26;
    ctx.fillStyle = "#ffffff";
    roundRect(ctx, cx, chipY - 17, cw, 34, 9);
    ctx.fill();
    ctx.strokeStyle = C.line;
    ctx.lineWidth = 1.2;
    roundRect(ctx, cx, chipY - 17, cw, 34, 9);
    ctx.stroke();
    ctx.fillStyle = C.inkSoft;
    ctx.textAlign = "left";
    ctx.fillText(chip, cx + 13, chipY + 1);
    cx += cw + 8;
  }
  ctx.textBaseline = "alphabetic";

  // ── 표 (직전거래 · 3년최고 · 3년최저 · 전세) ─────────────
  const tableTop = TABLE_TOP;
  const rowH = ROW_H;
  p.rows.forEach((row, i) => {
    const y = tableTop + i * rowH;
    if (i % 2 === 0) {
      ctx.fillStyle = C.rowAlt;
      ctx.fillRect(PAD, y, W - PAD * 2, rowH);
    }
    ctx.strokeStyle = C.lineSoft;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(PAD, y + rowH + 0.5);
    ctx.lineTo(W - PAD, y + rowH + 0.5);
    ctx.stroke();

    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    ctx.font = `700 15px ${SANS}`;
    ctx.fillStyle = row.tone === "high" ? C.rise : row.tone === "jeonse" ? C.teal : C.muted;
    ctx.fillText(row.label, PAD + 14, y + rowH / 2);

    ctx.font = `700 17px ${SANS}`;
    ctx.fillStyle = C.ink;
    const vx = PAD + 130;
    ctx.fillText(row.value, vx, y + rowH / 2);

    if (row.pill) {
      const vw = ctx.measureText(row.value).width;
      drawPill(
        ctx,
        row.pill,
        vx + vw + 12,
        y + rowH / 2,
        row.tone === "high" ? C.riseSoft : C.pillBg,
        row.tone === "high" ? C.rise : C.tealDeep
      );
    }

    if (row.date) {
      ctx.textAlign = "right";
      ctx.font = `500 15px ${SANS}`;
      ctx.fillStyle = C.muted;
      ctx.fillText(row.date, W - PAD - 14, y + rowH / 2);
    }
    ctx.textBaseline = "alphabetic";
  });

  // ── 꼬리말 ────────────────────────────────────────────
  ctx.textAlign = "left";
  ctx.font = `400 12.5px ${SANS}`;
  ctx.fillStyle = C.muted;
  ctx.fillText(
    "국토교통부 실거래가 공개시스템 자료 · 계약 후 30일 이내 신고분이라 최근 거래는 이후에도 추가될 수 있습니다.",
    PAD,
    H - 26
  );

  // 테두리
  ctx.strokeStyle = C.line;
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, W - 2, H - 2);

  return cv;
}

/** 파일 이름에 쓸 수 없는 글자를 걸러냅니다. */
function safeName(s: string): string {
  return s.replace(/[\\/:*?"<>|]/g, "").trim() || "card";
}

/** 카드를 PNG 파일로 내려받습니다. */
export async function downloadDealCard(p: CardPayload) {
  if (document.fonts?.ready) await document.fonts.ready; // 웹폰트가 준비된 뒤에 그려야 글자가 제대로 나옵니다
  const cv = drawDealCard(p);
  const blob: Blob | null = await new Promise((res) => cv.toBlob((b) => res(b), "image/png"));
  if (!blob) throw new Error("이미지를 만들지 못했습니다.");
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${safeName(p.complex)}_${safeName(p.dealLabel)}_실거래.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/**
 * 카드를 클립보드에 복사합니다 (네이버 글쓰기 창에 Ctrl+V로 바로 붙일 수 있습니다).
 * 지원하지 않는 브라우저도 있어, 실패하면 false를 돌려줍니다.
 */
export async function copyDealCard(p: CardPayload): Promise<boolean> {
  try {
    if (typeof ClipboardItem === "undefined" || !navigator.clipboard?.write) return false;
    if (document.fonts?.ready) await document.fonts.ready;
    const cv = drawDealCard(p);
    const blob: Blob | null = await new Promise((res) => cv.toBlob((b) => res(b), "image/png"));
    if (!blob) return false;
    await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
    return true;
  } catch {
    return false;
  }
}
