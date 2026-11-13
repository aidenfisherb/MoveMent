import { db, type Activity } from "../../../data/db";
import { getSettings, saveSetting } from "../../../data/settings";
import { exchangeCode, listActivities, refreshTokens, toActivity, type Tokens } from "./stravaApi";

/* ---------- Manual runs ---------- */

export function saveActivity(a: Activity) {
  return a.id ? db.activities.put(a) : db.activities.add(a);
}

export function updateActivity(id: number, patch: Partial<Activity>) {
  return db.activities.update(id, patch);
}

/** Delete an activity. Returns a function that restores it. */
export async function deleteActivity(a: Activity) {
  await db.activities.delete(a.id!);
  return () => db.activities.add(a);
}

/* ---------- Strava ---------- */

async function storeTokens(t: Tokens) {
  await Promise.all([
    saveSetting("stravaAccessToken", t.accessToken),
    saveSetting("stravaRefreshToken", t.refreshToken),
    saveSetting("stravaExpiresAt", t.expiresAt),
    t.athlete ? saveSetting("stravaAthlete", t.athlete) : Promise.resolve()
  ]);
}

export async function saveStravaApp(clientId: string, clientSecret: string) {
  await Promise.all([saveSetting("stravaClientId", clientId.trim()), saveSetting("stravaClientSecret", clientSecret.trim())]);
}

/** Finish connecting: trade the one-time code from Strava's approval page for long-lived tokens. */
export async function connectStrava(code: string) {
  const s = await getSettings();
  if (!s.stravaClientId || !s.stravaClientSecret) throw new Error("Enter your Strava Client ID and Secret first.");
  await storeTokens(await exchangeCode(s.stravaClientId, s.stravaClientSecret, code));
}

export async function disconnectStrava() {
  await db.settings.bulkDelete(["stravaAccessToken", "stravaRefreshToken", "stravaExpiresAt", "stravaAthlete", "stravaLastSync"]);
}

async function accessToken() {
  const s = await getSettings();
  if (!s.stravaRefreshToken || !s.stravaClientId || !s.stravaClientSecret) throw new Error("Strava isn't connected.");
  if (s.stravaAccessToken && (s.stravaExpiresAt || 0) > Date.now() + 60_000) return s.stravaAccessToken;
  const t = await refreshTokens(s.stravaClientId, s.stravaClientSecret, s.stravaRefreshToken);
  await storeTokens(t);
  return t.accessToken;
}

/**
 * Import new Strava activities. The first sync pulls your whole history; later syncs
 * only fetch what's newer than the latest imported activity. Existing imports are
 * never overwritten, so edits you make in MoveMent (run type, notes) stick.
 */
export async function syncStrava(): Promise<{ added: number }> {
  const token = await accessToken();
  const latest = await db.activities.orderBy("startedAt").reverse().filter((a) => a.source === "strava").first();
  // Small overlap (1 day) guards against time zone edge cases; duplicates are skipped below.
  const after = latest ? Math.floor(latest.startedAt / 1000) - 86400 : 0;
  let added = 0;
  for (let page = 1; page <= 50; page++) {
    const batch = await listActivities(token, after, page);
    const ids = batch.map((a) => a.id);
    const existing = new Set((await db.activities.where("stravaId").anyOf(ids).toArray()).map((a) => a.stravaId));
    const fresh = batch.filter((a) => !existing.has(a.id)).map(toActivity);
    if (fresh.length) await db.activities.bulkAdd(fresh);
    added += fresh.length;
    if (batch.length < 100) break;
  }
  await saveSetting("stravaLastSync", Date.now());
  return { added };
}
