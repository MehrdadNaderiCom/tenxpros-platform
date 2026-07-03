# Report 2: Partner Academy image and screenshot audit

Scope: every image and screenshot referenced anywhere in the Partner Academy content, checked for accuracy after the commission redesign. The specific risk is a screenshot that shows a superseded rule baked into the image (the delivery band, the seat unlock, Panel classification of strong, old commission numbers, or retired wording), which a text rewrite would not fix. Each image was opened and viewed directly, not inferred.

Method: the academy modules reference eight distinct screenshots, all under the public path /academy/screens/, stored at app/public/academy/screens/ and served live by the running container (verified: the live container serves the same eight files, same sizes). All eight were captured between 30 June and 1 July 2026, before the 3 July redesign, so any that depict a page the redesign changed are candidates for staleness. Each image was viewed and assessed for commission content and for accuracy against the now live rules and the now live forms.

## Summary

Eight distinct screenshots, eighteen references in total. Seven are current and accurate. One is stale.

- Stale: deal-registration.png. It shows the deal registration form without the new Company domain field, which the redesign added and which is now on the live form. No wrong rule is baked into the image; it is an outdated depiction of a form we changed. Used six times, the most referenced screenshot in the academy.
- Not stale, but worth noting: commission-statements.png was the highest risk candidate (a statement image could have baked in old rates or the delivery band). On inspection it does not: it shows only function names and illustrative dollar amounts and statuses, with no rate, no band, no seat unlock, and no Panel classification. It is accurate.

No image anywhere shows the retired delivery five to eight percent band, the forty seat unlock, Panel classification of strong, or any retired commission number. The one issue is a missing field, not a wrong rule.

## Image by image

### 1. deal-registration.png  (STALE)

- Used in: m02 (identity), m03 (rules), m09 (prospecting), m10 (conversation), m11 (operations), m13 (motions). Six references, the most used academy screenshot.
- Depicts: the partner "Register a deal" form. Header "Register a new opportunity." Fields shown: Type, Offering in view, Exact legal entity or individual, Country, Business unit or department (optional), Primary contact (optional), Contact title (optional), Estimated seats (optional), Estimated value (USD) (optional), Functions you intend to perform (Origination, Closing, Delivery or Coaching), Your case for this account, Any wider scope requested (optional), Submit registration.
- What is wrong: the redesign added a Company domain field to this exact form, positioned right after "Exact legal entity or individual." The live form now has that field (confirmed in code: the form registers a "domain" input with the label "Company domain"). The screenshot was captured before that change and does not show it. So a partner studying the academy sees a registration form image that is missing the field that drives the entire objective origination classification, then meets a real form that has it.
- Severity: minor to moderate. It does not teach a wrong rule, but it is an inaccurate, incomplete depiction of a changed form, and the missing field is not a trivial one (the domain is the identity the whole Qualified versus Strong rule keys on).
- Proposed fix: regenerate deal-registration.png by capturing the current partner deal registration form (the one that now includes the Company domain field), matching the existing screenshot's framing and style, and replace the file at app/public/academy/screens/deal-registration.png. There is no dedicated academy screens regenerator script in the repo (only dossier and home rebuild scripts exist), so this is a fresh capture of the live form. No text change is needed; the six lesson references stay as they are and simply point at the corrected image.

### 2. commission-statements.png  (CURRENT)

- Used in: m11 (operations). One reference.
- Depicts: a partner "Commission statements" view. A table with columns Function, Account, Amount, Status. Three illustrative rows: Qualified origination, Meridian Finance, USD 1,200, Paid; Strong origination, Northwind Health, USD 2,400, Pending; Closing, Dr. Lena Okafor, USD 600, Pending. Caption: "Commissions follow the program rules and your confirmed role on each account. Nothing here changes a rate; it shows what those rules produced."
- Assessment: accurate. The function names shown (Qualified origination, Strong origination, Closing) are all still valid function names under the redesign; none was renamed or retired. The amounts are illustrative dollar figures, not rates, and no rate, no delivery band, no seat unlock, and no Panel classification appears. The Strong origination row is consistent with the new rule (a plausible new company, high value B2B deal). This is the image I most expected to be stale, and it is not.

### 3. accounts.png  (CURRENT)

- Used in: m11 (operations). One reference.
- Depicts: a partner "My accounts" table with columns Account, Country, Status, Last activity, Next step, and a "Log activity" input. Illustrative rows for Northwind Health, Dr. Lena Okafor, Meridian Finance, all Active. It is about keeping accounts alive with logged activity.
- Assessment: accurate. Account protection and activity logging were not changed by the commission redesign. No commission rule appears.

### 4. target-list.png  (CURRENT)

- Used in: m09 (prospecting). One reference.
- Depicts: a "Target list" table with columns Prospect, Why they fit, Your route in. Prospecting and qualification content.
- Assessment: accurate. No commission rule appears; prospecting was not changed.

### 5. application.png  (CURRENT)

- Used in: m08 (selling), m10 (conversation), m13 (motions). Three references.
- Depicts: the participant "Apply to TenXPros" application form (Professional context, Program fit, Consent and confidentiality). This is the student application, not a partner surface.
- Assessment: accurate. It is a product surface unrelated to partner commission; nothing on it was changed by the redesign.

### 6. dossier-submission.png  (CURRENT)

- Used in: m12 (mechanics). One reference.
- Depicts: the "Submit your dossier" view, the twelve dossier sections across the four phases (Frame, Design, Prove, Foresee), reviewed against the eight public criteria.
- Assessment: accurate. Product and certification content, unrelated to partner commission.

### 7. field-journey-explorer.png  (CURRENT)

- Used in: m05 (journey), m08 (selling), m14 (customize). Three references.
- Depicts: the "Field Journey Explorer," the twelve week program journey for a chosen field (shown for a Radiologist), the four phases and what the participant holds at the end.
- Assessment: accurate. Product and journey content, unrelated to partner commission.

### 8. verification.png  (CURRENT)

- Used in: m04 (product), m12 (mechanics). Two references.
- Depicts: a "Credential verification" card (holder, serial, awarded date, year) confirming completion of the Partner Academy.
- Assessment: accurate. Credential verification, unrelated to partner commission.

## Bottom line

Only one of the eight academy screenshots needs work: deal-registration.png, which should be recaptured so it shows the new Company domain field. The good news is that the highest risk image, the commission statement, is clean, and no screenshot anywhere has a superseded commission rule or number baked into it. Nothing here is urgent for correctness of what a partner is taught in words; it is an accuracy refresh of one form image. No image was edited or regenerated as part of this report, as instructed.
