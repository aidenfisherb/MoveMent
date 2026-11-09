import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import type { Route } from "../../app/routes";
import { db, MEALS } from "../../data/db";
import { useActiveWorkout, useSettings } from "../../data/hooks";
import { addDays, dayKey, parseDay } from "../../lib/dates";
import { cap, fmt } from "../../lib/format";
import { sumMacros } from "../../lib/macros";
import { Dial, Icon } from "../../ui";
import { WeighInSheet } from "../body/WeighInSheet";

export default function TodayScreen({ go }: { go: (r: Route) => void }) {
  const today = dayKey();
  const settings = useSettings();
  const t = settings.targets;
  const logs = useLiveQuery(() => db.foodLogs.where("date").equals(today).toArray(), [today], []);
  const total = sumMacros(logs);
  const left = t.kcal - total.kcal;
  const active = useActiveWorkout();
  const todaysWorkouts = useLiveQuery(() => db.workouts.where("date").equals(today).filter((w) => !!w.finishedAt).toArray(), [today], []);
  const weights = useLiveQuery(() => db.weights.orderBy("date").reverse().limit(8).toArray(), [], []);
  const latest = weights[0];
  const weekAgo = weights.find((w) => w.date <= addDays(today, -7));
  const [weighOpen, setWeighOpen] = useState(false);

  return (
    <main className="screen">
      <div className="screen-head">
        <div className="left"><h1>Today</h1><span className="small muted num">{parseDay(today).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</span></div>
        <button className="btn icon-btn" type="button" aria-label="Settings" onClick={() => go("settings")}><Icon name="gear" /></button>
      </div>

      <section className="card">
        <div className="card-head">
          <span className="label">{left >= 0 ? "Calories left" : "Calories over"}</span>
          <span className="small muted num">{fmt(total.kcal)} eaten</span>
        </div>
        <div className="spread" style={{ alignItems: "baseline" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span className="display" style={left < 0 ? { color: "var(--danger)" } : undefined}>{fmt(Math.abs(left))}</span>
            <span className="small muted num">of {fmt(t.kcal)} kcal</span>
          </div>
          <button className="btn btn-primary btn-sm" type="button" onClick={() => go("food")}><Icon name="plus" />Log food</button>
        </div>
        <div className="dials">
          <Dial label="Protein" value={total.p} target={t.p} color="var(--series-1)" />
          <Dial label="Carbs" value={total.c} target={t.c} color="var(--series-2)" limit />
          <Dial label="Fat" value={total.f} target={t.f} color="var(--series-3)" limit />
        </div>
      </section>

      <section className="card">
        <div className="card-head"><h2>Meals</h2><button className="btn btn-ghost btn-sm" type="button" onClick={() => go("food")}>Open log</button></div>
        <div className="rows">
          {MEALS.map((m) => {
            const items = logs.filter((l) => l.meal === m);
            const s = sumMacros(items);
            return (
              <button key={m} className="row" type="button" onClick={() => go("food")}>
                <span className="name">{cap(m)}</span>
                <span className="sub">{items.length ? items.map((i) => i.name).join(", ") : "Nothing logged"}</span>
                <span className="val">{items.length ? <>{fmt(s.kcal)}<span className="unit">kcal</span></> : <span className="faint">—</span>}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="card">
        <div className="card-head"><h2>Training</h2></div>
        {active ? (
          <div className="spread">
            <div><div>{active.name}</div><div className="small muted">In progress</div></div>
            <button className="btn btn-primary btn-sm" type="button" onClick={() => go("train")}>Resume</button>
          </div>
        ) : todaysWorkouts.length ? (
          <div className="spread">
            <div><div>{todaysWorkouts.map((w) => w.name).join(", ")}</div><div className="small up">Done today</div></div>
            <button className="btn btn-sm" type="button" onClick={() => go("train")}>View</button>
          </div>
        ) : (
          <div className="spread">
            <span className="muted">No workout logged yet today.</span>
            <button className="btn btn-sm" type="button" onClick={() => go("train")}><Icon name="play" />Start</button>
          </div>
        )}
      </section>

      <section className="card">
        <div className="card-head">
          <h2>Body weight</h2>
          <button className="btn btn-sm" type="button" onClick={() => setWeighOpen(true)}><Icon name="scale" />Weigh in</button>
        </div>
        {latest ? (
          <div className="stats">
            <div><span className="label">Latest</span><span className="stat">{fmt(latest.weight, 1)}<span className="unit">{settings.unit}</span></span><span className="small muted">{latest.date === today ? "Today" : parseDay(latest.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span></div>
            {weekAgo && (
              <div><span className="label">vs 1 week ago</span><span className="stat">{latest.weight - weekAgo.weight > 0 ? "+" : ""}{fmt(latest.weight - weekAgo.weight, 1)}<span className="unit">{settings.unit}</span></span></div>
            )}
          </div>
        ) : (
          <span className="muted">Log your weight to start a trend line.</span>
        )}
      </section>

      <WeighInSheet open={weighOpen} onClose={() => setWeighOpen(false)} unit={settings.unit} initial={latest?.weight} />
    </main>
  );
}
