# TenXPros — Home Rebuild Round 1 Report

**Task:** Rebuild the public Home page (`/`) into the 7-section structure using the same "The Instrument" visual language as the rebuilt Dossier page.
**Date:** 2026-06-07
**Status:** Complete. typecheck / test / build green. QA green on desktop (1440) and mobile (390) — all headings visible, footer flush, 0px horizontal overflow, 0px trailing blank.

---

## 0. Git status check (required) — untracked files

`git status --short` at task start showed these **untracked but build-required** files. They must be `git add`-ed before any merge/deploy:

| File | Status | Imported by | Required because |
| --- | --- | --- | --- |
| **`app/src/components/marketing/dossier-instrument.tsx`** | `??` untracked | `app/src/app/(public)/dossier/page.tsx` | The live Dossier route won't compile without it. **Add to git before merge/deploy.** |
| **`app/src/lib/authz.ts`** | `??` untracked | `app/src/lib/actions/admin.ts`, `applications.ts` | Defines `requireAdminUser()` — the admin authorization guard (security hardening). Build **and** the auth check break without it. **Add to git before merge/deploy.** |

Other untracked-but-required files (same risk, flagged for completeness): `app/src/components/marketing/home-instrument.tsx` (imported by `/` — touched in this task), `app/src/components/marketing/sample-dossier-preview.tsx` (pricing/apply), `app/public/` (the sample-dossier assets), `app/tests/security-hardening.test.ts`, `SECURITY_HARDENING_REPORT.md`.

No git operation that could remove untracked files was run (no clean/reset/checkout) — only file edits.

---

## 1. Files changed

| File | Type | Change |
| --- | --- | --- |
| `app/src/app/(public)/page.tsx` | Modified | Composition reduced to the requested 7 sections (Certification moved before Audience; Sample-Proof and Founder-Band dropped from the page). |
| `app/src/components/marketing/home-instrument.tsx` | Modified | Shift headline copy; Certification → "Reviewed work, not attendance." with the Dossier-style gold criteria panel; Final CTA headline + label; mobile typography/padding tuning to match the Dossier page. `HomeSampleProof` / `HomeFounderBand` kept defined (not deleted) but no longer composed. |
| `app/scripts/home-qa-verify.mjs` | New | QA + screenshot tooling (segmented captures, mobile-menu capture, DOM sanity checks). Not part of the app bundle. |

**Shared nav/footer were reused unchanged** — they were already polished in Dossier Polish Round 2 (new labels, indigo CTA, full-screen mobile menu, "expertise" brand line). This task did not modify them.

---

## 2. Design decisions

- **Same Instrument language as Dossier:** base `#070B14`, panels `#0B1120`, hairline `border-white/10`, indigo accent, JetBrains-Mono labels, restrained indigo glows (hero + final CTA), no stock imagery.
- **Cool indigo for all actions:** hero CTA, final CTA, and the shared nav CTA are indigo. The hero's secondary "Preview sample dossier" is the outline variant.
- **Gold only for the credential moment:** the Review-Standard / Certification section uses gold for the eyebrow, the "Certified" outcome card, and the gold-check criteria panel — identical treatment to the Dossier review-standard, so the two pages read as one system. No gold on any action.
- **Mobile typography tuning (matches Dossier):** hero H1 `text-[2.15rem] → sm:text-4xl → md:text-6xl`; hero body `text-base → sm:text-lg`; section vertical padding `py-16` mobile / `py-28` desktop. Large premium headings preserved; less vertical sprawl.
- **Hero instrument visual** retained: the real sample-dossier cover framed with the Frame/Design/Prove/Foresee readout, a `Reviewed` chip, and `Verified credential / Public review rubric` metadata.

## 3. Content decisions (against the requested structure)

1. **Hero** — eyebrow "You bring the expertise. We bring the AI method."; H1 "Lead AI adoption in your field. Don't just use AI."; sub = 12-week selective certification → reviewed Living AI Solution Dossier; CTAs **Apply for Founding Charter** (`/apply`) + **Preview sample dossier** (PDF); trust line "Apply first. Pay only after acceptance."; quick facts (12 guided weeks · 4-phase method · 1 reviewed dossier · Verifiable credential).
2. **The Shift** — "Most professionals are using AI. **Few can lead its adoption.**" (updated to the requested wording).
3. **What you build** — "Eight assets. One defensible dossier." (8-asset grid).
4. **The TenX Method** — "Frame. Design. Prove. Foresee." (four phase cards + week ranges).
5. **Review standard / Certification** — "**Reviewed work, not attendance.**" + a new one-line lede, the three outcomes (Certified / Strong draft / Completed), and the eight review criteria in a gold panel. *(This is the section captured as the `*-proof.png` screenshots.)*
6. **Who this is for / not for** — two-column for/not-for (confirmed rendering in the DOM).
7. **Founding Charter CTA** — "**Bring one real problem. Leave with reviewed evidence.**" + apply-first/pay-after-acceptance body; CTAs **Apply for Founding Charter** (`/apply`) + **View pricing** (`/pricing`).

The standalone Sample-Dossier-Proof section and the Founder-credibility band from the prior Home are **not** in the requested 7-section structure, so they were dropped from the page. The proof artifact stays linked via the hero's "Preview sample dossier" CTA and the hero instrument visual; both component definitions remain in the file for easy re-add.

