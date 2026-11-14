import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import { db, MEALS, type FoodLog, type Meal } from "../../data/db";
import { useSettings } from "../../data/hooks";
import { addDays, dayKey, prettyDay } from "../../lib/dates";
import { cap, fmt } from "../../lib/format";
import { sumMacros } from "../../lib/macros";
import { Icon, toast } from "../../ui";
import { markDayComplete, missingText, unmarkDayComplete, useDayStatuses } from "../../data/dayStatus";
import { AddFoodSheet } from "./add/AddFoodSheet";
import { WeekStrip, weekStart } from "./WeekStrip";
import { EditLogSheet } from "./EditLogSheet";
import { copyDay, undoCopy } from "./foodActions";

export default function FoodScreen() {
  const [date, setDate] = useState(dayKey());
  const settings = useSettings();
  const logs = useLiveQuery(() => db.foodLogs.where("date").equals(date).toArray(), [date], []);
  const total = sumMacros(logs);
  const [adding, setAdding] = useState<Meal | null>(null);
  const [editing, setEditing] = useState<FoodLog | null>(null);
  const isToday = date === dayKey();
  const wkStart = weekStart(date);
  const statuses = useDayStatuses(wkStart, addDays(wkStart, 6));
  const status = statuses[date];
  const [tipOpen, setTipOpen] = useState(false);
  const pick = (d: string) => { setDate(d); setTipOpen(false); };

  const copyYesterday = async () => {
    const ids = await copyDay(addDays(date, -1), date);
    if (!ids.length) return toast("Nothing logged the day before", { error: true });
    toast(`Copied ${ids.length} items`, { action: { label: "Undo", run: () => undoCopy(ids) } });
  };

  return (
    <main className="screen">
      <div className="screen-head">
        <button className="btn icon-btn" type="button" aria-label="Previous day" onClick={() => pick(addDays(date, -1))}><Icon name="left" /></button>
        <div className="day-title">
          <h1>{prettyDay(date)}</h1>
          {status?.incomplete && (
            <button type="button" className="flag-chip" aria-expanded={tipOpen} onClick={() => setTipOpen(!tipOpen)}><Icon name="flag" />Incomplete</button>
          )}
          {status?.markedComplete && (
            <button type="button" className="flag-chip cleared" aria-expanded={tipOpen} onClick={() => setTipOpen(!tipOpen)}><Icon name="check" />Marked complete</button>
          )}
        </div>
        <button className="btn icon-btn" type="button" aria-label="Next day" disabled={isToday} onClick={() => pick(addDays(date, 1))}><Icon name="right" /></button>
      </div>

      {tipOpen && status?.incomplete && (
        <div className="tip-line">
          <span>{cap(missingText(status.missing))}.</span>
          <button className="btn btn-ghost btn-sm" style={{ color: "var(--accent)" }} type="button" onClick={async () => { await markDayComplete(date); setTipOpen(false); toast("Marked complete", { action: { label: "Undo", run: () => unmarkDayComplete(date) } }); }}>Mark complete</button>
        </div>
      )}
      {tipOpen && status?.markedComplete && (
        <div className="tip-line">
          <span>You marked this day complete ({missingText(status.missing)}).</span>
          <button className="btn btn-ghost btn-sm" type="button" onClick={async () => { await unmarkDayComplete(date); setTipOpen(false); }}>Undo</button>
        </div>
      )}

      <WeekStrip selected={date} statuses={statuses} onPick={pick} />

      <section className="card">
        <div className="grid4" style={{ textAlign: "center" }}>
          <MacroStat label="kcal" v={total.kcal} t={settings.targets.kcal} />
          <MacroStat label="Protein" v={total.p} t={settings.targets.p} g />
          <MacroStat label="Carbs" v={total.c} t={settings.targets.c} g />
          <MacroStat label="Fat" v={total.f} t={settings.targets.f} g />
        </div>
      </section>

      {MEALS.map((m) => {
        const items = logs.filter((l) => l.meal === m).sort((a, b) => a.createdAt - b.createdAt);
        const s = sumMacros(items);
        return (
          <section className="card" key={m}>
            <div className="card-head">
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <h2>{cap(m)}</h2>
                {items.length > 0 && <span className="small muted num">{fmt(s.kcal)} kcal · {fmt(s.p)}p</span>}
              </div>
              <button className="btn icon-btn sm" type="button" aria-label={`Add to ${m}`} onClick={() => setAdding(m)}><Icon name="plus" /></button>
            </div>
            {items.length > 0 && (
              <div className="rows">
                {items.map((l) => (
                  <button key={l.id} type="button" className="row" onClick={() => setEditing(l)}>
                    <span className="name">{l.name}</span>
                    <span className="sub num">{fmt(l.grams)} g · {fmt(l.p)}p {fmt(l.c)}c {fmt(l.f)}f</span>
                    <span className="val">{fmt(l.kcal)}</span>
                  </button>
                ))}
              </div>
            )}
          </section>
        );
      })}

      {logs.length === 0 && (
        <button className="btn" type="button" onClick={copyYesterday}>Copy the day before</button>
      )}

      {adding && <AddFoodSheet open meal={adding} date={date} onClose={() => setAdding(null)} />}
      {editing && <EditLogSheet log={editing} onClose={() => setEditing(null)} />}
    </main>
  );
}

function MacroStat({ label, v, t, g }: { label: string; v: number; t: number; g?: boolean }) {
  const over = v > t * 1.05;
  return (
    <div style={{ display: "grid", gap: 2 }}>
      <span className="label">{label}</span>
      <span className="num" style={{ fontWeight: 600, fontSize: 16, color: label === "kcal" ? "var(--accent)" : over ? "var(--danger)" : undefined }}>{fmt(v)}</span>
      <span className="small muted num">/ {fmt(t)}{g ? "g" : ""}</span>
    </div>
  );
}

/* ---------------- Add food flow ---------------- */
