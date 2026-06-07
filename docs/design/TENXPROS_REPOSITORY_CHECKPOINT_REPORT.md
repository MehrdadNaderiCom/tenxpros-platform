# TenXPros — Repository Safety Checkpoint Report

**Purpose:** Before moving to the Pricing rebuild, confirm that every required file from security hardening, the sample dossier asset, the Dossier rebuild, the Home rebuild, the shared nav/footer polish, and QA tooling is tracked or stage-ready and cannot be lost before merge/deploy.
**Date:** 2026-06-07
**Result:** ✅ **PASSED** — build is green with the current working tree; no required file is missing; all required code lives on disk and is git-addable (nothing gitignored). Action needed: `git add` the untracked required files (and commit) before merge/deploy.

> Read-only checkpoint: no UI changed, no page rebuilt, no server logic touched, **no files or folders deleted**, and no `git clean` / `git reset` / destructive checkout was run.

---

## 1. Full current git status (`git status --short`)

**Modified (tracked):**
```
 M app/src/app/(participant)/portal/layout.tsx
 M app/src/app/(public)/about/page.tsx
 M app/src/app/(public)/apply/page.tsx
 M app/src/app/(public)/dossier/page.tsx
 M app/src/app/(public)/page.tsx
 M app/src/app/(public)/pricing/page.tsx
 M app/src/app/(public)/program/page.tsx
 M app/src/components/marketing/marketing-sections.tsx
 M app/src/components/shared/footer.tsx
 M app/src/components/shared/public-nav.tsx
 M app/src/lib/actions/admin.ts
 M app/src/lib/actions/applications.ts
```
**Untracked (`??`):**
```
?? SECURITY_HARDENING_REPORT.md
?? TENXPROS_SAMPLE_DOSSIER_EXCERPT_V2_PUBLIC_READY.md
?? app/public/                                              (5 sample-dossier asset files)
?? app/scripts/dossier-qa-verify.mjs
?? app/scripts/dossier-rebuild-screenshots.mjs
?? app/scripts/home-qa-verify.mjs
?? app/scripts/home-rebuild-screenshots.mjs
?? app/src/components/marketing/dossier-instrument.tsx
?? app/src/components/marketing/home-instrument.tsx
?? app/src/components/marketing/sample-dossier-preview.tsx
?? app/src/lib/authz.ts
?? app/tests/security-hardening.test.ts
?? docs/design/
?? docs/reports/                                            (prior sprint evidence)
?? scripts/                                                 (scripts/generate-sample-dossier-pdf.mjs)
```
**Deleted (tracked):** none (`git status` shows no `D` — no required file was removed from the working tree).

`.gitignore` review: neither the root nor `app/.gitignore` ignores any required path. `git check-ignore` on `app/public`, `authz.ts`, `dossier-instrument.tsx`, `home-instrument.tsx`, and the security test returned nothing — **all are addable.**

---

## 2. Required untracked files that MUST be added before merge/deploy

| File | Why required |
| --- | --- |
| **`app/src/lib/authz.ts`** | Admin authorization guard (`requireAdminUser`); imported by two server actions. |
| **`app/src/components/marketing/dossier-instrument.tsx`** | The entire `/dossier` page body; imported by its route. |
| **`app/src/components/marketing/home-instrument.tsx`** | The entire `/` (Home) page body; imported by its route. |
| **`app/src/components/marketing/sample-dossier-preview.tsx`** | Sample-dossier block; imported by `/pricing` and `/apply`. |
| **`app/public/samples/*` (5 files)** | The sample-dossier PDF/HTML/cover/snapshot/rubric assets referenced by 3 components — would 404 at runtime if missing. |
| **`app/tests/security-hardening.test.ts`** | Security-authorization regression test; required for `pnpm test` to cover the hardening. |

Also strongly recommended (no build break, but accepted deliverables / tooling that would otherwise be lost): `SECURITY_HARDENING_REPORT.md`, `TENXPROS_SAMPLE_DOSSIER_EXCERPT_V2_PUBLIC_READY.md`, `app/scripts/*.mjs`, `scripts/generate-sample-dossier-pdf.mjs`, `docs/design/`, `docs/reports/`.

---

## 3. Files required by imports (build breaks if missing)

Verified by grep against the importers:

| Required file | Imported by | Missing → effect |
| --- | --- | --- |
| `app/src/lib/authz.ts` | `app/src/lib/actions/admin.ts`, `app/src/lib/actions/applications.ts` | **Build fails** (TS module not found); admin auth guard lost |
| `app/src/components/marketing/dossier-instrument.tsx` | `app/src/app/(public)/dossier/page.tsx` | **`/dossier` build fails** |
| `app/src/components/marketing/home-instrument.tsx` | `app/src/app/(public)/page.tsx` | **`/` build fails** |
| `app/src/components/marketing/sample-dossier-preview.tsx` | `app/src/app/(public)/pricing/page.tsx`, `app/src/app/(public)/apply/page.tsx` | **`/pricing` + `/apply` build fails** |
| `app/public/samples/*` (PDF/HTML/cover/snapshot/rubric) | `sample-dossier-preview.tsx`, `home-instrument.tsx`, `dossier-instrument.tsx` | Compiles, but links/images **404 at runtime** |

No other untracked source files exist under `app/src` (`git ls-files --others` returns exactly the four `.tsx`/`.ts` above), so the import-required untracked set is fully accounted for.

---

## 4. Files grouped by deliverable

