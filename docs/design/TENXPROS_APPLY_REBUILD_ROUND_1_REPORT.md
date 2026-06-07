# TenXPros — Apply Rebuild Round 1 Report

**Task:** Rebuild the public Apply page (`/apply`) into the 8-section Instrument experience while preserving the existing application form, validation, and server action exactly.
**Date:** 2026-06-07
**Status:** Complete. typecheck / test / build green. QA green on desktop (1440) and mobile (390) — 7/7 headings visible, footer flush, 0px horizontal overflow, 0px trailing blank, **form intact (14/14 fields + submit), `#application-form` anchor works**, mobile menu verified.

---

## 1. Files changed

| File | Type | Change |
| --- | --- | --- |
| `app/src/app/(public)/apply/page.tsx` | Modified | Rebuilt as a dark Instrument composition that wraps the **unchanged** `ApplicationForm` (kept inside `<Suspense>`); metadata updated. Route `/apply` unchanged. |
| `app/src/components/marketing/apply-instrument.tsx` | **New** | The 8 presentational sections + `ApplyFormShell` visual wrapper (provides the `#application-form` anchor + header/helper copy). Self-contained, mirrors Home/Dossier/Pricing. |
| `app/scripts/apply-qa-verify.mjs` | **New** | QA + screenshot tooling, including a form-integrity check (14 field names + submit button + anchor-scroll) and the mobile-menu capture. Not part of the app bundle. |

**Not touched:** `application-form.tsx`, the zod schema, the server action, shared nav/footer, routes, and all app logic.

---

## 2. Form logic preserved (inspected before editing)

- **Form component:** `ApplicationForm` (`app/src/components/marketing/application-form.tsx`) — `"use client"`, `react-hook-form` + `zodResolver(applicationSchema)`. **Unchanged.**
- **Validation:** `applicationSchema` (`app/src/lib/validations/application.ts`). **Unchanged.** All fields preserved: `fullName, email, country, professionalRole, domain, linkedinUrl, aiExperience, whyTenXPros, realProblemBrief, dataSensitivity, timeAvailability, preferredLanguage, consentConfidentiality, consentTerms` + tracking (`utmSource/Medium/Campaign/Term/Content, referrerUrl, landingPage`).
- **Server action:** `submitApplication` (`app/src/lib/actions/applications.ts`) → on success `router.push('/apply/thank-you?id=...')`. **Unchanged.**
- **Behavior preserved:** required fields, error messages, focus states, the 80-char minimums on `whyTenXPros`/`realProblemBrief`, the two required consent checkboxes, the `serverError` banner, and the `<Suspense>` boundary required by `useSearchParams` (UTM capture still works).
- **QA confirmation:** the Playwright run (real browser, post-hydration) reports **`form present: true · submit btn: true · 14/14 fields present · #application-form anchor target: true · "Start application" jumps to form: true`** on both desktop and mobile.

> The form is a Suspense-wrapped client component, so the static HTML shows the fallback ("Loading application form…") and the inputs hydrate on the client — that is why a plain `curl` shows 0 inputs while the browser-based QA confirms all 14. Expected, not a regression.

---

## 3. Design decisions

- **Same Instrument system as Home/Dossier/Pricing:** base `#070B14`, panels `#0B1120`, hairline rules, indigo action accent, JetBrains-Mono labels, two restrained indigo glows.
- **Hero "Application path" instrument panel:** a 4-stage process readout (Application received → Fit review → **Payment link — after acceptance** → Onboarding & diagnostic) with the payment step highlighted and a "No payment before acceptance" footer. It is framed as a **process, not a guarantee** — no fake automation, no acceptance promise.
- **The form sits on its own white "application surface"** inside a dark section with an Instrument header + helper copy. The intentional dark→white contrast reads as a clean, trustworthy form plate and keeps the existing form 100% unmodified (the brief explicitly allows a visual wrapper only).
- **Anchor CTAs, no heavy JS:** both "Start application" CTAs are `href="#application-form"`; the section has `id="application-form"` + `scroll-mt-24` so it lands below the sticky nav. Verified to scroll.
- **Gold:** not used on Apply (no review/seal moment here) — kept indigo-only, consistent with "gold only for credential/review moments."
- **Mobile typography/padding** match the other rebuilt pages (H1 `text-[2.15rem] → sm:text-4xl → md:text-5xl`; `py-16` mobile / `py-28` desktop).

## 4. Copy decisions

- **5-second clarity:** hero H1 "Apply with one real professional problem." + sub + trust line "No payment details required · Reviewed application · Pay only after acceptance." Payment timing repeats in the hero panel, the "After you apply" flow ("No payment is requested before acceptance."), the form header, and the reassurance cards.
- **Selective but not intimidating, premium but not arrogant:** "selective because the work is reviewed"; "You do not need to be technical. You do need to bring judgment, context, and a serious problem."
- **No overselling / no promises:** no guaranteed acceptance, no income/job/promotion/business claims, no academic accreditation or "university-level" language. The "Not a fit" panel explicitly lists "guaranteed job or income outcomes" and "paste confidential data."
- **Confidentiality reassurance** is prominent ("Do not include confidential client data," "redacted or fictionalized examples"), reinforcing the form's existing consent checkbox.
- **Core thread kept:** expertise + AI method → reviewed AI adoption work; proof via the existing sample dossier and public review standard.

