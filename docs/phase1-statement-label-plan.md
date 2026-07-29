# Phase 1 plan: the statement label must match what was actually paid

**Status: INVESTIGATION AND PLAN ONLY. Nothing has been changed. Phase 2 begins only on the owner's approval.**

The finding under investigation: a partner who registers a B2B origination expecting Strong, on a deal that collects fewer paid seats than the threshold, is paid the Qualified rate (correct), but the statement line can read "Strong Origination" beside that Qualified rate, which looks like a shortchange even though the engine did exactly the right thing.

---

## 1. Where the displayed label comes from (traced in code)

Every place a commission line is shown renders `PARTNER_FUNCTION_LABELS[entry.function]`, that is, the function value STORED on the `CommissionEntry` row, never the registered or intended function:

| Render site | File and line |
|---|---|
| The partner's own statement | `src/app/(partner)/partner/commissions/page.tsx:73` |
| The admin commissions ledger | `src/app/(admin)/admin/partners/commissions/page.tsx:70` |
| The partner profile's commission table (admin) | `src/app/(admin)/admin/partners/[id]/page.tsx:373` |
| The "commission paid" email to the partner | `src/lib/actions/partner-admin.ts:1312` (`partnerCommissionPaidEmail`) |

The registration's own claims (`DealFunctionClaim`) never enter any of these paths, and in fact cannot carry a Strong versus Qualified intent at all: the claimable functions are Basic Introduction, Origination, Closing, and Delivery, with the strength decided later by the engine. So the divergence does not come from displaying "what was registered"; it comes from the stored function value itself.

## 2. Exactly where the label can diverge from the paid rate (confirmed)

The engine's classifier deliberately encodes the new-company STANDING in the stored function. In `classifyOrigination` (`src/lib/partner/commission.ts`), the B2B New or Dormant company below the seat threshold (or with no paid seats yet) returns:

`{ function: "STRONG_ORIGINATION", rateBp: qualifiedRate, isNewCompany: true, paidStrongRate: false }`

and `addCommissionLine` stores exactly that (`recordedFn = cls.function`, `rateBp = cls.rateBp`). This is intentional and load-bearing: the growth bonus counter (`src/lib/partner/growth.ts`) counts a partner's genuinely new B2B organisations by looking for a non-reversed `STRONG_ORIGINATION` line on the deal, and the same standing keeps the renewal override anchored on the account. Changing the STORED value would silently break the growth bonus count, so the stored value must stay; only the presentation should change.

**This is the ONLY divergent case.** Verified branch by branch: B2C at or above the threshold pays and labels Strong; B2C below labels and pays Qualified; B2B with no domain labels and pays Qualified; B2B Existing (including a forced-existing Panel decision) labels and pays Qualified; B2B New or Dormant at or above the threshold labels and pays Strong. Weighted-split siblings carry the same classification per line, so the same handling covers them. The recompute path rescales amounts only and never rewrites `function` or `rateBp`, so it cannot create a new divergence. The B2C registered-Strong case the owner asked about cannot diverge: on B2C the label always follows the paid rate.

## 3. What the engine already exposes at render time (and what it does not)

The pay path computes everything needed, including `paidStrongRate` and a full plain-language reason, but persists them only to the AUDIT LOG (`auditExtra.paidStrongRate`, `auditExtra.classification`). The `CommissionEntry` row carries `function` and `rateBp` but not the paid-strength flag. A render-time derivation without any stored flag is possible (compare the line's `rateBp` to the resolved Strong rate), but it is fragile across future rate changes: a historical line paid at an old Strong rate would compare unequal to the current Strong rate and misdisplay. So the clean fix persists the already-computed fact.

## 4. The plan (display only; no payment amount and no classification logic changes)

1. **Persist the already-computed fact, additively.** A nullable `paidStrongRate Boolean?` on `CommissionEntry` (additive migration), set on the single write path that creates origination lines (`addCommissionLine`, which also serves reverse-and-re-add and weighted splits) from the classifier's existing output. This adds no logic: the engine already computes and audits this exact boolean; we store it beside the line so the display never has to guess. The live database has ZERO CommissionEntry rows today (verified: 0 entries, 0 closed deals), so there is no backfill and no historical ambiguity; a null (should any pre-column row ever exist) simply renders as today.
2. **A tiny pure display helper** (in `src/lib/partner/constants.ts`, next to `PARTNER_FUNCTION_LABELS`): given `function` and `paidStrongRate`, return the label to SHOW and whether the explanatory note applies. For `STRONG_ORIGINATION` with `paidStrongRate === false` it returns the label "Qualified Origination" (so the label and the rate beside it always agree) plus the note; every other combination returns the stored label unchanged.
3. **Wire the helper into all four render sites** listed in section 1, so the partner statement, both admin views, and the paid email all tell the same story.
4. **The explanatory note**, plain, encouraging, and config-rendered (never a hardcoded number), shown only on the divergent line:
   "Registered as a new company origination, and that standing is kept: the deal still counts toward your growth bonus and anchors your renewal override. It is paid at the Qualified rate because the deal has collected fewer than [strongSeatThresholdB2b] paid seats; if later collections reach the threshold, the company reverses and re-adds the line so it reclassifies at the Strong rate."
   The threshold renders from the partner's resolved config on the server (the same resolver the engine pays through), so a per-partner override shows that partner their own number.
5. **Tests.** Pure tests for the helper: the below-threshold line (Strong stored, paidStrongRate false) displays as Qualified with the note; a genuinely Strong line (paidStrongRate true) still displays as Strong with no note; a Qualified line is unchanged; a null flag renders the stored label. A write-path pin that `addCommissionLine` persists `paidStrongRate` from the classifier. A wiring pin that all four render sites use the helper.
6. **Unchanged, and verified unchanged by the existing suites:** every payment amount, `classifyOrigination` itself, the stored `function` value, the growth bonus counter keyed on it, the override anchoring, the duplicate-origination guard, and the reverse-and-re-add flow.

**Rejected alternatives, for the record:** rewriting the stored function to Qualified (breaks the growth bonus count and erases the new-company standing the engine depends on); and a pure render-time rate comparison with no stored flag (misdisplays historical lines after any future rate change).

**HARD STOP. Awaiting the owner's approval before Phase 2 builds any of this.**
