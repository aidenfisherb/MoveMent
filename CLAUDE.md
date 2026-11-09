# MoveMent: notes for Claude

Personal calorie/macro + workout tracker for one user (iPhone, installed as a PWA).

## Ground rules
- **Zero cost.** Every choice must be free to build and run. If a request needs something paid (App Store account, paid API, paid hosting/database), say so and offer the free alternative.
- **Style:** follow the `personal-ui-style` skill (`.claude/skills/personal-ui-style/SKILL.md`). Tokens live in `src/styles.css`. Macro colors in this app: protein = orange (`--series-1`), carbs = white (`--series-2`), fat = gray (`--series-3`).
- Data is local-only (IndexedDB via Dexie). No backend. Never add network calls other than the free food APIs.

## Stack
Vite + React 18 + TypeScript, Dexie (`src/lib/db.ts`), vite-plugin-pwa, @zxing/browser for barcodes (lazy-loaded; iPhone Safari has no BarcodeDetector). Charts are hand-written SVG (`src/components/charts.tsx`). Deployed to GitHub Pages under `/MoveMent/`.

## Layout
- `src/screens/`: Today, Food, Train, Progress, Settings (hash routing in `App.tsx`)
- `src/lib/db.ts`: schema and types. Changing tables requires a new `this.version(n)`; never edit version 1 in place.
- `src/lib/foodApi.ts`: Open Food Facts + USDA FoodData Central
- `src/lib/training.ts`: start/finish workouts, PR detection (Epley e1RM)
- `design/`: style pickers and the visual style guide (not part of the app)

## Checks
`npx tsc -b && npx vite build` must pass before committing.
