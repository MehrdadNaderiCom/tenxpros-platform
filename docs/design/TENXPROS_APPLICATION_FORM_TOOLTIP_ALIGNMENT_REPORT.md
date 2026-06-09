# TenXPros — Application Form Tooltips + Alignment Report

**Date:** 2026-06-09 · branch `deployment/production-deployment-sprint-a` (HEAD `6717de2`)
**Scope:** Make the `/apply` form visually uniform and add accessible per-field tooltips, after the previous clarity sprint left grid rows uneven. **No schema/migration. No env/DB/email/payment/application/pricing change. No marketing dashboard.**
**Outcome:** ✅ Implemented, QA-clean (typecheck + 61 tests + build), and visually verified with local Playwright screenshots (desktop / tooltip-open / mobile).

---

## 1. What was changed

### New component — `app/src/components/ui/form-field.tsx`
A self-contained, dependency-free client component used only by the application form:
- **`Field`** — uniform field structure: a single-line label row (with an optional `(optional)` tag and an info tooltip), an optional always-visible description, the control, and the error. Every field has the same vertical rhythm and the control is bottom-aligned within grid cells, so **grid rows line up cleanly**.
- **`InfoTip`** — an accessible `ⓘ` button (lucide `Info`) that reveals a short description on **hover, keyboard focus, and tap** (works without a mouse), dismissible with `Escape`.

### `app/src/components/marketing/application-form.tsx` (rewritten to use `Field`)
- Helper text moved **out of variable-height blocks** and into the `ⓘ` tooltip for the short fields (this is what fixes the alignment); the two long free-text questions keep an always-visible description (full width, so no alignment impact).
- **Final micro-copy fix:** the visible label `AI familiarity in professional work` → **`AI familiarity`** (it was wrapping to two lines and unbalancing the 3-column row). The fuller explanation now lives in the tooltip: *"Your familiarity with AI in your professional work today. Pick the closest option — this tailors the program, it does not screen you out."* Persisted enum values are unchanged: `BEGINNER / INTERMEDIATE / ADVANCED`.
- **Data sensitivity:** each option now self-explains — `Low — public or general info`, `Moderate — internal business data`, `High — personal, financial, or client data`, `Critical — regulated (health, legal, gov)` — plus a neutral placeholder and **no default** (conscious choice).
- **Weekly availability:** closed the 8–12h gap → `About 2–5` / `About 6–10` / `More than 10 hours / week`.
- **AI familiarity:** ambiguous middle option clarified → `Use AI tools occasionally or regularly`; neutral placeholder, no default.
- **LinkedIn** marked `(optional)`; one-line note "All fields are required unless marked optional."
- **terms / privacy / refund** now hyperlinked (open in a new tab) in the consent checkbox.
- Slightly larger grid gap (`gap-5`) for cleaner spacing.

### `app/src/lib/validations/application.ts`
- Fixed label↔error mismatches: `professionalRole` → "Enter your role or job function."; `domain` → "Enter your field or industry."
- Friendly messages for the two now-required selects: `dataSensitivity` → "Select the closest level."; `timeAvailability` → "Select your weekly availability." (enum values unchanged).

## 2. Why helper text moved into tooltips
In the previous sprint, helper text was rendered as a block `<span>` inside some grid cells but not others. In a 2-column / 3-column grid this made cells different heights, so inputs sat at different vertical positions — the "uneven / messed-up" look. Moving the guidance into a zero-height `ⓘ` tooltip removes the height variance entirely, so every cell in a row is the same height and all inputs/selects align. Essential guidance for the two long-answer questions stays visible (those are full-width and don't affect alignment).

## 3. Accessibility improvements
- Explicit `htmlFor`/`id` association (previously implicit nesting), generated with `useId()`.
- Hint and error each have ids wired into the control's `aria-describedby`; controls get `aria-invalid` when in error.
- Errors render as `role="alert"` (announced to screen readers) instead of color-only text — fixes a WCAG "use of color" gap. The top-level submit error is also `role="alert"`.
- The tooltip trigger is a real `<button type="button">` (keyboard-focusable, tappable on touch), with an `aria-label` and `aria-expanded`; the popover is `role="tooltip"`. No new dependencies.

## 4. Visual verification (local Playwright, production build on :3010)
Reviewed three screenshots:
- **Desktop (1280px):** "Professional context" (2-col) and "Program fit" (3-col) rows are even; all inputs/selects align; `ⓘ` icons sit by every label; `(optional)` on LinkedIn; neutral select placeholders.
- **Tooltip-open:** the `ⓘ` popover renders as a clean white card (verified on "AI familiarity").
- **Mobile (390px):** single-column, uniform, readable, not cramped; consent links visible.

Checklist confirmed: no uneven rows · inputs/selects aligned · tooltip opens cleanly · mobile readable · LinkedIn optional · Data sensitivity explanatory copy · neutral placeholders · consent links visible.

## 5. QA results
| Check | Result |
|---|---|
| `pnpm typecheck` | PASS (exit 0) |
| `pnpm test` | PASS — 9 files, **61/61** |
| `pnpm build` | PASS — "Compiled successfully" |
| e2e specs affected? | No — `core-smoke`/`full-lifecycle` explicitly `selectOption(...)` the dropdowns (don't rely on removed defaults) |
| Schema/migration changed? | **No** |

## 6. Confirmations
**No schema/migration added. No `.env.production` edit. No DB mutation. No email sent. No application submitted. No payment triggered. No pricing/payment-logic change. No marketing dashboard.** Production (:3003) was untouched during local verification; the preview server (:3010) was stopped afterward.

## 7. Final git status before commit
```
 M app/src/components/marketing/application-form.tsx
 M app/src/lib/validations/application.ts
?? app/src/components/ui/form-field.tsx
?? docs/design/TENXPROS_APPLICATION_FORM_TOOLTIP_ALIGNMENT_REPORT.md
```
