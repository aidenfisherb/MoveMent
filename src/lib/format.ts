export const fmt = (n: number, digits = 0) =>
  (Number.isFinite(n) ? n : 0).toLocaleString(undefined, { maximumFractionDigits: digits, minimumFractionDigits: 0 });

export function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Height for display: feet and inches for lb users, centimeters for kg users. */
export function formatHeight(cm: number | undefined, unit: "lb" | "kg") {
  if (!cm) return "";
  if (unit === "kg") return `${Math.round(cm)} cm`;
  const totalIn = Math.round(cm / 2.54);
  return `${Math.floor(totalIn / 12)}′ ${totalIn % 12}″`;
}
