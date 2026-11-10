---
name: movement-food-photo
description: Estimate calories and macros from a food photo and reply with a MOVEMENT block that pastes straight into Aiden's MoveMent tracker app. Use whenever Aiden sends a photo of food or a meal, or asks to "macro this", "log this", "how many calories", or mentions MoveMent with a food picture or description.
---

# MoveMent food photo estimates

Aiden logs food in MoveMent, a personal tracker app. The app has a **Paste from Claude** button that reads a specific text block from the clipboard. Your job is to make that copy-and-paste effortless and the estimate as good as a photo allows.

## What to do

1. Look at the photo (or read the description). Identify each component and estimate portion sizes using visual cues: plate or bowl size (a standard dinner plate is about 26 cm / 10.5 in), utensils, hands, packaging, and how deep the food sits.
2. Estimate calories, protein, carbs and fat for **everything shown, as one serving**. Account for cooking oil, butter, sauces and dressings; they are the most common reason estimates come in low.
3. Reply in exactly this shape, short:

**Chicken burrito bowl** (~520 g)
- Rice, ~1 cup: 210 kcal
- Grilled chicken, ~5 oz: 230 kcal
- Black beans, corn, salsa: 140 kcal
- Cheese and sour cream: 200 kcal

```
MOVEMENT
name: Chicken burrito bowl
serving: 1 bowl
grams: 520
kcal: 780
protein: 48
carbs: 82
fat: 26
```

Biggest uncertainty: how much sour cream is under the cheese.

## Rules for the MOVEMENT block

- Always put it in its own code block so the Claude app shows a one-tap copy button. It must be the only code block in the reply.
- First line is exactly `MOVEMENT`. Then one `key: value` per line, in this order: `name`, `serving`, `grams`, `kcal`, `protein`, `carbs`, `fat`.
- Values are plain numbers: no units, no `~`, no ranges. Round kcal to the nearest 5 and macros to whole grams.
- `name` is short and specific (under 40 characters), the way it should appear in a food log. No brand names unless the packaging is visible.
- `serving` describes the whole portion in the photo ("1 bowl", "2 slices", "1 plate").
- `grams` is the estimated total weight of the portion. If you truly can't judge it, leave the `grams` line out rather than guessing wildly.
- Check the math: protein × 4 + carbs × 4 + fat × 9 should land within about 10% of kcal. Fix the numbers if it doesn't.
- If the photo shows several separate meals or people's plates, ask which one is Aiden's before producing a block.
- If Aiden corrects something ("it was half the rice", "cooked in olive oil"), reply with a fresh, complete MOVEMENT block.

## Tone

Keep the reply short: the itemized list, the block, and one line naming the biggest uncertainty. No disclaimers about AI accuracy beyond that one line. Aiden reviews and can edit every number in the app before saving.
