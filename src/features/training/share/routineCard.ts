/**
 * Renders routines as a shareable image (a "training split" card) and as plain text.
 * Image is drawn on a canvas at 1080 px wide, in the app's style, so it looks good in a text thread.
 */

export interface ShareDay {
  name: string;
  items: { exercise: string; sets: number; reps: number; weight?: string }[];
}

const C = {
  bg: "#000000", line: "#2A2C31", fg: "#F2F2F2", muted: "#8B8E96", faint: "#5A5D64", accent: "#FF5A1F",
  text: '"Manrope", system-ui, -apple-system, sans-serif',
  num: '"JetBrains Mono", ui-monospace, Menlo, monospace'
};

const W = 1080, PAD = 72, CARD_PAD = 44, ROW = 74, GAP = 28;

export const setsText = (sets: number, reps: number) => (reps > 0 ? `${sets} × ${reps}` : `${sets} set${sets === 1 ? "" : "s"}`);

function title(owner?: string) {
  return owner ? `${owner}'s training split` : "My training split";
}

function eyebrow(days: ShareDay[]) {
  return `${days.length} day${days.length === 1 ? "" : "s"} a week`;
}

function subtitle(days: ShareDay[]) {
  return days.map((d) => d.name).join(" / ");
}

async function fontsReady() {
  try {
    await Promise.all([
      document.fonts.load(`800 64px ${C.text}`),
      document.fonts.load(`600 32px ${C.text}`),
      document.fonts.load(`600 30px ${C.num}`)
    ]);
  } catch { /* fall back to system fonts */ }
}

/** Shorten text with "…" until it fits. */
function fit(ctx: CanvasRenderingContext2D, s: string, max: number) {
  if (ctx.measureText(s).width <= max) return s;
  while (s.length > 1 && ctx.measureText(`${s}…`).width > max) s = s.slice(0, -1);
  return `${s}…`;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export async function renderRoutineCard(days: ShareDay[], owner?: string): Promise<Blob> {
  await fontsReady();
  const headerH = 250;
  const cardHs = days.map((d) => CARD_PAD * 2 + 92 + Math.max(1, d.items.length) * ROW);
  const H = PAD + headerH + cardHs.reduce((a, b) => a + b, 0) + GAP * (days.length - 1) + 110 + PAD;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, W, H);
  ctx.textBaseline = "alphabetic";

  // Header
  let y = PAD + 30;
  ctx.fillStyle = C.accent;
  ctx.font = `700 26px ${C.text}`;
  ctx.fillText(eyebrow(days).toUpperCase(), PAD, y);
  y += 84;
  ctx.fillStyle = C.fg;
  ctx.font = `800 68px ${C.text}`;
  ctx.fillText(fit(ctx, title(owner), W - PAD * 2), PAD, y);
  y += 60;
  ctx.fillStyle = C.muted;
  ctx.font = `500 32px ${C.text}`;
  ctx.fillText(fit(ctx, subtitle(days), W - PAD * 2), PAD, y);
  y = PAD + headerH;

  // One outlined card per day
  days.forEach((d, i) => {
    const h = cardHs[i];
    const x = PAD, w = W - PAD * 2;
    ctx.strokeStyle = C.line;
    ctx.lineWidth = 2;
    roundRect(ctx, x, y, w, h, 24);
    ctx.stroke();

    let cy = y + CARD_PAD + 26;
    ctx.fillStyle = C.accent;
    ctx.font = `700 24px ${C.text}`;
    ctx.fillText(`DAY ${i + 1}`, x + CARD_PAD, cy);
    ctx.fillStyle = C.muted;
    ctx.font = `600 24px ${C.num}`;
    const count = `${d.items.length} exercise${d.items.length === 1 ? "" : "s"}`;
    ctx.fillText(count, x + w - CARD_PAD - ctx.measureText(count).width, cy);
    cy += 58;
    ctx.fillStyle = C.fg;
    ctx.font = `800 48px ${C.text}`;
    ctx.fillText(fit(ctx, d.name, w - CARD_PAD * 2), x + CARD_PAD, cy);
    cy += 26;

    d.items.forEach((it, k) => {
      const rowTop = cy + k * ROW;
      if (k > 0) {
        ctx.fillStyle = C.line;
        ctx.fillRect(x + CARD_PAD, rowTop, w - CARD_PAD * 2, 2);
      }
      const base = rowTop + ROW / 2 + 12;
      ctx.font = `600 30px ${C.num}`;
      const right = setsText(it.sets, it.reps);
      const rw = ctx.measureText(right).width;
      let ww = 0;
      if (it.weight) {
        ctx.font = `400 26px ${C.num}`;
        ww = ctx.measureText(`${it.weight}  `).width;
      }
      ctx.fillStyle = C.fg;
      ctx.font = `600 32px ${C.text}`;
      ctx.fillText(fit(ctx, it.exercise, w - CARD_PAD * 2 - rw - ww - 32), x + CARD_PAD, base);
      ctx.font = `600 30px ${C.num}`;
      ctx.fillStyle = C.fg;
      ctx.fillText(right, x + w - CARD_PAD - rw, base);
      if (it.weight) {
        ctx.font = `400 26px ${C.num}`;
        ctx.fillStyle = C.muted;
        ctx.fillText(it.weight, x + w - CARD_PAD - rw - ww, base);
      }
    });
    y += h + GAP;
  });

  // Footer
  const fy = H - PAD - 10;
  ctx.fillStyle = C.accent;
  ctx.beginPath();
  ctx.arc(PAD + 9, fy - 9, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = C.faint;
  ctx.font = `600 26px ${C.text}`;
  ctx.fillText("Made with MoveMent", PAD + 32, fy);

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Couldn't create the image."))), "image/png"));
}

export function routineText(days: ShareDay[], owner?: string) {
  const lines = [title(owner), `${eyebrow(days)} · ${subtitle(days)}`, ""];
  days.forEach((d, i) => {
    lines.push(`DAY ${i + 1} · ${d.name.toUpperCase()}`);
    d.items.forEach((it) => lines.push(`• ${it.exercise}: ${setsText(it.sets, it.reps)}${it.weight ? ` @ ${it.weight}` : ""}`));
    lines.push("");
  });
  return lines.join("\n").trim();
}
