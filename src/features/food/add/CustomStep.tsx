import { useState } from "react";
import type { Food, Macros } from "../../../data/db";
import { NumInput, toast } from "../../../ui";
import { createFood } from "../foodActions";

export function CustomStep({ barcode, name: initialName, onSaved }: { barcode?: string; name?: string; onSaved: (f: Food) => void }) {
  const [name, setName] = useState(initialName || "");
  const [brand, setBrand] = useState("");
  const [servingG, setServingG] = useState<number | undefined>(100);
  const [servingLabel, setServingLabel] = useState("");
  const [v, setV] = useState<Partial<Macros>>({});
  const valid = name.trim() && servingG && servingG > 0 && v.kcal !== undefined;

  const save = async () => {
    if (!valid) return;
    const k = 100 / servingG!;
    const food: Food = {
      name: name.trim(), brand: brand.trim() || undefined, barcode, source: "custom",
      per100: { kcal: (v.kcal || 0) * k, p: (v.p || 0) * k, c: (v.c || 0) * k, f: (v.f || 0) * k },
      servingG, servingLabel: servingLabel.trim() || `${servingG} g`
    };
    const saved = await createFood(food);
    toast("Food saved");
    onSaved(saved);
  };

  return (
    <>
      {barcode && <span className="small muted num">Barcode {barcode}</span>}
      <div className="field"><label className="label" htmlFor="cf-n">Name</label><input id="cf-n" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Protein bar" /></div>
      <div className="field"><label className="label" htmlFor="cf-b">Brand (optional)</label><input id="cf-b" className="input" value={brand} onChange={(e) => setBrand(e.target.value)} /></div>
      <div className="grid2">
        <div className="field"><label className="label" htmlFor="cf-sg">Serving size (g)</label><NumInput id="cf-sg" value={servingG} onChange={setServingG} /></div>
        <div className="field"><label className="label" htmlFor="cf-sl">Serving name</label><input id="cf-sl" className="input" value={servingLabel} onChange={(e) => setServingLabel(e.target.value)} placeholder="e.g. 1 bar" /></div>
      </div>
      <span className="label">Per serving (from the label)</span>
      <div className="grid4">
        {(["kcal", "p", "c", "f"] as const).map((k) => (
          <div className="field" key={k}>
            <label className="label" htmlFor={`cf-${k}`}>{k === "kcal" ? "kcal" : k === "p" ? "Protein" : k === "c" ? "Carbs" : "Fat"}</label>
            <NumInput id={`cf-${k}`} value={v[k]} onChange={(x) => setV({ ...v, [k]: x })} placeholder="0" />
          </div>
        ))}
      </div>
      <button className="btn btn-primary btn-full" type="button" disabled={!valid} onClick={save}>Save food</button>
    </>
  );
}
