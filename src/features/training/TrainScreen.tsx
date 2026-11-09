import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import { db, type Routine, type Workout } from "../../data/db";
import { useActiveWorkout, useExercises, useSettings } from "../../data/hooks";
import { parseDay } from "../../lib/dates";
import { fmt } from "../../lib/format";
import { Icon } from "../../ui";
import { ActiveWorkout } from "./ActiveWorkout";
import { RoutineEditor } from "./RoutineEditor";
import { formatDuration, startWorkout } from "./trainingActions";
import { WorkoutDetail } from "./WorkoutDetail";

export default function TrainScreen() {
  const active = useActiveWorkout();
  if (active) return <ActiveWorkout workout={active} />;
  return <TrainHome />;
}

/* ---------------- Home: routines + history ---------------- */

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
  const settings = useSettings();

  return (
    <main className="screen">
      <div className="screen-head"><h1>Train</h1></div>
      <button className="btn btn-primary btn-full" type="button" onClick={() => startWorkout()}><Icon name="play" />Start empty workout</button>

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
        {history.length ? (
          <div className="rows">
            {history.map((w) => (
              <button key={w.id} type="button" className="row" onClick={() => setViewing(w)}>
                <span className="name">{w.name}</span>
                <span className="sub">{parseDay(w.date).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })} · {formatDuration((w.finishedAt || 0) - w.startedAt)}</span>
                <span className="val">{setCounts[w.id!]?.sets ?? 0} sets{setCounts[w.id!]?.volume ? <><br /><span className="muted">{fmt(setCounts[w.id!].volume)} {settings.unit}</span></> : null}</span>
              </button>
            ))}
          </div>
        ) : (
          <span className="muted">Finished workouts show up here.</span>
        )}
      </section>

      {editing && <RoutineEditor routine={editing === "new" ? undefined : editing} onClose={() => setEditing(null)} />}
      {viewing && <WorkoutDetail workout={viewing} onClose={() => setViewing(null)} />}
    </main>
  );
}

/* ---------------- Active workout ---------------- */
