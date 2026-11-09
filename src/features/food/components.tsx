import type { Food, Macros, Meal } from "../../data/db";
import { MEALS } from "../../data/db";
import { cap, fmt } from "../../lib/format";
import { scale } from "../../lib/macros";

export function MealChips({ meal, setMeal }: { meal: Meal; setMeal: (m: Meal) => void }) {
  return (
    <div className="chips">
      {MEALS.map((x) => <button key={x} className="chip" type="button" aria-pressed={x === meal} onClick={() => setMeal(x)}>{cap(x)}</button>)}
    </div>
  );
}

export function FoodList({ foods, onPick }: { foods: Food[]; onPick: (f: Food) => void }) {
  return (
    <div className="rows">
      {foods.map((f, i) => {
        const serving = f.servingG ? scale(f.per100, f.servingG) : f.per100;
        return (
          <button key={f.id ?? `${f.source}-${f.sourceId}-${i}`} type="button" className="row" onClick={() => onPick(f)}>
            <span className="name">{f.name}</span>
            <span className="sub">{[f.brand, f.servingG ? f.servingLabel || `${fmt(f.servingG)} g` : "per 100 g"].filter(Boolean).join(" · ")}</span>
            <span className="val">{fmt(serving.kcal)}<span className="unit">kcal</span></span>
          </button>
        );
      })}
    </div>
  );
}

export function MacroLine({ m, grams }: { m: Macros; grams: number }) {
  return (
    <div className="card" style={{ gridTemplateColumns: "repeat(4, 1fr)", textAlign: "center", gap: 4 }}>
      <div><div className="label">kcal</div><div className="stat accent">{fmt(m.kcal)}</div></div>
      <div><div className="label">Protein</div><div className="stat">{fmt(m.p, 1)}</div></div>
      <div><div className="label">Carbs</div><div className="stat">{fmt(m.c, 1)}</div></div>
      <div><div className="label">Fat</div><div className="stat">{fmt(m.f, 1)}</div></div>
      <div className="small muted num" style={{ gridColumn: "1 / -1" }}>{fmt(grams)} g</div>
    </div>
  );
}
