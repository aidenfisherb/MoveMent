/**
 * Turns a Claude chat reply about a food photo into an editable estimate.
 *
 * Preferred input is the block the `movement-food-photo` skill produces:
 *
 *   MOVEMENT
 *   name: Chicken burrito bowl
 *   serving: 1 bowl
 *   grams: 520
 *   kcal: 780
 *   protein: 48
 *   carbs: 82
 *   fat: 26
 *
 * It also copes with ordinary replies ("Total: ~780 calories, 48 g protein…"),
 * taking the last value mentioned for each field, since totals usually come last.
 */
export interface Estimate {
  name: string;
  serving: string;
  grams?: number;
  kcal?: number;
  p?: number;
  c?: number;
  f?: number;
}

const NUM = String.raw`~?\s*(\d[\d,]*(?:\.\d+)?)(?:\s*(?:-|–|to)\s*(\d[\d,]*(?:\.\d+)?))?`;

function toNum(a: string, b?: string) {
  const x = parseFloat(a.replace(/,/g, ""));
  const y = b ? parseFloat(b.replace(/,/g, "")) : NaN;
  return Number.isFinite(y) ? Math.round((x + y) / 2) : x; // a range like 700-800 becomes 750
}

function lastMatch(text: string, re: RegExp) {
  let hit: RegExpExecArray | null = null;
  for (const m of text.matchAll(new RegExp(re.source, "gi"))) hit = m as RegExpExecArray;
  return hit ? toNum(hit[1], hit[2]) : undefined;
}

export function parseClaudeReply(raw: string): Estimate | null {
  if (!raw?.trim()) return null;
  // If the skill's block is present, only read from it.
  const block = raw.match(/MOVEMENT\s*\n([\s\S]*?)(?:```|\n\s*\n\s*\n|$)/i);
  const text = (block ? block[1] : raw)
    .replace(/\*\*/g, "")
    // Ignore saturated/trans fat lines so they aren't read as total fat.
    .replace(/(?:saturated|trans)\s+fats?[^\n]*/gi, "");

  const field = (key: string) => text.match(new RegExp(String.raw`^\s*[-*]?\s*(?:${key})\s*[:=]\s*(.+)$`, "im"))?.[1]?.trim();

  const kcal = lastMatch(text, new RegExp(String.raw`(?:kcal|calories|cals?|energy)\s*[:=]?\s*${NUM}`)) ??
    lastMatch(text, new RegExp(String.raw`${NUM}\s*(?:kcal|calories|cals?)\b`));
  const p = lastMatch(text, new RegExp(String.raw`protein\s*[:=]?\s*${NUM}`)) ?? lastMatch(text, new RegExp(String.raw`${NUM}\s*g?\s*(?:of\s+)?protein`));
  const c = lastMatch(text, new RegExp(String.raw`carb(?:ohydrate)?s?\s*[:=]?\s*${NUM}`)) ?? lastMatch(text, new RegExp(String.raw`${NUM}\s*g?\s*(?:of\s+)?carb`));
  const f = lastMatch(text, new RegExp(String.raw`\bfats?\s*[:=]?\s*${NUM}`)) ?? lastMatch(text, new RegExp(String.raw`${NUM}\s*g?\s*(?:of\s+)?fat\b`));
  const gramsField = field("grams|weight|portion weight");
  const grams = gramsField ? parseFloat(gramsField) : undefined;

  if (kcal === undefined && p === undefined) return null;

  let name = field("name|meal|food") || "";
  if (!name) {
    const first = raw
      .split("\n")
      .map((l) => l.replace(/^[#*\s-]+|[*:]+$/g, "").trim())
      .find((l) => l && l.length < 70 && !/:|calorie|kcal|protein|carb|\bfat\b|estimate|total/i.test(l));
    name = (first || "Photo meal")
      .replace(/^(?:this\s+)?(?:looks|appears)\s+(?:like|to be)\s+(?:an?\s+)?/i, "")
      .replace(/[.!]$/, "");
    name = name.charAt(0).toUpperCase() + name.slice(1);
  }
  return {
    name: name.replace(/[*_`]/g, "").slice(0, 80),
    serving: field("serving|portion") || "1 serving",
    grams: grams && Number.isFinite(grams) && grams > 0 ? grams : undefined,
    kcal, p, c, f
  };
}