**Security hardening**
- Untracked-new: `app/src/lib/authz.ts` ⚠️ required, `app/tests/security-hardening.test.ts`, `SECURITY_HARDENING_REPORT.md`
- Modified-tracked: `app/src/lib/actions/admin.ts`, `app/src/lib/actions/applications.ts`, `app/src/app/(participant)/portal/layout.tsx`

**Sample dossier asset**
- Untracked-new: `app/public/samples/*` (5 files) ⚠️ required, `app/src/components/marketing/sample-dossier-preview.tsx` ⚠️ required, `scripts/generate-sample-dossier-pdf.mjs`, `TENXPROS_SAMPLE_DOSSIER_EXCERPT_V2_PUBLIC_READY.md`

**Dossier page rebuild**
- Untracked-new: `app/src/components/marketing/dossier-instrument.tsx` ⚠️ required
- Modified-tracked: `app/src/app/(public)/dossier/page.tsx`

**Home page rebuild**
- Untracked-new: `app/src/components/marketing/home-instrument.tsx` ⚠️ required
- Modified-tracked: `app/src/app/(public)/page.tsx`

**Shared nav/footer polish**
- Modified-tracked: `app/src/components/shared/public-nav.tsx`, `app/src/components/shared/footer.tsx`, plus brand-line edits in `app/src/app/(public)/about/page.tsx`, `app/src/app/(public)/program/page.tsx`, `app/src/components/marketing/marketing-sections.tsx`

**QA / reporting tooling**
- Untracked-new: `app/scripts/{dossier-qa-verify,home-qa-verify,dossier-rebuild-screenshots,home-rebuild-screenshots}.mjs`, `docs/design/` (design reports + the current screenshot folder), `docs/reports/` (earlier-sprint evidence)

---

## 5. Exact recommended `git add` command(s)

**Minimum — everything required for a correct build, security, and runtime assets:**
```bash
git add app/src app/public/samples app/tests/security-hardening.test.ts
```
(`git add app/src` stages the four untracked source files plus all modified tracked source; `app/public/samples` stages the assets; the test stages the security regression.)

**Recommended full — also tooling, reports, and root docs so nothing is lost:**
```bash
git add app/src app/public app/tests app/scripts scripts docs \
        SECURITY_HARDENING_REPORT.md TENXPROS_SAMPLE_DOSSIER_EXCERPT_V2_PUBLIC_READY.md
```
Then review with `git status` and commit. *(Not executed in this checkpoint — staging/committing is left to you; I did not run `git add`.)*

---

## 6–9. Import confirmations (explicit)

6. **`app/src/lib/authz.ts` imported by `admin.ts` and `applications.ts`?** ✅ **Yes.**
   - `admin.ts:4` → `import { requireAdminUser as requireAdmin } from "@/lib/authz";`
   - `applications.ts:6` → `import { requireAdminUser } from "@/lib/authz";`
7. **`dossier-instrument.tsx` imported by `/dossier`?** ✅ **Yes** — `app/src/app/(public)/dossier/page.tsx:11` imports its section components from `@/components/marketing/dossier-instrument`.
8. **`home-instrument.tsx` imported by `/`?** ✅ **Yes** — `app/src/app/(public)/page.tsx:10` imports its section components from `@/components/marketing/home-instrument`.
9. **Sample assets under `app/public/` referenced by public pages?** ✅ **Yes** — `/samples/tenxpros-sample-dossier-*` is referenced by `sample-dossier-preview.tsx` (used on `/pricing`, `/apply`), `home-instrument.tsx` (`/`), and `dossier-instrument.tsx` (`/dossier`). All 5 files exist on disk.

## 10. No required file missing

✅ Confirmed three ways: (a) no `D` entries in `git status`; (b) `git ls-files --others` lists only the four expected untracked source files (no surprise gaps); (c) **the build chain passes** with the current working tree (below) — which it could not do if any imported file were missing.

---

## Build verification

| Command | Result |
| --- | --- |
| `pnpm typecheck` | ✅ Pass (exit 0) |
| `pnpm test` | ✅ Pass — 5 files, 16 tests (incl. `security-hardening.test.ts`) |
| `pnpm build` | ✅ Compiled successfully (exit 0) |

---

## Screenshot-retention rule — UPDATED

**New rule (supersedes the prior "keep only the latest folder" rule):** keep **one QA screenshot folder per page/sprint** under `docs/design/`:
- `docs/design/dossier-polish-round-2/`
- `docs/design/home-rebuild-round-1/`
- future `docs/design/pricing-rebuild-round-1/`
- future `docs/design/apply-rebuild-round-1/`

**Do not delete a previous page's QA folder when working on a new page.** Only delete an older folder **for the same page** when explicitly instructed. (Saved to project memory; the older "delete all previous" rule is retired.)

---

## Remaining risks

1. **⚠️ `docs/design/dossier-polish-round-2/` no longer exists.** It was deleted during the Home work under the *old* retention rule, before this corrected rule was set. Nothing in the build depends on it, but the Dossier QA report's image links are now broken. **Offer:** I can regenerate it (re-run the Dossier QA screenshot script — no page rebuild, no code change) on request.
2. **Required files are untracked, not yet committed.** Until the `git add` (+ commit) in §5 is run, a stray `git clean -fdx` or a fresh checkout would lose them. This checkpoint did not stage or commit anything.
3. **Modified server-action/security files are uncommitted** (`admin.ts`, `applications.ts`, `portal/layout.tsx`). They are tracked (so visible to git) but their hardening changes are unsaved to history — include them in the commit.
4. The earlier-sprint evidence under `docs/reports/` and the two root `.md` deliverables are untracked; add them if they should be preserved in history.
