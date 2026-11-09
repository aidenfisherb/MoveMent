import { useEffect, useState } from "react";
import { Icon, ToastHost } from "./components/ui";
import Today from "./screens/Today";
import FoodScreen from "./screens/Food";
import Train from "./screens/Train";
import Progress from "./screens/Progress";
import SettingsScreen from "./screens/Settings";

export type Route = "today" | "food" | "train" | "progress" | "settings";
const TABS: { id: Route; label: string; icon: string }[] = [
  { id: "today", label: "Today", icon: "home" },
  { id: "food", label: "Food", icon: "food" },
  { id: "train", label: "Train", icon: "dumbbell" },
  { id: "progress", label: "Progress", icon: "chart" }
];

const readHash = (): Route => {
  const h = location.hash.slice(1) as Route;
  return ["today", "food", "train", "progress", "settings"].includes(h) ? h : "today";
};

export default function App() {
  const [route, setRoute] = useState<Route>(readHash);
  useEffect(() => {
    const on = () => setRoute(readHash());
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  const go = (r: Route) => {
    if (r !== route) location.hash = r;
    window.scrollTo(0, 0);
  };

  return (
    <div className="app">
      {route === "today" && <Today go={go} />}
      {route === "food" && <FoodScreen />}
      {route === "train" && <Train />}
      {route === "progress" && <Progress />}
      {route === "settings" && <SettingsScreen go={go} />}
      <div className="tabbar">
        <nav aria-label="Main">
          {TABS.map((t) => (
            <button key={t.id} type="button" aria-current={route === t.id ? "page" : undefined} onClick={() => go(t.id)}>
              <Icon name={t.icon} />
              {t.label}
            </button>
          ))}
        </nav>
      </div>
      <ToastHost />
    </div>
  );
}
