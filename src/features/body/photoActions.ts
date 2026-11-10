import { db } from "../../data/db";
import { saveSetting } from "../../data/settings";
import { resizeImage } from "../../lib/image";

/** Resize and store progress photos. Originals are never kept, which keeps storage small. */
export async function addPhotos(files: File[], date: string) {
  for (const file of files) {
    const [image, thumb] = await Promise.all([resizeImage(file, 1600), resizeImage(file, 400, 0.75)]);
    await db.photos.add({ date, image, thumb, createdAt: Date.now() });
  }
}

export function setPhotoDate(id: number, date: string) {
  return db.photos.update(id, { date });
}

export function deletePhoto(id: number) {
  return db.photos.delete(id);
}

export function saveProfile(name: string, heightCm: number | undefined) {
  return Promise.all([saveSetting("name", name.trim()), saveSetting("heightCm", heightCm)]);
}
