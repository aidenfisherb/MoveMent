import { useEffect, useState } from "react";
import { useSettings } from "../../../data/hooks";
import { ConfirmButton, Icon, Sheet, toast } from "../../../ui";
import { connectStrava, disconnectStrava, saveStravaApp, syncStrava } from "./runActions";
import { authorizeUrl, callbackUrl, extractCode } from "./stravaApi";

/** Key the strava.html callback page uses to hand the code over when it shares storage with the app. */
export const PENDING_CODE_KEY = "movement.stravaCode";

export function takePendingCode(): string | null {
  try {
    const c = localStorage.getItem(PENDING_CODE_KEY);
    if (c) localStorage.removeItem(PENDING_CODE_KEY);
    return c;
  } catch {
    return null;
  }
}

export function StravaSheet({ onClose }: { onClose: () => void }) {
  const s = useSettings();
  const connected = !!s.stravaRefreshToken;
  const [id, setId] = useState(s.stravaClientId ?? "");
  const [secret, setSecret] = useState(s.stravaClientSecret ?? "");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState<"" | "connect" | "sync">("");
  const [error, setError] = useState("");
  const hasApp = !!s.stravaClientId && !!s.stravaClientSecret;

  useEffect(() => { setId(s.stravaClientId ?? ""); setSecret(s.stravaClientSecret ?? ""); }, [s.stravaClientId, s.stravaClientSecret]);

  const finish = async (raw: string) => {
    const c = extractCode(raw);
    if (!c) return setError("That doesn't look like a Strava code. Copy the code shown after you tap Authorize.");
    setBusy("connect"); setError("");
    try {
      await connectStrava(c);
      toast("Strava connected");
      setBusy("sync");
      const { added } = await syncStrava();
      toast(added ? `Imported ${added} activities from Strava` : "Connected. No activities to import yet.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  };

  // If the approval page saved the code where the app can see it, finish automatically.
  useEffect(() => {
    if (connected || !hasApp) return;
    const check = () => { const c = takePendingCode(); if (c) finish(c); };
    check();
    window.addEventListener("focus", check);
    document.addEventListener("visibilitychange", check);
    return () => { window.removeEventListener("focus", check); document.removeEventListener("visibilitychange", check); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, hasApp]);

  const pasteCode = async () => {
    try {
      const t = await navigator.clipboard.readText();
      if (t) { setCode(t); return finish(t); }
    } catch { /* fall through to manual paste */ }
    setError("Couldn't read the clipboard. Paste the code into the box instead.");
  };

  if (connected) {
    return (
      <Sheet open onClose={onClose} title="Strava">
        <div className="banner"><span className="small"><Icon name="check" size={16} /> Connected{s.stravaAthlete ? ` as ${s.stravaAthlete}` : ""}</span></div>
        <span className="small muted">{s.stravaLastSync ? `Last synced ${new Date(s.stravaLastSync).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}.` : "Not synced yet."} Sync pulls in new runs, walks, rides and other activities. Editing one here doesn't change Strava.</span>
        {error && <span className="help-err">{error}</span>}
        <button className="btn btn-primary btn-full" type="button" disabled={!!busy} onClick={async () => {
          setBusy("sync"); setError("");
          try { const { added } = await syncStrava(); toast(added ? `Imported ${added} new` : "Already up to date"); }
          catch (e) { setError((e as Error).message); }
          finally { setBusy(""); }
        }}><Icon name="sync" />{busy ? "Syncing…" : "Sync now"}</button>
        <ConfirmButton label="Disconnect Strava" confirmLabel="Tap again to disconnect" className="btn btn-ghost" onConfirm={async () => { await disconnectStrava(); toast("Strava disconnected. Imported runs are kept."); }} />
      </Sheet>
    );
  }

  return (
    <Sheet open onClose={onClose} tall title="Connect Strava">
      <span className="small muted">One-time setup, about 5 minutes. Your keys stay on this phone and are left out of backups.</span>

      <div className="card">
        <span className="label">Step 1 · Your Strava API app</span>
        <p className="small muted">At strava.com/settings/api, copy the Client ID and Client Secret.</p>
        <div className="field"><label className="label" htmlFor="sv-id">Client ID</label><input id="sv-id" className="input num" inputMode="numeric" value={id} onChange={(e) => setId(e.target.value.trim())} placeholder="123456" /></div>
        <div className="field"><label className="label" htmlFor="sv-sec">Client Secret</label><input id="sv-sec" className="input num" value={secret} onChange={(e) => setSecret(e.target.value.trim())} placeholder="40 letters and numbers" autoComplete="off" /></div>
        <button className="btn" type="button" disabled={!id || secret.length < 20} onClick={async () => { await saveStravaApp(id, secret); toast("Saved"); }}>
          {hasApp && id === s.stravaClientId && secret === s.stravaClientSecret ? <><Icon name="check" />Saved</> : "Save"}
        </button>
      </div>

      <div className="card" style={hasApp ? undefined : { opacity: 0.5 }}>
        <span className="label">Step 2 · Approve MoveMent on Strava</span>
        <p className="small muted">Opens Strava. Tap <b>Authorize</b>. You'll land on a MoveMent page showing a code.</p>
        {hasApp ? (
          <a className="btn btn-primary" href={authorizeUrl(s.stravaClientId!)} target="_blank" rel="noopener"><Icon name="link" />Open Strava to approve</a>
        ) : <button className="btn btn-primary" type="button" disabled>Open Strava to approve</button>}
      </div>

      <div className="card" style={hasApp ? undefined : { opacity: 0.5 }}>
        <span className="label">Step 3 · Bring the code back</span>
        <p className="small muted">Tap Copy on that page, come back here, and paste. If it connects by itself, you're done.</p>
        <button className="btn btn-primary" type="button" disabled={!hasApp || !!busy} onClick={pasteCode}><Icon name="paste" />{busy === "connect" ? "Connecting…" : busy === "sync" ? "Importing your activities…" : "Paste code"}</button>
        <div style={{ display: "flex", gap: 8 }}>
          <input className="input num" aria-label="Strava code" placeholder="Or paste it here" value={code} onChange={(e) => { setCode(e.target.value); setError(""); }} />
          <button className="btn" type="button" disabled={!hasApp || !code.trim() || !!busy} onClick={() => finish(code)}>Connect</button>
        </div>
        {error && <span className="help-err">{error}</span>}
      </div>
      <span className="small faint">Callback page: <span className="num">{callbackUrl()}</span></span>
    </Sheet>
  );
}
