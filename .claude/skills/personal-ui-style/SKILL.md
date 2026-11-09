---
name: personal-ui-style
description: Aiden's personal visual style for any website, web app, dashboard, or UI component (true-black background, "Blaze" orange accent, Manrope + JetBrains Mono, outlined cards, pill buttons, compact lists, dial charts). Use whenever building or restyling any interface for Aiden unless the request asks for a different look.
---

# Personal UI Style Guide

This file defines the visual style for every interface built for me. Follow it exactly unless my request explicitly says otherwise. If something you need isn't covered here, extend the system in the same spirit (dark, sharp contrast, one orange accent, quiet everywhere else) rather than inventing a new look.

## 1. Personality in one paragraph

Dark, focused, athletic, and data-forward. A true-black canvas with thin gray outlines, white text, and a single hot orange accent used sparingly for the one thing that matters on screen (the primary action, the key number, the active state). Clean rounded sans-serif for words, monospace for numbers. Compact and information-dense, like a training log, never cluttered. No gradients, no shadows, no decoration.

## 2. Hard rules

1. **Dark mode only.** Background is true black `#000000`. Do not build a light theme unless asked.
2. **One accent color: Blaze orange `#FF5A1F`.** Never introduce a second brand color (no blues, purples, teals). Use orange for at most 1 to 3 elements per screen.
3. **Fonts: Manrope for all text, JetBrains Mono for all numbers and measurements** (weights, reps, calories, grams, times, dates in tables).
4. **Cards are outlined, not filled.** Card background equals page background (`#000`); separation comes from a 1px `#2A2C31` border.
5. **Corners: 10px on cards, 8px on inputs, fully round (pill) on buttons and chips.**
6. **No box shadows, no gradients, no glassmorphism/blur, no emoji as icons.**
7. **Compact density.** Tight list rows, small gaps. More information on screen beats more whitespace.
8. **Progress is shown as circular dials** (see §7.6), not bars, wherever a value has a target.

## 3. Color tokens

| Token | Hex | Use |
|---|---|---|
| `--bg` | `#000000` | Page background, card background |
| `--surface` | `#0E0F11` | Rare raised areas only: inputs, hover row, bottom sheet, dial track backgrounds |
| `--surface-2` | `#17181B` | Pressed/hover state of surface, tooltip background |
| `--line` | `#2A2C31` | All borders, dividers, dial tracks |
| `--line-strong` | `#3A3D44` | Hovered borders, input border on hover |
| `--fg` | `#F2F2F2` | Primary text (never pure white) |
| `--muted` | `#8B8E96` | Secondary text, labels, captions, placeholder |
| `--faint` | `#5A5D64` | Disabled text, tertiary info |
| `--accent` | `#FF5A1F` | Primary buttons, key numbers, active nav, focus ring, links |
| `--accent-hover` | `#FF7340` | Hover state of accent elements |
| `--accent-dim` | `rgba(255,90,31,0.14)` | Selected row / active chip background tint |
| `--on-accent` | `#000000` | Text on orange backgrounds (black, not white) |

**Semantic colors** (only for status, never decoration; they are deliberately distinct from the orange):

| Token | Hex | Use |
|---|---|---|
| `--success` | `#3DDC84` | Goal hit, PR achieved, saved |
| `--warning` | `#FFC233` | Approaching limit |
| `--danger` | `#FF4D6A` | Over limit, delete, errors |

**Data series colors** (charts with more than one series, e.g. macros): series 1 `#FF5A1F` (orange), series 2 `#F2F2F2` (white), series 3 `#6C7080` (gray). Add `#FFC9B3` (pale orange) as a 4th only if unavoidable. Default mapping for nutrition: **Protein = orange, Carbs = white, Fat = gray.**

## 4. Typography

