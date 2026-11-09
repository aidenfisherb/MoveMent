import { useState } from "react";
import { dayKey } from "../../lib/dates";
import { NumInput, Sheet, toast } from "../../ui";
import { saveWeight } from "./bodyActions";

export function WeighInSheet({ open, onClose, unit, initial }: { open: boolean; onClose: () => void; unit: string; initial?: number }) {
  const [w, setW] = useState<number | undefined>(initial);
  const [date, setDate] = useState(dayKey());
  const save = async () => {
    if (!w || w <= 0) return;
    await saveWeight(date, w);
    toast("Weight saved");
    onClose();
  };
  return (
    <Sheet open={open} onClose={onClose} title="Weigh in">
      <div className="grid2">
        <div className="field"><label className="label" htmlFor="wi-w">Weight ({unit})</label><NumInput id="wi-w" value={w} onChange={setW} placeholder="0.0" /></div>
        <div className="field"><label className="label" htmlFor="wi-d">Date</label><input id="wi-d" className="input num" type="date" value={date} max={dayKey()} onChange={(e) => setDate(e.target.value)} /></div>
      </div>
      <button className="btn btn-primary btn-full" type="button" disabled={!w} onClick={save}>Save weight</button>
    </Sheet>
  );
}
