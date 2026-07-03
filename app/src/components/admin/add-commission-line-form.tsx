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
  deliverySingleRateBp,
  functionOptions,
  isSuperAdmin = false,
  dealOwnerId,
  partnerOptions = [],
}: {
  closedDealId: string;
  currency: string;
  dealKind: "B2C" | "B2B";
  rates: Record<string, FnRate>;
  deliverySingleRateBp: number;
  functionOptions: [string, string][];
  isSuperAdmin?: boolean;
  dealOwnerId?: string;
  partnerOptions?: [string, string][];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [fn, setFn] = useState<string>(functionOptions[0]?.[0] ?? "BASIC_INTRO");
  const [evidence, setEvidence] = useState("");
  const [flatFee, setFlatFee] = useState("");
  const [warmAttested, setWarmAttested] = useState(false);
  const [attributedPartnerId, setAttributedPartnerId] = useState("");
  const [weightBp, setWeightBp] = useState("");
  const [error, setError] = useState<string | null>(null);
  // OVERRIDE is always credited to the account opener by the server, so manual
  // attribution does not apply to it.
  const canAttribute = isSuperAdmin && fn !== "OVERRIDE";

  const derived = rates[fn];
  const isBasicIntro = fn === "BASIC_INTRO";
  const isOrigination = fn === "QUALIFIED_ORIGINATION" || fn === "STRONG_ORIGINATION";
  const isDelivery = fn === "DELIVERY";
  const isFlat = derived?.kind === "FLAT";
  const isAutoOnly = derived?.kind === "AUTO_ONLY";

  // The rate the engine will apply, shown read-only. The server re-derives it
  // authoritatively on save, so this preview can never produce a wrong stored rate.
  // Origination is derived from the company's newness and the sale amount, which the
  // form cannot know, so it is shown as "derived on save" rather than a fixed number.
  const previewRateBp = useMemo(() => {
    if (isOrigination) return null;
    if (isDelivery) return deliverySingleRateBp;
    if (!derived || derived.kind !== "PERCENT") return null;
    return derived.rateBp;
  }, [derived, isOrigination, isDelivery, deliverySingleRateBp]);

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("closedDealId", closedDealId);
      fd.set("function", fn);
      fd.set("evidenceNote", evidence);
      if (isFlat && flatFee.trim() !== "") fd.set("flatFee", flatFee.trim());
      if (isBasicIntro && warmAttested) fd.set("warmRelationshipAttested", "true");
      if (canAttribute && attributedPartnerId && attributedPartnerId !== dealOwnerId) fd.set("attributedPartnerId", attributedPartnerId);
      if (canAttribute && weightBp.trim() !== "") fd.set("weightBp", weightBp.trim());
      const result = await addCommissionLine(fd);
      if (!result?.ok) {
        setError(result?.message ?? "Could not add the line.");
        return;
      }
      setEvidence("");
      setFlatFee("");
      setWarmAttested(false);
      setAttributedPartnerId("");
      setWeightBp("");
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
            {isAutoOnly ? "n/a" : isOrigination ? "Derived on save" : isFlat ? "Fixed fee" : previewRateBp != null ? pct(previewRateBp) : "-"}
          </div>
        </div>

        {isFlat ? (
          <label className="space-y-1">
            <span className="text-xs text-slate-600">Fixed fee ({currency})</span>
            <Input value={flatFee} onChange={(e) => setFlatFee(e.target.value)} type="number" step="0.01" min={0} className="h-8 w-28" />
          </label>
        ) : null}
      </div>

      {isOrigination ? (
        <p className="text-xs text-slate-500">
          The server sets Qualified or Strong objectively from the company&apos;s newness (by domain) and the sale amount. The Strong rate
          applies only to a genuinely New or Dormant company on a sale above the high-value threshold; otherwise a new-company deal is paid
          the Qualified rate, and a deal with no domain is always Qualified.
        </p>
      ) : null}

      {isDelivery ? (
        <p className="text-xs text-slate-500">
          Delivery pays a single configured rate of {pct(deliverySingleRateBp)}. A fixed fee is a superadmin exception recorded with a reason.
        </p>
      ) : null}

      {isBasicIntro ? (
        <label className="flex items-start gap-2 text-xs text-slate-600">
          <input
            type="checkbox"
            checked={warmAttested}
            onChange={(e) => setWarmAttested(e.target.checked)}
            className="mt-0.5 h-4 w-4"
          />
          <span>
            I attest this Basic Introduction reflects a genuine, pre-existing warm relationship. The evidence
            note below must describe who the person is and the nature of that relationship. Basic Introduction
            confers no account ownership or protection and pays only under the usual money gates.
          </span>
        </label>
      ) : null}

      {canAttribute ? (
        <div className="flex flex-wrap items-end gap-2 rounded border border-dashed border-neutral-300 p-2">
          <label className="space-y-1">
            <span className="text-xs text-slate-600">Credit to (superadmin)</span>
            <Select value={attributedPartnerId} onChange={(e) => setAttributedPartnerId(e.target.value)} className="h-8 w-52">
              <option value="">Deal owner (default)</option>
              {partnerOptions.map(([id, label]) => (
                <option key={id} value={id}>{label}</option>
              ))}
            </Select>
          </label>
          <label className="space-y-1">
            <span className="text-xs text-slate-600">Split weight bp (optional)</span>
            <Input value={weightBp} onChange={(e) => setWeightBp(e.target.value)} type="number" min={1} max={10000} placeholder="e.g. 6000" className="h-8 w-28" />
          </label>
          <p className="w-full text-xs text-slate-500">
            Weighted split: add one line per partner with the same function; each share is a weight in basis points. The lines together
            equal exactly one unshared line. The evidence note records the reason.
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
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={submit}
        disabled={isPending || isAutoOnly || evidence.trim().length < 5 || (isBasicIntro && !warmAttested)}
      >
        {isPending ? "Adding…" : "Add line"}
      </Button>
    </div>
  );
}
