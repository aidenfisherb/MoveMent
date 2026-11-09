import type { Food, Macros } from "../../data/db";

/**
 * Free food data sources:
 *  - Open Food Facts: no key, great for barcodes and packaged foods.
 *  - USDA FoodData Central: free key from api.data.gov; best for whole foods.
 *    Without a key we fall back to DEMO_KEY, which is heavily rate limited.
 */

const OFF = "https://world.openfoodfacts.org";
const OFF_FIELDS = "code,product_name,brands,nutriments,serving_size,serving_quantity";

const num = (v: unknown) => {
  const n = typeof v === "string" ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? n : 0;
};

interface OffProduct {
  code?: string;
  product_name?: string;
  brands?: string;
  serving_size?: string;
  serving_quantity?: number | string;
  nutriments?: Record<string, number | string>;
}

function fromOff(p: OffProduct): Food | null {
  const n = p.nutriments || {};
  let kcal = num(n["energy-kcal_100g"]);
  if (!kcal && n["energy_100g"]) kcal = num(n["energy_100g"]) / 4.184;
  const per100: Macros = { kcal, p: num(n["proteins_100g"]), c: num(n["carbohydrates_100g"]), f: num(n["fat_100g"]) };
  if (!p.product_name || (!per100.kcal && !per100.p && !per100.c && !per100.f)) return null;
  const sq = num(p.serving_quantity);
  return {
    name: p.product_name.trim(),
    brand: p.brands?.split(",")[0]?.trim() || undefined,
    barcode: p.code,
    source: "off",
    sourceId: p.code,
    per100,
    servingG: sq || undefined,
    servingLabel: p.serving_size || undefined
  };
}

export async function lookupBarcode(code: string): Promise<Food | null> {
  const r = await fetch(`${OFF}/api/v2/product/${encodeURIComponent(code)}.json?fields=${OFF_FIELDS}`);
  if (!r.ok) return null;
  const j = await r.json();
  return j.status === 1 && j.product ? fromOff({ ...j.product, code }) : null;
}

export async function searchOff(q: string, signal?: AbortSignal): Promise<Food[]> {
  const url = `${OFF}/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=20&fields=${OFF_FIELDS}`;
  const r = await fetch(url, { signal });
  if (!r.ok) throw new Error(`Open Food Facts returned ${r.status}`);
  const j = await r.json();
  return (j.products || []).map(fromOff).filter(Boolean) as Food[];
}

interface UsdaFood {
  fdcId: number;
  description: string;
  brandOwner?: string;
  brandName?: string;
  gtinUpc?: string;
  dataType?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  householdServingFullText?: string;
  foodNutrients?: { nutrientId?: number; nutrientNumber?: string; nutrientName?: string; value?: number; unitName?: string }[];
}

function fromUsda(f: UsdaFood): Food | null {
  const get = (ids: number[], nums: string[]) => {
    const hit = f.foodNutrients?.find((x) => (x.nutrientId && ids.includes(x.nutrientId)) || (x.nutrientNumber && nums.includes(x.nutrientNumber)));
    return hit?.value ?? 0;
  };
  let kcal = get([1008, 2047, 2048], ["208", "957", "958"]);
  const energyKj = f.foodNutrients?.find((x) => x.nutrientName === "Energy" && x.unitName === "kJ");
  if (!kcal && energyKj?.value) kcal = energyKj.value / 4.184;
  const per100: Macros = { kcal, p: get([1003], ["203"]), c: get([1005], ["205"]), f: get([1004], ["204"]) };
  if (!per100.kcal && !per100.p) return null;
  const servingG = f.servingSizeUnit?.toLowerCase() === "g" ? f.servingSize : undefined;
  return {
    name: cleanUsdaName(f.description),
    brand: f.brandName || f.brandOwner || undefined,
    barcode: f.gtinUpc,
    source: "usda",
    sourceId: String(f.fdcId),
    per100,
    servingG,
    servingLabel: f.householdServingFullText || (servingG ? `${servingG} g` : undefined)
  };
}

function cleanUsdaName(s: string) {
  const lower = s.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

export async function searchUsda(q: string, key: string, signal?: AbortSignal): Promise<Food[]> {
  const url = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${encodeURIComponent(key || "DEMO_KEY")}&query=${encodeURIComponent(q)}&pageSize=20&dataType=Foundation,SR%20Legacy,Branded`;
  const r = await fetch(url, { signal });
  if (r.status === 429) throw new Error("USDA rate limit reached. Add your free API key in Settings.");
  if (!r.ok) throw new Error(`USDA returned ${r.status}`);
  const j = await r.json();
  return (j.foods || []).map(fromUsda).filter(Boolean) as Food[];
}
