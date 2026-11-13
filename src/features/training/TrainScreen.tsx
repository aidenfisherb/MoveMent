import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import { db, type Activity, type Routine, type Workout } from "../../data/db";
import { useActiveWorkout, useExercises, useSettings } from "../../data/hooks";
import { parseDay } from "../../lib/dates";
import { fmt } from "../../lib/format";
import { distUnitFor, formatPace, formatTime, toUnit } from "../../lib/running";
import { Icon } from "../../ui";
import { ActiveWorkout } from "./ActiveWorkout";
import { RoutineEditor } from "./RoutineEditor";
import { startWorkout } from "./trainingActions";
import { activityLabel, RunDetailSheet } from "./runs/RunSheets";
import { RunsCard } from "./runs/RunsCard";
import { WorkoutDetail } from "./WorkoutDetail";

export default function TrainScreen() {
  const active = useActiveWorkout();
  if (active) return <ActiveWorkout workout={active} />;
  return <TrainHome />;
}

/* ---------------- Home: running, routines, history ---------------- */

/** "54 min" or "1 h 05 min" for workout length. */
function fmtMinutes(ms: number) {
  const m = Math.round(ms / 60000);
  return m >= 60 ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")} min` : `${m} min`;
}

function TrainHome() {
  const routines = useLiveQuery(() => db.routines.orderBy("name").toArray(), [], []);
  const exercises = useExercises();
  const exName = (id: number) => exercises.find((e) => e.id === id)?.name ?? "Exercise";
  const history = useLiveQuery(() => db.workouts.orderBy("startedAt").reverse().filter((w) => !!w.finishedAt).limit(30).toArray(), [], []);
  const setCounts = useLiveQuery(async () => {
    const ids = history.map((w) => w.id!);
    const sets = await db.sets.where("workoutId").anyOf(ids).toArray();
    const map: Record<number, { sets: number; volume: number }> = {};
    sets.forEach((s) => {
      const m = (map[s.workoutId] ||= { sets: 0, volume: 0 });
      m.sets++;
      m.volume += (s.weight || 0) * (s.reps || 0);
    });
    return map;
  }, [history], {} as Record<number, { sets: number; volume: number }>);
  const [editing, setEditing] = useState<Routine | "new" | null>(null);
  const [viewing, setViewing] = useState<Workout | null>(null);
  const [viewingRun, setViewingRun] = useState<Activity | null>(null);
  const settings = useSettings();
  const u = distUnitFor(settings.unit);
  const activities = useLiveQuery(() => db.activities.orderBy("startedAt").reverse().limit(30).toArray(), [], []);
  // One timeline: lifting sessions and runs/cardio, newest first.
  const timeline = [
    ...history.map((w) => ({ kind: "lift" as const, at: w.startedAt, w })),
    ...activities.map((a) => ({ kind: "cardio" as const, at: a.startedAt, a }))
  ].sort((x, y) => y.at - x.at).slice(0, 30);
  const dayLabel = (d: string) => parseDay(d).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });

  return (
    <main className="screen">
      <div className="screen-head"><h1>Train</h1></div>
      <button className="btn btn-primary btn-full" type="button" onClick={() => startWorkout()}><Icon name="play" />Start empty workout</button>

      <RunsCard />

      <section className="card">
        <div className="card-head">
          <h2>Routines</h2>
          <button className="btn btn-sm" type="button" onClick={() => setEditing("new")}><Icon name="plus" />New</button>
        </div>
        {routines.length ? (
          <div className="rows">
            {routines.map((r) => (
              <div key={r.id} className="row" style={{ gridTemplateColumns: "1fr auto auto" }}>
                <span className="name">{r.name}</span>
                <span className="sub">{r.items.map((i) => exName(i.exerciseId)).join(", ") || "No exercises"}</span>
                <button className="btn icon-btn sm" type="button" aria-label={`Edit ${r.name}`} style={{ gridRow: "1 / span 2", gridColumn: 2 }} onClick={() => setEditing(r)}><Icon name="edit" /></button>
                <button className="btn btn-primary btn-sm" type="button" style={{ gridRow: "1 / span 2", gridColumn: 3 }} onClick={() => startWorkout(r)}>Start</button>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty">
            <Icon name="dumbbell" />
            <p>Save the workouts you repeat as routines.</p>
            <p className="small muted">Starting one pre-fills last time's weights.</p>
          </div>
        )}
      </section>

      <section className="card">
        <div className="card-head"><h2>History</h2></div>
        {timeline.length ? (
          <div className="rows">
            {timeline.map((t) => t.kind === "lift" ? (
              <button key={`w${t.w.id}`} type="button" className="row" onClick={() => setViewing(t.w)}>
                <span className="name"><Icon name="dumbbell" size={14} /> {t.w.name}</span>
                <span className="sub">{dayLabel(t.w.date)} · {fmtMinutes((t.w.finishedAt || 0) - t.w.startedAt)}</span>
                <span className="val">{setCounts[t.w.id!]?.sets ?? 0} sets{setCounts[t.w.id!]?.volume ? <><br /><span className="muted">{fmt(setCounts[t.w.id!].volume)} {settings.unit}</span></> : null}</span>
              </button>
            ) : (
              <button key={`a${t.a.id}`} type="button" className="row" onClick={() => setViewingRun(t.a)}>
                <span className="name"><Icon name="run" size={14} /> {t.a.name}</span>
                <span className="sub">{dayLabel(t.a.date)} · {activityLabel(t.a)} · {formatTime(t.a.movingS)}</span>
                <span className="val">{toUnit(t.a.distanceM, u).toFixed(2)} {u}<br /><span className="muted">{formatPace(t.a.distanceM, t.a.movingS, u)}</span></span>
              </button>
            ))}
          </div>
        ) : (
          <span className="muted">Finished workouts and runs show up here.</span>
        )}
      </section>

      {editing && <RoutineEditor routine={editing === "new" ? undefined : editing} onClose={() => setEditing(null)} />}
      {viewing && <WorkoutDetail workout={viewing} onClose={() => setViewing(null)} />}
      {viewingRun && <RunDetailSheet activity={viewingRun} onClose={() => setViewingRun(null)} />}
    </main>
  );
}

/* ---------------- Active workout ---------------- */
