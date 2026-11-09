import { useEffect, useState, type ReactNode } from "react";

/* ---------- Confirm-in-place button (no browser dialogs) ---------- */
export function ConfirmButton({ label, confirmLabel = "Tap again to confirm", onConfirm, className = "btn btn-danger" }: { label: ReactNode; confirmLabel?: string; onConfirm: () => void; className?: string }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = window.setTimeout(() => setArmed(false), 3000);
    return () => window.clearTimeout(t);
  }, [armed]);
  return (
    <button type="button" className={className} onClick={() => (armed ? (setArmed(false), onConfirm()) : setArmed(true))}>
      {armed ? confirmLabel : label}
    </button>
  );
}
