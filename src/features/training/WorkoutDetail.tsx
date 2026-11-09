import { useLiveQuery } from "dexie-react-hooks";
import { db, type Exercise, type Workout, type WorkoutSet } from "../../data/db";
import { useExercises, useSettings } from "../../data/hooks";
import { parseDay } from "../../lib/dates";
import { ConfirmButton, Icon, Sheet, toast } from "../../ui";
import { deleteWorkout, formatDuration } from "./trainingActions";

export function WorkoutDetail({ workout, onClose }: { workout: Workout; onClose: () => void }) {
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
