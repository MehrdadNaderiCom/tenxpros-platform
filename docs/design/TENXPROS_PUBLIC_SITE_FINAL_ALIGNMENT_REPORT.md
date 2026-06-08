# TenXPros — Public Site Final Conversion Pass / Alignment Report

**Date:** 2026-06-08
**Branch:** `deployment/production-deployment-sprint-a` · base `92a7637`
**Scope:** Public marketing site copy/UX, policy copy, application-form (schema-safe), brand mark/favicon, sample-artifact alignment, and a read-only admin/participant analysis.
**Status:** `typecheck` PASS · `test` 16/16 PASS · `build` PASS · route/content checks PASS.
**Not committed, not pushed, not deployed** (per instruction).

Hard rules honored: no destructive commands; no changes to auth, Prisma schema, migrations, admin/portal backend logic, payment/enrollment logic, or server actions; no DB schema changes; no fake testimonials/logos/applicants/credentials/outcomes; no accreditation/guarantee claims added. The application **submit action and validation schema are unchanged**; form edits are display/label and an English-only field consolidation that still submits a valid value.

---

## 1. Every concern addressed, one by one

### Part A — Global copy and positioning
- **A1 “one real problem” overuse —** reframed across Home, Program, Dossier, Certification, Pricing, Apply, About, How-it-Works toward “bring your expertise / explore the challenges / find where AI belongs.” Rendered marketing + page metadata now lead with expertise, not a pre-known problem. Remaining `one real problem` strings live only in **unrendered legacy modules** (`marketing-sections.tsx`, `sample-dossier-preview.tsx`) and were left untouched. The phrase “one focused professional challenge” is used only where dossier scope needs it.
- **A2 negative marketing —** the standalone “What it is not” sections were already unmounted (prior sprint); this pass converted Program’s comparison into the positive **“What makes the work defensible,”** softened the Certification FAQ (below), and made Pricing’s comparison positive.
- **A3 em-dash overuse —** reduced em dashes in rendered marketing instruments from **~102 → ~84** (and to **0** in the policy pages and the rewritten How-it-Works), replacing them with periods, colons, commas, and parentheses. Reduction concentrated in headlines, heroes, CTAs, and all new copy. (Not eliminated everywhere, to avoid grammar breakage; see caveats.)
- **A4 audience expansion —** the Home “Who it is for” list now explicitly includes **startup founders, entrepreneurs, SMB owners, and senior operators / decision-makers** alongside professionals, consultants, managers, researchers, and educators.
- **A5 “who it is not for” —** the discouraging Home panel was replaced with a positive **“It works best when…”** panel (all Check bullets, no “People expecting guaranteed outcomes” language). Outcome disclaimers remain only in FAQ/policy contexts.

### Part B — Home
- Hero softened: “Bring one real problem…” → “Bring your expertise, find where AI truly belongs in your field…”.
- **“Eight assets. One defensible dossier.”** strengthened with a line covering risk, governance, evaluation, and responsible adoption.
- Final-CTA headline varied (“Bring your expertise. Leave with reviewed evidence.”) to cut cross-page CTA repetition; hero/Program language kept distinct.
- `Minus` import removed (no longer used).

### Part C — Program
- Hero reworked to emphasize what the program **teaches** (find where AI belongs, design responsibly, prove value) rather than “bring one problem.”
- The guided-path intro now states the **teaching arc**: early weeks build AI orientation and problem discovery; later weeks move to responsible design, proof, and foresight (addresses the Week-1 orientation and early problem-discovery concerns at the copy level).
- Replaced “No coding is required — but serious professional judgment is.” and “…tied to the dossier you build, not to video attendance.” with clearer, positive phrasing.
- Replaced the “A generic AI tools course can leave you with prompts…” line with a stronger positive explanation of the deeper level TenXPros teaches.
- Fixed awkward wrap on **“Bring your expertise. We bring the AI method.”** with `text-balance`.
- **Module/week review is reported as analysis (see §7)** — module *data* in `program-data.ts` was intentionally **not** edited to avoid marketing/DB drift.

