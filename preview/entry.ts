// Preview-only entry: fills an empty database with realistic sample data, then starts the real app.
import { db, type Food, type Meal } from "../src/data/db";
import { saveSetting } from "../src/data/settings";
import { addDays, dayKey } from "../src/lib/dates";
import { scale } from "../src/lib/macros";

const today = dayKey();
const rand = (seed: number) => {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
};

async function seed() {
  if (await db.settings.get("previewSeeded")) return;
  const ex = Object.fromEntries((await db.exercises.toArray()).map((e) => [e.name, e.id!]));

  await saveSetting("name", "Aiden");
  await saveSetting("heightCm", 180.3);

  // Weigh-ins every 3 days for 8 weeks, trending down.
  const weights = [];
  for (let d = 56; d >= 0; d -= 3) weights.push({ date: addDays(today, -d), weight: Math.round((178.4 + d * 0.065 + (rand(d) - 0.5) * 0.8) * 10) / 10 });
  await db.weights.bulkPut(weights);

  // Routines.
  const push = [["Bench press", 3, 8], ["Overhead press", 3, 10], ["Incline dumbbell press", 3, 12], ["Lateral raise", 3, 15], ["Tricep pushdown", 3, 12]] as const;
  const pull = [["Barbell row", 3, 8], ["Lat pulldown", 3, 10], ["Pull-up", 3, 8], ["Bicep curl", 3, 12]] as const;
  const legs = [["Squat", 3, 6], ["Romanian deadlift", 3, 8], ["Leg press", 3, 12]] as const;
  const plans = { Push: push, Pull: pull, Legs: legs };
  const routineIds: Record<string, number> = {};
  for (const [name, items] of Object.entries(plans)) {
    routineIds[name] = await db.routines.add({ name, items: items.map(([n, sets, reps]) => ({ exerciseId: ex[n], sets, reps })), updatedAt: Date.now() });
  }

  // Past workouts: push / pull / legs every other day for three weeks, weights creeping up.
  const start: Record<string, number> = {
    "Bench press": 175, "Overhead press": 90, "Incline dumbbell press": 50, "Lateral raise": 20, "Tricep pushdown": 50,
    "Barbell row": 145, "Lat pulldown": 130, "Pull-up": 0, "Bicep curl": 30, Squat: 225, "Romanian deadlift": 185, "Leg press": 360
  };
  const order = ["Push", "Pull", "Legs"] as const;
  let i = 0;
  for (let d = 21; d >= 1; d -= 2, i++) {
    const name = order[i % 3];
    const date = addDays(today, -d);
    const startedAt = new Date(`${date}T17:30:00`).getTime();
    const workoutId = await db.workouts.add({ date, name, routineId: routineIds[name], startedAt, finishedAt: startedAt + (52 + Math.round(rand(d) * 20)) * 60000 });
    const week = Math.floor(i / 3);
    let o = 0;
    for (const [exName, sets, reps] of plans[name]) {
      const w = start[exName] + week * (start[exName] >= 100 ? 5 : start[exName] > 0 ? 2.5 : 0);
      for (let s = 0; s < sets; s++) {
        await db.sets.add({ workoutId, exerciseId: ex[exName], order: o++, weight: w || undefined, reps: Math.max(1, reps - (s === sets - 1 && rand(d + s) > 0.5 ? 1 : 0)), done: true });
      }
    }
  }

  // Foods and two weeks of logs.
  const foods: Record<string, Food> = {
    yogurt: { name: "Greek yogurt, 2%", source: "custom", per100: { kcal: 73, p: 10, c: 4, f: 2 }, servingG: 200, servingLabel: "1 cup" },
    oats: { name: "Rolled oats", source: "custom", per100: { kcal: 379, p: 13, c: 68, f: 6.5 }, servingG: 40, servingLabel: "1/2 cup" },
    chicken: { name: "Chicken breast, cooked", source: "custom", per100: { kcal: 165, p: 31, c: 0, f: 3.6 }, servingG: 150, servingLabel: "5 oz" },
    rice: { name: "White rice, cooked", source: "custom", per100: { kcal: 130, p: 2.7, c: 28, f: 0.3 }, servingG: 180, servingLabel: "1 cup" },
    bar: { name: "Protein bar", source: "custom", per100: { kcal: 367, p: 33, c: 40, f: 12 }, servingG: 60, servingLabel: "1 bar" },
    banana: { name: "Banana", source: "custom", per100: { kcal: 89, p: 1.1, c: 23, f: 0.3 }, servingG: 118, servingLabel: "1 medium" },
    salmon: { name: "Salmon fillet", source: "custom", per100: { kcal: 208, p: 20, c: 0, f: 13 }, servingG: 170, servingLabel: "6 oz" },
    bowl: { name: "Chicken burrito bowl", source: "custom", ai: true, per100: { kcal: 150, p: 9.2, c: 15.8, f: 5 }, servingG: 520, servingLabel: "1 bowl" }
  };
  for (const [k, f] of Object.entries(foods)) foods[k] = { ...f, id: await db.foods.add({ ...f, lastUsed: Date.now() - Math.round(rand(k.length) * 1e7), useCount: 3 }) };
  const day: [Meal, keyof typeof foods, number][] = [
    ["breakfast", "yogurt", 1], ["breakfast", "oats", 1], ["breakfast", "banana", 1],
    ["lunch", "bowl", 1], ["snack", "bar", 1], ["dinner", "salmon", 1], ["dinner", "rice", 1]
  ];
  for (let d = 13; d >= 0; d--) {
    const date = addDays(today, -d);
    const items = d === 0 ? day.slice(0, 4) : day.filter((_, j) => rand(d * 10 + j) > 0.12);
    for (const [meal, key, qty] of items) {
      const f = foods[key];
      const grams = f.servingG! * qty * (0.85 + rand(d + qty) * 0.3);
      await db.foodLogs.add({ date, meal, foodId: f.id, name: f.name, grams: Math.round(grams), ...scale(f.per100, grams), createdAt: Date.now() });
    }
  }

  await db.settings.put({ key: "previewSeeded", value: true });
}

seed()
  .catch((e) => console.error("Preview seed failed", e))
  .finally(() => import("../src/main"));
