import { useState } from "react";
import { RUN_TYPES, type Activity, type RunType, type Sport } from "../../../data/db";
import { useSettings } from "../../../data/hooks";
import { dayKey, parseDay } from "../../../lib/dates";
import { decodePolyline, distUnitFor, formatPace, formatTime, fromUnit, parseTime, toUnit } from "../../../lib/running";
import { ConfirmButton, Icon, NumInput, RouteShape, Sheet, toast } from "../../../ui";
import { deleteActivity, saveActivity, updateActivity } from "./runActions";

export const RUN_TYPE_LABEL: Record<RunType, string> = { easy: "Easy", long: "Long", workout: "Workout", race: "Race" };
const SPORT_LABEL: Record<Sport, string> = { run: "Run", walk: "Walk", hike: "Hike", ride: "Ride", swim: "Swim", other: "Other" };

export function activityLabel(a: Activity) {
  return a.sport === "run" && a.runType ? `${RUN_TYPE_LABEL[a.runType]} run` : SPORT_LABEL[a.sport];
}

function RunTypeChips({ value, onChange }: { value?: RunType; onChange: (t: RunType) => void }) {
  return (
    <div className="chips">
      {RUN_TYPES.map((t) => <button key={t} type="button" className="chip" aria-pressed={value === t} onClick={() => onChange(t)}>{RUN_TYPE_LABEL[t]}</button>)}
    </div>
  );
}

function EffortPicker({ value, onChange }: { value?: number; onChange: (v?: number) => void }) {
  return (
    <div className="effort" role="group" aria-label="Effort from 1 to 10">
      {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
        <button key={n} type="button" aria-pressed={value === n} onClick={() => onChange(value === n ? undefined : n)}>{n}</button>
      ))}
    </div>
  );
}

/* ---------------- Log or edit a run by hand ---------------- */

export function RunLogSheet({ existing, onClose }: { existing?: Activity; onClose: () => void }) {
  const s = useSettings();
  const u = distUnitFor(s.unit);
  const [date, setDate] = useState(existing?.date ?? dayKey());
  const [dist, setDist] = useState<number | undefined>(existing ? Math.round(toUnit(existing.distanceM, u) * 100) / 100 : undefined);
  const [time, setTime] = useState(existing ? formatTime(existing.movingS) : "");
  const [runType, setRunType] = useState<RunType>(existing?.runType ?? "easy");
  const [effort, setEffort] = useState<number | undefined>(existing?.effort);
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const secs = parseTime(time);
  const timeErr = time.trim() !== "" && !secs;
  const valid = !!dist && dist > 0 && !!secs;

  const save = async () => {
    if (!valid) return;
    const now = new Date();
    const startedAt = date === dayKey() ? now.getTime() - secs! * 1000 : parseDay(date).getTime() + 7 * 3600_000;
    await saveActivity({
      ...(existing ?? { source: "manual" as const, sport: "run" as const }),
      date,
      startedAt: existing && existing.date === date ? existing.startedAt : startedAt,
      name: existing?.name && existing.source === "strava" ? existing.name : `${RUN_TYPE_LABEL[runType]} run`,
      runType,
      distanceM: fromUnit(dist!, u),
      movingS: secs!,
      effort,
      notes: notes.trim() || undefined
    });
    toast(existing ? "Run updated" : "Run logged");
    onClose();
  };

  return (
    <Sheet open onClose={onClose} title={existing ? "Edit run" : "Log a run"}>
      <RunTypeChips value={runType} onChange={setRunType} />
      <div className="grid2">
        <div className="field"><label className="label" htmlFor="rn-d">Distance ({u})</label><NumInput id="rn-d" value={dist} onChange={setDist} placeholder="0.00" /></div>
        <div className="field">
          <label className="label" htmlFor="rn-t">Time</label>
          <input id="rn-t" className={`input num${timeErr ? " err" : ""}`} inputMode="numeric" placeholder="45:30" value={time} onChange={(e) => setTime(e.target.value.replace(/[^\d:]/g, ""))} />
        </div>
      </div>
      <div className="spread small">
        <span className={timeErr ? "help-err" : "muted"}>{timeErr ? "Use minutes:seconds, like 45:30, or h:mm:ss." : "Type 45:30 or 1:05:09."}</span>
        <span className="num">{valid ? formatPace(fromUnit(dist!, u), secs!, u) : ""}</span>
      </div>
      <div className="field"><label className="label" htmlFor="rn-date">Date</label><input id="rn-date" className="input num" type="date" value={date} max={dayKey()} onChange={(e) => e.target.value && setDate(e.target.value)} /></div>
      <div className="field"><span className="label">How hard did it feel? (optional)</span><EffortPicker value={effort} onChange={setEffort} /></div>
      <div className="field"><label className="label" htmlFor="rn-n">Notes (optional)</label><input id="rn-n" className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Route, weather, how legs felt" /></div>
      <button className="btn btn-primary btn-full" type="button" disabled={!valid} onClick={save}>{existing ? "Save run" : "Log run"}</button>
    </Sheet>
  );
}