---

## 4. CTA / link verification

Verified against the served HTML (`/`):

| CTA / link | Target | Present |
| --- | --- | --- |
| Hero primary — Apply for Founding Charter | `/apply` | ✅ |
| Hero secondary — Preview sample dossier | `/samples/tenxpros-sample-dossier-excerpt.pdf` (new tab) | ✅ |
| Final CTA primary — Apply for Founding Charter | `/apply` | ✅ |
| Final CTA secondary — View pricing | `/pricing` | ✅ |
| Nav — The Method / The Dossier / Certification / Pricing / About | `/program` `/dossier` `/certification` `/pricing` `/about` | ✅ |
| Nav CTA + mobile compact CTA | `/apply` | ✅ |
| Footer + mobile menu — How it works, Login | `/how-it-works`, `/login` | ✅ |

Route `/` is unchanged. No routes added/removed. (`/apply` ×4, `/pricing` ×3, sample PDF ×2 — counts consistent with the components rendered; the mobile-menu links render client-side on open.)

---

## 5. QA results

| Check | Desktop (1440×900) | Mobile (390×844) |
| --- | --- | --- |
| Section headings visible + in-doc | ✅ 6/6 | ✅ 6/6 |
| Footer present & flush | ✅ 4532 → 4697 | ✅ 7280 → 7565 |
| **Horizontal overflow** | ✅ **0px** | ✅ **0px** |
| **Trailing blank after footer** | ✅ **0px** | ✅ **0px** |
| `scrollHeight` | 4697px | 7565px |
| Largest heading gap | 1401px (the Audience for/not-for section, no `<h2>`) | 2316px (same) — confirmed content via DOM, not blank |
| Mobile menu covers viewport (no bleed-through) | n/a | ✅ `elementFromPoint(195,400)` = menu `<nav>` |

Raw metrics: `docs/design/home-rebuild-round-1/qa-measurements.json`.

---

## 6. Screenshots generated

Folder: `docs/design/home-rebuild-round-1/`

- `home-desktop-top.png` — hero
- `home-desktop-method.png` — TenX Method
- `home-desktop-proof.png` — Review standard / Certification (gold)
- `home-desktop-bottom.png` — final CTA + footer
- `home-mobile-top.png` — hero
- `home-mobile-menu-open.png` — full-screen hamburger menu
- `home-mobile-proof.png` — Review standard / Certification
- `home-mobile-bottom.png` — final CTA + footer

(Full-page captures were intentionally not generated — they downscale into apparent black bands on tall dark pages, a confirmed artifact in the Dossier QA round; segmented shots are the source of truth.)

---

## 7. Commands run and results

| Command | Result |
| --- | --- |
| `git status --short` | ✅ Ran; untracked-file risks reported (§0) |
| `pnpm typecheck` | ✅ Pass |
| `pnpm test` | ✅ Pass — 5 files, 16 tests |
| `pnpm build` | ✅ Pass — `/` static, 59/59 pages |
| `node scripts/home-qa-verify.mjs` | ✅ Exit 0 — 6/6 headings, 0px overflow, 0px trailing, footer flush, menu verified |

---

## 8. Was any app logic touched?

**No.** Only the Home page and its presentational marketing component were edited, plus QA tooling. No server actions, auth, Prisma/database, admin, participant portal, application, payment, or enrollment logic. The Dossier page was not modified (it only shares the already-polished nav/footer). The `admin.ts`/`applications.ts` modifications in `git status` predate this task.

---

## 9. Caveats

- **Sample-Proof & Founder-Band dropped from the page** to match the explicit 7-section structure. Both components remain defined in `home-instrument.tsx`; the proof artifact is still reachable from the hero. Re-add to the page if you want them back.
- **Shared-component reach:** the nav/footer (reused here) still render on the other, still-light pages (Pricing/Apply/Program/Certification/About) pending their own rebuilds.
- **Full-page screenshots not produced** (see §6) — by design.
- **Screenshot-folder cleanup:** per the standing rule, the previous screenshot folder `dossier-polish-round-2/` was deleted and only `home-rebuild-round-1/` is kept. As a result, the Dossier reports' image links are now stale (consistent with the prior accepted cleanup behavior). `.md` reports were not deleted.

---

## 10. Git status summary

- **Modified (this task):** `app/src/app/(public)/page.tsx`, `app/src/components/marketing/home-instrument.tsx`.
- **New (this task):** `app/scripts/home-qa-verify.mjs`, `docs/design/home-rebuild-round-1/*`, this report.
- **Pre-existing modified (not from this task):** `(public)/about|apply|dossier|pricing|program/page.tsx`, `components/shared/footer.tsx`, `components/shared/public-nav.tsx`, `components/marketing/marketing-sections.tsx`, `lib/actions/admin.ts`, `lib/actions/applications.ts`, `(participant)/portal/layout.tsx`.
- **⚠️ Required untracked — must `git add` before merge/deploy:** `app/src/lib/authz.ts`, `app/src/components/marketing/dossier-instrument.tsx`, `app/src/components/marketing/home-instrument.tsx`, `app/src/components/marketing/sample-dossier-preview.tsx`, `app/public/` (sample assets), `app/tests/security-hardening.test.ts`.
