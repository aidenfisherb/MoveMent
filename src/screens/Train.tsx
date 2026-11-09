import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useMemo, useState } from "react";
import { ConfirmButton, Icon, NumInput, Sheet, toast } from "../components/ui";
import { db, type Exercise, type ExerciseKind, type Routine, type RoutineItem, type Workout, type WorkoutSet } from "../lib/db";
import { useActiveWorkout, useExercises, useSettings } from "../lib/hooks";
import { deleteWorkout, finishWorkout, formatDuration, lastSetsFor, startWorkout } from "../lib/training";
import { fmt, parseDay } from "../lib/util";

export default function Train() {
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

function useNow(interval = 1000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), interval);
    return () => window.clearInterval(t);
  }, [interval]);
  return now;
}

function ActiveWorkout({ workout }: { workout: Workout }) {
  const sets = useLiveQuery(() => db.sets.where("workoutId").equals(workout.id!).sortBy("order"), [workout.id], []);
  const exercises = useExercises();
  const settings = useSettings();
  const now = useNow();
  const [picking, setPicking] = useState(false);
  const [lastDoneAt, setLastDoneAt] = useState<number | null>(null);
  const [name, setName] = useState(workout.name);

  const groups = useMemo(() => {
    const order: number[] = [];
    sets.forEach((s) => !order.includes(s.exerciseId) && order.push(s.exerciseId));
    return order.map((id) => ({ ex: exercises.find((e) => e.id === id), sets: sets.filter((s) => s.exerciseId === id) }));
  }, [sets, exercises]);

  const nextOrder = () => (sets.length ? Math.max(...sets.map((s) => s.order)) + 1 : 0);

  const addExercise = async (ex: Exercise) => {
    setPicking(false);
    const prev = await lastSetsFor(ex.id!, workout.id);
    const n = Math.max(prev.length, ex.kind === "cardio" ? 1 : 3);
    let order = nextOrder();
    for (let i = 0; i < n; i++) {
      const p = prev[i] || prev[prev.length - 1];
      await db.sets.add({ workoutId: workout.id!, exerciseId: ex.id!, order: order++, weight: p?.weight, reps: p?.reps, minutes: p?.minutes, distance: p?.distance, done: false });
    }
  };

  const finish = async () => {
    const res = await finishWorkout(workout.id!);
    if (!res.saved) toast("Discarded: no completed sets");
    else toast(res.prs.length ? `Saved · New PR: ${res.prs.join(", ")}` : "Workout saved");
  };

  const rest = lastDoneAt ? now - lastDoneAt : 0;

  return (
    <main className="screen">
      <div className="screen-head">
        <input className="input" style={{ fontWeight: 800, fontSize: 18, background: "transparent", border: 0, padding: 0, height: 32 }} value={name} aria-label="Workout name"
          onChange={(e) => setName(e.target.value)} onBlur={() => db.workouts.update(workout.id!, { name: name.trim() || "Workout" })} />
        <button className="btn btn-primary btn-sm" type="button" onClick={finish}>Finish</button>
      </div>
      <div className="spread small">
        <span className="muted">Elapsed <span className="num" style={{ color: "var(--fg)" }}>{formatDuration(now - workout.startedAt)}</span></span>
        {lastDoneAt && <span className="muted">Rest <span className="num accent">{formatDuration(rest)}</span></span>}
      </div>

      {groups.map(({ ex, sets: exSets }) => ex && (
        <ExerciseBlock key={ex.id} ex={ex} sets={exSets} unit={settings.unit} workoutId={workout.id!} nextOrder={nextOrder} onDone={() => setLastDoneAt(Date.now())} />
      ))}

      {!groups.length && (
        <div className="card"><div className="empty"><Icon name="dumbbell" /><p>Add your first exercise.</p></div></div>
      )}

      <button className="btn btn-full" type="button" onClick={() => setPicking(true)}><Icon name="plus" />Add exercise</button>
      <ConfirmButton label="Discard workout" confirmLabel="Tap again to discard" className="btn btn-ghost btn-full" onConfirm={async () => { await deleteWorkout(workout.id!); toast("Workout discarded"); }} />

      {picking && <ExercisePicker onPick={addExercise} onClose={() => setPicking(false)} />}
    </main>
  );
}

