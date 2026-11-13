import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useMemo, useState } from "react";
import { db, type Exercise, type Workout, type WorkoutSet } from "../../data/db";
import { useExercises, useSettings } from "../../data/hooks";
import { ConfirmButton, Icon, NumInput, toast } from "../../ui";
import { ExercisePicker } from "./ExercisePicker";
import { deleteWorkout, finishWorkout, formatDuration, lastSetsFor } from "./trainingActions";

function useNow(interval = 1000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), interval);
    return () => window.clearInterval(t);
  }, [interval]);
  return now;
}

export function ActiveWorkout({ workout }: { workout: Workout }) {
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
        {sets.map((s, i) => {
          const p = prev[i];
          return (
            <div key={s.id} style={{ display: "contents" }} className={s.done ? "setdone" : undefined}>
              {/* Tap the numbered circle to mark the set done; it fills orange with a check. */}
              <button type="button" className="set-dot" aria-label={`Set ${i + 1} done`} aria-pressed={s.done}
                onClick={() => { upd(s, { done: !s.done }); if (!s.done) onDone(); }}>
                {s.done ? <Icon name="check" /> : i + 1}
              </button>
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
            </div>
          );
        })}
      </div>
      <button className="btn btn-sm" type="button" onClick={addSet}><Icon name="plus" />Add set</button>
    </section>
  );
}

/* ---------------- Exercise picker ---------------- */