### Part D — Dossier & sample artifact
- Copy aligned: the dossier is positioned as **a visible record of what you can think through and defend**, not the “only goal”; “one real problem” reduced.
- **HTML preview is now the primary CTA** in the hero (in-browser, mobile-friendly); PDF remains the secondary/download path. The sample section already led with “Preview in browser” + “Download PDF.”
- **Sample HTML/PDF were not regenerated this sprint** (they were regenerated and visually verified clean in the prior sprint: 12 pages, valid, no stranded headings). Confirmed still valid: `…excerpt.pdf` 465,130 bytes / 12 pages, `…excerpt.html` 70,563 bytes, `…verification.html` 4,614 bytes.

### Part E — Certification
- FAQ reordered to **lead with positive/practical questions**; added **“What does the reviewer check?”** and **“How can I use the credential?”**; folded the three negative questions (university / accredited / guarantee) into **one quieter closing FAQ**. Necessary “not accredited / no guarantee” language is retained but no longer repeated or prominent.
- A couple of prominent em dashes removed. Milestones/ranks/verification sections (already strong) retained.

### Part F — Pricing
- **$997 Founding Charter kept.** Added an **honest future-standard anchor**: hero readout shows “Future standard $2,497 USD”; the card shows a tasteful struck-through “Future standard: $2,497 USD · available during the founding review-capacity window”; the ladder’s Standard tier updated to $2,497. No fake urgency, no countdown.
- New **“What each module includes”** section: structured core learning, field-specific application, a guided exercise, dossier progress, review feedback at checkpoints, technical support, and milestones/ranks. **No live 1:1 coaching/advisory was promised** (not confirmed as included — see caveats).
- **“Different by design”** made positive: “Different by design: applied, reviewed, and field-specific,” complementing (not replacing) executive education and tools training.

### Part G — Apply & form (most sensitive)
- **Copy:** reframed to “Tell us about your expertise and where AI could help” (no pre-known problem required); added **“You will receive a response by email within 48 hours,”** **official acceptance/payment only from hello@tenxpros.com**, and **support@tenxpros.com** for help; changed “7–10 minutes” → **“5–7 minutes”**; softened confidentiality to **“Do not include confidential … data. Keep examples general or redacted.”** (removed “fictionalized”).
- **Form (schema-safe only):** dropdown/input **text contrast fixed** (`text-slate-900` + placeholder color — they previously inherited light text on the white card); “Real problem brief” relabeled to **“Challenges or opportunities you want to explore with AI”** with a no-finished-answer placeholder; “Why TenXPros?” → **“Your goals with AI”**; weekly availability relabeled to welcome lower commitment (**“About 2–5 / 6–8 / 12+ hours”**); **“Preferred language” removed** (English-only) via a registered hidden input that still submits `"English"`, so the schema stays satisfied.
- **Submit action, zod schema, and field set are unchanged at the data layer.** Tests still pass.
- **Deeper field model (org type, education, decision authority, English-comfort, separate “main goals”) was NOT implemented** — it requires new Prisma columns/enums. Per the rules, this is reported for a schema sprint, not applied.
- **Anti-abuse:** a **duplicate-email guard already exists** in `submitApplication` (active applications per email are blocked). **No rate limiting exists** — flagged for a safe next sprint (not implemented to avoid risky backend changes).

### Part H — Refund / Privacy / Terms
- Refund: **“Stripe Payment Link” removed** → “secure, accepted-applicant payment link”; refund-limitation language rephrased in trust-preserving terms (capacity/reviewer time reserved); cooling-off/statutory language kept conservative; official-email guidance added.
- Privacy & Terms: added a **“Contact and official communication”** section (acceptance/payment only from hello@tenxpros.com; support@tenxpros.com; treat other payment requests as suspicious).

### Part I — How it Works
- Rewritten as a **premium dark Instrument-style page** matching the rest of the site (dropped the legacy light-theme `JourneySteps`). Reduced “one exact problem” framing and added the full **after-apply flow**: apply → fit review within 48h → acceptance email → payment link after acceptance → onboarding & password setup → diagnostic → Week 1.

