import { useEffect, useState } from "react";
import type { Exercise, Routine } from "../../../data/db";
import { useSettings } from "../../../data/hooks";
import { Icon, Sheet, toast } from "../../../ui";
import { lastSetsFor } from "../trainingActions";
import { renderRoutineCard, routineText, type ShareDay } from "./routineCard";

/** Pick routines and share them as an image card or as text. */
export function ShareRoutinesSheet({ routines, exercises, onClose }: { routines: Routine[]; exercises: Exercise[]; onClose: () => void }) {
  const s = useSettings();
  const [picked, setPicked] = useState<number[]>(routines.map((r) => r.id!));
  const [withWeights, setWithWeights] = useState(false);
  const [days, setDays] = useState<ShareDay[]>([]);
  const [img, setImg] = useState<{ url: string; blob: Blob } | null>(null);
  const owner = s.name?.trim() || undefined;

  // Build the day list (optionally with your top weight from last session for each exercise).
  useEffect(() => {
    let alive = true;
    (async () => {
      const chosen = picked.map((id) => routines.find((r) => r.id === id)).filter((r): r is Routine => !!r);
      const out: ShareDay[] = [];
      for (const r of chosen) {
        const items = [];
        for (const it of r.items) {
          const ex = exercises.find((e) => e.id === it.exerciseId);
          let weight: string | undefined;
          if (withWeights && ex && ex.kind !== "cardio") {
            const prev = await lastSetsFor(ex.id!);
            const top = Math.max(0, ...prev.map((p) => p.weight || 0));
            weight = ex.kind === "bodyweight" ? (top ? `BW+${top}` : "BW") : top ? `${top} ${s.unit}` : undefined;
          }
          items.push({ exercise: ex?.name ?? "Exercise", sets: it.sets, reps: it.reps, weight });
        }
        out.push({ name: r.name, items });
      }
      if (alive) setDays(out);
    })();
    return () => { alive = false; };
  }, [routines, exercises, picked, withWeights, s.unit]);

  // Redraw the image whenever the selection changes.
  useEffect(() => {
    if (!days.length) { setImg(null); return; }
    let url = "";
    let alive = true;
    renderRoutineCard(days, owner).then((blob) => {
      if (!alive) return;
      url = URL.createObjectURL(blob);
      setImg({ url, blob });
    });
    return () => { alive = false; if (url) URL.revokeObjectURL(url); };
  }, [days, owner]);

  const shareImage = async () => {
    if (!img) return;
    const file = new File([img.blob], "training-split.png", { type: "image/png" });
    if (navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file], title: "My training split" }); return; }
      catch (e) { if ((e as Error).name === "AbortError") return; }
    }
    toast("Sharing isn't available here. Press and hold the image to save or share it.");
  };

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(routineText(days, owner));
      toast("Copied as text");
    } catch {
      toast("Couldn't copy. Press and hold the image to share it instead.", { error: true });
    }
  };

  // Tap order sets the day order: tapping a routine adds it as the next day.
  const toggle = (id: number) => setPicked(picked.includes(id) ? picked.filter((x) => x !== id) : [...picked, id]);

  return (
    <Sheet open onClose={onClose} tall title="Share routines">
      <div className="chips" style={{ flexWrap: "wrap" }}>
        {[...picked.map((id) => routines.find((r) => r.id === id)).filter((r): r is Routine => !!r), ...routines.filter((r) => !picked.includes(r.id!))].map((r) => {
          const n = picked.indexOf(r.id!);
          return <button key={r.id} type="button" className="chip" aria-pressed={n >= 0} onClick={() => toggle(r.id!)}>{n >= 0 ? `Day ${n + 1} · ` : ""}{r.name}</button>;
        })}
      </div>
      <label className="spread small" htmlFor="sh-w">
        <span>Include my weights</span>
        <button id="sh-w" className="toggle" type="button" role="switch" aria-checked={withWeights} onClick={() => setWithWeights(!withWeights)} />
      </label>
      <div className="share-preview">
        {img ? <img src={img.url} alt={`Training split card: ${days.map((d) => d.name).join(", ")}`} /> : <span className="small muted">{picked.length ? "Drawing…" : "Pick at least one routine."}</span>}
      </div>
      <div className="grid2">
        <button className="btn btn-primary" type="button" disabled={!img} onClick={shareImage}><Icon name="upload" />Share image</button>
        <button className="btn" type="button" disabled={!days.length} onClick={copyText}><Icon name="paste" />Copy as text</button>
      </div>
      <span className="small muted">To change the day order, tap routines off, then back on in the order you train them. Press and hold the image to save it to Photos.</span>
    </Sheet>
  );
}
