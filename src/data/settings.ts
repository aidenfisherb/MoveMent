import { db, type Macros } from "./db";

export interface Settings {
  targets: Macros;
  unit: "lb" | "kg";
  usdaKey: string;
  lastBackup?: number;
  lastPhotoBackup?: number;
  name?: string;
  heightCm?: number;
  /** Strava connection. Secrets and tokens are never included in backups. */
  stravaClientId?: string;
  stravaClientSecret?: string;
  stravaRefreshToken?: string;
  stravaAccessToken?: string;
  stravaExpiresAt?: number;
  stravaAthlete?: string;
  stravaLastSync?: number;
}

/** Settings keys that must never leave the device (excluded from backup files). */
export const PRIVATE_SETTING_KEYS = ["stravaClientSecret", "stravaRefreshToken", "stravaAccessToken", "stravaExpiresAt"];

export const DEFAULT_SETTINGS: Settings = {
  targets: { kcal: 2400, p: 180, c: 260, f: 70 },
  unit: "lb",
  usdaKey: ""
};

export async function getSettings(): Promise<Settings> {
  const rows = await db.settings.toArray();
  const s = { ...DEFAULT_SETTINGS } as Record<string, unknown>;
  rows.forEach((r) => (s[r.key] = r.value));
  return s as unknown as Settings;
}

export function saveSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
  return db.settings.put({ key, value });
}