/* ---------------- Detail view ---------------- */

export function RunDetailSheet({ activity: a, onClose }: { activity: Activity; onClose: () => void }) {
  const s = useSettings();
  const u = distUnitFor(s.unit);
  const [editing, setEditing] = useState(false);
  const [notes, setNotes] = useState(a.notes ?? "");
  if (editing) return <RunLogSheet existing={a} onClose={() => { setEditing(false); onClose(); }} />;

  const points = a.polyline ? decodePolyline(a.polyline) : [];
  const elevFt = a.elevationM ? (u === "mi" ? `${Math.round(a.elevationM * 3.281)} ft` : `${Math.round(a.elevationM)} m`) : null;

  return (
    <Sheet open onClose={onClose} tall title={a.name}>
      <span className="small muted">
        {parseDay(a.date).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })} · {activityLabel(a)}{a.source === "strava" ? " · from Strava" : ""}
      </span>
      {points.length > 1 && <RouteShape points={points} label={`Route of ${a.name}`} />}
      <div className="card">
        <div className="stats">
          <div><span className="label">Distance</span><span className="stat">{toUnit(a.distanceM, u).toFixed(2)}<span className="unit">{u}</span></span></div>
          <div><span className="label">Pace</span><span className="stat">{formatPace(a.distanceM, a.movingS, u)}</span></div>
          <div><span className="label">Moving time</span><span className="stat">{formatTime(a.movingS)}</span></div>
          {elevFt && <div><span className="label">Elevation</span><span className="stat">{elevFt}</span></div>}
          {a.avgHr && <div><span className="label">Avg heart rate</span><span className="stat">{a.avgHr}<span className="unit">bpm</span></span></div>}
          {a.effort && <div><span className="label">Effort</span><span className="stat">{a.effort}<span className="unit">/10</span></span></div>}
        </div>
      </div>
      {a.sport === "run" && (
        <div className="field"><span className="label">Run type</span><RunTypeChips value={a.runType} onChange={(t) => { updateActivity(a.id!, { runType: t }); a.runType = t; toast("Updated"); }} /></div>
      )}
      <div className="field">
        <label className="label" htmlFor="rd-n">Notes</label>
        <input id="rd-n" className="input" value={notes} placeholder="Add a note" onChange={(e) => setNotes(e.target.value)} onBlur={() => notes !== (a.notes ?? "") && updateActivity(a.id!, { notes: notes.trim() || undefined })} />
      </div>
      <div className="grid2">
        <ConfirmButton label={<><Icon name="trash" />Delete</>} onConfirm={async () => {
          const restore = await deleteActivity(a);
          toast(a.source === "strava" ? "Deleted here (still on Strava)" : "Run deleted", { action: { label: "Undo", run: restore } });
          onClose();
        }} />
        <button className="btn" type="button" onClick={() => setEditing(true)}><Icon name="edit" />Edit</button>
      </div>
      {a.source === "strava" && <span className="small muted">Edits here stay in MoveMent and don't change Strava.</span>}
    </Sheet>
  );
}

