import { useEffect, useState } from "react";

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
