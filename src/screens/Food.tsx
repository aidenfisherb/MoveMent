import { useLiveQuery } from "dexie-react-hooks";
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";

// The barcode library is large; only load it when the scanner opens.
const Scanner = lazy(() => import("../components/Scanner"));
import { ConfirmButton, Icon, NumInput, Sheet, toast } from "../components/ui";
import { db, MEALS, type Food, type FoodLog, type Macros, type Meal } from "../lib/db";
import { lookupBarcode, searchOff, searchUsda } from "../lib/foodApi";
import { useSettings } from "../lib/hooks";
import { addDays, cap, dayKey, fmt, prettyDay, scale, sumMacros } from "../lib/util";

function defaultMeal(): Meal {
  const h = new Date().getHours();
  return h < 11 ? "breakfast" : h < 15 ? "lunch" : h < 21 ? "dinner" : "snack";
}

export default function FoodScreen() {
  const [date, setDate] = useState(dayKey());
  const settings = useSettings();
  const logs = useLiveQuery(() => db.foodLogs.where("date").equals(date).toArray(), [date], []);
  const total = sumMacros(logs);
  const [adding, setAdding] = useState<Meal | null>(null);
  const [editing, setEditing] = useState<FoodLog | null>(null);
  const isToday = date === dayKey();

  const copyYesterday = async () => {
    const prev = await db.foodLogs.where("date").equals(addDays(date, -1)).toArray();
    if (!prev.length) return toast("Nothing logged the day before", { error: true });
    const ids = await db.foodLogs.bulkAdd(prev.map(({ id: _id, ...l }) => ({ ...l, date, createdAt: Date.now() })), { allKeys: true });
    toast(`Copied ${prev.length} items`, { action: { label: "Undo", run: () => db.foodLogs.bulkDelete(ids as number[]) } });
  };

  return (
    <main className="screen">
      <div className="screen-head">
        <button className="btn icon-btn" type="button" aria-label="Previous day" onClick={() => setDate(addDays(date, -1))}><Icon name="left" /></button>
        <h1 style={{ textAlign: "center" }}>{prettyDay(date)}</h1>
        <button className="btn icon-btn" type="button" aria-label="Next day" disabled={isToday} onClick={() => setDate(addDays(date, 1))}><Icon name="right" /></button>
      </div>

      <section className="card">
        <div className="grid4" style={{ textAlign: "center" }}>
          <MacroStat label="kcal" v={total.kcal} t={settings.targets.kcal} />
          <MacroStat label="Protein" v={total.p} t={settings.targets.p} g />
          <MacroStat label="Carbs" v={total.c} t={settings.targets.c} g />
          <MacroStat label="Fat" v={total.f} t={settings.targets.f} g />
        </div>
      </section>

      {MEALS.map((m) => {
        const items = logs.filter((l) => l.meal === m).sort((a, b) => a.createdAt - b.createdAt);
        const s = sumMacros(items);
        return (
          <section className="card" key={m}>
            <div className="card-head">
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <h2>{cap(m)}</h2>
                {items.length > 0 && <span className="small muted num">{fmt(s.kcal)} kcal · {fmt(s.p)}p</span>}
              </div>
              <button className="btn icon-btn sm" type="button" aria-label={`Add to ${m}`} onClick={() => setAdding(m)}><Icon name="plus" /></button>
            </div>
            {items.length > 0 && (
              <div className="rows">
                {items.map((l) => (
                  <button key={l.id} type="button" className="row" onClick={() => setEditing(l)}>
                    <span className="name">{l.name}</span>
                    <span className="sub num">{fmt(l.grams)} g · {fmt(l.p)}p {fmt(l.c)}c {fmt(l.f)}f</span>
                    <span className="val">{fmt(l.kcal)}</span>
                  </button>
                ))}
              </div>
            )}
          </section>
        );
      })}

      {logs.length === 0 && (
        <button className="btn" type="button" onClick={copyYesterday}>Copy the day before</button>
      )}

      {adding && <AddFood open meal={adding} date={date} onClose={() => setAdding(null)} />}
      {editing && <EditLog log={editing} onClose={() => setEditing(null)} />}
    </main>
  );
}

function MacroStat({ label, v, t, g }: { label: string; v: number; t: number; g?: boolean }) {
  const over = v > t * 1.05;
  return (
    <div style={{ display: "grid", gap: 2 }}>
      <span className="label">{label}</span>
      <span className="num" style={{ fontWeight: 600, fontSize: 16, color: label === "kcal" ? "var(--accent)" : over ? "var(--danger)" : undefined }}>{fmt(v)}</span>
      <span className="small muted num">/ {fmt(t)}{g ? "g" : ""}</span>
    </div>
  );
}

/* ---------------- Add food flow ---------------- */

