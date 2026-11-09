import { useState } from "react";
import type { Food, Meal } from "../../../data/db";
import { fmt } from "../../../lib/format";
import { Icon, NumInput, toast } from "../../../ui";
import { parseClaudeReply, type Estimate } from "../claudeImport";
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
export function PasteStep({ clipboardMissed, onParsed }: { clipboardMissed?: boolean; onParsed: (e: Estimate) => void }) {
  const [text, setText] = useState("");
  const [error, setError] = useState(clipboardMissed ? "Your clipboard didn't have a food estimate. Copy Claude's MOVEMENT block, then paste it here." : "");
  const go = () => {
    const e = parseClaudeReply(text);
    if (e) onParsed(e);
    else setError("Couldn't find calories or protein in that text. Copy Claude's MOVEMENT block and paste it here.");
  };
  return (
    <>
      <ol className="small muted" style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 2 }}>
        <li>In the Claude app, send a photo of your food.</li>
        <li>Tap copy on the <span className="num" style={{ color: "var(--fg)" }}>MOVEMENT</span> block in the reply.</li>
        <li>Come back here and paste.</li>
      </ol>
      <textarea className={`input${error ? " err" : ""}`} aria-label="Claude's reply" placeholder={"MOVEMENT\nname: …\nkcal: …"} value={text} onChange={(e) => { setText(e.target.value); setError(""); }} />
      {error && <span className="help-err">{error}</span>}
      <button className="btn btn-primary btn-full" type="button" disabled={!text.trim()} onClick={go}>Read estimate</button>
    </>
  );
}

/** Editable review of an AI estimate. Saves it as a food (so it shows in Recent) and logs it. */
export function ReviewStep({ estimate, meal, setMeal, date, onDone }: { estimate: Estimate; meal: Meal; setMeal: (m: Meal) => void; date: string; onDone: () => void }) {
  const [name, setName] = useState(estimate.name);
  const [serving, setServing] = useState(estimate.serving);
  const [v, setV] = useState({ kcal: estimate.kcal, p: estimate.p, c: estimate.c, f: estimate.f });
  const [qty, setQty] = useState<number | undefined>(1);
  const fromMacros = (v.p || 0) * 4 + (v.c || 0) * 4 + (v.f || 0) * 9;
  const mismatch = v.kcal && fromMacros && Math.abs(fromMacros - v.kcal) / v.kcal > 0.15;
  const valid = name.trim() && v.kcal !== undefined && qty;

  const add = async () => {
    if (!valid) return;
    // One serving is stored as the estimated weight (or a 100 g stand-in) so servings scale correctly.
    const servingG = estimate.grams || 100;
    const k = 100 / servingG;
    const food: Food = {
      name: name.trim(), source: "custom", ai: true,
      per100: { kcal: (v.kcal || 0) * k, p: (v.p || 0) * k, c: (v.c || 0) * k, f: (v.f || 0) * k },
      servingG, servingLabel: serving.trim() || "1 serving"
    };
    const saved = await createFood(food);
    await logFood(saved, servingG * (qty || 1), meal, date);
    toast(`Added to ${meal}`);
    onDone();
  };

  return (
    <>
      <div className="ai-note"><Icon name="sparkle" /><span>AI estimate from a photo. Check the numbers, especially portion size and cooking oil. It's saved to Recent for quick re-adding.</span></div>
      <MealChips meal={meal} setMeal={setMeal} />
      <div className="field"><label className="label" htmlFor="rv-n">Name</label><input id="rv-n" className="input" value={name} onChange={(e) => setName(e.target.value)} /></div>
      <div className="grid2">
        <div className="field"><label className="label" htmlFor="rv-s">Serving</label><input id="rv-s" className="input" value={serving} onChange={(e) => setServing(e.target.value)} /></div>
        <div className="field"><label className="label" htmlFor="rv-q">Servings eaten</label><NumInput id="rv-q" value={qty} onChange={setQty} /></div>
      </div>
      <span className="label">Per serving</span>
      <div className="grid4">
        {(["kcal", "p", "c", "f"] as const).map((k) => (
          <div className="field" key={k}>
            <label className="label" htmlFor={`rv-${k}`}>{k === "kcal" ? "kcal" : k === "p" ? "Protein" : k === "c" ? "Carbs" : "Fat"}</label>
            <NumInput id={`rv-${k}`} value={v[k]} onChange={(x) => setV({ ...v, [k]: x })} placeholder="0" />
          </div>
        ))}
      </div>
      {mismatch ? <span className="small warn">Macros add up to {fmt(fromMacros)} kcal, which doesn't match {fmt(v.kcal!)}. One of the numbers may be off.</span> : null}
      <button className="btn btn-primary btn-full" type="button" disabled={!valid} onClick={add}>
        Add {qty && qty !== 1 ? `${fmt(qty, 2)} × ` : ""}{fmt((v.kcal || 0) * (qty || 0))} kcal to {meal}
      </button>
    </>
  );
}
