# TenXPros — Final Product Polish Sprint Report

**Scope:** Presentational marketing copy/UX + legal-copy + one sample-asset print-CSS hardening. No backend/application logic.
**Base:** `23f6d07` (live site at `6bd2232`). **Not committed, deployed, or pushed.**
**Status:** typecheck / test / build green; local route + content + form + mobile checks pass; claims clean.

---

## 1. Files changed (13)

| File | Change | Item(s) |
| --- | --- | --- |
| `app/src/components/marketing/about-instrument.tsx` | Principles grid fixed (6 + 1 full-width) + positive headline; founder section made more human + integrated LinkedIn; quiet boundary line added to Trust. | 1,2,5,9 |
| `app/src/app/(public)/about/page.tsx` | Removed the prominent "What it is not" section (boundary now quiet, in Trust). | 2,9 |
| `app/src/components/marketing/certification-instrument.tsx` | New "Milestones, ranks, and the final credential" section (real rank/capstone data). | 4 |
| `app/src/app/(public)/certification/page.tsx` | Added `CertMilestones`; removed the prominent "What it is not" section. | 2,4,9 |
| `app/src/components/marketing/apply-instrument.tsx` | Compact single pre-form panel; premium frame around the form. | 6,9 |
| `app/src/app/(public)/apply/page.tsx` | Form moved up (right after hero); dropped repetitive Strong/Reassurance/Fit sections. | 6,9 |
| `app/src/components/marketing/pricing-instrument.tsx` | Removed "first 10 accepted members" (×4) → capacity-window framing; positive value headline. | 2,3 |
| `app/src/app/(public)/pricing/page.tsx` | Metadata: "first 10 accepted members" → capacity-window framing; `$997 USD`. | 3 |
| `app/src/components/marketing/home-instrument.tsx` | Final CTA "first 10 members" → capacity-window framing. | 3 |
| `app/src/components/marketing/program-instrument.tsx` | "This is not a prompt library." → "Built to hold up to review." | 2 |
| `app/src/app/(public)/terms/page.tsx` | Added "Deadlines, extensions, and resubmission" (one reasonable extension; admin/review fee for extra cycles). | 7 |
| `app/src/app/(public)/refund/page.tsx` | Added "Statutory rights and cooling-off" (EU/UK 14-day, explicit consent during withdrawal). | 7 |
| `app/public/samples/tenxpros-sample-dossier-excerpt.html` | Print-CSS hardening: `orphans/widows` + heading `break-after:avoid` (for future PDF regenerations). | 8 |

**Not touched:** `application-form.tsx`, the zod schema, the submit action, auth, Prisma/DB/migrations, admin, participant portal, payment/enrollment logic.

---

## 2. Design / UX fixes

- **Item 1 — incomplete grid:** the About "Principles" 7-item grid (which left empty cells in a 3-col layout) is now **6 cards + 1 full-width final card** (`sm/lg:col-span` on the last item) — no empty cells, balanced on all breakpoints.
- **Item 6 — Apply page:** the **form now sits directly under the hero** (was 4th section). The "Before you apply" + "What the form asks" content is collapsed into **one compact two-column panel** (shorter, tighter), and the form is wrapped in a **premium indigo-tinted frame** (border + ring + shadow). Repetitive "Strong applications," "Before you submit," and "Good fit / Not a fit" sections were removed.
- **Item 9 — compression:** Apply dropped 3 repetitive sections; About and Certification each dropped a standalone "What it is not" section. Proof-critical content is preserved everywhere (sample dossier, review criteria, review outcomes, pay-after-acceptance, confidentiality warning).

## 3. Copy / positioning fixes (item 2)

- Reframed high-conversion headlines positively: Pricing value "…is not a video course" → **"What your Founding Charter builds."**; Program "This is not a prompt library." → **"Built to hold up to review."**; About principles "What we will not compromise." → **"The principles we hold to."**
- Removed the two standalone **"What TenXPros is not"** sections (About, Certification). Boundaries are retained where useful but **quieter and later** — the About Trust section ends with a small boundary line, and the Certification and Pricing FAQs still answer "Is this a university certificate?".

## 4. Founding-window framing (item 3)

All public "first 10 accepted members" / "first 10 members" copy (7 occurrences across Pricing, Home, and Pricing metadata) replaced with capacity-window language: **"limited founding review-capacity window," "open while founding review capacity remains," "Limited founding review-capacity window."** No seat counter, no fabricated urgency. **$997 USD Founding Charter price kept.** The existing "review is manual and capacity is intentionally constrained" note remains.

## 5. Policy / refund / deadline changes (item 7)

- **Terms** now states participants follow module/dossier deadlines; **one reasonable extension or resubmission** may be granted; additional missed deadlines / repeated resubmissions / extra review cycles may require an **administrative or review fee** (capacity is reserved).
- **Refund** now adds **statutory rights & cooling-off**: statutory consumer rights may still apply by jurisdiction; for **EU/UK-style 14-day withdrawal**, starting access/review during the withdrawal period requires **explicit consent** and acknowledgment that it may affect refund rights.
- Existing rules retained: certification not guaranteed; refund eligibility limited once access/diagnostic/materials/review begin. No "no refunds ever," no claim that this is final legal advice. Suitable for later legal review.

