/**
 * Renders one routine (e.g. "Legs") as a shareable image card and as plain text.
 * The image is drawn on a canvas at 1080 px wide, in the app's style, so it looks good in a text thread.
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

const W = 1080, PAD = 72, CARD_PAD = 44, ROW = 78;

export const setsText = (sets: number, reps: number) => (reps > 0 ? `${sets} × ${reps}` : `${sets} set${sets === 1 ? "" : "s"}`);

const eyebrow = (owner?: string) => (owner ? `${owner}'s routine` : "My routine");

function summary(day: ShareDay) {
  const sets = day.items.reduce((a, it) => a + it.sets, 0);
  return `${day.items.length} exercise${day.items.length === 1 ? "" : "s"} · ${sets} set${sets === 1 ? "" : "s"}`;
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

export async function renderRoutineCard(day: ShareDay, owner?: string): Promise<Blob> {
  await fontsReady();
  const headerH = 270;
  const cardH = CARD_PAD + Math.max(1, day.items.length) * ROW + CARD_PAD - 16;
  const H = PAD + headerH + cardH + 120 + PAD;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, W, H);

  // Header: whose routine, the routine name, and a size summary.
  let y = PAD + 30;
  ctx.fillStyle = C.accent;
  ctx.font = `700 26px ${C.text}`;
  ctx.fillText(eyebrow(owner).toUpperCase(), PAD, y);
  y += 100;
  ctx.fillStyle = C.fg;
  ctx.font = `800 96px ${C.text}`;
  ctx.fillText(fit(ctx, day.name, W - PAD * 2), PAD, y);
  y += 64;
  ctx.fillStyle = C.muted;
  ctx.font = `500 32px ${C.text}`;
  ctx.fillText(summary(day), PAD, y);
  y = PAD + headerH;

  // Exercises in one outlined card.
  const x = PAD, w = W - PAD * 2;
  ctx.strokeStyle = C.line;
  ctx.lineWidth = 2;
  roundRect(ctx, x, y, w, cardH, 24);
  ctx.stroke();
  const top = y + CARD_PAD - 8;
  day.items.forEach((it, k) => {
    const rowTop = top + k * ROW;
    if (k > 0) {
      ctx.fillStyle = C.line;
      ctx.fillRect(x + CARD_PAD, rowTop, w - CARD_PAD * 2, 2);
    }
    const base = rowTop + ROW / 2 + 12;
    ctx.font = `600 32px ${C.num}`;
    const right = setsText(it.sets, it.reps);
    const rw = ctx.measureText(right).width;
    let ww = 0;
    if (it.weight) {
      ctx.font = `400 26px ${C.num}`;
      ww = ctx.measureText(`${it.weight}  `).width;
    }
    ctx.fillStyle = C.fg;
    ctx.font = `600 34px ${C.text}`;
    ctx.fillText(fit(ctx, it.exercise, w - CARD_PAD * 2 - rw - ww - 32), x + CARD_PAD, base);
    ctx.font = `600 32px ${C.num}`;
    ctx.fillText(right, x + w - CARD_PAD - rw, base);
    if (it.weight) {
      ctx.font = `400 26px ${C.num}`;
      ctx.fillStyle = C.muted;
      ctx.fillText(it.weight, x + w - CARD_PAD - rw - ww, base);
    }
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

export function routineText(day: ShareDay, owner?: string) {
  return [
    `${day.name} · ${eyebrow(owner)}`,
    summary(day),
    "",
    ...day.items.map((it) => `• ${it.exercise}: ${setsText(it.sets, it.reps)}${it.weight ? ` @ ${it.weight}` : ""}`)
  ].join("\n");
}
