import type { DayStatus } from "../../data/dayStatus";
import { addDays, dayKey, parseDay } from "../../lib/dates";

/** Monday of the week containing `key`. */
export function weekStart(key: string) {
  return addDays(key, -((parseDay(key).getDay() + 6) % 7));
}

/** Seven days with a logging dot each: green = lunch and dinner logged, yellow ring = incomplete. */
export function WeekStrip({ selected, statuses, onPick }: { selected: string; statuses: Record<string, DayStatus>; onPick: (d: string) => void }) {
  const start = weekStart(selected);
  const today = dayKey();
  return (
    <div className="week-strip" role="group" aria-label="Pick a day this week">
      {Array.from({ length: 7 }, (_, i) => addDays(start, i)).map((d) => {
        const s = statuses[d];
        const future = d > today;
        const state = d === today ? "today" : s?.incomplete ? "bad" : s?.judged ? "ok" : "none";
        const date = parseDay(d);
        return (
          <button key={d} type="button" className={`wd ${state}${d === selected ? " sel" : ""}`} disabled={future} aria-current={d === selected ? "date" : undefined}
            aria-label={`${date.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}${state === "bad" ? ", incomplete" : state === "ok" ? ", fully logged" : ""}`}
            onClick={() => onPick(d)}>
            <span className="wl">{date.toLocaleDateString(undefined, { weekday: "narrow" })}</span>
            <span className="wn">{date.getDate()}</span>
            <i aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}