## 6. Badge / rank visibility added (item 4)

New Certification section **"Milestones, ranks, and the final credential"** using the actual `program-data` badge/rank data:
- **11 module milestones** — earned through submitted work, not attendance.
- **3 ranks** reflecting phase progress: **AI-Ready Professional** (Frame), **AI Problem Solver & Solution Designer** (Design), **Future-Ready AI Solution Designer** (Prove · Foresee).
- **Certified TenXPro Capstone Seal** (gold) — belongs to certified dossier work; verification confirms metadata without exposing confidential work.
- **No public-directory-visibility promise** was added (that requires certification + opt-in).

## 7. About founder changes (item 5)

The founder block now explains **why** TenXPros was created (AI adoption became professional judgment work), names **Mehrdad Naderi as the creator/architect** of the method and review standard, states his **professional focus** (AI adoption, professional learning, human–AI collaboration, AI training, product thinking), and links his **public LinkedIn** once (de-duplicated). Founder remains a trust layer, not the headline advantage. **No** unsupported numbers, logos, degrees, awards, or affiliations were added (the removed "DeepLearning.AI Ambassador / 19,000 hours" copy stays removed).

## 8. Apply page improvements (item 6)

Form moved to the top; compact pre-form panel; premium form frame; load-failure fallback (`hello@tenxpros.com`) retained. **All 14 fields, labels, validation, and the submit action are unchanged** (verified 14/14 + submit post-hydration). "No payment details required" and the confidentiality warning remain clearly visible.

## 9. Dossier PDF action taken (item 8)

- **Inspected:** the live PDF is valid — `%PDF-1.4`, **11 pages**, A4, rendered by Chromium/Skia, 465,633 bytes (non-empty).
- **Source review:** the HTML print CSS already implements the requested safeguards — `.sec-head { break-after:avoid; break-inside:avoid }` (×25, prevents stranded section headings), `.note/.panel/.block { break-inside:avoid }` (prevents orphan reviewer-note headers), `tr { break-inside:avoid }` + `thead { break-after:avoid }` (prevents broken table rows).
- **Hardening added** to the HTML source: `orphans:3; widows:3;` on paragraphs/list-items and an extra `break-after:avoid` on headings/note-headers — for **future** regenerations.
- **PDF NOT regenerated** this sprint (honest note, no faked success): the documented generator (`scripts/generate-sample-dossier-pdf.mjs`) relies on an AppArmor-confined snap Chromium that is not reliably runnable here, and re-rendering with a different headless Chromium risks altering the original's carefully-crafted typography. The current 11-page PDF already reflects the robust break rules; **no broken pagination was introduced.**
- **Recommendation:** a human visual proofread of the 11-page PDF before print distribution; if specific stranded-heading examples are found, regenerate via the documented script in a controlled environment (the source CSS now includes orphans/widows).

## 10. Tests run and results

| Command | Result |
| --- | --- |
| `pnpm typecheck` | ✅ Pass (exit 0) |
| `pnpm test` | ✅ Pass — 5 files, 16 tests |
| `pnpm build` | ✅ Compiled successfully |
| Local route check (13 routes/assets) | ✅ all 200 |
| Item-by-item content checks (22) | ✅ all pass |
| Apply form (post-hydration) | ✅ 14/14 fields + submit present |
| Mobile (390px: about, apply, certification, pricing) | ✅ 0px overflow, footer flush, 0 broken images, menu opens/closes |
| Claims sweep | ✅ no DeepLearning / 19,000 / founder-led / $10,000 / blockchain / guaranteed-income / testimonials |

## 11. Remaining caveats

- **Sample PDF not regenerated** (see §9) — the live PDF is unchanged and valid; the orphans/widows hardening benefits only future regenerations. A human proofread is recommended before print distribution.
- **Unused exports retained:** `AboutNot`, `CertNot`, `ApplyStrong`, `ApplyReassure`, `ApplyAudience` remain defined in their files but are no longer composed (kept to avoid churn; easy to delete or re-add later).
- **Legal copy** is conservative and suitable for later legal review (no claim of final legal advice; no "no refunds ever").
- **Tablet nav (768–1023px)** still uses the hamburger menu (functional; unchanged) — flagged in the prior sprint for real-device QA.
- Not committed, pushed, or deployed (per instructions).

## 12. Final `git status --short`

```
 M app/public/samples/tenxpros-sample-dossier-excerpt.html
 M app/src/app/(public)/about/page.tsx
 M app/src/app/(public)/apply/page.tsx
 M app/src/app/(public)/certification/page.tsx
 M app/src/app/(public)/pricing/page.tsx
 M app/src/app/(public)/refund/page.tsx
 M app/src/app/(public)/terms/page.tsx
 M app/src/components/marketing/about-instrument.tsx
 M app/src/components/marketing/apply-instrument.tsx
 M app/src/components/marketing/certification-instrument.tsx
 M app/src/components/marketing/home-instrument.tsx
 M app/src/components/marketing/pricing-instrument.tsx
 M app/src/components/marketing/program-instrument.tsx
```
HEAD unchanged at `23f6d07`. 13 files modified (presentational/legal/sample-asset only). Application form fields/schema/submit and all app logic untouched. No commit, push, or deploy.
