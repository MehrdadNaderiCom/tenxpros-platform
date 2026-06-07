# TenXPros — Proof & Conversion Anchor Patch Sprint 2 Report

**Scope:** Presentational marketing + one new static sample asset. Strengthens proof, review authority, verification example, pricing clarity, mobile sample access, and buyer confidence — with **no fabricated proof**.
**Base:** `88fbf2d` (live site at `7d3299a`). **Not committed, deployed, or pushed.**
**Status:** typecheck / test / build green; local route + content + claims checks pass.

---

## 1. Files changed (7 + this report)

| File | Change | Item(s) |
| --- | --- | --- |
| `app/public/samples/tenxpros-sample-verification.html` | **New** — illustrative, `noindex` verification example (fictional Maya R., TENX-SAMPLE-0000, clearly "not a real credential"). | 3 |
| `app/src/components/marketing/about-instrument.tsx` | Founder block: added "Created by Mehrdad Naderi. Read his public profile." → LinkedIn. | 1 |
| `app/src/components/marketing/certification-instrument.tsx` | "Who reviews the dossier?" callout; "View illustrative verification example" link + operating-standard verification wording; sample CTA → HTML-first. | 2,3,4,7 |
| `app/src/components/marketing/pricing-instrument.tsx` | USD on prices; tier descriptions; review-capacity scarcity framing; sample CTA HTML-first; buyer-use bridge paragraph. | 5,6,7,9 |
| `app/src/components/marketing/dossier-instrument.tsx` | "Living means…" clarification; sample CTA HTML-first. | 8,7 |
| `app/src/components/marketing/program-instrument.tsx` | Sample CTA HTML-first. | 7 |
| `app/src/components/marketing/apply-instrument.tsx` | Sample CTA HTML-first. | 7 |

No server actions, auth, Prisma/DB/migrations, admin, portal, payment/enrollment, application-form fields/schema/submit, or real verification logic were touched. **`public-nav.tsx` was inspected but not changed** (see Caveats).

---

## 2. Founder credibility anchor (item 1)

About founder block now reads: *"Created by Mehrdad Naderi. **Read his public profile**."* linking to `https://www.linkedin.com/in/mehrdad-naderi/` (task-provided). **No** DeepLearning.AI / 19,000 / sector claims were restored (none exist in the repo). Live `/about` confirms `DeepLearning.AI` and `19,000` remain **absent**.

## 3. Reviewer / review-authority wording (item 2)

New **"Who reviews the dossier?"** callout in the certification review-mechanics section, verbatim safe copy: review by the **TenXPros review team and program architect** against the eight public criteria; human-led, section-specific, evidence-based; additional reviewers may be added under the same standard as the program grows. **No** board/panel implied, **no** external accreditation, **no** certification guarantee.

## 4. Verification example (item 3) + wording (item 4)

- New `tenxpros-sample-verification.html` — an Instrument-styled, **clearly-labeled illustrative** verification page: a top banner and disclaimer ("This is an illustrative example. It is not a real credential and does not verify a real participant."), fictional recipient **Maya R.**, credential **Certified TenXPro**, status **Illustrative — not a real credential**, issue date **Illustrative**, code **TENX-SAMPLE-0000**, `meta robots noindex`.
- Linked from Certification as **"View illustrative verification example"**.
- Operating-standard wording present: *"When a credential is earned, verification confirms credential metadata without exposing the dossier."* No implication that real credentials have been issued. **No** real `/verify/[code]` logic, DB record, or badge was created.

## 5. Pricing tier / USD changes (item 5) + scarcity framing (item 6)

- **USD** added: hero readout `$997 USD`, Founding card `$997 USD`, and every ladder row (`$1,247 USD … $1,997 USD`).
- **Tier descriptions** added: Early "Opens after Founding Charter closes," Late "Opens after Early Charter closes," Final "Opens after Late Charter closes," Standard "Ongoing entry point after charter windows." (Founding: "Open now — the first 10 accepted members.") The ladder intro already states the structure stays the same as the founding window closes.
- **Scarcity reframed as capacity:** "The founding window is limited because dossier review is manual and capacity is intentionally constrained — not as a pressure tactic." **No** seat counter added (no real backend source of truth). **No** invented standard/corporate rate.

## 6. Sample dossier CTA changes (item 7)

In the five dedicated proof sections (Dossier, Pricing, Program, Apply, Certification), the sample CTA pair is now **HTML-first**: primary **"Preview in browser"** (`…excerpt.html`) + secondary **"Download PDF"** (`…excerpt.pdf`). The PDF is retained; no sample links were broken. (Single hero/final "Preview sample dossier" CTAs were left as-is to avoid an over-broad sweep — the proof sections give the mobile-friendly browser option.)

## 7. "Living" dossier clarification (item 8)

Added on `/dossier` under the hero: *"**Living** means the dossier is designed to be updated as your workflow, evidence, risks, and adoption context evolve."* No lifetime-review or renewal promise.

## 8. Buyer-use / ROI bridge (item 9)

Added to Pricing ("What you pay for"): *"Professionals use the dossier to explain AI adoption decisions to clients, leadership, and teams — not as a promise of outcomes, but as reviewed work they can stand behind…"* **No** promotion/revenue/job/client-win/ROI/impact claim.

---

## 9. Tests run and results

| Command | Result |
| --- | --- |
| `pnpm typecheck` | ✅ Pass (exit 0) |
| `pnpm test` | ✅ Pass — 5 files, 16 tests |
| `pnpm build` | ✅ Compiled successfully |
| Local `next start -p 3011` route check | ✅ all 7 pages + 3 sample assets **200** |
| Local content verification | ✅ all 10 patch items present/correct |

## 10. Claims-safety notes

Local sweep across the 7 public pages: **no** `DeepLearning`, `19,000`, `founder-led`, `Often $10,000`, `blockchain`, `guaranteed income`. Two matches, **both negations** (safe):
- "guaranteed job" → Home/Apply "not for / not a fit" disclaimers.
- "accreditation body" → Pricing FAQ "…not from an accreditation body" (disclaiming accreditation).

The new verification asset is explicitly illustrative; the LinkedIn link is the only new outbound proof anchor (a public profile, not a credential/endorsement claim).

## 11. Remaining caveats

- **Tablet nav (item 10):** unchanged. At md (768–1023px) the nav uses the full-screen hamburger menu (functional, verified). Switching inline links to `md:flex` would crowd 5 links + Login + the Apply button on a ~768px row, so it was **not** forced — flagged for real-device tablet QA before any change.
- **Single hero/final sample CTAs** still say "Preview sample dossier" → PDF (only the dedicated proof sections were switched to HTML-first). Can be unified in a later pass if desired.
- Legal pages remain light-themed (out of scope, from prior sprint).
- Not deployed/committed/pushed (per instructions).

## 12. Final `git status --short`

```
 M app/src/components/marketing/about-instrument.tsx
 M app/src/components/marketing/apply-instrument.tsx
 M app/src/components/marketing/certification-instrument.tsx
 M app/src/components/marketing/dossier-instrument.tsx
 M app/src/components/marketing/pricing-instrument.tsx
 M app/src/components/marketing/program-instrument.tsx
?? app/public/samples/tenxpros-sample-verification.html
?? docs/design/TENXPROS_PROOF_CONVERSION_PATCH_2_REPORT.md
```
HEAD unchanged at `88fbf2d`. 6 components modified + 1 new sample asset + 1 report. No commit, deploy, or push.
