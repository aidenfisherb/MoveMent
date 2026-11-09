import { useCallback, useState } from "react";
import type { Food, Meal } from "../../../data/db";
import { Icon, Sheet, toast } from "../../../ui";
import { lookupBarcode } from "../foodApi";
import { findFoodByBarcode } from "../foodActions";
import { AmountStep } from "./AmountStep";
import { CustomStep } from "./CustomStep";
import { ScanStep } from "./ScanStep";
import { SearchStep } from "./SearchStep";

function defaultMeal(): Meal {
  const h = new Date().getHours();
  return h < 11 ? "breakfast" : h < 15 ? "lunch" : h < 21 ? "dinner" : "snack";
}

type Step = { kind: "search" } | { kind: "scan" } | { kind: "amount"; food: Food } | { kind: "custom"; barcode?: string; name?: string };

export function AddFoodSheet({ open, meal, date, onClose }: { open: boolean; meal: Meal; date: string; onClose: () => void }) {
  const [step, setStep] = useState<Step>({ kind: "search" });
  const [m, setM] = useState<Meal>(meal || defaultMeal());
  const title = step.kind === "scan" ? "Scan barcode" : step.kind === "custom" ? "New food" : step.kind === "amount" ? "How much?" : `Add to ${m}`;
  const back = step.kind !== "search" ? () => setStep({ kind: "search" }) : undefined;

  const onCode = useCallback(async (code: string) => {
    const local = await findFoodByBarcode(code);
    if (local) return setStep({ kind: "amount", food: local });
    try {
      const f = await lookupBarcode(code);
      if (f) return setStep({ kind: "amount", food: f });
      toast("Not in Open Food Facts. Enter it once and it's saved.");
    } catch {
      toast("No connection. Enter the food manually.", { error: true });
    }
    setStep({ kind: "custom", barcode: code });
  }, []);

  return (
    <Sheet open={open} onClose={onClose} tall title={
      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {back && <button className="btn icon-btn sm" type="button" aria-label="Back" onClick={back}><Icon name="left" /></button>}
        {title}
      </span>
    }>
      {step.kind === "search" && (
        <SearchStep meal={m} setMeal={setM} onPick={(food) => setStep({ kind: "amount", food })} onScan={() => setStep({ kind: "scan" })} onCustom={(name) => setStep({ kind: "custom", name })} />
      )}
      {step.kind === "scan" && <ScanStep onCode={onCode} />}
      {step.kind === "amount" && <AmountStep food={step.food} meal={m} setMeal={setM} date={date} onDone={onClose} />}
      {step.kind === "custom" && <CustomStep barcode={step.barcode} name={step.name} onSaved={(food) => setStep({ kind: "amount", food })} />}
    </Sheet>
  );
}
