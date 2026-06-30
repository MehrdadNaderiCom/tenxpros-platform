# Admin QA Checklist (manual, live site)

A practical walk-through to verify the platform on the live site (`https://tenxpros.com`). Tick each box as you confirm it. Steps assume you sign in as the superadmin. Where a step needs a partner account, that is called out (production currently has zero partners, so some partner-side checks require creating a test partner first).

**Sign in:** go to `/login` and sign in as the superadmin (`mail@mehrdadnaderi.com`).

---

## 1. Newsletter flow

- [ ] `/admin/newsletter` loads; the compose form shows a subject field and the rich block editor.
- [ ] Create a campaign: type a subject, add a heading, a paragraph, a bullet list, a link, and a CTA button in the editor, pick a target group, and save. It saves without error.
- [ ] Saving with an empty subject or body shows the warning banner (does not crash).
- [ ] Open the campaign at `/admin/newsletter/campaigns/[id]`. The email preview renders (headings, button, lists) and looks email-safe.
- [ ] Send a single test to your own inbox using the test-send field. The email arrives and matches the preview.
- [ ] `/admin/newsletter/subscribers` loads. Add a subscriber by email, toggle Unsubscribe/Resubscribe, and confirm the status badge updates.
- [ ] Create a group, assign a subscriber to it with the group toggle, and confirm the count updates.
- [ ] Subscriber list pagination works (Previous/Next) if there are more than 25 subscribers.
- [ ] Confirm-and-send asks you to type the exact recipient count; a wrong number is rejected and nothing is sent.
- [ ] After a real send, the delivery history shows per-recipient rows.

## 2. Payment flow

- [ ] `/admin/payments` loads with the status and follow-up filter pills.
- [ ] The follow-up filters (Awaiting, Reminded, Past deadline, Deadline notice sent) each filter the table.
- [ ] A payment past its due date shows the due date in red with "(passed)".
- [ ] The Application link on a row opens the related application.
- [ ] The admin dashboard payment follow-up report links into `/admin/payments?follow=...` correctly.
- [ ] (If testing the automation) Accept an application, confirm manual payment instructions are recorded with a 48h due date, and confirm reminder/deadline timestamps appear as the schedule fires.

## 3. Partner academy (content + progress)

- [ ] `/admin/partners/academy` lists partners with certificate and progress columns (will be empty until partners exist).
- [ ] Open a partner at `/admin/partners/academy/[partnerId]` (needs a partner): module progress shows per-module read/exercises/exam status and the content version each module was passed at.
- [ ] As a partner (or superadmin preview), `/partner/academy` shows the 14 modules, the progress bar, and the Pro/TenXPro detection panel.
- [ ] Open a module lesson `/partner/academy/[slug]`: the rich lesson renders (headings, lists, callouts, the journey table in module 5), and copy is protected (selection/copy suppressed).
- [ ] The audio reader reads the lesson text.
- [ ] Exercises give the stated number of attempts and then reveal the answer; the final exam unlocks only after the lesson is read and exercises are done.
- [ ] Passing all modules awards the Partner Academy certificate.

## 4. Content editing (superadmin)

- [ ] `/admin/academy/content` lists all 14 modules/lessons with current version and "passed on older version" counts.
- [ ] Open a lesson edit page `/admin/academy/content/[lessonId]`: the rich editor loads pre-filled with the current content (editing is non-destructive).
- [ ] Make a small edit, add a change note, and Save and publish. It succeeds.
- [ ] The module's version increments (v1 to v2) and the change appears in the Change history timeline.
- [ ] "Preview as partner" opens the lesson with your edit.
- [ ] After saving, confirm a `PartnerNotification` was created for partners with progress on that module (needs at least one such partner).

## 5. Notifications (partner)

- [ ] After a content edit, `/partner/notifications` shows the "Lesson updated" notice for an affected partner.
- [ ] The partner nav shows an unread count badge.
- [ ] "Mark read" and "Mark all read" clear the unread state and update the badge.
- [ ] A partner with no notifications sees the empty state (no crash).
- [ ] A partner who already passed the edited module is told their certificate stays valid; a not-yet-passed partner is told they take the latest version.

## 6. Certificates

- [ ] `/admin/partners/academy/[partnerId]`: Issue a certificate; it shows the serial and year.
- [ ] Renew for the current year updates the year.
- [ ] Revoke asks for confirmation (red modal) and removes the certificate.
- [ ] Manually marking a module complete (or Reset) updates the partner's progress and version status.
- [ ] The public verify page `/academy/verify/[serial]` shows the credential, status, and issue date for a real serial.

## 7. Partner commissions

- [ ] `/admin/partners/config` loads the program defaults (rates by function, caps). Editing a value saves and is recorded in the audit log.
- [ ] `/admin/partners/commissions` lists commission entries; Mark payable / Mark paid update status.
- [ ] A flat commission line shows "Flat" (not a stray comma) in the rate column.
- [ ] `/admin/partners/[id]` shows a partner's deals and commission lines with correct amounts and statuses.
- [ ] As a partner, `/partner/commissions` shows their own commission statement.

## 8. Public pages

- [ ] `/`, `/apply`, `/about`, `/program`, `/partners`, `/pricing`, `/how-it-works`, `/refund`, `/terms` all load (200) and look polished.
- [ ] No raw em or en dashes appear in any visible copy.
- [ ] `/apply` shows the Pro/TenXPro self-screening section and the application form submits (including a resume upload).
- [ ] `/partners` describes the partner program and the commission table renders.
- [ ] Buttons, cards, and spacing look consistent across pages (one design language).
- [ ] On a phone-width screen, pages reflow without horizontal overflow and the nav collapses sensibly.

---

**Sign-off:** Tester ______________  Date ____________  Result: Pass / Fail (attach notes for any failure).
