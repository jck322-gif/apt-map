import type { MonthlyPoint } from "@/lib/complex";
import { fmtManwonShort } from "@/lib/format";

/**
 * 단지 페이지 안에 바로 보이는 "최근 12개월 매매 평균가" 그래프 (서버에서 그리는 SVG).
 * 자바스크립트가 없어도 보이고, 검색엔진도 같은 화면을 봅니다.
 * 거래가 없는 달은 점을 찍지 않고 앞뒤 달을 이어서 그립니다.
 */
export default function PriceTrendChart({ points }: { points: MonthlyPoint[] }) {
  const W = 640;
  const H = 280;
  const PAD = { top: 34, right: 18, bottom: 40, left: 76 };
  const vals = points.filter((p) => p.avgPriceManwon !== null).map((p) => p.avgPriceManwon as number);
  if (vals.length < 2) return null;

  let min = Math.min(...vals);
  let max = Math.max(...vals);
  const span = max - min || max * 0.1 || 1;
  min = Math.max(0, min - span * 0.15);
  max = max + span * 0.15;

  const n = points.length;
  const x = (i: number) => PAD.left + (n === 1 ? 0 : (i * (W - PAD.left - PAD.right)) / (n - 1));
  const y = (v: number) => PAD.top + ((max - v) * (H - PAD.top - PAD.bottom)) / (max - min);

  const pts = points
    .map((p, i) => (p.avgPriceManwon === null ? null : { x: x(i), y: y(p.avgPriceManwon), p }))
    .filter((v): v is { x: number; y: number; p: MonthlyPoint } => v !== null);
  const line = pts.map((q, i) => `${i ? "L" : "M"}${q.x.toFixed(1)},${q.y.toFixed(1)}`).join(" ");
  const base = H - PAD.bottom;
  const area = `${line} L${pts[pts.length - 1].x.toFixed(1)},${base} L${pts[0].x.toFixed(1)},${base} Z`;
  const ticks = [max, (max + min) / 2, min];
  const last = pts[pts.length - 1];

  return (
    <figure className="price-chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="최근 12개월 월별 매매 평균가 그래프">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} className="pc-grid" />
            <text x={PAD.left - 8} y={y(t) + 4} textAnchor="end" className="pc-axis">
              {fmtManwonShort(Math.round(t))}
            </text>
          </g>
        ))}
        <path d={area} className="pc-area" />
        <path d={line} className="pc-line" />
        {pts.map((q) => (
          <circle key={q.p.ymd} cx={q.x} cy={q.y} r={q === last ? 8 : 5} className={q === last ? "pc-dot-last" : "pc-dot"}>
            <title>{`${q.p.label} 평균 ${fmtManwonShort(q.p.avgPriceManwon as number)} (${q.p.count}건)`}</title>
          </circle>
        ))}
        <text x={last.x} y={last.y - 16} textAnchor="end" className="pc-last-label">
          {fmtManwonShort(last.p.avgPriceManwon as number)}
        </text>
        {points.map((p, i) =>
          i % 2 === (n - 1) % 2 ? (
            <text key={p.ymd} x={x(i)} y={H - 12} textAnchor="middle" className="pc-axis">
              {Number(p.ymd.slice(4, 6))}월
            </text>
          ) : null
        )}
      </svg>
    </figure>
  );
}
