# TenXPros — Application Form Copy + Field Clarity Sprint

**Date:** 2026-06-09 · branch `deployment/production-deployment-sprint-a` (HEAD `d7736a1`)
**Scope:** Clarity/label/helper/placeholder improvements to the `/apply` form + one validation copy improvement. **No schema/migration. No env/DB/email/payment/application/deploy.**
**Outcome:** ✅ Implemented, QA-clean (typecheck + 61 tests + build). Two files changed, both code. Nothing committed/pushed.

---

## 1. Inspection findings (Step 1)

**Files:** form `src/components/marketing/application-form.tsx` (client, react-hook-form + zod); page `src/app/(public)/apply/page.tsx`; visual wrapper `src/components/marketing/apply-instrument.tsx` (presentational only); validation `src/lib/validations/application.ts`; server action `submitApplication` in `src/lib/actions/applications.ts`.

**Current stored fields (`Application` model):** `fullName, email, country, professionalRole, domain, linkedinUrl?, aiExperience(enum), whyTenXPros(text), realProblemBrief(text), dataSensitivity(enum), timeAvailability(enum), preferredLanguage, consentConfidentiality, consentTerms, status, adminNotes?, reviewedAt/By?, pricingTierAtApply?` + attribution `utmSource/Medium/Campaign/Term/Content?, referrerUrl?, landingPage?` + `payments[]`.

**Current required fields (zod):** fullName, email, country, professionalRole, domain, aiExperience, whyTenXPros (≥80 chars), realProblemBrief (≥80 chars), dataSensitivity, timeAvailability, preferredLanguage, consentConfidentiality=true, consentTerms=true. **Optional:** linkedinUrl + all UTM/referrer fields.

**Copy/label changes possible without schema change:** all labels, placeholders, helper text, select option *display text*, and consent informational copy — none of these touch the DB. The only request that would need a schema change is a **distinct 4th AI-familiarity value** (see §3).

**Source attribution already exists?** **Yes.** Hidden UTM/referrer/landing-page capture is already wired in the form's `useEffect` and persisted to the existing `utm*`/`referrerUrl`/`landingPage` columns. Left fully intact.

**Can a visible source field be added without schema change?** A free-text *"How did you hear about TenXPros?"* does **not** map cleanly to any existing column (`utmSource` is structured machine attribution; overloading it with self-reported text would pollute UTM analytics). Per the runbook, **deferred** (no clean target field) — documented as a later marketing-dashboard enhancement.

## 2. Labels, helper text, and placeholders changed (Step 2)

| Field (DB name) | Old label | New label | Helper added | New placeholder |
|---|---|---|---|---|
| `professionalRole` | Professional role | **Role / job function** | "What role do you currently play professionally?" | "Founder, HR Director, Operations Manager, Consultant, Legal Counsel..." |
| `domain` | Professional domain | **Field / industry context** | "Where is your work grounded?" | "Healthcare, legal services, logistics, education, finance, public sector..." |
| `aiExperience` | AI experience | **AI familiarity in professional work** | placeholder option "Select the closest option" | — (see §3) |
| `whyTenXPros` | Your goals with AI | **What would make these 12 weeks professionally valuable for you?** | "A rough direction is enough. You do not need a finished AI idea or solution." | "For example: identify useful AI opportunities in my work, redesign a recurring workflow, improve decision support, or build a clearer AI adoption plan." |
| `realProblemBrief` | Challenges or opportunities you want to explore with AI | **What work situations, workflows, decisions, or opportunities should we explore with you?** | "Share 1–2 examples from your work context. Please avoid confidential or sensitive details." | "For example: reporting, client onboarding, compliance review, training design, knowledge search, operations planning, or customer support." |

