import { useState } from "react";
import { db, type Exercise, type ExerciseKind } from "../../data/db";
import { useExercises } from "../../data/hooks";
import { Icon, Sheet } from "../../ui";

export function ExercisePicker({ onPick, onClose }: { onPick: (e: Exercise) => void; onClose: () => void }) {
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
