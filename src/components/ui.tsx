import { useEffect, useRef, useState, type ReactNode } from "react";

/* ---------- Icons (Lucide-style outline, stroke 1.75) ---------- */
const paths: Record<string, ReactNode> = {
  home: <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />,
  food: <path d="M4 3v8a3 3 0 0 0 3 3v7M7 3v6M10 3v8a3 3 0 0 1-3 3M17 21V3c-2 1-3 4-3 8h3" />,
  dumbbell: <path d="M6 6v12M18 6v12M3 9v6M21 9v6M6 12h12" />,
  chart: <path d="M3 3v18h18M7 15l4-4 3 3 6-6" />,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  check: <path d="M5 12.5 10 17l9-10" />,
  x: <path d="M6 6l12 12M18 6 6 18" />,
  left: <path d="M15 5l-7 7 7 7" />,
  right: <path d="M9 5l7 7-7 7" />,
  gear: <><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1" /></>,
  scan: <path d="M4 7V5a1 1 0 0 1 1-1h2M17 4h2a1 1 0 0 1 1 1v2M20 17v2a1 1 0 0 1-1 1h-2M7 20H5a1 1 0 0 1-1-1v-2M7 9v6M10 9v6M13 9v6M16 9v6" />,
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>,
  trash: <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />,
  edit: <path d="M4 20h4L19 9l-4-4L4 16zM14 6l4 4" />,
  play: <path d="M7 4v16l13-8z" />,
  scale: <><path d="M4 20h16l-2-14H6z" /><path d="M9 10a3 3 0 0 1 6 0" /></>,
  more: <><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></>,
  download: <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />,
  upload: <path d="M12 20V9M7 14l5-5 5 5M5 4h14" />,
  trophy: <path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 20h8M10 17h4" />
};

export function Icon({ name, size }: { name: keyof typeof paths | string; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

/* ---------- Dial ---------- */
const C = 2 * Math.PI * 40;
export function Dial({ label, value, target, color, unit = "g", limit = false }: { label: string; value: number; target: number; color: string; unit?: string; limit?: boolean }) {
  const raw = target > 0 ? value / target : 0;
  const over = raw > 1;
  const p = Math.min(raw, 1);
  const stroke = over ? (limit ? "var(--danger)" : "var(--success)") : color;
  return (
    <div className="dial">
      <svg viewBox="0 0 100 100" role="img" aria-label={`${label} ${Math.round(raw * 100)}%`}>
        <circle cx="50" cy="50" r="40" fill="none" stroke="var(--line)" strokeWidth="8" />
        {p > 0 && <circle className="prog" cx="50" cy="50" r="40" fill="none" stroke={stroke} strokeWidth="8" strokeLinecap="round" strokeDasharray={`${C * p} ${C}`} transform="rotate(-90 50 50)" />}
        <text x="50" y="57" textAnchor="middle">{Math.round(raw * 100)}%</text>
      </svg>
      <span className="label">{label}</span>
      <span className="v">{Math.round(value)} / {Math.round(target)}{unit}</span>
    </div>
  );
}

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

/* ---------- Toast ---------- */
type ToastMsg = { text: string; error?: boolean; action?: { label: string; run: () => void } };
let pushToast: (t: ToastMsg) => void = () => {};
export const toast = (text: string, opts: Omit<ToastMsg, "text"> = {}) => pushToast({ text, ...opts });

export function ToastHost() {
  const [msg, setMsg] = useState<ToastMsg | null>(null);
  const timer = useRef<number>();
  useEffect(() => {
    pushToast = (t) => {
      setMsg(t);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setMsg(null), t.action ? 5000 : 3000);
    };
  }, []);
  if (!msg) return null;
  return (
    <div className={`toast${msg.error ? " error" : ""}`} role="status">
      <span className="dot" />
      {msg.text}
      {msg.action && (
        <button className="btn btn-ghost btn-sm accent" style={{ height: "auto", padding: 0, color: "var(--accent)" }} onClick={() => { msg.action!.run(); setMsg(null); }}>
          {msg.action.label}
        </button>
      )}
    </div>
  );
}

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

/* ---------- Number input that tolerates partial typing ---------- */
export function NumInput({ value, onChange, placeholder, id, className = "input num", step }: { value: number | undefined; onChange: (v: number | undefined) => void; placeholder?: string; id?: string; className?: string; step?: string }) {
  const [text, setText] = useState(value === undefined || value === null ? "" : String(value));
  useEffect(() => {
    const parsed = text === "" ? undefined : parseFloat(text);
    if (parsed !== value) setText(value === undefined || value === null ? "" : String(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <input
      id={id}
      className={className}
      inputMode="decimal"
      step={step}
      placeholder={placeholder}
      value={text}
      onFocus={(e) => e.target.select()}
      onChange={(e) => {
        const t = e.target.value.replace(",", ".");
        if (!/^\d*\.?\d*$/.test(t)) return;
        setText(t);
        onChange(t === "" || t === "." ? undefined : parseFloat(t));
      }}
    />
  );
}