Helper text is rendered as a small `<span>` between the label and control (valid inside the `Field`'s `<label>`); the shared `Field` component was **not** modified.

### Consent / payment-understanding copy
Added an **informational** line (not a new persisted consent, **no hardcoded price**) under the consent block:
> "I understand TenXPros is selective, and payment is requested only after acceptance according to the active pricing tier shown on the [Pricing page](/pricing)."

Both existing checkboxes (confidentiality, and terms/privacy/refund) are **kept unchanged**.

## 3. AI familiarity — 3 values relabeled; 4th value proposed (schema, deferred)
The runbook lists **four** options, but the `AIExperienceLevel` enum has **three** values (`BEGINNER/INTERMEDIATE/ADVANCED`). Four *distinct persisted* values require `ALTER TYPE "AIExperienceLevel" ADD VALUE` — a schema/migration change, which the hard rules say to **stop and propose, not apply**. Implemented without schema change:

| Stored value | New display label |
|---|---|
| (unselected) | "Select the closest option" — disabled placeholder, **no default** |
| `BEGINNER` | "New to AI in my professional work" |
| `INTERMEDIATE` | "Experimenting with / using AI tools" |
| `ADVANCED` | "Leading or advising AI initiatives" |

- The `BEGINNER` default was removed from the form's `defaultValues`; the unselected placeholder (`value=""`) fails validation, so the field **cannot silently default to "new."**
- Validation message improved to **"Select the closest option."** (zod v4 `error` param; no schema change).
- **Proposed (deferred) schema change** to honor the full 4-level ladder as distinct data: add an `AIExperienceLevel` value (e.g. `LEADING`) and split the middle into "Experimenting" vs "Using regularly". Additive `ADD VALUE`, low risk — but **not applied here** per the stop-and-propose rule. Awaiting go-ahead.

## 4. Fields intentionally NOT changed (and why)
- **fullName, email, country** — already clear; no change requested.
- **linkedinUrl** — remains **optional** (friction control).
- **dataSensitivity, timeAvailability** — out of scope; existing options/defaults retained.
- **preferredLanguage** — hidden ("English"); English-only program, unchanged.
- **≥80-char minimums** on the two textareas — kept, to preserve qualification quality while the new helper text signals "a rough direction is enough" (no long essays added, no requirement to know the final AI project).
- **Submit flow / server action** — unchanged.
- **apply-instrument.tsx** marketing summary bullets ("Your goals with AI", etc.) — left as generic high-level summaries to keep blast radius minimal; they are not field labels.
- **Navbar overlap** — not reproduced as a real bug; out of scope, untouched.

## 5. Source attribution (Step 3)
- **Hidden UTM/referrer/landing capture:** kept working (unchanged).
- **Visible "How did you hear about TenXPros?":** **deferred** — no existing column maps cleanly; documented as a later marketing-dashboard-related enhancement (would need a small additive `referralSource` column).

## 6. Schema change needed?
**No.** All shipped changes are copy/UI + one validation message. The only place a schema change would be required (4th AI-familiarity value, and an optional `referralSource` column) is **proposed and deferred**, not applied. `git status` confirms `prisma/schema.prisma` and `prisma/migrations/` are untouched.

## 7. QA results (Step 5)
| Check | Result |
|---|---|
| `pnpm typecheck` | PASS (exit 0; zod v4 `error` param accepted) |
| `pnpm test` | PASS — 9 files, **61/61** (incl. `application-validation` still green) |
| `pnpm build` | PASS — "Compiled successfully" (`/apply` compiles) |
| Schema/migration added? | **No** |
| Validation matches submitted fields? | Yes — same field set; only the `aiExperience` message changed; option *values* unchanged (`BEGINNER/INTERMEDIATE/ADVANCED`), so the e2e `selectOption("INTERMEDIATE")` selectors still work |
| Payment/email/application action? | **None** |

## 8. Final git status (uncommitted)
```
 M app/src/components/marketing/application-form.tsx
 M app/src/lib/validations/application.ts
```
(Plus this new report.) Branch in sync with origin at `d7736a1`.

## 9. Confirmations
**No `.env.production` edit. No email sent. No application submitted. No payment triggered. No production DB mutation. No deploy/rebuild. No schema/migration added. No pricing amount changed. No marketing dashboard. Nothing committed or pushed.**

## 10. Next steps (on approval)
1. Review → commit (form clarity, docs) → deploy (`docker compose up -d --build tenxpros-app`) → live-check `/apply` renders and the new copy/validation behaves.
2. Optional, on go-ahead: the additive `AIExperienceLevel` 4th value (+ middle split) and/or a visible `referralSource` field — both small additive migrations, proposed above.
