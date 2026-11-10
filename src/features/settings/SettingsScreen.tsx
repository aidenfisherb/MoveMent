import { useEffect, useRef, useState } from "react";
import type { Route } from "../../app/routes";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type Macros } from "../../data/db";
import { useSettings } from "../../data/hooks";
import { saveSetting } from "../../data/settings";
import { fmt } from "../../lib/format";
import { ConfirmButton, Icon, NumInput, toast } from "../../ui";
import { exportBackup, hasPhotos, readBackupFile, restoreBackup, type Backup } from "./backup";
import { switchUnit } from "./units";

export default function SettingsScreen({ go }: { go: (r: Route) => void }) {
  const s = useSettings();
  const [t, setT] = useState<Macros>(s.targets);
  const [key, setKey] = useState(s.usdaKey);
  const [exportingPhotos, setExportingPhotos] = useState(false);
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [pendingImport, setPendingImport] = useState<Backup | null>(null);

  useEffect(() => setT(s.targets), [s.targets]);
  useEffect(() => setKey(s.usdaKey), [s.usdaKey]);
  useEffect(() => { navigator.storage?.persisted?.().then(setPersisted).catch(() => {}); }, []);

  const macroKcal = t.p * 4 + t.c * 4 + t.f * 9;

  const saveTargets = async () => { await saveSetting("targets", t); toast("Targets saved"); };

  const exportData = async (withPhotos: boolean) => {
    if (withPhotos) setExportingPhotos(true);
    try {
      if (await exportBackup(withPhotos)) toast(withPhotos ? "Full backup created" : "Backup created");
    } finally {
      setExportingPhotos(false);
    }
  };
  const readImport = async (f: File) => {
    const data = await readBackupFile(f);
    if (data) setPendingImport(data);
    else toast("That file isn't a MoveMent backup", { error: true });
  };
  const doImport = async () => {
    if (!pendingImport) return;
    await restoreBackup(pendingImport);
    setPendingImport(null);
    toast("Backup restored");
  };
  const changeUnit = async (unit: "lb" | "kg") => {
    if (unit === s.unit) return;
    await switchUnit(unit);
    toast(`Switched to ${unit}; past entries converted`);
  };

  const photoCount = useLiveQuery(() => db.photos.count(), [], 0);
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
          <div className="seg">{(["lb", "kg"] as const).map((u) => <button key={u} type="button" aria-pressed={s.unit === u} onClick={() => changeUnit(u)}>{u}</button>)}</div>
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
          <button className="btn btn-primary" type="button" onClick={() => exportData(false)}><Icon name="download" />Back up data</button>
          <button className="btn" type="button" onClick={() => fileRef.current?.click()}><Icon name="upload" />Restore</button>
        </div>
        {photoCount > 0 && (
          <div className="spread" style={{ flexWrap: "wrap" }}>
            <span className="small muted">
              {photoCount} progress photo{photoCount === 1 ? "" : "s"} · {s.lastPhotoBackup ? `last saved ${new Date(s.lastPhotoBackup).toLocaleDateString(undefined, { month: "short", day: "numeric" })}` : "never backed up"}
            </span>
            <button className="btn btn-sm" type="button" disabled={exportingPhotos} onClick={() => exportData(true)}><Icon name="camera" />{exportingPhotos ? "Preparing…" : "Back up with photos"}</button>
          </div>
        )}
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) readImport(f); e.target.value = ""; }} />
        {pendingImport && (
          <div className="banner warn">
            <span className="small">Restoring replaces everything on this device with the backup{hasPhotos(pendingImport) ? ", including photos" : ". Your photos are kept"}.</span>
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
