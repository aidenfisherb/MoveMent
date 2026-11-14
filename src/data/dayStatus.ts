import { useLiveQuery } from "dexie-react-hooks";
import { addDays, dayKey } from "../lib/dates";
import { db, type Meal } from "./db";

/**
 * "Incomplete day" label. Purely informational: it never changes totals or averages.
 * A past day is incomplete when any required meal has nothing logged, unless you've
 * marked it complete. Days before your first ever food log, and today, are never flagged.
 */
export const REQUIRED_MEALS: Meal[] = ["lunch", "dinner"];

export interface DayStatus {
  date: string;
  /** Required meals with nothing logged. */
  missing: Meal[];
  /** Shows the label: a past, tracked day with missing meals and no manual override. */
  incomplete: boolean;
  /** Would be incomplete, but you marked it complete. */
  markedComplete: boolean;
  /** At least lunch and dinner logged. */
  complete: boolean;
  /** False for today, future days, and days before you started logging. */
  judged: boolean;
}

export function useDayStatuses(from: string, to: string): Record<string, DayStatus> {
  return useLiveQuery(async () => {
    const [logs, marks, first] = await Promise.all([
      db.foodLogs.where("date").between(from, to, true, true).toArray(),
      db.dayMarks.where("date").between(from, to, true, true).toArray(),
      db.foodLogs.orderBy("date").first()
    ]);
    const today = dayKey();
    const marked = new Set(marks.map((m) => m.date));
    const out: Record<string, DayStatus> = {};
    for (let d = from; d <= to; d = addDays(d, 1)) {
      const meals = new Set(logs.filter((l) => l.date === d).map((l) => l.meal));
      const missing = REQUIRED_MEALS.filter((m) => !meals.has(m));
      const judged = !!first && d >= first.date && d < today;
      const flagged = judged && missing.length > 0;
      out[d] = { date: d, missing, incomplete: flagged && !marked.has(d), markedComplete: flagged && marked.has(d), complete: missing.length === 0, judged };
    }
    return out;
  }, [from, to], {} as Record<string, DayStatus>);
}

export function markDayComplete(date: string) {
  return db.dayMarks.put({ date, complete: true, markedAt: Date.now() });
}

export function unmarkDayComplete(date: string) {
  return db.dayMarks.delete(date);
}

/** "no lunch or dinner logged", "no dinner logged" */
export function missingText(missing: Meal[]) {
  return `no ${missing.join(" or ")} logged`;
}