function ExerciseBlock({ ex, sets, unit, workoutId, nextOrder, onDone }: { ex: Exercise; sets: WorkoutSet[]; unit: string; workoutId: number; nextOrder: () => number; onDone: () => void }) {
  const prev = useLiveQuery(() => lastSetsFor(ex.id!, workoutId), [ex.id, workoutId], []);
  const cardio = ex.kind === "cardio";
  const bw = ex.kind === "bodyweight";
  const upd = (s: WorkoutSet, patch: Partial<WorkoutSet>) => db.sets.update(s.id!, patch);

  const addSet = async () => {
    const last = sets[sets.length - 1];
    await db.sets.add({ workoutId, exerciseId: ex.id!, order: nextOrder(), weight: last?.weight, reps: last?.reps, minutes: last?.minutes, distance: last?.distance, done: false });
  };
  const removeLast = async () => {
    const last = sets[sets.length - 1];
    if (last) await db.sets.delete(last.id!);
  };

  return (
    <section className="card">
      <div className="card-head">
        <h2>{ex.name}</h2>
        <button className="btn icon-btn sm" type="button" aria-label={`Remove last set of ${ex.name}`} onClick={removeLast}><Icon name="minus" /></button>
      </div>
      <div className={`setgrid${cardio ? " cardio" : ""}`}>
        <span className="h">Set</span>
        {!cardio && <span className="h" style={{ textAlign: "center" }}>Last</span>}
        <span className="h" style={{ textAlign: "center" }}>{cardio ? "Min" : bw ? `+${unit}` : unit}</span>
        <span className="h" style={{ textAlign: "center" }}>{cardio ? "Dist" : "Reps"}</span>
        <span />
        {sets.map((s, i) => {
          const p = prev[i];
          return (
            <div key={s.id} style={{ display: "contents" }} className={s.done ? "setdone" : undefined}>
              <span className="num muted" style={{ textAlign: "center" }}>{i + 1}</span>
              {!cardio && <span className="prev">{p ? `${p.weight ?? 0}×${p.reps ?? 0}` : "—"}</span>}
              {cardio ? (
                <>
                  <NumInput value={s.minutes} onChange={(v) => upd(s, { minutes: v })} placeholder="0" />
                  <NumInput value={s.distance} onChange={(v) => upd(s, { distance: v })} placeholder="0" />
                </>
              ) : (
                <>
                  <NumInput value={s.weight} onChange={(v) => upd(s, { weight: v })} placeholder={bw ? "0" : p?.weight?.toString() ?? "0"} />
                  <NumInput value={s.reps} onChange={(v) => upd(s, { reps: v })} placeholder={p?.reps?.toString() ?? "0"} />
                </>
              )}
              <button type="button" className="check" aria-label={`Set ${i + 1} done`} aria-pressed={s.done}
                onClick={() => { upd(s, { done: !s.done }); if (!s.done) onDone(); }}>
                <Icon name="check" />
              </button>
            </div>
          );
        })}
      </div>
      <button className="btn btn-sm" type="button" onClick={addSet}><Icon name="plus" />Add set</button>
    </section>
  );
}

/* ---------------- Exercise picker ---------------- */

function ExercisePicker({ onPick, onClose }: { onPick: (e: Exercise) => void; onClose: () => void }) {
  const exercises = useExercises();
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<ExerciseKind>("weight");
  const list = exercises.filter((e) => !e.archived && e.name.toLowerCase().includes(q.trim().toLowerCase()));
  const exact = exercises.some((e) => e.name.toLowerCase() === q.trim().toLowerCase());
  const create = async () => {
    const id = await db.exercises.add({ name: q.trim(), kind });
    onPick({ id, name: q.trim(), kind });
  };
  return (
    <Sheet open onClose={onClose} tall title="Add exercise">
      <input className="input" autoFocus type="search" placeholder="Search or name a new exercise" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search exercises" />
      {q.trim() && !exact && (
        <div className="card">
          <span className="label">New exercise</span>
          <div className="seg" style={{ justifySelf: "start" }}>
            {(["weight", "bodyweight", "cardio"] as const).map((k) => <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)}>{k === "weight" ? "Weights" : k === "bodyweight" ? "Bodyweight" : "Cardio"}</button>)}
          </div>
          <button className="btn btn-primary" type="button" onClick={create}><Icon name="plus" />Create “{q.trim()}”</button>
        </div>
      )}
      <div className="rows">
        {list.map((e) => (
          <button key={e.id} type="button" className="row" onClick={() => onPick(e)}>
            <span className="name">{e.name}</span>
            <span className="sub">{e.kind === "weight" ? "Weights" : e.kind === "bodyweight" ? "Bodyweight" : "Cardio"}</span>
            <span className="val"><Icon name="plus" size={18} /></span>
          </button>
        ))}
      </div>
    </Sheet>
  );
}

/* ---------------- Routine editor ---------------- */

