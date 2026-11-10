import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useRef, useState } from "react";
import { db, type Photo } from "../../data/db";
import { useSettings } from "../../data/hooks";
import { dayKey, parseDay } from "../../lib/dates";
import { fmt, formatHeight } from "../../lib/format";
import { ConfirmButton, Icon, NumInput, Sheet, toast } from "../../ui";
import { addPhotos, deletePhoto, saveProfile, setPhotoDate } from "./photoActions";

const GRID_PREVIEW = 6;

/** Object URL for a stored blob, revoked when the component unmounts or the blob changes. */
function useBlobUrl(blob?: Blob) {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    if (!blob) return;
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);
  return url;
}

const shortDate = (d: string) => parseDay(d).toLocaleDateString(undefined, { month: "short", day: "numeric" });

export function ProfileCard() {
  const s = useSettings();
  const latest = useLiveQuery(() => db.weights.orderBy("date").last(), [], undefined);
  const photos = useLiveQuery(() => db.photos.orderBy("date").reverse().toArray(), [], []);
  const [editing, setEditing] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [viewing, setViewing] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const onFiles = async (files: File[]) => {
    if (!files.length) return;
    setBusy(true);
    try {
      await addPhotos(files, dayKey());
      toast(files.length === 1 ? "Photo added" : `${files.length} photos added`);
    } catch (e) {
      toast((e as Error).message || "Couldn't add that photo", { error: true });
    } finally {
      setBusy(false);
    }
  };

  const shown = showAll ? photos : photos.slice(0, GRID_PREVIEW);

  return (
    <section className="card">
      <div className="card-head">
        <span className="label">Profile</span>
        <button className="btn icon-btn sm" type="button" aria-label="Edit profile" onClick={() => setEditing(true)}><Icon name="edit" /></button>
      </div>
      {s.name ? <h2 style={{ fontSize: 22 }}>{s.name}</h2> : <button className="btn btn-ghost" style={{ justifySelf: "start", padding: 0 }} type="button" onClick={() => setEditing(true)}>Add your name</button>}
      <div className="stats">
        <div>
          <span className="label">Weight</span>
          {latest ? <span className="stat">{fmt(latest.weight, 1)}<span className="unit">{s.unit}</span></span> : <span className="stat faint">—</span>}
          <span className="small muted">{latest ? `Weighed ${shortDate(latest.date)}` : "No weigh-ins yet"}</span>
        </div>
        <div>
          <span className="label">Height</span>
          {s.heightCm ? <span className="stat">{formatHeight(s.heightCm, s.unit)}</span> : <span className="stat faint">—</span>}
          {!s.heightCm && <button className="btn btn-ghost btn-sm" style={{ justifySelf: "start", padding: 0, height: "auto" }} type="button" onClick={() => setEditing(true)}>Set height</button>}
        </div>
      </div>

      <div className="divider" />
      <div className="card-head">
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}><h3>Progress photos</h3>{photos.length > 0 && <span className="small muted num">{photos.length}</span>}</div>
        <button className="btn btn-sm" type="button" disabled={busy} onClick={() => fileRef.current?.click()}><Icon name="plus" />{busy ? "Adding…" : "Add"}</button>
      </div>
      <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => { const files = [...(e.target.files || [])]; e.target.value = ""; onFiles(files); }} />
      {photos.length ? (
        <>
          <div className="photo-grid">
            {shown.map((p, i) => <Thumb key={p.id} photo={p} onOpen={() => setViewing(i)} />)}
          </div>
          {photos.length > GRID_PREVIEW && (
            <button className="btn btn-ghost btn-sm" type="button" onClick={() => setShowAll(!showAll)}>{showAll ? "Show fewer" : `Show all ${photos.length}`}</button>
          )}
        </>
      ) : (
        <button type="button" className="photo-empty" onClick={() => fileRef.current?.click()}>
          <Icon name="camera" />
          <span>Take or choose a photo to start a visual timeline.</span>
          <span className="small muted">Photos stay on this phone only.</span>
        </button>
      )}

      {editing && <EditProfile name={s.name || ""} heightCm={s.heightCm} unit={s.unit} onClose={() => setEditing(false)} />}
      {viewing !== null && photos[viewing] && <PhotoViewer photos={photos} index={viewing} setIndex={setViewing} onClose={() => setViewing(null)} />}
    </section>
  );
}

