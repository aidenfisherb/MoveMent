import { fmt } from "../lib/format";

export interface Point { x: string; y: number }

/** Orange line chart with horizontal gridlines and the latest point labeled. */
export function LineChart({ data, unit = "", height = 160, label }: { data: Point[]; unit?: string; height?: number; label: string }) {
  const W = 340, H = height, L = 40, R = 46, T = 12, B = 22;
  if (data.length === 0) return null;
  const ys = data.map((d) => d.y);
  let lo = Math.min(...ys), hi = Math.max(...ys);
  if (lo === hi) { lo -= 1; hi += 1; }
  const padY = (hi - lo) * 0.15;
  lo -= padY; hi += padY;
  const ticks = niceTicks(lo, hi, 4);
  lo = Math.min(lo, ticks[0]); hi = Math.max(hi, ticks[ticks.length - 1]);
  const x = (i: number) => (data.length === 1 ? (L + W - R) / 2 : L + (i * (W - L - R)) / (data.length - 1));
  const y = (v: number) => T + ((hi - v) * (H - T - B)) / (hi - lo);
  const last = data[data.length - 1];
  const xIdx = data.length <= 4 ? data.map((_, i) => i) : [0, Math.round((data.length - 1) / 3), Math.round((2 * (data.length - 1)) / 3), data.length - 1];
  return (
    <div className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="var(--grid)" />
            <text x={L - 6} y={y(t) + 3} textAnchor="end">{fmt(t, 1)}</text>
          </g>
        ))}
        {xIdx.map((i) => <text key={i} x={x(i)} y={H - 6} textAnchor="middle">{data[i].x}</text>)}
        <polyline fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" points={data.map((d, i) => `${x(i)},${y(d.y)}`).join(" ")} />
        <circle cx={x(data.length - 1)} cy={y(last.y)} r="4" fill="var(--accent)" />
        <text x={x(data.length - 1) + 7} y={y(last.y) + 4} style={{ fill: "var(--fg)", fontWeight: 600 }}>{fmt(last.y, 1)}{unit}</text>
      </svg>
    </div>
  );
}

/** Bars with a dashed target line. Bars over target turn red. */
/**
 * Bars with a dashed target line. Bars over target turn red.
 * `hollow` draws chosen bars as outlines (e.g. to flag them) and `onBarTap` makes bars tappable.
 */
export function BarChart({ data, target, height = 150, label, hollow, onBarTap }: { data: Point[]; target?: number; height?: number; label: string; hollow?: boolean[]; onBarTap?: (i: number) => void }) {
  const W = 340, H = height, L = 40, R = 8, T = 12, B = 22;
  const max = Math.max(target || 0, ...data.map((d) => d.y), 1) * 1.1;
  const ticks = niceTicks(0, max, 3);
  const hi = Math.max(max, ticks[ticks.length - 1]);
  const y = (v: number) => T + ((hi - v) * (H - T - B)) / hi;
  const bw = (W - L - R) / data.length;
  const every = Math.ceil(data.length / 7);
  return (
    <div className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="var(--grid)" />
            <text x={L - 6} y={y(t) + 3} textAnchor="end">{fmt(t)}</text>
          </g>
        ))}
        {data.map((d, i) => {
          const h = Math.max(0, y(0) - y(d.y));
          const over = target ? d.y > target * 1.05 : false;
          const bx = L + i * bw + bw * 0.18, w = bw * 0.64;
          const r = Math.min(3, w / 2, h);
          if (hollow?.[i]) {
            const top = Math.min(y(d.y), y(0) - 6); // keep a visible stub even at zero
            return (
              <g key={i} onClick={onBarTap ? () => onBarTap(i) : undefined} style={onBarTap ? { cursor: "pointer" } : undefined}>
                <rect x={bx} y={T} width={w} height={y(0) - T} fill="transparent" />
                <rect x={bx + 0.75} y={top + 0.75} width={w - 1.5} height={y(0) - top - 1.5} rx={2} fill="none" stroke="var(--warning)" strokeWidth="1.5" />
                <text x={bx + w / 2} y={top - 5} textAnchor="middle" style={{ fill: "var(--warning)" }}>!</text>
                {i % every === 0 && <text x={bx + w / 2} y={H - 6} textAnchor="middle">{d.x}</text>}
              </g>
            );
          }
          return (
            <g key={i} onClick={onBarTap ? () => onBarTap(i) : undefined}>
              {d.y > 0 && <path d={`M${bx},${y(0)} V${y(d.y) + r} Q${bx},${y(d.y)} ${bx + r},${y(d.y)} H${bx + w - r} Q${bx + w},${y(d.y)} ${bx + w},${y(d.y) + r} V${y(0)} Z`} fill={over ? "var(--danger)" : "var(--accent)"} />}
              {i % every === 0 && <text x={bx + w / 2} y={H - 6} textAnchor="middle">{d.x}</text>}
            </g>
          );
        })}
        {target ? <line x1={L} x2={W - R} y1={y(target)} y2={y(target)} stroke="var(--fg)" strokeDasharray="3 4" strokeWidth="1" opacity=".6" /> : null}
      </svg>
    </div>
  );
}

function niceTicks(lo: number, hi: number, count: number) {
  const span = hi - lo;
  const raw = span / count;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => span / s <= count) || 10 * mag;
  const start = Math.floor(lo / step) * step;
  const out: number[] = [];
  for (let v = start; v <= hi + step * 0.001; v += step) out.push(Math.round(v * 1000) / 1000);
  return out;
}
