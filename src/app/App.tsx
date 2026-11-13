import { useEffect, useState } from "react";
import { Icon, ToastHost } from "../ui";
import TodayScreen from "../features/today/TodayScreen";
import FoodScreen from "../features/food/FoodScreen";
import TrainScreen from "../features/training/TrainScreen";
import ProgressScreen from "../features/progress/ProgressScreen";
import SettingsScreen from "../features/settings/SettingsScreen";
import { hashFor, routeFromHash, TABS, type Route } from "./routes";

const readHash = (): Route => routeFromHash(location.hash.slice(1));

export default function App() {
  const [route, setRoute] = useState<Route>(readHash);
  useEffect(() => {
    const on = () => setRoute(readHash());
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  const go = (r: Route) => {
    if (r !== route) location.hash = hashFor(r);
    window.scrollTo(0, 0);
  };

  return (
    <div className="app">
      {route === "today" && <TodayScreen go={go} />}
      {route === "food" && <FoodScreen />}
      {route === "train" && <TrainScreen />}
      {route === "progress" && <ProgressScreen />}
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