---

## 5. CTA / link verification (browser + HTML)

| CTA / link | Target | Verified |
| --- | --- | --- |
| Hero + Final — Start application | `#application-form` (scrolls to form) | ✅ anchor present (×2), target id present, scroll confirmed |
| Hero + Proof + (sample links) — Preview sample dossier | `/samples/tenxpros-sample-dossier-excerpt.pdf` (new tab) | ✅ |
| Proof — Open HTML preview | `/samples/tenxpros-sample-dossier-excerpt.html` (new tab) | ✅ |
| Form — Submit application | `submitApplication` server action → `/apply/thank-you?id=...` | ✅ unchanged |
| Nav — The Method/The Dossier/Certification/Pricing/About | `/program` `/dossier` `/certification` `/pricing` `/about` | ✅ |

Route `/apply` unchanged; no routes added/removed.

---

## 6. Commands run and results

| Command | Result |
| --- | --- |
| `git status --short` (pre-edit) | clean (HEAD `f316631`) |
| `pnpm typecheck` | ✅ Pass (exit 0) |
| `pnpm test` | ✅ Pass — 5 files, 16 tests |
| `pnpm build` | ✅ Pass — `/apply` static (`○`, 30.4 kB form bundle), 59/59 pages |
| `node scripts/apply-qa-verify.mjs` | ✅ Exit 0 — 7/7 headings, 0px overflow, 0px trailing, footer flush, 14/14 fields, anchor works, menu verified |

---

## 7. Screenshots generated

Folder: `docs/design/apply-rebuild-round-1/` (10 required PNGs + `qa-measurements.json`)

- `apply-desktop-top.png` — hero + application-path panel
- `apply-desktop-flow.png` — "What happens after you apply" 4-step flow
- `apply-desktop-form.png` — form section (white application surface)
- `apply-desktop-proof.png` — sample dossier proof
- `apply-desktop-bottom.png` — fit panels + final CTA + footer
- `apply-mobile-top.png`, `-form.png`, `-proof.png`, `-bottom.png`
- `apply-mobile-menu-open.png` — full-screen hamburger menu

Folders **preserved** (not deleted): `dossier-polish-round-2/`, `home-rebuild-round-1/`, `pricing-rebuild-round-1/`.

---

## 8. Mobile QA results (390px)

| Check | Result |
| --- | --- |
| Horizontal overflow | **0px** |
| Trailing blank after footer | **0px** |
| Footer flush | ✅ 9503 → 9788 (= scrollHeight) |
| Section headings visible + in-doc | ✅ 7/7 |
| Form renders (14 fields + submit) | ✅ |
| `#application-form` anchor scroll | ✅ |
| Mobile menu covers viewport | ✅ `elementFromPoint(195,400)` = menu `<nav>` |

(Desktop: scrollHeight 6581px, 0px overflow, 0px trailing, footer flush 6416→6581, 7/7 headings.) The largest heading gap is the form section itself (the tall white form card) — content, not blank.

---

## 9. Was any app logic touched?

**No.** Only the Apply page and a new presentational marketing component were added/edited, plus QA tooling. No server actions, auth, Prisma/database/migrations, admin, participant portal, payment/enrollment logic, routes, or the application form's fields/validation/submission. The form's data collection and `submitApplication` behavior are byte-for-byte the same.

---

## 10. Caveats

- **The submit button inside the form stays navy** (the form component's existing accent) rather than indigo, because the form is intentionally unmodified. All page-level CTAs are indigo; the navy submit lives on the white form surface where it reads correctly. Changing it would require editing the form component — out of scope.
- **White form on a dark page** is a deliberate contrast (a clean "application surface"); if a fully-dark form is wanted later, it would mean restyling `application-form.tsx` / `form-fields.tsx` (a separate, larger change).
- **Shared nav/footer reach:** unchanged and identical to the other rebuilt pages.
- **Full-page screenshots intentionally not generated** (tall dark-theme downscaling artifact); segmented shots are the source of truth.

---

## 11. Final `git status --short`

```
 M app/src/app/(public)/apply/page.tsx
?? app/scripts/apply-qa-verify.mjs
?? app/src/components/marketing/apply-instrument.tsx
?? docs/design/TENXPROS_APPLY_REBUILD_ROUND_1_REPORT.md
?? docs/design/apply-rebuild-round-1/
```
No commit was made (not instructed). `apply-instrument.tsx` is a new build-required file (imported by `/apply`) to `git add` in the next checkpoint commit, alongside this report, the QA script, and the screenshot folder.
