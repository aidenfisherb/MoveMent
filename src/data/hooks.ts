import { useLiveQuery } from "dexie-react-hooks";
import { db } from "./db";
import { DEFAULT_SETTINGS, getSettings, type Settings } from "./settings";

export function useSettings(): Settings {
  return useLiveQuery(getSettings, [], DEFAULT_SETTINGS);
}

export function useExercises() {
  return useLiveQuery(() => db.exercises.orderBy("name").toArray(), [], []);
}

export function useActiveWorkout() {
  return useLiveQuery(async () => (await db.workouts.filter((w) => !w.finishedAt).toArray())[0] ?? null, [], null);
}
