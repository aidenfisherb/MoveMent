export const fmt = (n: number, digits = 0) =>
  (Number.isFinite(n) ? n : 0).toLocaleString(undefined, { maximumFractionDigits: digits, minimumFractionDigits: 0 });

export function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
