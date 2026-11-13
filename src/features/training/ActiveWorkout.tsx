import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useMemo, useState } from "react";
import { db, type Exercise, type Workout, type WorkoutSet } from "../../data/db";
import { useExercises, useSettings } from "../../data/hooks";
import { ConfirmButton, Icon, NumInput, toast } from "../../ui";
import { ExercisePicker } from "./ExercisePicker";
import { fmt } from "../../lib/format";
import { distUnitFor } from "../../lib/running";
import { addExerciseToWorkout, addSet, deleteWorkout, finishWorkout, formatDuration, lastSetsFor, removeExerciseFromWorkout, removeSet, renameWorkout, updateSet } from "./trainingActions";

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

  // The exercise you're on: the first one with a set left to do.
  const currentId = groups.find((g) => g.sets.some((s) => !s.done))?.ex?.id;

  const addExercise = async (ex: Exercise) => {
    setPicking(false);
    await addExerciseToWorkout(workout.id!, ex);
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
          onChange={(e) => setName(e.target.value)} onBlur={() => renameWorkout(workout.id!, name)} />
        <button className="btn btn-primary btn-sm" type="button" onClick={finish}>Finish</button>
      </div>
      <div className="spread small">
        <span className="muted"><span className="num" style={{ color: "var(--fg)" }}>{formatDuration(now - workout.startedAt)}</span> elapsed</span>
        {lastDoneAt && <span className="muted">Rest <span className="num accent">{formatDuration(rest)}</span></span>}
      </div>

      {groups.map(({ ex, sets: exSets }) => ex && (
        <ExerciseBlock key={ex.id} ex={ex} sets={exSets} unit={settings.unit} workoutId={workout.id!} current={ex.id === currentId} onDone={() => setLastDoneAt(Date.now())} />
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

/** Weight × reps for display: "240 lb × 6", "BW + 25 × 8", "BW × 10". */
function setText(s: WorkoutSet, kind: Exercise["kind"], unit: string) {
  if (kind === "bodyweight") return <>{s.weight ? <>BW + {s.weight}<small>{unit}</small></> : "BW"} × {s.reps ?? "—"}</>;
  return <>{s.weight ?? "—"}<small>{unit}</small>× {s.reps ?? "—"}</>;
}

/** How this set compares to the same set last session. Weight first, then reps. */
function diffHint(s: WorkoutSet, p: WorkoutSet | undefined, unit: string) {
  if (!p) return null;
  const dw = (s.weight || 0) - (p.weight || 0);
  if (dw) return <span className={`set-hint${dw > 0 ? " up" : ""}`}>{dw > 0 ? "+" : "−"}{fmt(Math.abs(dw), 1)} {unit}</span>;
  const dr = (s.reps || 0) - (p.reps || 0);
  if (dr) return <span className={`set-hint${dr > 0 ? " up" : ""}`}>{dr > 0 ? "+" : "−"}{Math.abs(dr)} rep{Math.abs(dr) === 1 ? "" : "s"}</span>;
  return null;
}

function ExerciseBlock({ ex, sets, unit, workoutId, current, onDone }: { ex: Exercise; sets: WorkoutSet[]; unit: string; workoutId: number; current: boolean; onDone: () => void }) {
  const prev = useLiveQuery(() => lastSetsFor(ex.id!, workoutId), [ex.id, workoutId], []);
  const settings = useSettings();
  const cardio = ex.kind === "cardio";
  const du = distUnitFor(settings.unit);
  const [editing, setEditing] = useState<number | null>(null);
  const [menu, setMenu] = useState(false);
  const best = prev.length ? prev.reduce((a, b) => ((b.weight || 0) * (b.reps || 0) > (a.weight || 0) * (a.reps || 0) ? b : a), prev[0]) : null;

  const toggle = (s: WorkoutSet) => {
    setEditing(null);
    updateSet(s.id!, { done: !s.done });
    if (!s.done) onDone();
  };

  return (
    <section className={`card${current ? " current" : ""}`}>
      <div className="card-head">
        <h2>{ex.name}</h2>
        {best && !cardio && <span className="small muted num">Last: {ex.kind === "bodyweight" && !best.weight ? "BW" : `${best.weight ?? 0}`} × {best.reps ?? 0}</span>}
      </div>
      <div className="set-rows">
        {sets.map((s, i) => {
          const isEditing = editing === s.id;
          return (
            <div key={s.id} className={`set-row${s.done ? " done" : ""}`}>
              <button type="button" className="set-dot" aria-label={`Set ${i + 1} done`} aria-pressed={s.done} onClick={() => toggle(s)}>
                {s.done ? <Icon name="check" /> : i + 1}
              </button>
              {isEditing ? (
                <div className="set-edit" onKeyDown={(e) => e.key === "Enter" && setEditing(null)}>
                  {cardio ? (
                    <>
                      <NumInput value={s.minutes} onChange={(v) => updateSet(s.id!, { minutes: v })} placeholder="0" /><span className="muted">min</span>
                      <NumInput value={s.distance} onChange={(v) => updateSet(s.id!, { distance: v })} placeholder="0" /><span className="muted">{du}</span>
                    </>
                  ) : (
                    <>
                      <NumInput value={s.weight} onChange={(v) => updateSet(s.id!, { weight: v })} placeholder={ex.kind === "bodyweight" ? "+0" : "0"} /><span className="muted">{unit}</span>
                      <span className="muted">×</span>
                      <NumInput value={s.reps} onChange={(v) => updateSet(s.id!, { reps: v })} placeholder="0" />
                    </>
                  )}
                  <button type="button" className="btn btn-sm" onClick={() => setEditing(null)}>Done</button>
                </div>
              ) : (
                <>
                  <button type="button" className="set-val" aria-label={`Edit set ${i + 1}`} onClick={() => setEditing(s.id!)}>
                    {cardio ? <>{s.minutes ?? "—"}<small>min</small>· {s.distance ?? "—"}<small>{du}</small></> : setText(s, ex.kind, unit)}
                  </button>
                  {!cardio && diffHint(s, prev[i], unit)}
                </>
              )}
            </div>
          );
        })}
      </div>
      <div className="spread">
        <button className="btn btn-sm" type="button" onClick={() => addSet(workoutId, ex.id!, sets[sets.length - 1])}><Icon name="plus" />Set</button>
        <button className="btn btn-ghost icon-btn sm" type="button" aria-label={`More options for ${ex.name}`} aria-expanded={menu} onClick={() => setMenu(!menu)}><Icon name="more" /></button>
      </div>
      {menu && (
        <div className="row-gap" style={{ justifyContent: "flex-end" }}>
          <button className="btn btn-sm" type="button" disabled={!sets.length} onClick={() => { removeSet(sets[sets.length - 1].id!); setMenu(false); }}>Remove last set</button>
          <ConfirmButton label="Remove exercise" confirmLabel="Tap to remove" className="btn btn-sm btn-danger" onConfirm={() => removeExerciseFromWorkout(workoutId, ex.id!)} />
        </div>
      )}
    </section>
  );
}
