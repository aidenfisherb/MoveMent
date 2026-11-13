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
  /** True when the numbers came from an AI photo estimate. */
  ai?: boolean;
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

export type Sport = "run" | "walk" | "hike" | "ride" | "swim" | "other";
export type RunType = "easy" | "long" | "workout" | "race";
export const RUN_TYPES: RunType[] = ["easy", "long", "workout", "race"];

/** A distance/cardio session: logged by hand or imported from Strava. Distances in meters, times in seconds. */
export interface Activity {
  id?: number;
  date: string;
  startedAt: number;
  name: string;
  sport: Sport;
  runType?: RunType;
  distanceM: number;
  movingS: number;
  elapsedS?: number;
  elevationM?: number;
  avgHr?: number;
  maxHr?: number;
  effort?: number; // 1-10, how hard it felt
  notes?: string;
  source: "manual" | "strava";
  stravaId?: number;
  polyline?: string;
}

/** A progress photo. Stored resized (about 1600px) plus a small thumbnail for the grid. */
export interface Photo {
  id?: number;
  date: string;
  image: Blob;
  thumb: Blob;
  createdAt: number;
}

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
  photos!: Table<Photo, number>;
  activities!: Table<Activity, number>;

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
    // v2: progress photos. Add new versions below; never edit an earlier one.
    this.version(2).stores({ photos: "++id, date" });
    // v3: runs and other cardio (manual or from Strava).
    this.version(3).stores({ activities: "++id, date, startedAt, &stravaId, sport" });
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
