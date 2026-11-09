import { db } from "../../data/db";
import { saveSetting } from "../../data/settings";

/** Switch lb <-> kg and convert every stored weigh-in and lift so history stays consistent. */
export async function switchUnit(unit: "lb" | "kg") {
  const k = unit === "kg" ? 1 / 2.20462 : 2.20462;
  const r = (v: number) => Math.round(v * k * 10) / 10;
  await db.transaction("rw", db.weights, db.sets, db.settings, async () => {
    await db.weights.toCollection().modify((w) => { w.weight = r(w.weight); });
    await db.sets.toCollection().modify((x) => { if (x.weight) x.weight = r(x.weight); });
    await saveSetting("unit", unit);
  });
}