function RoutineEditor({ routine, onClose }: { routine?: Routine; onClose: () => void }) {
  const exercises = useExercises();
  const [name, setName] = useState(routine?.name || "");
  const [items, setItems] = useState<RoutineItem[]>(routine?.items || []);
  const [picking, setPicking] = useState(false);
  const exName = (id: number) => exercises.find((e) => e.id === id)?.name ?? "Exercise";

  const save = async () => {
    const data = { name: name.trim() || "Routine", items, updatedAt: Date.now() };
    if (routine?.id) await db.routines.update(routine.id, data);
    else await db.routines.add(data);
    toast("Routine saved");
    onClose();
  };
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    setItems(next);
  };

  return (
    <Sheet open onClose={onClose} tall title={routine ? "Edit routine" : "New routine"}>
      <div className="field"><label className="label" htmlFor="rt-n">Name</label><input id="rt-n" className="input" value={name} placeholder="e.g. Push day" onChange={(e) => setName(e.target.value)} /></div>
      <div className="rows">
        {items.map((it, i) => (
          <div key={i} className="row" style={{ gridTemplateColumns: "1fr 56px 56px auto", gap: 6 }}>
            <span className="name" style={{ gridRow: "1 / span 2" }}>{exName(it.exerciseId)}</span>
            <NumInput value={it.sets} onChange={(v) => setItems(items.map((x, k) => (k === i ? { ...x, sets: Math.max(1, Math.round(v || 1)) } : x)))} />
            <NumInput value={it.reps} onChange={(v) => setItems(items.map((x, k) => (k === i ? { ...x, reps: Math.round(v || 0) } : x)))} />
            <div style={{ display: "flex", gap: 4 }}>
              <button className="btn icon-btn sm" type="button" aria-label="Move up" onClick={() => move(i, -1)} disabled={i === 0}><span style={{ transform: "rotate(90deg)", display: "grid" }}><Icon name="left" /></span></button>
              <button className="btn icon-btn sm" type="button" aria-label="Remove" onClick={() => setItems(items.filter((_, k) => k !== i))}><Icon name="x" /></button>
            </div>
          </div>
        ))}
      </div>
      {items.length > 0 && <span className="small muted">Columns: sets, reps</span>}
      <button className="btn" type="button" onClick={() => setPicking(true)}><Icon name="plus" />Add exercise</button>
      <button className="btn btn-primary btn-full" type="button" onClick={save} disabled={!items.length}>Save routine</button>
      {routine?.id && <ConfirmButton label="Delete routine" className="btn btn-ghost" onConfirm={async () => { await db.routines.delete(routine.id!); toast("Routine deleted"); onClose(); }} />}
      {picking && <ExercisePicker onClose={() => setPicking(false)} onPick={(e) => { setItems([...items, { exerciseId: e.id!, sets: 3, reps: e.kind === "cardio" ? 0 : 10 }]); setPicking(false); }} />}
    </Sheet>
  );
}

/* ---------------- Workout detail ---------------- */

function WorkoutDetail({ workout, onClose }: { workout: Workout; onClose: () => void }) {
  const sets = useLiveQuery(() => db.sets.where("workoutId").equals(workout.id!).sortBy("order"), [workout.id], []);
  const exercises = useExercises();
  const settings = useSettings();
  const groups: { ex?: Exercise; sets: WorkoutSet[] }[] = [];
  sets.forEach((s) => {
    const g = groups.find((x) => x.ex?.id === s.exerciseId);
    if (g) g.sets.push(s);
    else groups.push({ ex: exercises.find((e) => e.id === s.exerciseId), sets: [s] });
  });
  const saveAsRoutine = async () => {
    await db.routines.add({ name: workout.name, items: groups.map((g) => ({ exerciseId: g.ex!.id!, sets: g.sets.length, reps: g.sets[0].reps || 0 })), updatedAt: Date.now() });
    toast("Saved as routine");
  };
  return (
    <Sheet open onClose={onClose} tall title={workout.name}>
      <span className="small muted">{parseDay(workout.date).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })} · {formatDuration((workout.finishedAt || 0) - workout.startedAt)}</span>
      {groups.map((g, i) => (
        <div className="card" key={i}>
          <h3>{g.ex?.name ?? "Exercise"}</h3>
          <div className="rows">
            {g.sets.map((s, k) => (
              <div key={s.id} className="row">
                <span className="name muted">Set {k + 1}</span>
                <span className="val">{g.ex?.kind === "cardio" ? `${s.minutes ?? 0} min${s.distance ? ` · ${s.distance}` : ""}` : `${s.weight ?? 0} ${settings.unit} × ${s.reps ?? 0}`}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
      <div className="grid2">
        <ConfirmButton label={<><Icon name="trash" />Delete</>} onConfirm={async () => { await deleteWorkout(workout.id!); toast("Workout deleted"); onClose(); }} />
        <button className="btn" type="button" onClick={saveAsRoutine} disabled={!groups.length}>Save as routine</button>
      </div>
    </Sheet>
  );
}