### Part J — Logo / favicon
- Brand mark **“TX” → “TXP”** in `logo.tsx` (used by public nav, footer, portal nav, admin nav, auth layout).
- Added **`app/icon.svg`** (navy rounded square + “TXP”, system fonts only) — Next auto-registers it; verified `<link rel="icon" href="/icon.svg…">` is injected and the `/icon.svg` route builds.

### Part K — Admin / participant analysis (report only)
See §7. No admin system was built.

---

## 2. Files changed

**Modified (19):**
`app/src/app/(public)/{page,about/page,apply/page,program/page,pricing/page,refund/page,privacy/page,terms/page,how-it-works/page}.tsx`,
`app/src/components/marketing/{home,program,dossier,certification,pricing,apply,about}-instrument.tsx`,
`app/src/components/marketing/application-form.tsx`,
`app/src/components/shared/logo.tsx`,
`app/src/components/ui/form-fields.tsx`.

**Added (1):** `app/src/app/icon.svg`.

Diffstat: 19 files changed, +305 / −151; plus the new `icon.svg`.

**Intentionally NOT changed:** `app/prisma/schema.prisma`, migrations, `prisma/seed.ts`, `src/lib/validations/application.ts` (schema), `src/lib/actions/*` (server actions incl. `submitApplication`), auth, admin/portal pages and logic, `program-data.ts`, the sample HTML/PDF/PNG assets, and the legacy/unrendered `marketing-sections.tsx` and `sample-dossier-preview.tsx`.

---

## 3. Copy changes (summary)
Positive reframing of heroes, value lists, FAQs, and CTAs across all eight public marketing surfaces; “one real problem” → “your expertise / the challenges you want to explore / a focused professional challenge”; audience broadened to founders/entrepreneurs/SMB/operators; “who it is not for” → “it works best when”; em-dash density reduced; new Pricing “what each module includes” and future-standard anchor; new positive Program “what makes the work defensible”; rewritten premium How-it-Works.

## 4. Form changes
Display/label + contrast only, plus English-only consolidation (hidden registered field). **No** changes to field data model, zod schema, or submit action. Validation behavior unchanged (tests green). Proposed deeper field model deferred to a schema sprint.

## 5. Legal / policy changes
Refund “Stripe Payment Link” removed and limitation language softened to trust-preserving phrasing; official-communication/contact sections added to Refund, Privacy, and Terms; cooling-off/statutory wording kept conservative and unchanged in substance.

## 6. Logo / favicon / sample
Brand mark TX→TXP across all navs; new `icon.svg` favicon. Sample dossier artifacts unchanged this sprint and confirmed valid (12-page PDF, non-empty HTML + verification).

---

## 7. Admin & participant operating-system analysis (report only)

The admin and participant systems are **substantially implemented** (far more than a shell). Highlights from a read-only audit:

**Implemented:** application review + status transitions + manual enrollment (`lib/actions/applications.ts`); participant onboarding (starter pack → diagnostic → path approval → modules); module artifact submit/review with auto-badge issuance; 12-section dossier review; certification decision flow (auto-issues capstone seal + draft directory profile); full support-ticket CRUD (admin + portal) with monthly fair-use limit; badge system (11 module + 3 rank + capstone) with public `/verify/[code]`; admin dashboard, settings/feature-flags, audit log; **set-password token flow** for accepted applicants; NextAuth credentials with roles `APPLICANT/PARTICIPANT/COACH/ADMIN`.

**Stub / partial:** `/admin/analytics*`, `/admin/reports`, `/admin/email/templates`, `/portal/feedback` (shells).

**Missing:** change-password & forgot-password flows; deadline-extension admin UI (data model supports it); Stripe webhook automation (payment is manual link + admin “mark paid”); stored PDF certificate generation; file uploads (artifact URLs are text).