Load from Google Fonts (free):

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600&family=Manrope:wght@400;600;800&display=swap" rel="stylesheet">
```

- **Text font:** `"Manrope", system-ui, -apple-system, "Segoe UI", sans-serif`. Weights used: 400 regular, 600 semibold, 800 extrabold. Nothing else.
- **Number font:** `"JetBrains Mono", ui-monospace, "SF Mono", Menlo, monospace`. Weights 400 and 600. Always add `font-variant-numeric: tabular-nums`.

Type scale (px, mobile first; desktop may bump display and h1 by ~20%):

| Role | Font | Size / line-height | Weight | Notes |
|---|---|---|---|---|
| Display number | JetBrains Mono | 40 / 1.0 | 600 | The single hero number on a screen (e.g. calories left). Colored `--accent`. |
| H1 page title | Manrope | 24 / 1.2 | 800 | One per screen. Letter-spacing -0.01em. |
| H2 section / card title | Manrope | 17 / 1.3 | 800 | |
| H3 subsection | Manrope | 15 / 1.3 | 600 | |
| Body | Manrope | 14 / 1.5 | 400 | Default text size. |
| Small / caption | Manrope | 12 / 1.4 | 400 | `--muted` color. |
| Label (eyebrow) | Manrope | 11 / 1.2 | 600 | UPPERCASE, letter-spacing 0.08em, `--muted`. Used above values and as section headers inside cards. |
| Data value | JetBrains Mono | 13 / 1.4 | 400 | Weights, reps, grams in lists and tables. |
| Data value, emphasis | JetBrains Mono | 20 / 1.1 | 600 | Stat tiles, dial centers. |

Headings use `text-wrap: balance`. Running text is capped near 65 characters wide. Units go after the number in `--muted` at a smaller size when space allows: `185 lb`, `2,400 kcal`.

## 5. Spacing, sizing, layout

- **Base unit 4px.** Spacing scale: 4, 8, 12, 16, 20, 24, 32, 48. Compact density means most gaps are 8 or 12.
- **Card padding:** 12px mobile, 16px desktop.
- **Gap between cards:** 12px.
- **Page gutter:** 16px minimum on each side.
- **Layout is mobile-first.** App screens use a single column, max-width 560px, centered. Content websites/dashboards: max-width 1120px with a responsive grid (`repeat(auto-fill, minmax(280px, 1fr))`).
- Use flex/grid with `gap`, not margins between siblings.
- **Touch targets:** at least 40px tall even when visually compact.

## 6. Shape, borders, depth, motion

- **Radius:** cards 10px, inputs 8px, buttons/chips/toggles 9999px (pill), dial strokes round-capped, small tags 6px.
- **Borders:** 1px solid `--line`. Hover raises border to `--line-strong`. Never thicker than 1px except the focus ring.
- **Depth:** none. No shadows. Layering is shown by border and, rarely, `--surface`.
- **Focus ring:** `outline: 2px solid var(--accent); outline-offset: 2px;` on every interactive element via `:focus-visible`.
- **Motion:** 150ms `ease-out` for hover/press, 250ms for sheets/dials filling. Dials animate their stroke from 0 on first render. Wrap all animation in `@media (prefers-reduced-motion: no-preference)`.
- **Disabled:** opacity 0.4, `cursor: not-allowed`.

## 7. Components

### 7.1 Card
```
background: var(--bg); border: 1px solid var(--line); border-radius: 10px; padding: 12px;
display: grid; gap: 10px;
```
Card header: H2 title on the left, optional muted meta or icon button on the right. Inside a card, use an uppercase Label for sub-sections. Cards never nest inside cards; use a divider (`border-top: 1px solid var(--line)`) instead.

### 7.2 Buttons (all pill-shaped)
- **Primary:** background `--accent`, text `--on-accent` (black), Manrope 700-800 at 14px, padding 10px 18px, height 40px, radius 9999px. Hover `--accent-hover`. Only one primary button per view.
- **Secondary:** transparent background, 1px `--line` border, text `--fg`. Hover border `--line-strong`, background `--surface`.
- **Ghost / text:** no border or background, `--muted` text, hover `--fg`.
- **Destructive:** transparent, 1px `--danger` border, `--danger` text. Confirm with an inline second step, not a browser dialog.
- **Icon button:** 36px circle, transparent, 1px `--line` border, 18px icon.
- Full-width primary button at the bottom of forms on mobile.

### 7.3 Inputs
Height 40px, background `--surface`, 1px `--line` border, radius 8px, padding 0 12px, Manrope 14px, text `--fg`, placeholder `--muted`. Focus: border `--accent` plus the focus ring. Numeric inputs (weight, reps, grams) use JetBrains Mono and `inputmode="decimal"`. Label above input as an uppercase Label. Error: border `--danger` and 12px `--danger` helper text below.

### 7.4 Chips / segmented controls / toggles
- Chip: pill, 28px tall, padding 0 12px, 1px `--line`, 12px Manrope 600. Selected: background `--accent-dim`, border `--accent`, text `--accent`.
- Segmented control: pill container with 1px `--line`; selected segment filled `--accent` with black text.
- Toggle switch: pill track 36x20, off `--line`, on `--accent`; knob `--fg`.

### 7.5 List rows (compact)
Row height 36-40px, padding 6px 0, divider `border-top: 1px solid var(--line)` between rows (none above the first). Layout: name on the left (Manrope 13-14px `--fg`), optional muted sub-line (12px), value on the right in JetBrains Mono 13px. Example: `Bench press · 3 × 8 ............ 185 lb`. Hover: background `--surface`. Selected: background `--accent-dim`.

### 7.6 Progress dials (signature element)
Use dials for anything with a target (macros, calories, weekly workouts, steps). Show them in a row of three (or two/four) side by side, each with the percentage in the center and the label + value beneath.

SVG spec (viewBox `0 0 100 100`, rendered 64-88px wide):
- Track circle: `cx=50 cy=50 r=40`, `fill="none"`, `stroke=var(--line)`, `stroke-width=8`.
- Progress circle: same geometry, `stroke` = series color, `stroke-width=8`, `stroke-linecap="round"`, `stroke-dasharray="{C*pct} {C}"` where `C = 2π·40 ≈ 251.3`, `transform="rotate(-90 50 50)"` so it starts at 12 o'clock.
- Center text: JetBrains Mono 600, ~20 units, `fill=var(--fg)`, e.g. `78%`.
- Below: Label (`PROTEIN`) and the value `142 / 180 g` in JetBrains Mono 12px `--muted`.
- Over 100%: clamp the ring at full and color it `--danger` (for limits like calories/fat) or `--success` (for goals like protein).

```html
<svg viewBox="0 0 100 100" width="72" height="72" role="img" aria-label="Protein 78%">
  <circle cx="50" cy="50" r="40" fill="none" stroke="#2A2C31" stroke-width="8"/>
  <circle cx="50" cy="50" r="40" fill="none" stroke="#FF5A1F" stroke-width="8" stroke-linecap="round"
          stroke-dasharray="196 251.3" transform="rotate(-90 50 50)"/>
  <text x="50" y="57" text-anchor="middle" font-family="JetBrains Mono" font-weight="600" font-size="20" fill="#F2F2F2">78%</text>
