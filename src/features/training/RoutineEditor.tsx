import { useState } from "react";
import { db, type Routine, type RoutineItem } from "../../data/db";
import { useExercises } from "../../data/hooks";
import { ConfirmButton, Icon, NumInput, Sheet, toast } from "../../ui";
import { ExercisePicker } from "./ExercisePicker";

export function RoutineEditor({ routine, onClose }: { routine?: Routine; onClose: () => void }) {
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
