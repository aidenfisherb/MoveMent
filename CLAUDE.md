# MoveMent: notes for Claude

Personal calorie/macro + workout tracker for one user (iPhone, installed as a PWA).

## Ground rules
- **Zero cost.** Every choice must be free to build and run. If a request needs something paid (App Store account, paid API, paid hosting/database), say so and offer the free alternative.
- **Style:** follow the `personal-ui-style` skill (`.claude/skills/personal-ui-style/SKILL.md`). Tokens live in `src/styles/tokens.css`. Macro colors in this app: protein = orange (`--series-1`), carbs = white (`--series-2`), fat = gray (`--series-3`).
- Data is local-only (IndexedDB via Dexie). No backend. The only network calls allowed are the free food APIs (Open Food Facts, USDA) and the user's own Strava API app (`features/training/runs/stravaApi.ts`). Strava secrets/tokens live in settings, listed in `PRIVATE_SETTING_KEYS`, and never go into backups.
- AI food estimates come in by copy/paste from the Claude app (`features/food/claudeImport.ts`), using the `skills/movement-food-photo` skill uploaded to claude.ai. Keep the MOVEMENT block format in sync between the two.

## Stack
Vite + React 18 + TypeScript, Dexie (`src/data/db.ts`), vite-plugin-pwa, @zxing/browser for barcodes (lazy-loaded; iPhone Safari has no BarcodeDetector). Charts are hand-written SVG (`src/ui/charts.tsx`). Deployed to GitHub Pages under `/MoveMent/`.

## Layout
Read `ARCHITECTURE.md` first. Layers: `app/` → `features/` → `data/`, `ui/` → `lib/`.
- Each feature folder holds its screen, sheets, and a `*Actions.ts` file that does all of its database writes. Screens read with `useLiveQuery` and write only through actions.
- Features don't import each other, except the shared `features/body`.
- `ui/` is app-agnostic (reusable in other projects); it never imports `data/` or `features/`.
- `scripts/check-architecture.mjs` enforces these rules on every build.
- Schema changes need a new `this.version(n)` in `src/data/db.ts`; never edit version 1 in place.

## Previewing
`npm run build:preview` builds a sandbox copy with sample data (`preview/entry.ts`) into `dist-preview/`, for publishing as a claude.ai artifact. Strava connect can't work there (wrong domain).

## Checks
`npm run build` (architecture check + type-check + build) must pass before committing.
