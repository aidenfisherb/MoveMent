import { useState } from "react";
import type { FoodLog, Macros, Meal } from "../../data/db";
import { scale } from "../../lib/macros";
import { ConfirmButton, Icon, NumInput, Sheet, toast } from "../../ui";
import { MacroLine, MealChips } from "./components";
import { removeLog, updateLog } from "./foodActions";

export function EditLogSheet({ log, onClose }: { log: FoodLog; onClose: () => void }) {
  const [grams, setGrams] = useState<number | undefined>(log.grams);
  const [meal, setMeal] = useState<Meal>(log.meal);
  const per100: Macros = log.grams ? { kcal: (log.kcal / log.grams) * 100, p: (log.p / log.grams) * 100, c: (log.c / log.grams) * 100, f: (log.f / log.grams) * 100 } : { kcal: 0, p: 0, c: 0, f: 0 };
  const m = scale(per100, grams || 0);
  const save = async () => {
    await updateLog(log, grams || 0, meal);
    toast("Updated");
    onClose();
  };
  const remove = async () => {
    const restore = await removeLog(log);
    toast("Removed", { action: { label: "Undo", run: restore } });
    onClose();
  };
  return (
    <Sheet open onClose={onClose} title={log.name}>
      <MealChips meal={meal} setMeal={setMeal} />
      <div className="field"><label className="label" htmlFor="el-g">Grams</label><NumInput id="el-g" value={grams} onChange={setGrams} /></div>
      <MacroLine m={m} grams={grams || 0} />
      <div className="grid2">
        <ConfirmButton label={<><Icon name="trash" />Remove</>} confirmLabel="Tap to remove" onConfirm={remove} />
        <button className="btn btn-primary" type="button" disabled={!grams} onClick={save}>Save</button>
      </div>
    </Sheet>
  );
}
