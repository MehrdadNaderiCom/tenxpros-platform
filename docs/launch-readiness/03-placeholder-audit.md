# Placeholder Audit

Deliverable 3. Rule: zero placeholder stubs in shipped content. Method: swept `prisma/seed/academy/*.ts` and `src` for placeholder markers and classified every `form-preview` frame (a real embedded screenshot with an `<img>` versus a text-only description with no image).

## Result: two categories found, one of them a real blocker

### 1. Real placeholder blocker: module 12 has 9 unfilled `[CONFIRM: ...]` markers

`prisma/seed/academy/m12-mechanics.ts` contains nine author-facing instruction markers left inline in the shipped lesson (and mirrored in the body), for operational program details the author was meant to fill in with the current official values:

1. `[CONFIRM: state the format, for example async first with optional live sessions, or a scheduled cohort]`
2. `[CONFIRM: state the hours per week]`
3. `[CONFIRM: rolling, or fixed cohort start dates]`
4. `[CONFIRM: describe the support and coaching model ...]`
5. `[CONFIRM: state the pacing and deadline policy]`
6. `[CONFIRM: state the extension or flexibility policy]`
7. `[CONFIRM: state any required tools or accounts]`
8. `[CONFIRM: state the review turnaround time]`
9. `[CONFIRM: state any alumni access or ongoing benefit]`

A partner reading module 12 would see literal text such as "The program is delivered as [CONFIRM: state the format ...]". This is a visible placeholder in exam-bearing shipped content and violates the zero-placeholder rule and the professional voice. It is **pre-existing** (not introduced by this program's work); the audit surfaced it.

Resolution requires the actual current operational answers (format, weekly hours, enrollment model, support model, deadline and extension policy, required tools, review turnaround, alumni benefit), which are real program facts. Two honest paths, no invented facts:
- The program owner supplies the current values, and they are filled in; or
- The passages are reworded to remove the markers and instead instruct the partner to quote the current official answer from the Panel or the official program details (the module already teaches exactly this discipline), inventing no specific value.

This is listed as a **blocker for the academy content** in the go/no-go. It does not affect the Partner Panel, commission, or credential systems.

### 2. Deferred, non-blocking: 4 text-only `form-preview` frames (no screenshot)

Of 23 `form-preview` frames in the academy, 19 embed a real `/academy/screens/*.png` screenshot (not placeholders). Four are text-only descriptions without an image. These are the "form preview" items the original spec flagged for module 7, plus two others; they read as prose and are not broken, but they are the intended targets of the deferred editorial pass:

| Module | File | Label |
|---|---|---|
| m06 | `m06-ranks.ts` | The progress view |
| m07 | `m07-coach.ts` | The coach pathway |
| m07 | `m07-coach.ts` | The coach screening checklist |
| m14 | `m14-customize.ts` | Leave-behind summary |

These are non-blocking: each contains an accurate text description; they should be converted to a real screenshot or to plain descriptive prose in the deferred editorial pass (module 7's revision specifically calls for removing its two).

### 3. No other placeholder markers

No `TODO`, `TBD`, `coming soon`, `lorem`, or `PLACEHOLDER` markers were found in shipped academy content or partner-facing UI (the public directory page's "coming soon" is an intentional pre-launch state of a separate feature, not a content stub).

## Summary

- **Blocker:** module 12's nine `[CONFIRM: ...]` markers (needs the owner's operational values, or an approved reword).
- **Deferred, non-blocking:** four text-only form-preview frames (m6, m7 x2, m14).
- **Clean:** 19 real embedded screenshots; no other placeholder markers.
