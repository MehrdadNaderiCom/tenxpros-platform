# Persian Retranslation Delta

Deliverable 9. Statement and precise list. All content changes in this program are in English. The Persian translation package must be regenerated for the deltas below. The Persian translation was not attempted here; the program owner will produce it from this list.

## Academy module content (the core package)

| File | Change | What to translate |
|---|---|---|
| `prisma/seed/academy/m15-contact.ts` | New module (Contact Us) | Entire title, summary, lesson, bodyHtml. |
| `prisma/seed/academy/m16-alumni.ts` | New module (The Alumni Network) | Entire title, summary, lesson, bodyHtml. |
| `prisma/seed/academy/m17-sharing.ts` | New module (Sharing Experience and Knowledge) | Entire title, summary, lesson, bodyHtml. |
| `prisma/seed/academy/m05-journey.ts` | One-sentence edit (module count) | Only the bodyHtml callout sentence now reading "This Academy has 17 modules: 14 that train and certify you as a partner, each with an exam, plus 3 short informational ones. ..." |
| `prisma/seed/academy/m02-identity.ts` | One inserted block | The "What your commission is calculated on" paragraph (in bodyHtml, before "The four things a partner protects"). |
| `prisma/seed/academy/m03-rules.ts` | One inserted block | The "current rates, by function" list and the "cap, and how functions add up" paragraph with the two worked examples (in bodyHtml, after "...never simply because a conversation happened."). |
| `prisma/seed/academy/m13-motions.ts` | One inserted block | The "What the customer pays, and what you earn" two paragraphs (in bodyHtml, before "How to use it"). |

Note for the money passages (modules 2, 3, 13): the numbers are interpolated from config at seed time, so the translated text should keep the same interpolation placeholders (translate the surrounding prose, keep the numeric values as rendered).

## Secondary (partner-panel UI English, only if the Persian package covers the panel UI, not just module content)

Small count-robustness rewords, not new concepts:
- `src/app/(partner)/partner/academy/page.tsx`: a reworded final-exam sentence and a new "Reference and information" section heading.
- `src/app/(partner)/partner/academy/final-exam/page.tsx`: two reworded sentences.
- `src/app/(partner)/partner/academy/certificate/page.tsx`: one reworded sentence.

The de-hardcoded public partners page and the terms text did not change any rendered English (the words are identical, now sourced from config), so they need no retranslation.

## Not included

The many new partner-panel feature screens (special deals, toolkit, discussions, support, alumni, account pipeline) are English UI added in this program. Whether they need Persian depends on whether the panel UI is localized at all; the academy module content above is the confirmed package.
