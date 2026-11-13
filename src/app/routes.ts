export type Route = "today" | "food" | "train" | "progress" | "settings";

export const ROUTES: Route[] = ["today", "food", "train", "progress", "settings"];

/** Bottom tab bar. Settings is reached from the gear on Today. */
export const TABS: { id: Route; label: string; icon: string }[] = [
  { id: "today", label: "Today", icon: "home" },
  { id: "food", label: "Food", icon: "food" },
  { id: "train", label: "Train", icon: "dumbbell" },
  { id: "progress", label: "Progress", icon: "chart" }
];

// The URL uses "#prefs" for Settings: "#settings" is reserved when the app is previewed inside claude.ai.
const HASH: Partial<Record<Route, string>> = { settings: "prefs" };

export const hashFor = (r: Route) => HASH[r] ?? r;

export function routeFromHash(h: string): Route {
  const match = ROUTES.find((r) => hashFor(r) === h);
  return match ?? "today";
}