function Thumb({ photo, onOpen }: { photo: Photo; onOpen: () => void }) {
  const url = useBlobUrl(photo.thumb);
  return (
    <button type="button" className="photo-thumb" onClick={onOpen} aria-label={`Photo from ${shortDate(photo.date)}`}>
      {url && <img src={url} alt="" />}
      <span>{shortDate(photo.date)}</span>
    </button>
  );
}

function PhotoViewer({ photos, index, setIndex, onClose }: { photos: Photo[]; index: number; setIndex: (i: number) => void; onClose: () => void }) {
  const p = photos[index];
  const url = useBlobUrl(p.image);
  return (
    <Sheet open onClose={onClose} tall title={parseDay(p.date).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}>
      <div className="photo-full">{url && <img src={url} alt={`Progress photo from ${shortDate(p.date)}`} />}</div>
      <div className="spread">
        <button className="btn icon-btn" type="button" aria-label="Newer photo" disabled={index === 0} onClick={() => setIndex(index - 1)}><Icon name="left" /></button>
        <span className="small muted num">{index + 1} / {photos.length}</span>
        <button className="btn icon-btn" type="button" aria-label="Older photo" disabled={index === photos.length - 1} onClick={() => setIndex(index + 1)}><Icon name="right" /></button>
      </div>
      <div className="grid2">
        <div className="field"><label className="label" htmlFor="ph-d">Date</label><input id="ph-d" className="input num" type="date" value={p.date} max={dayKey()} onChange={(e) => e.target.value && setPhotoDate(p.id!, e.target.value)} /></div>
        <div className="field" style={{ alignContent: "end" }}>
          <ConfirmButton label={<><Icon name="trash" />Delete</>} confirmLabel="Tap to delete" onConfirm={async () => {
            await deletePhoto(p.id!);
            toast("Photo deleted");
            if (photos.length <= 1) onClose();
            else if (index >= photos.length - 1) setIndex(index - 1);
          }} />
        </div>
      </div>
    </Sheet>
  );
}

function EditProfile({ name, heightCm, unit, onClose }: { name: string; heightCm?: number; unit: "lb" | "kg"; onClose: () => void }) {
  const [n, setN] = useState(name);
  const totalIn = heightCm ? Math.round(heightCm / 2.54) : undefined;
  const [ft, setFt] = useState<number | undefined>(totalIn !== undefined ? Math.floor(totalIn / 12) : undefined);
  const [inch, setInch] = useState<number | undefined>(totalIn !== undefined ? totalIn % 12 : undefined);
  const [cm, setCm] = useState<number | undefined>(heightCm ? Math.round(heightCm) : undefined);

  const save = async () => {
    const h = unit === "kg" ? cm : ft || inch ? ((ft || 0) * 12 + (inch || 0)) * 2.54 : undefined;
    await saveProfile(n, h);
    toast("Profile saved");
    onClose();
  };

  return (
    <Sheet open onClose={onClose} title="Profile">
      <div className="field"><label className="label" htmlFor="pf-n">Name</label><input id="pf-n" className="input" value={n} onChange={(e) => setN(e.target.value)} placeholder="Your name" autoComplete="given-name" /></div>
      {unit === "kg" ? (
        <div className="field"><label className="label" htmlFor="pf-cm">Height (cm)</label><NumInput id="pf-cm" value={cm} onChange={setCm} placeholder="180" /></div>
      ) : (
        <div className="grid2">
          <div className="field"><label className="label" htmlFor="pf-ft">Height (ft)</label><NumInput id="pf-ft" value={ft} onChange={setFt} placeholder="5" /></div>
          <div className="field"><label className="label" htmlFor="pf-in">(in)</label><NumInput id="pf-in" value={inch} onChange={setInch} placeholder="11" /></div>
        </div>
      )}
      <span className="small muted">Weight comes from your latest weigh-in.</span>
      <button className="btn btn-primary btn-full" type="button" onClick={save}>Save profile</button>
    </Sheet>
  );
}