</svg>
```

### 7.7 Stat tile
Inside an outlined card: Label on top, value in JetBrains Mono 20px/600 (or the 40px display size for the one hero stat), unit and comparison below in 12px `--muted` (e.g. `+5 lb vs last week` with the delta colored `--success` or `--danger`).

### 7.8 Navigation
- **Mobile app:** fixed bottom tab bar, 56px tall + safe-area inset, background `--bg`, top border 1px `--line`, 4-5 items, each a 22px outline icon over an 11px label. Active item: icon and label `--accent`. Inactive: `--muted`.
- **Desktop/web:** top bar, 56px, bottom border 1px `--line`, Manrope 600 14px links in `--muted`, active link `--fg` with a 2px orange underline offset 6px. Primary action as a pill button on the right.

### 7.9 Tables
No outer border beyond the card's. Header row: uppercase Label style. Rows 36px with `--line` dividers. Numeric columns right-aligned in JetBrains Mono. Zebra striping: no.

### 7.10 Charts (line/bar over time)
Background `--bg`, gridlines horizontal only in `#1A1B1E`, axis labels JetBrains Mono 11px `--muted`. Primary series: 2px orange line with the latest point emphasized as a 4px orange dot with its value labeled. Bars: orange, radius 3px on top corners only. Additional series use the series colors in §3. Tooltips: `--surface-2` background, 1px `--line` border, 8px radius.

