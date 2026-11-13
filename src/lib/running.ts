/** Distance, pace and time helpers for runs. Distances are stored in meters. */

export type DistUnit = "mi" | "km";
export const distUnitFor = (weightUnit: "lb" | "kg"): DistUnit => (weightUnit === "kg" ? "km" : "mi");
export const METERS: Record<DistUnit, number> = { mi: 1609.344, km: 1000 };

export const toUnit = (m: number, u: DistUnit) => m / METERS[u];
export const fromUnit = (d: number, u: DistUnit) => d * METERS[u];

export function formatDistance(m: number, u: DistUnit, digits = 2) {
  return `${toUnit(m, u).toFixed(digits)} ${u}`;
}

/** 1:05:09 or 45:30 */
export function formatTime(totalS: number) {
  const s = Math.max(0, Math.round(totalS));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}` : `${m}:${String(sec).padStart(2, "0")}`;
}

/** Seconds per mile/km, or 0 when there's no distance. */
export const paceSeconds = (m: number, s: number, u: DistUnit) => (m > 0 ? s / toUnit(m, u) : 0);

export function formatPace(m: number, s: number, u: DistUnit) {
  const p = paceSeconds(m, s, u);
  return p ? `${formatTime(p)} /${u}` : "—";
}

/** Accepts "45", "45:30" or "1:05:09". Plain numbers are minutes. */
export function parseTime(text: string): number | undefined {
  const parts = text.trim().split(":").map((x) => x.trim());
  if (!parts[0] || parts.some((x) => !/^\d+(\.\d+)?$/.test(x))) return undefined;
  const n = parts.map(Number);
  if (n.length === 1) return n[0] * 60;
  if (n.length === 2) return n[0] * 60 + n[1];
  if (n.length === 3) return n[0] * 3600 + n[1] * 60 + n[2];
  return undefined;
}

/** Decode a Google-encoded polyline (what Strava sends for route shapes) into [lat, lng] pairs. */
export function decodePolyline(str: string): [number, number][] {
  const out: [number, number][] = [];
  let i = 0, lat = 0, lng = 0;
  while (i < str.length) {
    for (const which of [0, 1]) {
      let shift = 0, result = 0, b: number;
      do { b = str.charCodeAt(i++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
      const d = result & 1 ? ~(result >> 1) : result >> 1;
      if (which === 0) lat += d; else lng += d;
    }
    out.push([lat / 1e5, lng / 1e5]);
  }
  return out;
}
