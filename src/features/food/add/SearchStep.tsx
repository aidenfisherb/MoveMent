import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useMemo, useRef, useState } from "react";
import { db, type Food, type Meal } from "../../../data/db";
import { useSettings } from "../../../data/hooks";
import { Icon } from "../../../ui";
import { FoodList, MealChips } from "../components";
import { searchOff, searchUsda } from "../foodApi";

export function SearchStep({ meal, setMeal, onPick, onScan, onCustom, onPaste }: { meal: Meal; setMeal: (m: Meal) => void; onPick: (f: Food) => void; onScan: () => void; onCustom: (name: string) => void; onPaste: () => void }) {
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
      <input className="input" type="search" placeholder="Search foods" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search foods" />
      <div className="quick-actions">
        <button className="btn" type="button" onClick={onScan}><Icon name="scan" />Scan</button>
        <button className="btn" type="button" onClick={onPaste}><Icon name="sparkle" />Paste from Claude</button>
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
