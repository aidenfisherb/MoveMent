import { useEffect, useRef, useState } from "react";
import type { Route } from "../App";
import { ConfirmButton, Icon, NumInput, toast } from "../components/ui";
import { db, saveSetting, type Macros } from "../lib/db";
import { useSettings } from "../lib/hooks";
import { dayKey, fmt } from "../lib/util";

const TABLES = ["foods", "foodLogs", "exercises", "routines", "workouts", "sets", "weights", "settings"] as const;

export default function SettingsScreen({ go }: { go: (r: Route) => void }) {
  const s = useSettings();
  const [t, setT] = useState<Macros>(s.targets);
  const [key, setKey] = useState(s.usdaKey);
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [pendingImport, setPendingImport] = useState<Record<string, unknown[]> | null>(null);

  useEffect(() => setT(s.targets), [s.targets]);
  useEffect(() => setKey(s.usdaKey), [s.usdaKey]);
  useEffect(() => { navigator.storage?.persisted?.().then(setPersisted).catch(() => {}); }, []);

  const macroKcal = t.p * 4 + t.c * 4 + t.f * 9;

  const saveTargets = async () => { await saveSetting("targets", t); toast("Targets saved"); };

  const switchUnit = async (unit: "lb" | "kg") => {
    if (unit === s.unit) return;
    const k = unit === "kg" ? 1 / 2.20462 : 2.20462;
    const r = (v: number) => Math.round(v * k * 10) / 10;
    await db.transaction("rw", db.weights, db.sets, db.settings, async () => {
      await db.weights.toCollection().modify((w) => { w.weight = r(w.weight); });
      await db.sets.toCollection().modify((x) => { if (x.weight) x.weight = r(x.weight); });
      await saveSetting("unit", unit);
    });
    toast(`Switched to ${unit}; past entries converted`);
  };

  const exportData = async () => {
    const data: Record<string, unknown> = { app: "movement", version: 1, exportedAt: new Date().toISOString() };
    for (const name of TABLES) data[name] = await db.table(name).toArray();
    const json = JSON.stringify(data);
    const filename = `movement-backup-${dayKey()}.json`;
    const file = new File([json], filename, { type: "application/json" });
    // On iPhone the share sheet is the reliable way to save to Files / iCloud Drive.
    if (navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file], title: "MoveMent backup" }); }
      catch (e) { if ((e as Error).name === "AbortError") return; }
    } else {
      const url = URL.createObjectURL(file);
      const a = document.createElement("a");
      a.href = url; a.download = filename; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    await saveSetting("lastBackup", Date.now());
    toast("Backup created");
  };

  const readImport = async (f: File) => {
    try {
      const data = JSON.parse(await f.text());
      if (data.app !== "movement") throw new Error();
      setPendingImport(data);
    } catch {
      toast("That file isn't a MoveMent backup", { error: true });
    }
  };

  const doImport = async () => {
    if (!pendingImport) return;
    await db.transaction("rw", TABLES.map((n) => db.table(n)), async () => {
      for (const name of TABLES) {
        await db.table(name).clear();
        const rows = pendingImport[name];
        if (Array.isArray(rows) && rows.length) await db.table(name).bulkAdd(rows);
      }
    });
    setPendingImport(null);
    toast("Backup restored");
  };

  const daysSinceBackup = s.lastBackup ? Math.floor((Date.now() - s.lastBackup) / 86400000) : null;

  return (
    <main className="screen">
      <div className="screen-head">
        <div className="left">
          <button className="btn icon-btn" type="button" aria-label="Back" onClick={() => go("today")}><Icon name="left" /></button>
          <h1>Settings</h1>
        </div>
      </div>

      <section className="card">
        <div className="card-head"><h2>Daily targets</h2></div>
        <div className="grid4">
          {(["kcal", "p", "c", "f"] as const).map((k) => (
            <div className="field" key={k}>
              <label className="label" htmlFor={`t-${k}`}>{k === "kcal" ? "kcal" : k === "p" ? "Protein" : k === "c" ? "Carbs" : "Fat"}</label>
              <NumInput id={`t-${k}`} value={t[k]} onChange={(v) => setT({ ...t, [k]: v || 0 })} />
            </div>
          ))}
        </div>
        <span className={`small ${Math.abs(macroKcal - t.kcal) > 100 ? "warn" : "muted"}`}>
          Your macros add up to {fmt(macroKcal)} kcal{Math.abs(macroKcal - t.kcal) > 100 ? `, ${fmt(Math.abs(macroKcal - t.kcal))} ${macroKcal > t.kcal ? "over" : "under"} your calorie target.` : "."}
        </span>
        <div className="row-gap">
          <button className="btn btn-primary btn-sm" type="button" onClick={saveTargets}>Save targets</button>
          <button className="btn btn-sm" type="button" onClick={() => setT({ ...t, kcal: Math.round(macroKcal) })}>Set kcal from macros</button>
        </div>
      </section>

      <section className="card">
        <div className="card-head"><h2>Units</h2>
          <div className="seg">{(["lb", "kg"] as const).map((u) => <button key={u} type="button" aria-pressed={s.unit === u} onClick={() => switchUnit(u)}>{u}</button>)}</div>
        </div>
        <span className="small muted">Switching converts your past weigh-ins and lifts.</span>
      </section>

      <section className="card">
        <div className="card-head"><h2>USDA food search</h2></div>
        <p className="small muted">Optional. Without a key, USDA search is limited to a few dozen searches a day. A free key allows 1,000 an hour. Get one at <span className="num" style={{ color: "var(--fg)" }}>api.data.gov/signup</span>. Open Food Facts needs no key.</p>
        <div style={{ display: "flex", gap: 8 }}>
          <input className="input num" placeholder="Paste API key" value={key} onChange={(e) => setKey(e.target.value.trim())} aria-label="USDA API key" />
          <button className="btn" type="button" onClick={async () => { await saveSetting("usdaKey", key); toast("Key saved"); }}>Save</button>
        </div>
      </section>

      <section className="card">
        <div className="card-head"><h2>Backup</h2></div>
        <p className="small muted">Your data lives only on this device. Back up regularly and save the file to iCloud Drive or Files. If you delete the app or clear Safari data, only a backup can bring it back.</p>
        {daysSinceBackup === null ? <span className="small warn">You haven't made a backup yet.</span> : <span className={`small ${daysSinceBackup > 7 ? "warn" : "muted"}`}>Last backup {daysSinceBackup === 0 ? "today" : `${daysSinceBackup} day${daysSinceBackup === 1 ? "" : "s"} ago`}.</span>}
        <div className="grid2">
          <button className="btn btn-primary" type="button" onClick={exportData}><Icon name="download" />Back up</button>
          <button className="btn" type="button" onClick={() => fileRef.current?.click()}><Icon name="upload" />Restore</button>
        </div>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) readImport(f); e.target.value = ""; }} />
        {pendingImport && (
          <div className="banner warn">
            <span className="small">Restoring replaces everything on this device with the backup.</span>
            <div className="row-gap">
              <button className="btn btn-ghost btn-sm" type="button" onClick={() => setPendingImport(null)}>Cancel</button>
              <ConfirmButton label="Restore" confirmLabel="Tap to replace" className="btn btn-danger btn-sm" onConfirm={doImport} />
            </div>
          </div>
        )}
        {persisted === false && <span className="small muted">Tip: add MoveMent to your Home Screen so iOS keeps its data safe from automatic cleanup.</span>}
      </section>
    </main>
  );
}
