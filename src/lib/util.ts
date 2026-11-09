import type { Macros } from "./db";

export const pad = (n: number) => String(n).padStart(2, "0");

/** Local date as YYYY-MM-DD (not UTC, so late-night logs land on the right day). */
export function dayKey(d: Date = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseDay(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(key: string, n: number) {
  const d = parseDay(key);
  d.setDate(d.getDate() + n);
  return dayKey(d);
}

export function prettyDay(key: string) {
  const today = dayKey();
  if (key === today) return "Today";
  if (key === addDays(today, -1)) return "Yesterday";
  return parseDay(key).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

export const fmt = (n: number, digits = 0) =>
  (Number.isFinite(n) ? n : 0).toLocaleString(undefined, { maximumFractionDigits: digits, minimumFractionDigits: 0 });

export const ZERO: Macros = { kcal: 0, p: 0, c: 0, f: 0 };

export function sumMacros(items: Macros[]): Macros {
  return items.reduce((a, b) => ({ kcal: a.kcal + b.kcal, p: a.p + b.p, c: a.c + b.c, f: a.f + b.f }), { ...ZERO });
}

export function scale(per100: Macros, grams: number): Macros {
  const k = grams / 100;
  return { kcal: per100.kcal * k, p: per100.p * k, c: per100.c * k, f: per100.f * k };
}

/** Epley estimated one-rep max. */
export function e1rm(weight: number, reps: number) {
  if (!weight || !reps) return 0;
  return reps === 1 ? weight : weight * (1 + reps / 30);
}

export function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
