import Dexie, { type Table } from "dexie";

export type Meal = "breakfast" | "lunch" | "dinner" | "snack";
export const MEALS: Meal[] = ["breakfast", "lunch", "dinner", "snack"];

export interface Macros { kcal: number; p: number; c: number; f: number }

/** A food definition. Nutrition is stored per 100 g (or 100 ml). */
export interface Food {
  id?: number;
  name: string;
  brand?: string;
  barcode?: string;
  source: "off" | "usda" | "custom";
  sourceId?: string;
  per100: Macros;
  /** Default serving in grams, plus a human label like "1 bar (40 g)". */
  servingG?: number;
  servingLabel?: string;
  lastUsed?: number;
  useCount?: number;
}

/** One logged food. Nutrition is snapshotted so editing a food later doesn't rewrite history. */
export interface FoodLog extends Macros {
  id?: number;
  date: string; // YYYY-MM-DD
  meal: Meal;
  foodId?: number;
  name: string;
  grams: number;
  createdAt: number;
}

export type ExerciseKind = "weight" | "bodyweight" | "cardio";
export interface Exercise { id?: number; name: string; kind: ExerciseKind; archived?: boolean }

export interface RoutineItem { exerciseId: number; sets: number; reps: number }
export interface Routine { id?: number; name: string; items: RoutineItem[]; updatedAt: number }

export interface Workout {
  id?: number;
  date: string;
  name: string;
  routineId?: number;
  startedAt: number;
  finishedAt?: number;
  notes?: string;
}

export interface WorkoutSet {
  id?: number;
  workoutId: number;
  exerciseId: number;
  order: number;
  weight?: number; // in the user's unit at time of logging
  reps?: number;
  minutes?: number;
  distance?: number;
  done: boolean;
}

export interface BodyWeight { date: string; weight: number }

export interface Setting { key: string; value: unknown }

class MoveMentDB extends Dexie {
  foods!: Table<Food, number>;
  foodLogs!: Table<FoodLog, number>;
  exercises!: Table<Exercise, number>;
  routines!: Table<Routine, number>;
  workouts!: Table<Workout, number>;
  sets!: Table<WorkoutSet, number>;
  weights!: Table<BodyWeight, string>;
  settings!: Table<Setting, string>;

  constructor() {
    super("movement");
    this.version(1).stores({
      foods: "++id, name, barcode, [source+sourceId], lastUsed",
      foodLogs: "++id, date, [date+meal], foodId",
      exercises: "++id, name",
      routines: "++id, name",
      workouts: "++id, date, startedAt, finishedAt",
      sets: "++id, workoutId, exerciseId, [workoutId+order]",
      weights: "date",
      settings: "key"
    });
    this.on("populate", (tx) => {
      const starter: Exercise[] = [
        ["Bench press", "weight"], ["Incline dumbbell press", "weight"], ["Overhead press", "weight"],
        ["Squat", "weight"], ["Deadlift", "weight"], ["Romanian deadlift", "weight"], ["Leg press", "weight"],
        ["Barbell row", "weight"], ["Lat pulldown", "weight"], ["Pull-up", "bodyweight"], ["Dip", "bodyweight"],
        ["Bicep curl", "weight"], ["Tricep pushdown", "weight"], ["Lateral raise", "weight"],
        ["Running", "cardio"], ["Cycling", "cardio"], ["Walking", "cardio"]
      ].map(([name, kind]) => ({ name, kind: kind as ExerciseKind }));
      tx.table("exercises").bulkAdd(starter);
    });
  }
}

export const db = new MoveMentDB();

export interface Settings {
  targets: Macros;
  unit: "lb" | "kg";
  usdaKey: string;
  lastBackup?: number;
}

export const DEFAULT_SETTINGS: Settings = {
  targets: { kcal: 2400, p: 180, c: 260, f: 70 },
  unit: "lb",
  usdaKey: ""
};

export async function getSettings(): Promise<Settings> {
  const rows = await db.settings.toArray();
  const s = { ...DEFAULT_SETTINGS } as Record<string, unknown>;
  rows.forEach((r) => (s[r.key] = r.value));
  return s as unknown as Settings;
}

export function saveSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
  return db.settings.put({ key, value });
}
