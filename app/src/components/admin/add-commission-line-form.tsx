"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addCommissionLine } from "@/lib/actions/partner-admin";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/form-fields";

export type FnRate =
  | { kind: "PERCENT"; rateBp: number }
  | { kind: "FLAT" }
  | { kind: "AUTO_ONLY"; reason: string };

function pct(bp: number): string {
  return `${(bp / 100).toFixed(2).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1")}%`;
}

export function AddCommissionLineForm({
  closedDealId,
  currency,
  dealKind,
  rates,
  strongUnlockedRateBp,
  seatGate,
  deliveryBand,
  functionOptions,
}: {
  closedDealId: string;
  currency: string;
  dealKind: "B2C" | "B2B";
  rates: Record<string, FnRate>;
  strongUnlockedRateBp: number;
  seatGate: { seats: number; threshold: number; met: boolean };
  deliveryBand: { minBp: number; maxBp: number; mode: string };
  functionOptions: [string, string][];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [fn, setFn] = useState<string>(functionOptions[0]?.[0] ?? "BASIC_INTRO");
  const [evidence, setEvidence] = useState("");
  const [panelUnlock, setPanelUnlock] = useState(false);
  const [deliveryBp, setDeliveryBp] = useState("");
  const [flatFee, setFlatFee] = useState("");
  const [error, setError] = useState<string | null>(null);

  const derived = rates[fn];
  const isStrongB2c = fn === "STRONG_ORIGINATION" && dealKind === "B2C";
  const isDeliveryPercent = fn === "DELIVERY" && derived?.kind === "PERCENT";
  const isFlat = derived?.kind === "FLAT";
  const isAutoOnly = derived?.kind === "AUTO_ONLY";

  // The rate the engine will apply, shown read-only. The server re-derives it
  // authoritatively on save, so this preview can never produce a wrong stored rate.
  const previewRateBp = useMemo(() => {
    if (!derived || derived.kind !== "PERCENT") return null;
    if (isStrongB2c && panelUnlock) return strongUnlockedRateBp;
    if (isDeliveryPercent) {
      const raw = deliveryBp.trim() === "" ? deliveryBand.minBp : Math.round(Number(deliveryBp));
      if (!Number.isFinite(raw)) return deliveryBand.minBp;
      return Math.min(Math.max(raw, deliveryBand.minBp), deliveryBand.maxBp);
    }
    return derived.rateBp;
  }, [derived, isStrongB2c, panelUnlock, strongUnlockedRateBp, isDeliveryPercent, deliveryBp, deliveryBand]);

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("closedDealId", closedDealId);
      fd.set("function", fn);
      fd.set("evidenceNote", evidence);
      if (isStrongB2c && panelUnlock) fd.set("strongUnlockedByPanel", "true");
      if (isDeliveryPercent && deliveryBp.trim() !== "") fd.set("deliveryApprovedBp", deliveryBp.trim());
      if (isFlat && flatFee.trim() !== "") fd.set("flatFee", flatFee.trim());
      const result = await addCommissionLine(fd);
      if (!result?.ok) {
        setError(result?.message ?? "Could not add the line.");
        return;
      }
      setEvidence("");
      setDeliveryBp("");
      setFlatFee("");
      setPanelUnlock(false);
      router.refresh();
    });
  };

  return (
    <div className="mt-2 space-y-2 rounded-md border border-neutral-200 bg-neutral-50 p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Add a commission line</p>
      {error ? <p role="alert" className="rounded bg-red-50 px-2 py-1 text-xs text-red-700">{error}</p> : null}

      <div className="flex flex-wrap items-end gap-2">
        <label className="space-y-1">
          <span className="text-xs text-slate-600">Function</span>
          <Select value={fn} onChange={(e) => setFn(e.target.value)} className="h-8 w-52">
            {functionOptions.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </Select>
        </label>

        <div className="space-y-1">
          <span className="text-xs text-slate-600">Engine rate</span>
          <div className="flex h-8 min-w-24 items-center rounded-md border border-neutral-300 bg-white px-3 text-sm font-medium text-navy-900">
            {isAutoOnly ? "n/a" : isFlat ? "Fixed fee" : previewRateBp != null ? pct(previewRateBp) : "-"}
          </div>
        </div>

        {isFlat ? (
          <label className="space-y-1">
            <span className="text-xs text-slate-600">Fixed fee ({currency})</span>
            <Input value={flatFee} onChange={(e) => setFlatFee(e.target.value)} type="number" step="0.01" min={0} className="h-8 w-28" />
          </label>
        ) : null}

        {isDeliveryPercent ? (
          <label className="space-y-1">
            <span className="text-xs text-slate-600">Approved rate bp ({deliveryBand.minBp}-{deliveryBand.maxBp})</span>
            <Input value={deliveryBp} onChange={(e) => setDeliveryBp(e.target.value)} type="number" min={0} placeholder={String(deliveryBand.minBp)} className="h-8 w-28" />
          </label>
        ) : null}
      </div>

      {isStrongB2c ? (
        <div className="text-xs text-slate-600">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={panelUnlock} onChange={(e) => setPanelUnlock(e.target.checked)} className="h-4 w-4" />
            Panel-confirmed strong unlock
          </label>
          <p className="mt-1 text-slate-500">
            Seat gate: {seatGate.seats}/{seatGate.threshold} paid seats {seatGate.met ? "(met)" : "(not met, falls back to qualified unless panel-unlocked)"}
          </p>
        </div>
      ) : null}

      {isAutoOnly && derived?.kind === "AUTO_ONLY" ? (
        <p className="text-xs text-amber-700">{derived.reason}</p>
      ) : null}

      <Textarea
        value={evidence}
        onChange={(e) => setEvidence(e.target.value)}
        rows={2}
        placeholder="Evidence note (required): who did what, and why this function/rate applies."
      />
      <Button type="button" size="sm" variant="ghost" onClick={submit} disabled={isPending || isAutoOnly || evidence.trim().length < 5}>
        {isPending ? "Adding…" : "Add line"}
      </Button>
    </div>
  );
}
