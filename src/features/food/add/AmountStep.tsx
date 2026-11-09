import { useState } from "react";
import type { Food, Meal } from "../../../data/db";
import { fmt } from "../../../lib/format";
import { scale } from "../../../lib/macros";
import { NumInput, toast } from "../../../ui";
import { MacroLine, MealChips } from "../components";
import { logFood } from "../foodActions";

export function AmountStep({ food, meal, setMeal, date, onDone }: { food: Food; meal: Meal; setMeal: (m: Meal) => void; date: string; onDone: () => void }) {
  const hasServing = !!food.servingG;
  const [mode, setMode] = useState<"serving" | "g">(hasServing ? "serving" : "g");
  const [qty, setQty] = useState<number | undefined>(hasServing ? 1 : 100);
  const grams = mode === "serving" ? (qty || 0) * (food.servingG || 0) : qty || 0;
  const m = scale(food.per100, grams);

  const add = async () => {
    if (!grams) return;
    await logFood(food, grams, meal, date);
    toast(`Added to ${meal}`);
    onDone();
  };

  return (
    <>
      <div>
        <h3>{food.name}</h3>
        <span className="small muted">{[food.brand, food.source === "off" ? "Open Food Facts" : food.source === "usda" ? "USDA" : "Your food"].filter(Boolean).join(" · ")}</span>
      </div>
      <MealChips meal={meal} setMeal={setMeal} />
      <div className="grid2">
        <div className="field">
          <label className="label" htmlFor="qty">{mode === "serving" ? "Servings" : "Grams"}</label>
          <NumInput id="qty" value={qty} onChange={setQty} />
        </div>
        <div className="field">
          <span className="label">Unit</span>
          <div className="seg" style={{ height: 40, alignItems: "center" }}>
            {hasServing && <button type="button" aria-pressed={mode === "serving"} onClick={() => { if (mode !== "serving") { setMode("serving"); setQty(1); } }}>Serving</button>}
            <button type="button" aria-pressed={mode === "g"} onClick={() => { if (mode !== "g") { setMode("g"); setQty(Math.round(grams) || 100); } }}>Grams</button>
          </div>
        </div>
      </div>
      {hasServing && mode === "serving" && <span className="small muted">1 serving = {food.servingLabel || `${fmt(food.servingG!)} g`}{food.servingLabel && !food.servingLabel.includes("g") ? ` (${fmt(food.servingG!)} g)` : ""}</span>}
      <MacroLine m={m} grams={grams} />
      <button className="btn btn-primary btn-full" type="button" disabled={!grams} onClick={add}>Add to {meal}</button>
    </>
  );
}
