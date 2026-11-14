---
name: movement-food-photo
description: Estimate calories and macros from food photos or descriptions and reply with a MOVEMENT block that pastes straight into Aiden's MoveMent tracker app, one entry per separate food. Use whenever Aiden sends a photo of food or a meal, describes a meal, asks to "macro this", "log this", "how many calories", or mentions MoveMent with food.
---

# MoveMent food estimates

Aiden logs food in MoveMent, a personal tracker app. The app has a **Paste from Claude** button that reads a specific text block from the clipboard and turns **each entry in it into its own food log entry**. Your job is to make that copy-and-paste effortless and the estimates as good as a photo or description allows.

## One entry per separate food

Split what Aiden sends into the foods Aiden would log separately, and give each its own entry:

- **Separate entries:** different dishes or items, separate photos, or things listed separately. Example: "a side salad, and then chicken and rice" is **2 entries**: *Side salad* and *Chicken and rice*.
- **One entry:** the components of a single dish or plate that reads as one thing. A burrito bowl, a sandwich with chips on the same plate, or "chicken and rice" are each **1 entry**.
- When unsure, follow how Aiden phrased it: each thing named separately gets its own entry.
- Drinks with calories (smoothie, latte, soda) are their own entry. Water and black coffee are skipped.

## What to do

1. Look at the photo(s) or read the description. Estimate portion sizes from visual cues: plate or bowl size (a standard dinner plate is about 26 cm / 10.5 in), utensils, hands, packaging, and how deep the food sits.
2. Estimate calories, protein, carbs and fat for each entry, as one serving of what's shown. Account for cooking oil, butter, sauces and dressings; they are the most common reason estimates come in low.
3. Reply in exactly this shape, short:

**Side salad** (~150 g): greens, tomato, cucumber, vinaigrette · 180 kcal
**Chicken and rice** (~430 g): 5 oz grilled chicken, 1 cup white rice, a little oil · 560 kcal

```
MOVEMENT
name: Side salad
serving: 1 bowl
grams: 150
kcal: 180
protein: 3
carbs: 9
fat: 15
---
name: Chicken and rice
serving: 1 plate
grams: 430
kcal: 560
protein: 48
carbs: 58
fat: 12
```

Biggest uncertainty: how much dressing is on the salad.

## Rules for the MOVEMENT block

- Put **all entries in one code block**, so the Claude app shows a single copy button that grabs everything. Never split entries across several code blocks, and never add any other code block to the reply.
- First line is exactly `MOVEMENT`. Separate entries with a line containing only `---`. A single food has no `---`.
- Each entry has one `key: value` per line, in this order: `name`, `serving`, `grams`, `kcal`, `protein`, `carbs`, `fat`.
- Values are plain numbers: no units, no `~`, no ranges. Round kcal to the nearest 5 and macros to whole grams.
- `name` is short and specific (under 40 characters), the way it should appear in a food log. No brand names unless the packaging is visible.
- `serving` describes the whole portion ("1 bowl", "2 slices", "1 plate").
- `grams` is the estimated total weight of that portion. If you truly can't judge it, leave the `grams` line out rather than guessing wildly.
- Check the math for each entry: protein × 4 + carbs × 4 + fat × 9 should land within about 10% of kcal. Fix the numbers if it doesn't.
- If the photo shows several people's plates, ask which is Aiden's before producing a block.
- If Aiden corrects something ("it was half the rice", "cooked in olive oil"), reply with a fresh, complete MOVEMENT block containing every entry, not just the changed one.

## Tone

Keep the reply short: one line per entry, the block, and one line naming the biggest uncertainty. No disclaimers about AI accuracy beyond that line. Aiden reviews and can edit every number in the app before saving.
