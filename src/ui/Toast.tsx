import { useEffect, useRef, useState } from "react";

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