type Step = { kind: "search" } | { kind: "scan" } | { kind: "amount"; food: Food } | { kind: "custom"; barcode?: string; name?: string };

function AddFood({ open, meal, date, onClose }: { open: boolean; meal: Meal; date: string; onClose: () => void }) {
  const [step, setStep] = useState<Step>({ kind: "search" });
  const [m, setM] = useState<Meal>(meal || defaultMeal());
  const title = step.kind === "scan" ? "Scan barcode" : step.kind === "custom" ? "New food" : step.kind === "amount" ? "How much?" : `Add to ${m}`;
  const back = step.kind !== "search" ? () => setStep({ kind: "search" }) : undefined;

  const onCode = useCallback(async (code: string) => {
    const local = await db.foods.where("barcode").equals(code).first();
    if (local) return setStep({ kind: "amount", food: local });
    try {
      const f = await lookupBarcode(code);
      if (f) return setStep({ kind: "amount", food: f });
      toast("Not in Open Food Facts. Enter it once and it's saved.");
    } catch {
      toast("No connection. Enter the food manually.", { error: true });
    }
    setStep({ kind: "custom", barcode: code });
  }, []);

  return (
    <Sheet open={open} onClose={onClose} tall title={
      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {back && <button className="btn icon-btn sm" type="button" aria-label="Back" onClick={back}><Icon name="left" /></button>}
        {title}
      </span>
    }>
      {step.kind === "search" && (
        <SearchStep meal={m} setMeal={setM} onPick={(food) => setStep({ kind: "amount", food })} onScan={() => setStep({ kind: "scan" })} onCustom={(name) => setStep({ kind: "custom", name })} />
      )}
      {step.kind === "scan" && <ScanStep onCode={onCode} />}
      {step.kind === "amount" && <AmountStep food={step.food} meal={m} setMeal={setM} date={date} onDone={onClose} />}
      {step.kind === "custom" && <CustomStep barcode={step.barcode} name={step.name} onSaved={(food) => setStep({ kind: "amount", food })} />}
    </Sheet>
  );
}

function MealChips({ meal, setMeal }: { meal: Meal; setMeal: (m: Meal) => void }) {
  return (
    <div className="chips">
      {MEALS.map((x) => <button key={x} className="chip" type="button" aria-pressed={x === meal} onClick={() => setMeal(x)}>{cap(x)}</button>)}
    </div>
  );
}

function SearchStep({ meal, setMeal, onPick, onScan, onCustom }: { meal: Meal; setMeal: (m: Meal) => void; onPick: (f: Food) => void; onScan: () => void; onCustom: (name: string) => void }) {
  const settings = useSettings();
  const [q, setQ] = useState("");
  const [online, setOnline] = useState<{ off: Food[]; usda: Food[]; loading: boolean; error: string }>({ off: [], usda: [], loading: false, error: "" });
  const abort = useRef<AbortController>();
  const recent = useLiveQuery(() => db.foods.orderBy("lastUsed").reverse().limit(30).toArray(), [], []);
  const local = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return recent.slice(0, 15);
    return recent.filter((f) => `${f.name} ${f.brand ?? ""}`.toLowerCase().includes(s));
  }, [q, recent]);
  const allLocal = useLiveQuery(async () => {
    const s = q.trim().toLowerCase();
    if (s.length < 2) return [];
    return db.foods.filter((f) => `${f.name} ${f.brand ?? ""}`.toLowerCase().includes(s)).limit(20).toArray();
  }, [q], []);
  const localResults = q.trim() ? dedupe([...local, ...allLocal]) : local;

  useEffect(() => {
    const s = q.trim();
    abort.current?.abort();
    if (s.length < 3) { setOnline({ off: [], usda: [], loading: false, error: "" }); return; }
    const ctl = new AbortController();
    abort.current = ctl;
    setOnline((o) => ({ ...o, loading: true, error: "" }));
    const t = window.setTimeout(async () => {
      const [off, usda] = await Promise.allSettled([searchOff(s, ctl.signal), searchUsda(s, settings.usdaKey, ctl.signal)]);
      if (ctl.signal.aborted) return;
      const errs = [off, usda].filter((r) => r.status === "rejected").map((r) => (r as PromiseRejectedResult).reason?.message).filter(Boolean);
      setOnline({
        off: off.status === "fulfilled" ? off.value : [],
        usda: usda.status === "fulfilled" ? usda.value : [],
        loading: false,
        error: errs.length === 2 ? "Couldn't reach the food databases. Check your connection." : errs.find((e: string) => e.includes("USDA")) || ""
      });
    }, 450);
    return () => { window.clearTimeout(t); ctl.abort(); };
  }, [q, settings.usdaKey]);

  return (
    <>
      <MealChips meal={meal} setMeal={setMeal} />
      <div style={{ display: "flex", gap: 8 }}>
        <input className="input" autoFocus type="search" placeholder="Search foods" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search foods" />
        <button className="btn icon-btn" style={{ width: 40, height: 40 }} type="button" aria-label="Scan barcode" onClick={onScan}><Icon name="scan" /></button>
      </div>

      {localResults.length > 0 && (
        <div className="field">
          <span className="label">{q.trim() ? "Your foods" : "Recent"}</span>
          <FoodList foods={localResults} onPick={onPick} />
        </div>
      )}

      {q.trim().length >= 3 && (
        <>
          {online.loading && <span className="small muted">Searching…</span>}
          {online.error && <span className="help-err">{online.error}</span>}
          {online.usda.length > 0 && <div className="field"><span className="label">USDA</span><FoodList foods={online.usda} onPick={onPick} /></div>}
          {online.off.length > 0 && <div className="field"><span className="label">Open Food Facts</span><FoodList foods={online.off} onPick={onPick} /></div>}
          {!online.loading && !online.usda.length && !online.off.length && !localResults.length && !online.error && <span className="small muted">No matches.</span>}
        </>
      )}

      {!q.trim() && !localResults.length && (
        <div className="empty">
          <Icon name="search" />
          <p>Search for a food or scan a barcode.</p>
          <p className="small muted">Foods you log show up here for quick re-adding.</p>
        </div>
      )}

      <button className="btn" type="button" onClick={() => onCustom(q.trim())}><Icon name="plus" />Create a food</button>
    </>
  );
}

