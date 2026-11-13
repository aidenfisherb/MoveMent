import { db, type Exercise, type Routine, type WorkoutSet } from "../../data/db";
import { dayKey } from "../../lib/dates";
import { e1rm } from "../../lib/strength";

/** Most recent finished-workout sets for an exercise, for "last time" hints and prefilling. */
export async function lastSetsFor(exerciseId: number, excludeWorkoutId?: number): Promise<WorkoutSet[]> {
  const sets = await db.sets.where("exerciseId").equals(exerciseId).filter((s) => s.done && s.workoutId !== excludeWorkoutId).toArray();
  if (!sets.length) return [];
  const lastWorkout = Math.max(...sets.map((s) => s.workoutId));
  return sets.filter((s) => s.workoutId === lastWorkout).sort((a, b) => a.order - b.order);
}

export async function startWorkout(routine?: Routine) {
  const workoutId = await db.workouts.add({ date: dayKey(), name: routine?.name || "Workout", routineId: routine?.id, startedAt: Date.now() });
  if (routine) {
    let order = 0;
    for (const item of routine.items) {
      const prev = await lastSetsFor(item.exerciseId);
      for (let i = 0; i < item.sets; i++) {
        const p = prev[i] || prev[prev.length - 1];
        await db.sets.add({ workoutId, exerciseId: item.exerciseId, order: order++, weight: p?.weight, reps: item.reps || p?.reps, minutes: p?.minutes, distance: p?.distance, done: false });
      }
    }
  }
  return workoutId;
}

export async function finishWorkout(workoutId: number) {
  const sets = await db.sets.where("workoutId").equals(workoutId).toArray();
  const done = sets.filter((s) => s.done);
  await db.sets.bulkDelete(sets.filter((s) => !s.done).map((s) => s.id!));
  if (!done.length) {
    await db.workouts.delete(workoutId);
    return { saved: false, prs: [] as string[] };
  }
  // Detect PRs by estimated 1RM against all earlier history.
  const prs: string[] = [];
  const exIds = [...new Set(done.map((s) => s.exerciseId))];
  for (const exId of exIds) {
    const mine = done.filter((s) => s.exerciseId === exId);
    const best = Math.max(...mine.map((s) => e1rm(s.weight || 0, s.reps || 0)));
    if (!best) continue;
    const history = await db.sets.where("exerciseId").equals(exId).filter((s) => s.done && s.workoutId !== workoutId).toArray();
    const prevBest = Math.max(0, ...history.map((s) => e1rm(s.weight || 0, s.reps || 0)));
    if (history.length && best > prevBest) {
      const ex = await db.exercises.get(exId);
      if (ex) prs.push(ex.name);
    }
  }
  await db.workouts.update(workoutId, { finishedAt: Date.now() });
  return { saved: true, prs };
}

export async function deleteWorkout(workoutId: number) {
  await db.transaction("rw", db.workouts, db.sets, async () => {
    await db.sets.where("workoutId").equals(workoutId).delete();
    await db.workouts.delete(workoutId);
  });
}

export function formatDuration(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}` : `${m}:${String(sec).padStart(2, "0")}`;
}

/* ---------- Editing a workout in progress ---------- */

async function nextOrder(workoutId: number) {
  const last = await db.sets.where("workoutId").equals(workoutId).sortBy("order");
  return last.length ? last[last.length - 1].order + 1 : 0;
}

/** Add an exercise with as many sets as last time (at least 3, or 1 for cardio), pre-filled from last time. */
export async function addExerciseToWorkout(workoutId: number, ex: Exercise) {
  const prev = await lastSetsFor(ex.id!, workoutId);
  const n = Math.max(prev.length, ex.kind === "cardio" ? 1 : 3);
  let order = await nextOrder(workoutId);
  for (let i = 0; i < n; i++) {
    const p = prev[i] || prev[prev.length - 1];
    await db.sets.add({ workoutId, exerciseId: ex.id!, order: order++, weight: p?.weight, reps: p?.reps, minutes: p?.minutes, distance: p?.distance, done: false });
  }
}

/** Add a set that copies the previous one's numbers. */
export async function addSet(workoutId: number, exerciseId: number, copyFrom?: WorkoutSet) {
  await db.sets.add({ workoutId, exerciseId, order: await nextOrder(workoutId), weight: copyFrom?.weight, reps: copyFrom?.reps, minutes: copyFrom?.minutes, distance: copyFrom?.distance, done: false });
}

export function updateSet(id: number, patch: Partial<WorkoutSet>) {
  return db.sets.update(id, patch);
}

export function removeSet(id: number) {
  return db.sets.delete(id);
}

export function removeExerciseFromWorkout(workoutId: number, exerciseId: number) {
  return db.sets.where("workoutId").equals(workoutId).filter((s) => s.exerciseId === exerciseId).delete();
}

export function renameWorkout(id: number, name: string) {
  return db.workouts.update(id, { name: name.trim() || "Workout" });
}
