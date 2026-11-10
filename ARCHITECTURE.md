# MoveMent architecture

MoveMent is a **local-first web app**: all code ships to the phone once, and all data lives in the phone's browser database. There is no server of our own, which is why it costs nothing to run.

## 1. The big picture

```mermaid
flowchart LR
  subgraph GitHub["GitHub (free)"]
    repo["Repo: main branch"] --> actions["Actions: npm run build"] --> pages["Pages: static files"]
  end
  subgraph Phone["iPhone (Home Screen app)"]
    sw["Service worker<br/>(offline cache)"] --> app["React app"]
    app <--> idb[("IndexedDB<br/>your data")]
  end
  pages -- "first load + updates" --> sw
  app -- "food search / barcode" --> off["Open Food Facts API"]
  app -- "food search" --> usda["USDA FoodData Central API"]
  app -- "Back up / Restore" --> files["iCloud Drive / Files<br/>(JSON backup)"]
```

- **GitHub Pages** only serves files. It never sees your data.
- The **service worker** caches the app so it opens offline and loads instantly.
- **IndexedDB** (through the Dexie library) is the database. It lives on the phone only.
- The only network calls are the two free food databases. Everything else works offline.

## 2. Layers

Code is split into five layers. Each layer may only import from the layers below it. `npm run build` runs `scripts/check-architecture.mjs`, which fails the build if a file breaks these rules.

```mermaid
flowchart TB
  app["app/<br/>shell, tab bar, routing"] --> features
  features["features/<br/>today · food · training · progress · settings · body"] --> data & ui & lib
  data["data/<br/>database schema, settings, live-query hooks"] --> lib
  ui["ui/<br/>Icon, Dial, Sheet, Toast, charts…<br/>(app-agnostic)"] --> lib
  lib["lib/<br/>pure helpers: dates, format, macros, strength"]
```

| Layer | What lives there | May import |
|---|---|---|
| `app/` | `App.tsx` (screen switcher + tab bar), `routes.ts` | everything |
| `features/` | One folder per area of the app: screens, sheets, and that area's actions | `data`, `ui`, `lib`, its own folder, and `features/body` (shared) |
| `data/` | `db.ts` (tables + types), `settings.ts`, `hooks.ts` | `lib` |
| `ui/` | Reusable components with no app knowledge. Could be copied into any future project. | `lib` |
| `lib/` | Pure functions: no React, no database | nothing (type imports only) |

**Why:** features can't tangle into each other, `ui/` stays reusable for future apps, and the database is only touched in one predictable place per feature.

## 3. Inside a feature

Every feature follows the same pattern:

```
features/food/
├── FoodScreen.tsx      Screen: reads data with live queries, renders
├── EditLogSheet.tsx    Bottom sheets the screen opens
├── add/                A multi-step flow gets its own subfolder
│   ├── AddFoodSheet.tsx   (search → amount, scan → amount, or create)
│   ├── SearchStep.tsx  ScanStep.tsx  Scanner.tsx
│   └── AmountStep.tsx  CustomStep.tsx
├── components.tsx      Small pieces shared inside this feature only
├── foodActions.ts      ALL writes to the database for this feature
└── foodApi.ts          Talks to Open Food Facts and USDA
```

- **Screens and sheets read** data directly with `useLiveQuery(...)`.
- **Screens and sheets write** only by calling the feature's `*Actions.ts` functions.
- **Live queries re-render automatically** after any write, so there's no manual state syncing.

## 4. How one action flows: logging a food

```mermaid
sequenceDiagram
  actor You
  participant Amount as AmountStep (UI)
  participant Act as foodActions.logFood
  participant DB as IndexedDB (Dexie)
  participant Screens as Today + Food screens
  You->>Amount: pick food, enter 2 servings, tap "Add"
  Amount->>Act: logFood(food, grams, meal, date)
  Act->>DB: save food if new / bump "recent"
  Act->>DB: add FoodLog with nutrition snapshot
  DB-->>Screens: live queries fire
  Screens-->>You: dials, totals and meal list update
```

The log stores its own calories and macros (a "snapshot"), so editing a food later never rewrites past days.

## 5. Data model

```mermaid
erDiagram
  FOODS ||--o{ FOOD_LOGS : "logged as"
  EXERCISES ||--o{ SETS : "performed as"
  WORKOUTS ||--o{ SETS : contains
  ROUTINES }o--o{ EXERCISES : "lists (items)"
  ROUTINES ||--o{ WORKOUTS : "started from"
  FOODS {
    int id
    string name
    string barcode
    string source
    json per100
    int servingG
  }
  FOOD_LOGS {
    int id
    string date
    string meal
    int foodId
    float grams
    float kcal
    float p
    float c
    float f
  }
  EXERCISES {
    int id
    string name
    string kind
  }
  ROUTINES {
    int id
    string name
    json items
  }
  WORKOUTS {
    int id
    string date
    string name
    int startedAt
    int finishedAt
  }
  SETS {
    int id
    int workoutId
    int exerciseId
    float weight
    int reps
    bool done
  }
  WEIGHTS {
    string date
    float weight
  }
  PHOTOS {
    int id
    string date
    blob image
    blob thumb
  }
  SETTINGS {
    string key
    json value
  }
```

- Dates are stored as local `YYYY-MM-DD` strings, so a late-night snack lands on the right day.
- A workout with no `finishedAt` is the one in progress. Only one exists at a time.
- **Changing the schema:** add a new `this.version(2)` block in `data/db.ts`. Never edit version 1; phones that already have data upgrade step by step.

## 6. Where to put new things

| You're adding… | Put it in |
|---|---|
| A new area (e.g. Activity / Apple Health import) | `features/activity/` with its own screen and `activityActions.ts`, plus a tab in `app/routes.ts` |
| A new table | `data/db.ts` as a new schema version |
| A button style, chart type or other generic widget | `ui/`, using tokens from `styles/tokens.css` |
| A calculation (e.g. TDEE, pace) | `lib/` as a pure function |
| Something two features both need | `features/body/`-style shared feature, and list it in `SHARED_FEATURES` in the check script |