function dedupe(list: Food[]) {
  const seen = new Set<number>();
  return list.filter((f) => (f.id && seen.has(f.id) ? false : (f.id && seen.add(f.id), true)));
}

function FoodList({ foods, onPick }: { foods: Food[]; onPick: (f: Food) => void }) {
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

function ScanStep({ onCode }: { onCode: (c: string) => void }) {
  const [manual, setManual] = useState("");
  return (
    <>
      <Suspense fallback={<div className="scanner" />}><Scanner onCode={onCode} /></Suspense>
      <div style={{ display: "flex", gap: 8 }}>
        <input className="input num" inputMode="numeric" placeholder="Or type the barcode number" value={manual} onChange={(e) => setManual(e.target.value.replace(/\D/g, ""))} aria-label="Barcode number" />
        <button className="btn" type="button" disabled={manual.length < 8} onClick={() => onCode(manual)}>Look up</button>
      </div>
    </>
  );
}

function AmountStep({ food, meal, setMeal, date, onDone }: { food: Food; meal: Meal; setMeal: (m: Meal) => void; date: string; onDone: () => void }) {
  const hasServing = !!food.servingG;
  const [mode, setMode] = useState<"serving" | "g">(hasServing ? "serving" : "g");
  const [qty, setQty] = useState<number | undefined>(hasServing ? 1 : 100);
  const grams = mode === "serving" ? (qty || 0) * (food.servingG || 0) : qty || 0;
  const m = scale(food.per100, grams);

  const add = async () => {
    if (!grams) return;
    let foodId = food.id;
    const meta = { lastUsed: Date.now(), useCount: (food.useCount || 0) + 1 };
    if (!foodId && food.sourceId) {
      const existing = await db.foods.where("[source+sourceId]").equals([food.source, food.sourceId]).first();
      foodId = existing?.id;
    }
    if (foodId) await db.foods.update(foodId, meta);
    else foodId = await db.foods.add({ ...food, ...meta });
    await db.foodLogs.add({ date, meal, foodId, name: food.name, grams, ...m, createdAt: Date.now() });
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

function MacroLine({ m, grams }: { m: Macros; grams: number }) {
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

function CustomStep({ barcode, name: initialName, onSaved }: { barcode?: string; name?: string; onSaved: (f: Food) => void }) {
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
    food.id = await db.foods.add(food);
    toast("Food saved");
    onSaved(food);
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

function EditLog({ log, onClose }: { log: FoodLog; onClose: () => void }) {
  const [grams, setGrams] = useState<number | undefined>(log.grams);
  const [meal, setMeal] = useState<Meal>(log.meal);
  const per100: Macros = log.grams ? { kcal: (log.kcal / log.grams) * 100, p: (log.p / log.grams) * 100, c: (log.c / log.grams) * 100, f: (log.f / log.grams) * 100 } : { kcal: 0, p: 0, c: 0, f: 0 };
  const m = scale(per100, grams || 0);
  const save = async () => {
    await db.foodLogs.update(log.id!, { grams: grams || 0, meal, ...m });
    toast("Updated");
    onClose();
  };
  const remove = async () => {
    await db.foodLogs.delete(log.id!);
    const { id: _id, ...rest } = log;
    toast("Removed", { action: { label: "Undo", run: () => db.foodLogs.add(rest) } });
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
