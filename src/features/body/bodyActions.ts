import { db } from "../../data/db";

/** One weigh-in per day; saving again on the same date replaces it. */
export function saveWeight(date: string, weight: number) {
  return db.weights.put({ date, weight });
}
