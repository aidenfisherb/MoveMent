/** Draws a GPS route as a simple line (no map tiles, so no cost or network). Points are [lat, lng]. */
export function RouteShape({ points, height = 180, label }: { points: [number, number][]; height?: number; label: string }) {
  if (points.length < 2) return null;
  const midLat = points.reduce((a, p) => a + p[0], 0) / points.length;
  const k = Math.cos((midLat * Math.PI) / 180);
  const xy = points.map(([lat, lng]) => [lng * k, -lat]);
  const xs = xy.map((p) => p[0]), ys = xy.map((p) => p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const W = 320, H = height, pad = 12;
  const s = Math.min((W - pad * 2) / (maxX - minX || 1), (H - pad * 2) / (maxY - minY || 1));
  const ox = (W - (maxX - minX) * s) / 2, oy = (H - (maxY - minY) * s) / 2;
  const pts = xy.map(([x, y]) => [ox + (x - minX) * s, oy + (y - minY) * s]);
  const d = pts.map((p) => p.map((n) => n.toFixed(1)).join(",")).join(" ");
  const [sx, sy] = pts[0], [ex, ey] = pts[pts.length - 1];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={label} style={{ display: "block", width: "100%", height: "auto", aspectRatio: `${W} / ${H}`, background: "var(--surface)", borderRadius: 8, border: "1px solid var(--line)" }}>
      <polyline points={d} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={sx} cy={sy} r="4" fill="var(--success)" />
      <circle cx={ex} cy={ey} r="4" fill="var(--fg)" />
    </svg>
  );
}
