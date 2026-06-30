# Risk Register

Every known remaining risk, including small ones. Severity is the impact if it bites; most are low. Nothing here is a known production-breaking bug. Items marked "by design" are intentional and listed for transparency.

| ID | Risk | Severity | Status | Action / owner |
| --- | --- | --- | --- | --- |
| R1 | Accessibility not fully browser/axe tested | Medium | Open | Run axe + keyboard + screen-reader pass before public launch |
| R2 | Mobile not fully viewport tested | Medium | Open | Test on real iOS/Android widths; static checks + fixes only so far |
| R3 | "Valid through December 31" certificate expiry is not automated | Medium | Open (product decision) | Decide: build a year-end expiry/renewal job, or keep manual annual renewal |
| R4 | Notification / re-pass pipeline has never fired in production | Medium | Open (no data) | Verify end-to-end with a real test partner before onboarding partners |
| R5 | Form-preview placeholders instead of real screenshots | Low | Open (intentional) | Replace placeholders with real form images via the lesson editor |
| R6 | Pre-existing dead code / stubs | Low | Open | Decide keep/remove; not introduced by this phase |
| R7 | Two `Field` components with the same name | Low | Open | Consolidate `form-fields.tsx` and `form-field.tsx` |
| R8 | `<img>` used instead of `next/image` (LCP warnings) | Low | Open (pre-existing) | Optional: migrate marketing images to `next/image` |
| R9 | Intentional design-system exceptions | Low | By design | None; documented |
| R10 | Single deploy branch, manual deploy + manual content seed | Low | Open | Document/automate the deploy + seed runbook |

---

## Details

### R1. Accessibility not fully tested (Medium)
Static evidence is good: primitives carry `aria`/`role`/focus rings, the `Dialog` now has a focus trap, initial focus, and `aria-labelledby`, alerts use `role=status|alert`, form fields have labels. **Not done:** an `axe`/Lighthouse run, keyboard-only navigation, and a screen-reader pass on the real pages. Minor known item: buttons use `focus:` rather than `focus-visible:` rings (the ring shows on mouse click too). **Before launch:** run an automated a11y scan and a manual keyboard/SR pass on the top public and admin flows.

### R2. Mobile not fully viewport tested (Medium)
Layouts use responsive breakpoints and tables use the `overflow-x-auto` `Table` primitive; the two bare admin layout tables were wrapped for horizontal scroll. **Not done:** real-device or devtools viewport testing across breakpoints. **Before launch:** test the apply flow, partner academy lesson, and admin tables at 360px, 768px, and 1024px.

### R3. December 31 certificate expiry is not automated (Medium, product decision)
The "valid through December 31" guarantee is represented as copy plus the badge's calendar `year`; there is **no job that invalidates anything at year end**. The load-bearing behavior (editing a lesson does **not** revoke a partner who already passed) **is** implemented. Renewal is manual (`renewBadge`). **Decision needed:** either build a scheduled year-end expiry/renewal, or accept manual annual renewal and remove any copy that implies automatic enforcement.

### R4. Notification / re-pass pipeline unproven in production (Medium, no data)
Production has **0 partners and 0 partner notifications**, and all modules are at content version 1 with empty edit history, so the edit -> notify -> re-pass path has never executed live. The full chain is code-verified and adversarially reviewed, but not exercised with real data. **Before onboarding partners:** create a test partner, give them academy progress, edit a lesson, and confirm the notification appears and the badge/version behavior is correct.

### R5. Form-preview placeholders (Low, intentional)
Lessons reference forms with clearly labelled placeholder frames ("Form preview, placeholder") because the real screenshots were not available. The editor and renderer already support images. **Action:** capture real form screenshots and replace the placeholders. The `ACADEMY_REVIEW_WORKBOOK.md` has a "Needs screenshot" checkbox per section.

### R6. Pre-existing dead code / stubs (Low)
Surfaced by the audit, not introduced this phase (left in place rather than deleting code I did not write):
- `src/lib/analytics/events.ts` defines a 14-event analytics taxonomy that nothing imports (no tracking is wired to it).
- `src/components/marketing/sample-dossier-preview.tsx` is referenced only in comments; instruments duplicate its image markup inline.
- `/portal/feedback` is a deployed but nav-unlinked "coming soon" stub.
**Action:** decide to wire or remove each.

### R7. Duplicate `Field` component (Low)
`src/components/ui/form-fields.tsx` (simple label wrapper) and `src/components/ui/form-field.tsx` (accessible `cloneElement` version) both export `Field`. Not a bug, but a confusing collision. **Action:** consolidate to one.

### R8. `<img>` instead of `next/image` (Low, pre-existing)
The marketing instruments use raw `<img>`, producing build-time LCP warnings (non-blocking). **Action (optional):** migrate to `next/image` for performance.

### R9. Intentional design-system exceptions (Low, by design)
Documented and accepted: the public `/partners` commission table keeps bespoke dark-marketing styling (the navy-header admin `Table` would clash); the newsletter group-membership control is a compact multi-select toggle (a form submit, so not a `FilterPill` link), kept as a small styled button with `aria-pressed`. `/directory` and `/radar` are intentional "coming soon" pre-launch stubs, unlinked from public nav until their feature flags are enabled.

### R10. Deploy and content-seed are manual (Low)
Deploy is `docker compose build` + `up --force-recreate` (migrations apply on boot). Publishing academy content is a separate manual step (`dump-content.ts` -> copy JSON into the container -> `seed-content.cjs`), because the normal Prisma seed refuses to run in production. The seed preserves superadmin-edited lessons (`contentVersion > 1`). **Action:** document this as a runbook (see `DO_NOT_FORGET.md`) or automate it.