### 7.11 Sheets, modals, toasts
- Bottom sheet (mobile) / modal (desktop): background `--bg`, 1px `--line` border, top radius 16px (sheet) or 10px all corners (modal), backdrop `rgba(0,0,0,0.7)`.
- Toast: pill, `--surface-2` background, 1px `--line`, 13px text, bottom-center above the tab bar, auto-dismiss 3s. Success toasts get a small `--success` dot.

### 7.12 Empty states
Centered in the card: a 32px outline icon in `--faint`, one line of `--fg` text saying what will appear, one line of `--muted` text saying how to add the first item, and a secondary button.

## 8. Icons
Lucide (free, MIT) outline icons, stroke width 1.75, sizes 18px inline / 22px in nav. Color inherits text color. Never filled icons, never emoji.

## 9. Writing style in the UI
Short, plain, direct. Sentence case everywhere except Labels (uppercase). Buttons say exactly what they do ("Log food", "Add set", "Save workout"). Numbers always carry units. Errors say what went wrong and how to fix it.

## 10. Do / Don't

**Do:** true black page; thin gray outlines; one orange focal point per screen; monospace numbers; dials for targets; compact rows; pill buttons with black text on orange.

**Don't:** filled gray cards; shadows or gradients; multiple accent colors; white text on orange; condensed or all-caps display fonts for headings; serif fonts; rounded-everything 20px+ cards; emoji; centered-everything layouts; large empty hero sections.

## 11. Drop-in CSS

```css
:root {
  --bg:#000000; --surface:#0E0F11; --surface-2:#17181B;
  --line:#2A2C31; --line-strong:#3A3D44;
  --fg:#F2F2F2; --muted:#8B8E96; --faint:#5A5D64;
  --accent:#FF5A1F; --accent-hover:#FF7340; --accent-dim:rgba(255,90,31,.14); --on-accent:#000000;
  --success:#3DDC84; --warning:#FFC233; --danger:#FF4D6A;
  --series-1:#FF5A1F; --series-2:#F2F2F2; --series-3:#6C7080;
  --font-text:"Manrope",system-ui,-apple-system,"Segoe UI",sans-serif;
  --font-num:"JetBrains Mono",ui-monospace,"SF Mono",Menlo,monospace;
  --r-card:10px; --r-input:8px; --r-pill:9999px;
  color-scheme: dark;
}
body { margin:0; background:var(--bg); color:var(--fg); font:400 14px/1.5 var(--font-text); -webkit-font-smoothing:antialiased; }
.num { font-family:var(--font-num); font-variant-numeric:tabular-nums; }
.label { font:600 11px/1.2 var(--font-text); text-transform:uppercase; letter-spacing:.08em; color:var(--muted); }
.card { background:var(--bg); border:1px solid var(--line); border-radius:var(--r-card); padding:12px; display:grid; gap:10px; }
.btn { height:40px; padding:0 18px; border-radius:var(--r-pill); font:700 14px var(--font-text); border:1px solid var(--line); background:transparent; color:var(--fg); cursor:pointer; transition:background .15s ease-out,border-color .15s ease-out; }
.btn:hover { border-color:var(--line-strong); background:var(--surface); }
.btn-primary { background:var(--accent); border-color:var(--accent); color:var(--on-accent); }
.btn-primary:hover { background:var(--accent-hover); border-color:var(--accent-hover); }
.input { height:40px; padding:0 12px; background:var(--surface); border:1px solid var(--line); border-radius:var(--r-input); color:var(--fg); font:400 14px var(--font-text); }
.input:focus { border-color:var(--accent); }
.row { display:flex; justify-content:space-between; align-items:center; min-height:36px; padding:6px 0; border-top:1px solid var(--line); }
.row:first-child { border-top:0; }
:focus-visible { outline:2px solid var(--accent); outline-offset:2px; }
```

**Tailwind users:** map the tokens above into `theme.extend.colors` (`bg`, `surface`, `line`, `fg`, `muted`, `accent`, etc.), `fontFamily.sans = Manrope…`, `fontFamily.mono = JetBrains Mono…`, and `borderRadius.card = 10px`.
