/* ---------- Dial ---------- */
const C = 2 * Math.PI * 40;
export function Dial({ label, value, target, color, unit = "g", limit = false }: { label: string; value: number; target: number; color: string; unit?: string; limit?: boolean }) {
  const raw = target > 0 ? value / target : 0;
  const over = raw > 1;
  const p = Math.min(raw, 1);
  const stroke = over ? (limit ? "var(--danger)" : "var(--success)") : color;
  return (
    <div className="dial">
      <svg viewBox="0 0 100 100" role="img" aria-label={`${label} ${Math.round(raw * 100)}%`}>
        <circle cx="50" cy="50" r="40" fill="none" stroke="var(--line)" strokeWidth="8" />
        {p > 0 && <circle className="prog" cx="50" cy="50" r="40" fill="none" stroke={stroke} strokeWidth="8" strokeLinecap="round" strokeDasharray={`${C * p} ${C}`} transform="rotate(-90 50 50)" />}
        <text x="50" y="57" textAnchor="middle">{Math.round(raw * 100)}%</text>
      </svg>
      <span className="label">{label}</span>
      <span className="v">{Math.round(value)} / {Math.round(target)}{unit}</span>
    </div>
  );
}
