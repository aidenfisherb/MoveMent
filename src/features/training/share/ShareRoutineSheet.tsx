import { useEffect, useState } from "react";
import type { Exercise, Routine } from "../../../data/db";
import { useSettings } from "../../../data/hooks";
import { Icon, Sheet, toast } from "../../../ui";
import { lastSetsFor } from "../trainingActions";
import { renderRoutineCard, routineText, type ShareDay } from "./routineCard";

/** Share one routine (e.g. Legs) as an image card or as text. */
export function ShareRoutineSheet({ routine, exercises, onClose }: { routine: Routine; exercises: Exercise[]; onClose: () => void }) {
  const s = useSettings();
  const [withWeights, setWithWeights] = useState(false);
  const [day, setDay] = useState<ShareDay | null>(null);
  const [img, setImg] = useState<{ url: string; blob: Blob } | null>(null);
  const owner = s.name?.trim() || undefined;

  // Build the exercise list, optionally with your top weight from last session.
  useEffect(() => {
    let alive = true;
    (async () => {
      const items = [];
      for (const it of routine.items) {
        const ex = exercises.find((e) => e.id === it.exerciseId);
        let weight: string | undefined;
        if (withWeights && ex && ex.kind !== "cardio") {
          const prev = await lastSetsFor(ex.id!);
          const top = Math.max(0, ...prev.map((p) => p.weight || 0));
          weight = ex.kind === "bodyweight" ? (top ? `BW+${top}` : "BW") : top ? `${top} ${s.unit}` : undefined;
        }
        items.push({ exercise: ex?.name ?? "Exercise", sets: it.sets, reps: it.reps, weight });
      }
      if (alive) setDay({ name: routine.name, items });
    })();
    return () => { alive = false; };
  }, [routine, exercises, withWeights, s.unit]);

  // Redraw the image when the list changes.
  useEffect(() => {
    if (!day) return;
    let url = "";
    let alive = true;
    renderRoutineCard(day, owner).then((blob) => {
      if (!alive) return;
      url = URL.createObjectURL(blob);
      setImg({ url, blob });
    });
    return () => { alive = false; if (url) URL.revokeObjectURL(url); };
  }, [day, owner]);

  const shareImage = async () => {
    if (!img) return;
    const file = new File([img.blob], `${routine.name.toLowerCase().replace(/\W+/g, "-")}.png`, { type: "image/png" });
    if (navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file], title: routine.name }); return; }
      catch (e) { if ((e as Error).name === "AbortError") return; }
    }
    toast("Sharing isn't available here. Press and hold the image to save or share it.");
  };

  const copyText = async () => {
    if (!day) return;
    try {
      await navigator.clipboard.writeText(routineText(day, owner));
      toast("Copied as text");
    } catch {
      toast("Couldn't copy. Press and hold the image to share it instead.", { error: true });
    }
  };

  return (
    <Sheet open onClose={onClose} tall title={`Share ${routine.name}`}>
      <label className="spread small" htmlFor="sh-w">
        <span>Include my weights</span>
        <button id="sh-w" className="toggle" type="button" role="switch" aria-checked={withWeights} onClick={() => setWithWeights(!withWeights)} />
      </label>
      <div className="share-preview">
        {img ? <img src={img.url} alt={`${routine.name} routine card`} /> : <span className="small muted">Drawing…</span>}
      </div>
      <div className="grid2">
        <button className="btn btn-primary" type="button" disabled={!img} onClick={shareImage}><Icon name="share" />Share image</button>
        <button className="btn" type="button" disabled={!day} onClick={copyText}><Icon name="paste" />Copy as text</button>
      </div>
      <span className="small muted">Press and hold the image to save it to Photos.</span>
    </Sheet>
  );
}
