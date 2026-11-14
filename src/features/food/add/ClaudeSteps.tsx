import { useState } from "react";
import { MEALS, type Food, type Meal } from "../../../data/db";
import { cap, fmt } from "../../../lib/format";
import { Icon, NumInput, toast } from "../../../ui";
import { parseClaudeReplies, type Estimate } from "../claudeImport";
import { MealChips } from "../components";
import { createFood, logFood } from "../foodActions";

/** Reads the clipboard (iOS shows a one-tap "Paste" bubble). Returns null if blocked or empty. */
export async function readClipboard(): Promise<string | null> {
  try {
    return (await navigator.clipboard?.readText?.()) || null;
  } catch {
    return null;
  }
}

/** Fallback when the clipboard can't be read or didn't contain an estimate. */
export function PasteStep({ clipboardMissed, onParsed }: { clipboardMissed?: boolean; onParsed: (e: Estimate[]) => void }) {
  const [text, setText] = useState("");
  const [error, setError] = useState(clipboardMissed ? "Your clipboard didn't have a food estimate. Copy Claude's MOVEMENT block, then paste it here." : "");
  const go = () => {
    const e = parseClaudeReplies(text);
    if (e.length) onParsed(e);
    else setError("Couldn't find calories or protein in that text. Copy Claude's MOVEMENT block and paste it here.");
  };
  return (
    <>
      <ol className="small muted" style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 2 }}>
        <li>In the Claude app, send a photo or description of your food.</li>
        <li>Tap copy on the <span className="num" style={{ color: "var(--fg)" }}>MOVEMENT</span> block in the reply.</li>
        <li>Come back here and paste.</li>
      </ol>
      <textarea className={`input${error ? " err" : ""}`} aria-label="Claude's reply" placeholder={"MOVEMENT\nname: …\nkcal: …"} value={text} onChange={(e) => { setText(e.target.value); setError(""); }} />
      {error && <span className="help-err">{error}</span>}
      <button className="btn btn-primary btn-full" type="button" disabled={!text.trim()} onClick={go}>Read estimate</button>
    </>
  );
}

interface Item { name: string; serving: string; grams?: number; qty?: number; meal: Meal; kcal?: number; p?: number; c?: number; f?: number }

/**
 * Editable review of one or more AI estimates. Each food becomes its own saved food
 * (so it shows in Recent for re-adding) and its own entry in the log.
 */
export function ReviewStep({ estimates, meal, setMeal, date, onDone }: { estimates: Estimate[]; meal: Meal; setMeal: (m: Meal) => void; date: string; onDone: () => void }) {
  const [items, setItems] = useState<Item[]>(() => estimates.map((e) => ({ name: e.name, serving: e.serving, grams: e.grams, qty: 1, meal, kcal: e.kcal, p: e.p, c: e.c, f: e.f })));
  const set = (i: number, patch: Partial<Item>) => setItems(items.map((it, k) => (k === i ? { ...it, ...patch } : it)));
  const total = items.reduce((a, it) => a + (it.kcal || 0) * (it.qty || 0), 0);
  const valid = items.length > 0 && items.every((it) => it.name.trim() && it.kcal !== undefined && it.qty);
  const many = items.length > 1;

  // Changing the meal at the top moves every food that's still on the old meal.
  const setAllMeal = (m: Meal) => {
    setItems(items.map((it) => (it.meal === meal ? { ...it, meal: m } : it)));
    setMeal(m);
  };

  const add = async () => {
    if (!valid) return;
    for (const it of items) {
      // One serving is stored as the estimated weight (or a 100 g stand-in) so servings scale correctly.
      const servingG = it.grams || 100;
      const k = 100 / servingG;
      const food: Food = {
        name: it.name.trim(), source: "custom", ai: true,
        per100: { kcal: (it.kcal || 0) * k, p: (it.p || 0) * k, c: (it.c || 0) * k, f: (it.f || 0) * k },
        servingG, servingLabel: it.serving.trim() || "1 serving"
      };
      const saved = await createFood(food);
      await logFood(saved, servingG * (it.qty || 1), it.meal, date);
    }
    const meals = [...new Set(items.map((it) => it.meal))];
    toast(`Added ${many ? `${items.length} foods` : items[0].name} to ${meals.join(" and ")}`);
    onDone();
  };

  return (
    <>
      <div className="ai-note"><Icon name="sparkle" /><span>AI estimate{many ? `s for ${items.length} foods` : ""}. Check the numbers, especially portion size and cooking oil. Each food is saved to Recent for quick re-adding.</span></div>
      <MealChips meal={meal} setMeal={setAllMeal} />
      {items.map((it, i) => (
        <div className={many ? "card" : undefined} key={i} style={many ? undefined : { display: "grid", gap: 12 }}>
          {many && (
            <div className="spread">
              <span className="label">Food {i + 1} of {items.length}</span>
              <div className="row-gap">
                <select className="input meal-select" aria-label={`Meal for food ${i + 1}`} value={it.meal} onChange={(e) => set(i, { meal: e.target.value as Meal })}>
                  {MEALS.map((m) => <option key={m} value={m}>{cap(m)}</option>)}
                </select>
                <button className="btn icon-btn sm" type="button" aria-label={`Remove ${it.name}`} onClick={() => setItems(items.filter((_, k) => k !== i))}><Icon name="x" /></button>
              </div>
            </div>
          )}
          <div className="field"><label className="label" htmlFor={`rv-n${i}`}>Name</label><input id={`rv-n${i}`} className="input" value={it.name} onChange={(e) => set(i, { name: e.target.value })} /></div>
          <div className="grid2">
            <div className="field"><label className="label" htmlFor={`rv-s${i}`}>Serving</label><input id={`rv-s${i}`} className="input" value={it.serving} onChange={(e) => set(i, { serving: e.target.value })} /></div>
            <div className="field"><label className="label" htmlFor={`rv-q${i}`}>Servings eaten</label><NumInput id={`rv-q${i}`} value={it.qty} onChange={(v) => set(i, { qty: v })} /></div>
          </div>
          <div className="grid4">
            {(["kcal", "p", "c", "f"] as const).map((k) => (
              <div className="field" key={k}>
                <label className="label" htmlFor={`rv-${k}${i}`}>{k === "kcal" ? "kcal" : k === "p" ? "Protein" : k === "c" ? "Carbs" : "Fat"}</label>
                <NumInput id={`rv-${k}${i}`} value={it[k]} onChange={(x) => set(i, { [k]: x })} placeholder="0" />
              </div>
            ))}
          </div>
          <MacroCheck it={it} />
        </div>
      ))}
      <button className="btn btn-primary btn-full" type="button" disabled={!valid} onClick={add}>
        {many ? `Add ${items.length} foods · ${fmt(total)} kcal` : `Add ${fmt(total)} kcal to ${items[0]?.meal ?? meal}`}
      </button>
    </>
  );
}

/** Warn when protein/carbs/fat don't add up to the calories (a sign one number is off). */
function MacroCheck({ it }: { it: Item }) {
  const fromMacros = (it.p || 0) * 4 + (it.c || 0) * 4 + (it.f || 0) * 9;
  if (!it.kcal || !fromMacros || Math.abs(fromMacros - it.kcal) / it.kcal <= 0.15) return null;
  return <span className="small warn">Macros add up to {fmt(fromMacros)} kcal, which doesn't match {fmt(it.kcal)}. One of the numbers may be off.</span>;
}
