import { lazy, Suspense, useState } from "react";

// The barcode library is large; it only downloads when the scanner opens.
const Scanner = lazy(() => import("./Scanner"));

export function ScanStep({ onCode }: { onCode: (c: string) => void }) {
  const [manual, setManual] = useState("");
  return (
    <>
      <Suspense fallback={<div className="scanner" />}><Scanner onCode={onCode} /></Suspense>
      <div style={{ display: "flex", gap: 8 }}>
        <input className="input num" inputMode="numeric" placeholder="Or type the barcode number" value={manual} onChange={(e) => setManual(e.target.value.replace(/\D/g, ""))} aria-label="Barcode number" />
        <button className="btn" type="button" disabled={manual.length < 8} onClick={() => onCode(manual)}>Look up</button>
      </div>
    </>
  );
}
