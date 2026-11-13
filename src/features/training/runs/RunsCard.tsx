import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useRef, useState } from "react";
import { db } from "../../../data/db";
import { useSettings } from "../../../data/hooks";
import { addDays, dayKey, parseDay } from "../../../lib/dates";
import { distUnitFor, toUnit } from "../../../lib/running";
import { BarChart, Icon, toast } from "../../../ui";
import { syncStrava } from "./runActions";
import { RunLogSheet } from "./RunSheets";
import { PENDING_CODE_KEY, StravaSheet } from "./StravaSheet";

const AUTO_SYNC_MS = 60 * 60 * 1000;

/** Monday of the week containing `key`. */
function weekStart(key: string) {
  const d = parseDay(key);
  return addDays(key, -((d.getDay() + 6) % 7));
}

export function RunsCard() {
  const s = useSettings();
  const u = distUnitFor(s.unit);
  const today = dayKey();
  const thisWeek = weekStart(today);
  const from = addDays(thisWeek, -7 * 7);
  const runs = useLiveQuery(() => db.activities.where("date").aboveOrEqual(from).filter((a) => a.sport === "run").toArray(), [from], []);
  const [logging, setLogging] = useState(false);
  const [strava, setStrava] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const autoTried = useRef(false);

  const weeks = Array.from({ length: 8 }, (_, i) => addDays(from, i * 7));
  const perWeek = weeks.map((w) => runs.filter((r) => weekStart(r.date) === w).reduce((a, r) => a + r.distanceM, 0));
  const thisDist = perWeek[7], lastDist = perWeek[6];
  const thisCount = runs.filter((r) => r.date >= thisWeek).length;

  const sync = async (quiet = false) => {
    setSyncing(true);
    try {
      const { added } = await syncStrava();
      if (added || !quiet) toast(added ? `Imported ${added} from Strava` : "Already up to date");
    } catch (e) {
      if (!quiet) toast((e as Error).message, { error: true });
    } finally {
      setSyncing(false);
    }
  };

  // Pull new Strava activities quietly when Train opens, at most once an hour.
  useEffect(() => {
    if (autoTried.current || !s.stravaRefreshToken) return;
    autoTried.current = true;
    if (Date.now() - (s.stravaLastSync || 0) > AUTO_SYNC_MS) sync(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.stravaRefreshToken]);

  // Coming back from Strava's approval page with a code waiting: reopen setup to finish.
  useEffect(() => {
    if (s.stravaRefreshToken || !s.stravaClientId) return;
    try { if (localStorage.getItem(PENDING_CODE_KEY)) setStrava(true); } catch { /* storage blocked */ }
  }, [s.stravaRefreshToken, s.stravaClientId]);

  return (
    <section className="card">
      <div className="card-head">
        <h2>Running</h2>
        <div className="row-gap">
          {s.stravaRefreshToken ? (
            <button className="btn btn-sm" type="button" disabled={syncing} onClick={() => sync()} aria-label="Sync Strava"><Icon name="sync" />{syncing ? "Syncing…" : "Strava"}</button>
          ) : (
            <button className="btn btn-sm" type="button" onClick={() => setStrava(true)}><Icon name="link" />Connect Strava</button>
          )}
          {s.stravaRefreshToken && <button className="btn icon-btn sm" type="button" aria-label="Strava settings" onClick={() => setStrava(true)}><Icon name="gear" /></button>}
        </div>
      </div>
      <div className="stats">
        <div>
          <span className="label">This week</span>
          <span className="stat">{toUnit(thisDist, u).toFixed(1)}<span className="unit">{u}</span></span>
          <span className="small muted">{thisCount} run{thisCount === 1 ? "" : "s"}</span>
        </div>
        <div>
          <span className="label">Last week</span>
          <span className="stat">{toUnit(lastDist, u).toFixed(1)}<span className="unit">{u}</span></span>
          {lastDist > 0 && <span className={`small ${thisDist >= lastDist ? "up" : "muted"}`}>{thisDist >= lastDist ? "Passed it" : `${toUnit(lastDist - thisDist, u).toFixed(1)} ${u} to match`}</span>}
        </div>
      </div>
      {runs.length > 0 && (
        <BarChart height={110} label={`Weekly running distance for the last 8 weeks in ${u}`}
          data={weeks.map((w, i) => ({ x: parseDay(w).toLocaleDateString(undefined, { month: "numeric", day: "numeric" }), y: Math.round(toUnit(perWeek[i], u) * 10) / 10 }))} />
      )}
      <button className="btn btn-primary" type="button" onClick={() => setLogging(true)}><Icon name="run" />Log a run</button>
      {logging && <RunLogSheet onClose={() => setLogging(false)} />}
      {strava && <StravaSheet onClose={() => setStrava(false)} />}
    </section>
  );
}
