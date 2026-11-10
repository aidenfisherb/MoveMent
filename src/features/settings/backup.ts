import { db, type Photo } from "../../data/db";
import { saveSetting } from "../../data/settings";
import { dayKey } from "../../lib/dates";
import { blobToDataUrl, dataUrlToBlob } from "../../lib/image";

const TABLES = ["foods", "foodLogs", "exercises", "routines", "workouts", "sets", "weights", "settings"] as const;

export type Backup = { app: "movement"; version: number; exportedAt: string } & Record<string, unknown>;

/**
 * Write every table to a JSON file. On iPhone this opens the share sheet (save to Files / iCloud Drive).
 * Photos are optional because they make the file much larger.
 */
export async function exportBackup(withPhotos: boolean): Promise<boolean> {
  const data: Record<string, unknown> = { app: "movement", version: 2, exportedAt: new Date().toISOString() };
  for (const name of TABLES) data[name] = await db.table(name).toArray();
  if (withPhotos) {
    const photos = await db.photos.toArray();
    data.photos = await Promise.all(photos.map(async (p) => ({ ...p, image: await blobToDataUrl(p.image), thumb: await blobToDataUrl(p.thumb) })));
  }
  const filename = `movement-${withPhotos ? "full-backup" : "backup"}-${dayKey()}.json`;
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
  if (withPhotos) await saveSetting("lastPhotoBackup", Date.now());
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

/**
 * Replace everything on this device with the backup, all-or-nothing.
 * Photos are only replaced when the backup contains them; a data-only backup leaves them alone.
 */
export async function restoreBackup(data: Backup) {
  const rawPhotos = Array.isArray(data.photos) ? (data.photos as (Omit<Photo, "image" | "thumb"> & { image: string; thumb: string })[]) : null;
  // Decode images before opening the transaction (IndexedDB transactions can't wait on other async work).
  const photos = rawPhotos && (await Promise.all(rawPhotos.map(async (p) => ({ ...p, image: await dataUrlToBlob(p.image), thumb: await dataUrlToBlob(p.thumb) }))));
  const tables = [...TABLES.map((n) => db.table(n)), db.photos];
  await db.transaction("rw", tables, async () => {
    for (const name of TABLES) {
      await db.table(name).clear();
      const rows = data[name];
      if (Array.isArray(rows) && rows.length) await db.table(name).bulkAdd(rows);
    }
    if (photos) {
      await db.photos.clear();
      if (photos.length) await db.photos.bulkAdd(photos);
    }
  });
}

export function hasPhotos(data: Backup) {
  return Array.isArray(data.photos) && data.photos.length > 0;
}