**Payment flow today:** Application `ACCEPTED` → auto-creates a PENDING `PaymentRecord` and emails a payment link from env (`STRIPE_PAYMENT_LINK_*`); admin manually confirms receipt → enrolls. Requires the env links + an email provider (Resend) to be configured.

**Admin bootstrap:** only via `prisma/seed.ts` reading `ADMIN_EMAIL` / `ADMIN_PASSWORD` (hashed, never stored in code). **No `mail@mehrdadnaderi.com` admin exists yet** and there is no web UI to create admins. **Secure one-time bootstrap proposal:** set `ADMIN_EMAIL=mail@mehrdadnaderi.com` and a strong `ADMIN_PASSWORD` in the server’s production env (never committed), run the seed/upsert once, then rotate the password from a future change-password screen. No plaintext password was stored, seeded in code, or printed.

**Proposed next sprint — “Admin + Participant Week 1 Sprint”:** (1) secure admin bootstrap for the founder account; (2) change-password + forgot-password; (3) deadline/extension admin controls; (4) Stripe webhook automation (replace manual mark-paid) or a documented manual SOP; (5) deeper application field model (org type, education, decision authority, English comfort, separate goals) with schema + validation + tests + admin display; (6) lightweight application rate-limiting; (7) fill analytics/reports/email-template/coach-feedback stubs.

---

## 8. Tests run and results
| Command | Result |
| --- | --- |
| `pnpm typecheck` | **PASS** (exit 0) |
| `pnpm test` (vitest) | **PASS** — 5 files, 16/16 |
| `pnpm build` | **PASS** (exit 0); all public routes prerendered static; `/icon.svg` route generated |

**Route/content checks (prerendered HTML):** TXP brand mark present (no stray “TX”); favicon link injected; Apply shows “within 48 hours” + hello@/support@; Refund has no “Stripe Payment Link”; Pricing shows $2,497 + “What each module includes”; Program “What makes the work defensible”; How-it-Works shows the 48-hour flow; About “creator and architect”; Home “It works best when” + “entrepreneurs”; no “first 10 accepted members”; sample PDF valid (12 pp).

---

## 9. Remaining blockers / caveats
- **Payment + email env must be configured before outreach.** Acceptance emails and payment links depend on `STRIPE_PAYMENT_LINK_*` and an email provider being set in production. Until then, acceptance/payment cannot complete end-to-end.
- **Admin account must be bootstrapped** (`mail@mehrdadnaderi.com`) before applications can be reviewed in `/admin`.
- **Pricing drift to reconcile:** marketing now advertises a **$2,497 future standard**, but `program-data.ts` (seeded pricing tiers, used by `/admin/pricing`) still has Standard at **$1,997**. Reconcile the seed/DB value to match the public claim.
- **Em dashes reduced, not eliminated** (~84 remain in marketing instruments) to avoid grammar breakage; can be driven lower in a follow-up if desired.
- **Deeper Apply fields and rate-limiting deferred** (schema/backend — next sprint).
- **Module content review is copy-level only;** any change to module titles/descriptions should be made in `program-data.ts` deliberately (it feeds both marketing and the seeded DB) — recommend doing it in the Admin sprint to avoid drift.
- Legacy unrendered modules (`marketing-sections.tsx`, `sample-dossier-preview.tsx`) still contain old phrasing but are not on any live route.

---

## 10. Final recommendation

**Ready for early applications (public site + intake) — conditional.**

The public site is polished, positive, premium, and conversion-ready, and the application form submits correctly into a working admin review pipeline. Before **serious outreach**, complete two operational prerequisites (no code blockers):

1. **Bootstrap the founder admin account** securely (`mail@mehrdadnaderi.com`).
2. **Configure the payment link + email provider** so acceptance → payment → enrollment works end-to-end.

If you want those handled first, treat this as **“Hold serious outreach for payment + admin setup”**; the site itself can go live to *collect* selected early applications now. The richer admin tooling and deeper form fields are a deliberate **next sprint**, not a launch blocker.

**No commit. No push. No deploy.** Awaiting review/approval.
