import { db, type Food, type FoodLog, type Meal } from "../../data/db";
import { scale } from "../../lib/macros";

/** Save a food the first time it's used (or bump its "recent" ranking), then log an amount of it. */
export async function logFood(food: Food, grams: number, meal: Meal, date: string) {
  let foodId = food.id;
  const meta = { lastUsed: Date.now(), useCount: (food.useCount || 0) + 1 };
  if (!foodId && food.sourceId) {
    const existing = await db.foods.where("[source+sourceId]").equals([food.source, food.sourceId]).first();
    foodId = existing?.id;
  }
  if (foodId) await db.foods.update(foodId, meta);
  else foodId = await db.foods.add({ ...food, ...meta });
  // Nutrition is copied onto the log so later edits to the food don't rewrite history.
  await db.foodLogs.add({ date, meal, foodId, name: food.name, grams, ...scale(food.per100, grams), createdAt: Date.now() });
}

export async function createFood(food: Food) {
  const id = await db.foods.add(food);
  return { ...food, id };
}

export function findFoodByBarcode(code: string) {
  return db.foods.where("barcode").equals(code).first();
}

/** Copy every log from one day to another. Returns the new ids so the copy can be undone. */
export async function copyDay(from: string, to: string) {
  const prev = await db.foodLogs.where("date").equals(from).toArray();
  if (!prev.length) return [];
  return (await db.foodLogs.bulkAdd(prev.map(({ id: _id, ...l }) => ({ ...l, date: to, createdAt: Date.now() })), { allKeys: true })) as number[];
}

export function undoCopy(ids: number[]) {
  return db.foodLogs.bulkDelete(ids);
}

export async function updateLog(log: FoodLog, grams: number, meal: Meal) {
  const per100 = log.grams
    ? { kcal: (log.kcal / log.grams) * 100, p: (log.p / log.grams) * 100, c: (log.c / log.grams) * 100, f: (log.f / log.grams) * 100 }
    : { kcal: 0, p: 0, c: 0, f: 0 };
  await db.foodLogs.update(log.id!, { grams, meal, ...scale(per100, grams) });
}

/** Delete a log. Returns a function that restores it. */
export async function removeLog(log: FoodLog) {
  await db.foodLogs.delete(log.id!);
  const { id: _id, ...rest } = log;
  return () => db.foodLogs.add(rest);
}
