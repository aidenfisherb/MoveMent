/**
 * Minimal Strava API client. Everything runs in the browser with the user's own
 * Strava API app (client ID + secret stored only on this device).
 * Docs: https://developers.strava.com/docs/reference/
 */
import type { Activity, RunType, Sport } from "../../../data/db";

const OAUTH = "https://www.strava.com/oauth";
const API = "https://www.strava.com/api/v3";

export interface Tokens { accessToken: string; refreshToken: string; expiresAt: number; athlete?: string }

/** Where Strava sends you after approving. Must be on the domain set as the app's "Authorization Callback Domain". */
export function callbackUrl() {
  return new URL("strava.html", location.href.split("#")[0]).toString();
}

export function authorizeUrl(clientId: string) {
  const q = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: callbackUrl(),
    approval_prompt: "auto",
    scope: "read,activity:read_all"
  });
  return `${OAUTH}/authorize?${q}`;
}

/** Accept either the bare code or the whole URL Strava redirected to. */
export function extractCode(text: string) {
  const t = text.trim();
  const fromUrl = t.match(/[?&]code=([^&#\s]+)/);
  if (fromUrl) return decodeURIComponent(fromUrl[1]);
  return /^[a-f0-9]{20,}$/i.test(t) ? t : null;
}

async function tokenRequest(body: Record<string, string>): Promise<Tokens> {
  let r: Response;
  try {
    r = await fetch(`${OAUTH}/token`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(body) });
  } catch {
    throw new Error("Couldn't reach Strava. Check your connection and try again.");
  }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    const field = j?.errors?.[0]?.field;
    if (field === "client_id" || field === "client_secret") throw new Error("Strava didn't accept the Client ID or Secret. Copy them again from strava.com/settings/api.");
    if (field === "code") throw new Error("That code has expired or was already used. Tap Approve on Strava again to get a new one.");
    throw new Error(j?.message ? `Strava said: ${j.message}` : `Strava returned an error (${r.status}).`);
  }
  return {
    accessToken: j.access_token,
    refreshToken: j.refresh_token,
    expiresAt: j.expires_at * 1000,
    athlete: j.athlete ? [j.athlete.firstname, j.athlete.lastname].filter(Boolean).join(" ") : undefined
  };
}

export const exchangeCode = (clientId: string, clientSecret: string, code: string) =>
  tokenRequest({ client_id: clientId, client_secret: clientSecret, code, grant_type: "authorization_code" });

export const refreshTokens = (clientId: string, clientSecret: string, refreshToken: string) =>
  tokenRequest({ client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: "refresh_token" });

interface StravaActivity {
  id: number;
  name: string;
  sport_type?: string;
  type?: string;
  start_date_local: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  total_elevation_gain?: number;
  average_heartrate?: number;
  max_heartrate?: number;
  workout_type?: number | null;
  map?: { summary_polyline?: string };
}

/** One page of activities, newest first after `afterEpoch` (seconds). */
export async function listActivities(accessToken: string, afterEpoch: number, page: number, perPage = 100): Promise<StravaActivity[]> {
  const q = new URLSearchParams({ after: String(afterEpoch), page: String(page), per_page: String(perPage) });
  const r = await fetch(`${API}/athlete/activities?${q}`, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (r.status === 401) throw new Error("Strava access was revoked. Reconnect Strava.");
  if (r.status === 429) throw new Error("Strava's rate limit was reached. Try again in 15 minutes.");
  if (!r.ok) throw new Error(`Strava returned an error (${r.status}).`);
  return r.json();
}

const SPORTS: Record<string, Sport> = {
  Run: "run", TrailRun: "run", VirtualRun: "run",
  Walk: "walk", Hike: "hike",
  Ride: "ride", VirtualRide: "ride", GravelRide: "ride", MountainBikeRide: "ride", EBikeRide: "ride",
  Swim: "swim"
};

/** Strava's run "workout_type": 1 race, 2 long run, 3 workout. */
const RUN_TYPE: Record<number, RunType> = { 1: "race", 2: "long", 3: "workout" };

/** Convert a Strava activity to ours. start_date_local is local wall-clock time even though it ends in "Z". */
export function toActivity(a: StravaActivity): Activity {
  const [d, t] = a.start_date_local.replace("Z", "").split("T");
  const [y, mo, da] = d.split("-").map(Number);
  const [h, mi, s] = (t || "0:0:0").split(":").map(Number);
  const sport = SPORTS[a.sport_type || a.type || ""] ?? "other";
  return {
    date: d,
    startedAt: new Date(y, mo - 1, da, h, mi, s).getTime(),
    name: a.name,
    sport,
    runType: sport === "run" ? RUN_TYPE[a.workout_type ?? 0] ?? "easy" : undefined,
    distanceM: a.distance,
    movingS: a.moving_time,
    elapsedS: a.elapsed_time,
    elevationM: a.total_elevation_gain || undefined,
    avgHr: a.average_heartrate ? Math.round(a.average_heartrate) : undefined,
    maxHr: a.max_heartrate ? Math.round(a.max_heartrate) : undefined,
    source: "strava",
    stravaId: a.id,
    polyline: a.map?.summary_polyline || undefined
  };
}
