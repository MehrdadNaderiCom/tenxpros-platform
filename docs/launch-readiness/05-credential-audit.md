# Credential Audit

Deliverable 5. Rule: the participant Certified TenXPro credential states the field (professional domain) and the specialization (what the dossier accomplished) on every credential surface, clearly labeled, with the correct visibility gate.

## Result: all 7 surfaces PASS

| # | Surface | File | Field + Specialization | Gate |
|---|---|---|---|---|
| 1 | Certificate template | `src/app/(verify)/certificate/[id]/page.tsx` | Shown in labeled panels ("Field", "Specialization") | Page 404s unless outcome CERTIFIED |
| 2 | Public verification page | `src/app/(verify)/verify/[code]/page.tsx` | Labeled "Field:" / "Specialization:" | Only when outcome CERTIFIED and the badge is public (isPublic) |
| 3 | Verification JSON API | `src/app/api/verify/[code]/route.ts` | `field` / `specialization` keys | Same gate as the page (null otherwise) |
| 4 | Dossier metadata | `src/app/(participant)/portal/dossier/preview/page.tsx` | Labeled `<dt>` Field / Specialization | Only when the participant is CERTIFIED |
| 5 | Participant certification page | `src/app/(participant)/portal/certification/page.tsx` | Labeled Field / Specialization | Only when outcome CERTIFIED |
| 6 | Admin decision form | `src/app/(admin)/admin/certifications/[id]/page.tsx` | Two inputs, with helper text | Prefilled: Field from `Application.domain`, Specialization from `Dossier.title`; reviewer-editable |
| 7 | Decision action + directory | `src/lib/actions/admin.ts` (`decideCertification`) | Persists both; falls back to the defaults if blank | Directory auto-create seeds from the real field and specialization, not the old hardcoded "AI adoption" |

## Notes

- **Consistency:** the credential details appear only when outcome is CERTIFIED everywhere; the two public surfaces (page and API) additionally require the badge to be public, so a private or non-certified record never leaks field or specialization. The page and the API use the identical gate, so they never disagree.
- **Data lineage:** field defaults from the participant's application domain (`Application.domain`, linked by `userId`); specialization prefills from the dossier title (`Dossier.title`, linked by `participantId`). Both are fully reviewer-editable at decision time, and the action falls back to those defaults if the reviewer leaves a field blank, so the credential is never bare.
- **Scope:** this is the participant Certified TenXPro credential only. The Partner Academy training certificate is a separate credential and was intentionally left unchanged.

## Verdict

Field and specialization are present, clearly labeled, and correctly gated on every credential surface. PASS.
