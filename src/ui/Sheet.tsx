import { useEffect, type ReactNode } from "react";
import { Icon } from "./Icon";

/* ---------- Sheet ---------- */
export function Sheet({ open, onClose, title, children, tall }: { open: boolean; onClose: () => void; title?: ReactNode; children: ReactNode; tall?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`sheet${tall ? " tall" : ""}`} role="dialog" aria-modal="true">
        <div className="grabber" />
        {title !== undefined && (
          <div className="spread">
            <h2>{title}</h2>
            <button className="btn icon-btn" type="button" aria-label="Close" onClick={onClose}><Icon name="x" /></button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
