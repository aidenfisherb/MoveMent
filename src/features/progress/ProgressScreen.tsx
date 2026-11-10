import { useLiveQuery } from "dexie-react-hooks";
import { useMemo, useState } from "react";
import { db } from "../../data/db";
import { useExercises, useSettings } from "../../data/hooks";
import { addDays, dayKey, parseDay } from "../../lib/dates";
import { fmt } from "../../lib/format";
import { sumMacros } from "../../lib/macros";
import { e1rm } from "../../lib/strength";
import { BarChart, Icon, LineChart } from "../../ui";
import { ProfileCard } from "../body/ProfileCard";
import { WeighInSheet } from "../body/WeighInSheet";

const short = (key: string) => parseDay(key).toLocaleDateString(undefined, { month: "numeric", day: "numeric" });

export default function ProgressScreen() {
  const settings = useSettings();
  const [range, setRange] = useState<30 | 90 | 365>(90);
  const [weighOpen, setWeighOpen] = useState(false);
  const today = dayKey();
  const from = addDays(today, -range + 1);
  const weights = useLiveQuery(() => db.weights.where("date").between(from, today, true, true).sortBy("date"), [from, today], []);

  const calFrom = addDays(today, -13);
  const logs = useLiveQuery(() => db.foodLogs.where("date").between(calFrom, today, true, true).toArray(), [calFrom, today], []);
  const days = Array.from({ length: 14 }, (_, i) => addDays(calFrom, i));
  const perDay = days.map((d) => sumMacros(logs.filter((l) => l.date === d)));
  const logged = perDay.filter((m) => m.kcal > 0);
  const avg = logged.length ? sumMacros(logged) : null;

  const exercises = useExercises();
  const [exId, setExId] = useState<number | "">("");
  const strength = useLiveQuery(async () => {
    const sets = await db.sets.filter((s) => s.done && !!s.weight && !!s.reps).toArray();
    const workouts = await db.workouts.toArray();
    const wDate = new Map(workouts.map((w) => [w.id!, w.date]));
    return { sets, wDate };
  }, [], { sets: [], wDate: new Map<number, string>() });

  const trainedIds = useMemo(() => [...new Set(strength.sets.map((s) => s.exerciseId))], [strength]);
  const chosen = exId || trainedIds[0] || "";
  const exSeries = useMemo(() => {
    if (!chosen) return [];
    const byDate = new Map<string, number>();
    strength.sets.filter((s) => s.exerciseId === chosen).forEach((s) => {
      const d = strength.wDate.get(s.workoutId);
      if (!d) return;
      byDate.set(d, Math.max(byDate.get(d) || 0, e1rm(s.weight!, s.reps!)));
    });
    return [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([d, v]) => ({ x: short(d), y: Math.round(v) }));
  }, [chosen, strength]);

  const prs = useMemo(() => {
    const best = new Map<number, { w: number; r: number; e: number; date: string }>();
    strength.sets.forEach((s) => {
      const e = e1rm(s.weight!, s.reps!);
      const cur = best.get(s.exerciseId);
      if (!cur || e > cur.e) best.set(s.exerciseId, { w: s.weight!, r: s.reps!, e, date: strength.wDate.get(s.workoutId) || "" });
    });
    return [...best.entries()].map(([id, b]) => ({ name: exercises.find((e) => e.id === id)?.name ?? "Exercise", ...b })).sort((a, b) => b.e - a.e);
  }, [strength, exercises]);

  const change = weights.length > 1 ? weights[weights.length - 1].weight - weights[0].weight : null;

  return (
    <main className="screen">
      <div className="screen-head"><h1>Progress</h1></div>

      <ProfileCard />

      <section className="card">
        <div className="card-head">
          <h2>Body weight</h2>
          <div className="seg">{([30, 90, 365] as const).map((r) => <button key={r} type="button" aria-pressed={range === r} onClick={() => setRange(r)}>{r === 365 ? "1Y" : `${r}D`}</button>)}</div>
        </div>
        {weights.length ? (
          <>
            <LineChart data={weights.map((w) => ({ x: short(w.date), y: w.weight }))} label={`Body weight over the last ${range} days`} />
            <div className="spread small">
              <span className="muted">{change !== null ? <>Change <span className="num" style={{ color: "var(--fg)" }}>{change > 0 ? "+" : ""}{fmt(change, 1)} {settings.unit}</span></> : "One entry so far"}</span>
              <button className="btn btn-sm" type="button" onClick={() => setWeighOpen(true)}><Icon name="scale" />Weigh in</button>
            </div>
          </>
        ) : (
          <div className="empty"><Icon name="scale" /><p>No weigh-ins in this range.</p><button className="btn" type="button" onClick={() => setWeighOpen(true)}>Weigh in</button></div>
        )}
      </section>

      <section className="card">
        <div className="card-head"><h2>Calories, last 14 days</h2></div>
        <BarChart data={days.map((d, i) => ({ x: parseDay(d).toLocaleDateString(undefined, { weekday: "narrow" }), y: Math.round(perDay[i].kcal) }))} target={settings.targets.kcal} label="Daily calories for the last 14 days with target line" />
        {avg && (
          <div className="grid4" style={{ textAlign: "center" }}>
            <div><div className="label">Avg kcal</div><div className="stat">{fmt(avg.kcal / logged.length)}</div></div>
            <div><div className="label">Protein</div><div className="stat">{fmt(avg.p / logged.length)}<span className="unit">g</span></div></div>
            <div><div className="label">Carbs</div><div className="stat">{fmt(avg.c / logged.length)}<span className="unit">g</span></div></div>
            <div><div className="label">Fat</div><div className="stat">{fmt(avg.f / logged.length)}<span className="unit">g</span></div></div>
          </div>
        )}
        <span className="small muted">Averages use the {logged.length} day{logged.length === 1 ? "" : "s"} you logged. Dashed line is your target.</span>
      </section>

      <section className="card">
        <div className="card-head"><h2>Strength</h2></div>
        {trainedIds.length ? (
          <>
            <select className="input" value={chosen} onChange={(e) => setExId(Number(e.target.value))} aria-label="Exercise">
              {trainedIds.map((id) => <option key={id} value={id}>{exercises.find((e) => e.id === id)?.name}</option>)}
            </select>
            <LineChart data={exSeries} unit={` ${settings.unit}`} label="Estimated one-rep max over time" />
            <span className="small muted">Estimated 1-rep max per session (Epley formula).</span>
          </>
        ) : (
          <span className="muted">Finish a workout with weights to see strength trends.</span>
        )}
      </section>

      {prs.length > 0 && (
        <section className="card">
          <div className="card-head"><h2>Personal records</h2><Icon name="trophy" size={18} /></div>
          <div className="rows">
            {prs.map((p) => (
              <div className="row" key={p.name}>
                <span className="name">{p.name}</span>
                <span className="sub">{p.date ? parseDay(p.date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : ""} · e1RM {fmt(p.e)}</span>
                <span className="val">{fmt(p.w, 1)} <span className="unit">{settings.unit}</span> × {p.r}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <WeighInSheet open={weighOpen} onClose={() => setWeighOpen(false)} unit={settings.unit} initial={weights[weights.length - 1]?.weight} />
    </main>
  );
}
