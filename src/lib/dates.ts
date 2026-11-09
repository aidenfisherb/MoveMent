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
