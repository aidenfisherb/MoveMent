import type { Macros } from "../data/db";

export const ZERO: Macros = { kcal: 0, p: 0, c: 0, f: 0 };

export function sumMacros(items: Macros[]): Macros {
  return items.reduce((a, b) => ({ kcal: a.kcal + b.kcal, p: a.p + b.p, c: a.c + b.c, f: a.f + b.f }), { ...ZERO });
}

export function scale(per100: Macros, grams: number): Macros {
  const k = grams / 100;
  return { kcal: per100.kcal * k, p: per100.p * k, c: per100.c * k, f: per100.f * k };
}
