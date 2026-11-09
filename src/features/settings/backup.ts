import { db } from "../../data/db";
import { saveSetting } from "../../data/settings";
import { dayKey } from "../../lib/dates";

const TABLES = ["foods", "foodLogs", "exercises", "routines", "workouts", "sets", "weights", "settings"] as const;

export type Backup = { app: "movement"; version: number; exportedAt: string } & Record<string, unknown>;

/** Write every table to a JSON file. On iPhone this opens the share sheet (save to Files / iCloud Drive). */
export async function exportBackup(): Promise<boolean> {
  const data: Record<string, unknown> = { app: "movement", version: 1, exportedAt: new Date().toISOString() };
  for (const name of TABLES) data[name] = await db.table(name).toArray();
  const filename = `movement-backup-${dayKey()}.json`;
  const file = new File([JSON.stringify(data)], filename, { type: "application/json" });
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title: "MoveMent backup" }); }
    catch (e) { if ((e as Error).name === "AbortError") return false; }
  } else {
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  await saveSetting("lastBackup", Date.now());
  return true;
}

export async function readBackupFile(f: File): Promise<Backup | null> {
  try {
    const data = JSON.parse(await f.text());
    return data?.app === "movement" ? data : null;
  } catch {
    return null;
  }
}

/** Replace everything on this device with the backup, all-or-nothing. */
export async function restoreBackup(data: Backup) {
  await db.transaction("rw", TABLES.map((n) => db.table(n)), async () => {
    for (const name of TABLES) {
      await db.table(name).clear();
      const rows = data[name];
      if (Array.isArray(rows) && rows.length) await db.table(name).bulkAdd(rows);
    }
  });
}
