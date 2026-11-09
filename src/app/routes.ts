export type Route = "today" | "food" | "train" | "progress" | "settings";

export const ROUTES: Route[] = ["today", "food", "train", "progress", "settings"];

/** Bottom tab bar. Settings is reached from the gear on Today. */
export const TABS: { id: Route; label: string; icon: string }[] = [
  { id: "today", label: "Today", icon: "home" },
  { id: "food", label: "Food", icon: "food" },
  { id: "train", label: "Train", icon: "dumbbell" },
  { id: "progress", label: "Progress", icon: "chart" }
];
