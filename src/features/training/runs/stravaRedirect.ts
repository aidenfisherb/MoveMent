import { PENDING_CODE_KEY } from "./StravaSheet";

/**
 * If Strava sent the browser back to the app with ?code=... in the address,
 * keep the code for the setup sheet and clean the address. Returns true when a code was found.
 */
export function captureStravaRedirect(): boolean {
  const q = new URLSearchParams(location.search);
  const code = q.get("code");
  if (!code || !(q.get("scope") || "").includes("read")) return false;
  try { localStorage.setItem(PENDING_CODE_KEY, code); } catch { /* storage blocked */ }
  history.replaceState(null, "", `${location.pathname.replace(/strava\.html$/, "")}#train`);
  return true;
}
