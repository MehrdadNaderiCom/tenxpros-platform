# TenXPros Operational Site Report

Generated: 2026-06-05

Prepared for: product strategists, content reviewers, UI/UX reviewers, technical reviewers, and specialist LLMs that need a detailed handoff of the current TenXPros site and platform.

Inspection basis:

- Local codebase: `/opt/tenxpros/app`
- Next.js App Router pages under `src/app`
- Shared UI and layout components under `src/components`
- Server actions, validation, auth, email, analytics, status, and dossier helpers under `src/lib`
- Prisma schema and seed data under `prisma`
- Existing build and launch documentation under `docs`

Verification run on 2026-06-05:

- `pnpm typecheck` passed.
- `pnpm test` passed: 4 test files, 12 tests.
- `pnpm build` passed and generated 59 app routes.

Important scope note: this is a source-inspection and build-verification report. It describes page intent, content, UI structure, workflows, data dependencies, and implementation state. It does not include production analytics, real user behavior, or live database records.

## 1. Executive Summary

TenXPros is a selective, async-first AI adoption certification platform for serious domain professionals. The central promise is that participants bring a real professional problem, work through an 11-module methodology across a 12-week program, and produce a reviewed Living AI Solution Dossier. Certification is positioned as earned through reviewed evidence rather than passive attendance.

The current implementation has three major surfaces:

1. Public marketing and application site.
2. Authenticated participant portal.
3. Authenticated admin portal.

The public site is coherent and launch-focused. It consistently repeats three core messages:

- "You bring the domain. We bring the AI method."
- "Frame. Design. Prove. Foresee."
- "This is not a course. It is a certification produced by reviewed work."

The participant portal supports the core lifecycle: onboarding, starter pack completion, diagnostic intake, personalized path display, module artifact submission, dossier section drafting/submission, ticket support, certification status, badges, and directory profile settings.

The admin portal supports the founder/admin launch workflow: application review, manual payment confirmation, enrollment, participant review, path approval, module review, dossier review, support responses, certification decisions, pricing tier activation, payment records, badge visibility, email event logs, users, settings, and audit logs.

The product is best described as a launch-ready MVP with many full architecture pieces present from day one. Some routes are intentionally minimal shells or coming-soon states, especially analytics, reports, email templates/log, participant feedback, public directory population, and Radar.

Primary strengths:

- Clear product positioning around serious, reviewed AI adoption work.
- Strong end-to-end lifecycle model from application to certification.
- Thoughtful data model covering applications, participants, diagnostic intake, modules, dossiers, tickets, certification, badges, pricing, email, analytics, notifications, and audit logs.
- Practical launch operations, including manual Stripe Payment Links and admin enrollment.
- Dossier autosave, submit locking, feedback history, and print-ready dossier/certificate output.
- Status-driven UI with consistent cards, badges, forms, and tables.

Primary critique areas:

- Public site has no real imagery or product screenshots; the brand feels serious but visually sparse.
- Several pages are placeholders, shells, or intentionally deferred features.
- Public mobile navigation hides most nav links and does not provide a mobile menu.
- Legal pages explicitly say founder/legal review is required.
- Directory and Radar are visible but not active experiences.
- Some operational settings exist but are not clearly wired into public behavior.
- Admin actions in `src/lib/actions/applications.ts` should be reviewed for explicit admin authorization checks.
- Module progression/unlock logic appears incomplete or mostly manual.
- Analytics models exist, but only limited business events appear implemented in the current code.

## 2. Product Model

TenXPros is not presented as a course marketplace or generic AI training product. It is a selective certification program.

Core user journey:

1. Prospect reads public site.
2. Prospect applies with professional context and a real problem.
3. Admin reviews fit, seriousness, problem clarity, readiness, and confidentiality posture.
4. Accepted applicant receives manual payment link.
5. Admin confirms payment and enrolls participant.
6. Participant sets password and enters portal.
7. Participant completes Starter Pack.
8. Participant completes Diagnostic Intake.
9. Admin reviews/tunes/approves personalized path.
10. Participant works through 11 modules.
11. Participant submits module artifacts for review.
12. Participant builds 12-section Living AI Solution Dossier.
13. Admin reviews dossier sections.
14. Admin makes certification decision.
15. Certified participant receives badge/certificate and may opt into public directory profile.
16. Radar and alumni updates are deferred until a certified cohort exists.

Three product identities:

- Public site: marketing, trust building, application, public verification.
- Participant portal: guided learning/evidence workspace.
- Admin portal: operational control center for launch and review.

## 3. Information Architecture

### Public Routes

These routes are publicly accessible and mostly static:

- `/`
- `/program`
- `/how-it-works`
- `/dossier`
- `/certification`
- `/pricing`
- `/directory`
- `/radar`
- `/about`
- `/apply`
- `/apply/thank-you`
- `/terms`
- `/privacy`
- `/refund`

### Auth Routes

- `/login`
- `/register`
- `/set-password`

### Participant Routes

Protected by middleware and participant layout. Allowed roles in middleware: `PARTICIPANT`, `COACH`, `ADMIN`.

- `/portal`
- `/portal/starter-pack`
- `/portal/diagnostic`
- `/portal/path`
- `/portal/modules`
- `/portal/modules/[id]`
- `/portal/dossier`
- `/portal/dossier/[section]`
- `/portal/dossier/preview`
- `/portal/tickets`
- `/portal/tickets/new`
- `/portal/tickets/[id]`
- `/portal/certification`
- `/portal/profile`
- `/portal/feedback`

### Admin Routes

Protected by middleware and admin layout. Requires `ADMIN` role.

- `/admin`
- `/admin/applications`
- `/admin/applications/[id]`
- `/admin/participants`
- `/admin/participants/[id]`
- `/admin/diagnostics`
- `/admin/paths`
- `/admin/paths/[id]`
- `/admin/modules`
- `/admin/modules/[id]`
- `/admin/dossiers`
- `/admin/dossiers/[id]`
- `/admin/tickets`
- `/admin/tickets/[id]`
- `/admin/certifications`
- `/admin/certifications/[id]`
- `/admin/directory`
- `/admin/pricing`
- `/admin/payments`
- `/admin/analytics`
- `/admin/analytics/funnel`
- `/admin/analytics/marketing`
- `/admin/analytics/cohorts`
- `/admin/badges`
- `/admin/users`
- `/admin/users/[id]`
- `/admin/email`
- `/admin/email/log`
- `/admin/email/templates`
- `/admin/audit`
- `/admin/reports`
- `/admin/settings`

### Verification and API Routes

- `/verify/[code]`
- `/certificate/[id]`
- `/api/health`
- `/api/verify/[code]`
- `/api/auth/[...nextauth]`
- `/robots.txt`
- `/sitemap.xml`

## 4. Global Design System

Visual language:

- Serious, restrained, professional.
- Primary palette: navy and gold, supported by white, neutral gray, slate, blue, amber, emerald, and red status colors.
- The product avoids playful visuals and uses a sober certification/workflow feel.
- Cards, badges, tables, forms, and progress-style elements carry most of the interface.

Key color tokens:

- Navy 900: `#1F4E79`
- Navy 700: `#255D91`
- Navy 500: `#2E75B6`
- Navy 100: `#D8E8F5`
- Navy 50: `#EEF5FB`
- Gold 500: `#C9A961`
- Gold 800: `#7C6230`
- Background: near-white neutral.

Typography:

- Inter/system sans-serif.
- H1s are usually large, semibold, navy.
- Body copy is slate/neutral, with restrained line-height.
- Eyebrows use uppercase gold text with wide tracking.

Reusable UI:

- `Button` and `ButtonLink`: primary navy, secondary bordered white/navy, ghost, danger.
- `Card`: rounded-lg, border, white background, padding, subtle shadow.
- `Badge`: status-driven colored pills for application, participant, module, ticket, payment, certification, and badge states.
- `Input`, `Textarea`, `Select`, `Field`: consistent form controls with labels and focus rings.
- `PageHeader`: optional eyebrow, title, description.
- `EmptyState`: dashed/neutral empty-state card with optional action.
- `RouteShell`: minimal launch placeholder with "Minimal launch view."

Shared navigation:

- Public nav: TenXPros logo, links to Program, How it works, Dossier, Certification, Pricing, Directory, Radar, About, plus Login and Apply CTA.
- Participant nav: Dashboard, Starter Pack, Diagnostic, Path, Modules, Dossier, Tickets, Certification, Profile, plus sign out.
- Admin nav: Dashboard, Applications, Participants, Diagnostics, Paths, Modules, Dossiers, Tickets, Certifications, Directory, Pricing, Payments, Analytics, Badges, Users, Email, Audit, Reports, Settings, plus sign out and environment display.

Responsive behavior:

- Public nav hides the main nav links below `lg`, while Login and Apply remain visible. There is no mobile menu in the current implementation.
- Admin and participant layouts use an aside that becomes a top block on smaller screens. Admin nav is long, so mobile navigation may become vertically heavy.
- Tables use horizontal overflow and fixed minimum widths.

## 5. Public Page Details

### `/` Home

Source: `src/app/(public)/page.tsx` and `src/components/marketing/marketing-sections.tsx`

Purpose:

- Introduce TenXPros and convert serious prospects into applicants.

Primary content:

- Hero eyebrow: "You bring the domain. We bring the AI method."
- Main headline: "Build AI adoption work serious enough to be reviewed."
- Supporting copy explains the selective 12-week certification, real professional problem, responsible design, value proof, and Living AI Solution Dossier.
- CTAs: Apply for Founding Charter, See the method.
- Three quick facts: 12 weeks, 11 modules, Reviewed Dossier.
- Visual mock dossier panel showing dossier sections, progress bars, and phase readiness.
- Proof cards:
  - Responsible boundaries.
  - Defensible output.
  - Practical adoption.
- Journey section: Apply, Diagnose, Build, Certify.
- Founding Charter CTA block: Tier 1 open for first 10 members.

Design notes:

- Two-column hero on desktop.
- Right side is a custom UI mockup, not an image.
- Clean white/neutral sections with cards and navy/gold accents.
- Strong CTAs but no testimonial, founder photo, cohort proof, screenshots, or external trust markers.

Reviewer prompts:

- Does the opening promise immediately distinguish TenXPros from generic AI courses?
- Is "reviewed AI adoption work" clear enough for non-expert prospects?
- Is the absence of real visuals, proof, or human presence hurting trust?
- Should the hero show an actual dossier screenshot, certificate, founder, or participant artifact?

### `/program`

Source: `src/app/(public)/program/page.tsx`

Purpose:

- Explain the 12-week architecture and the 11 modules.

Primary content:

- Header: "Frame. Design. Prove. Foresee."
- Description: certification produced by reviewed work.
- Dark navy CTA card: "You bring the domain. We bring the AI method."
- Phase cards:
  - Frame, Weeks 1-4.
  - Design, Weeks 5-8.
  - Prove, Weeks 9-10.
  - Foresee, Week 11.
- Full ModuleGrid from seed program data.

Design notes:

- Strong information architecture.
- Module cards contain module number, phase, title, badge name, core question, and description.
- Mostly text-based and card-heavy.

Reviewer prompts:

- Are the modules too abstract for a buyer?
- Should each phase include concrete deliverables and examples?
- Does the page need a week 12 capstone/integration block, since the code emphasizes 11 modules but the product is 12 weeks?

### `/how-it-works`

Source: `src/app/(public)/how-it-works/page.tsx`

Purpose:

- Explain the full process from application to directory profile.

Primary content:

Seven ordered steps:

1. Apply with a real professional problem and confidentiality consent.
2. Admission review checks fit, seriousness, and ability to benefit.
3. Complete Starter Pack and Diagnostic Intake.
4. Receive a personalized path across the 11 modules.
5. Build artifacts and dossier section by section.
6. Submit capstone materials for certification review.
7. Publish a directory profile only after certification and opt-in.

CTAs:

- Apply for Founding Charter.
- See the Dossier.

Design notes:

- Ordered vertical list with numbered circles.
- Reuses JourneySteps below.

Reviewer prompts:

- Is the process sufficiently reassuring about time, support, review expectations, and what happens after applying?
- Should the page show acceptance criteria, sample timeline, or expected weekly workload?

### `/dossier`

Source: `src/app/(public)/dossier/page.tsx`

Purpose:

- Explain the Living AI Solution Dossier as the core product artifact.

Primary content:

- Header: "The Living AI Solution Dossier is the work behind the credential."
- Emphasizes context, evidence, workflow, risk, adoption, value, and foresight.
- CTA card: "Reviewed section by section."
- Lists 12 dossier sections:
  1. Professional Context
  2. Problem Definition
  3. AI Suitability Assessment
  4. Context, Stakeholder & Initial Foresight Analysis
  5. Data & Evidence Review
  6. Workflow Before / After
  7. Risk, Ethics, Privacy & Compliance Review
  8. Responsible AI Solution Design
  9. Adoption & Communication Plan
  10. Value, Roadmap & Proof Plan
  11. Personal AI Foresight Plan
  12. Final Recommendation

Design notes:

- Clear grid of sections.
- Strong conceptual positioning, but no sample dossier excerpt or artifact preview.

Reviewer prompts:

- Does "Living AI Solution Dossier" need a sample PDF/mockup/download to feel tangible?
- Are the 12 sections understandable to busy professionals?

### `/certification`

Source: `src/app/(public)/certification/page.tsx`

Purpose:

- Explain certification standards and outcomes.

Primary content:

- Header: "Certified TenXPro is earned through reviewed work."
- Clarifies this is not attendance-based.
- Certification outcomes:
  - Certified.
  - Conditionally certified.
  - Completed, not certified.
- Badge catalog listing module badges, rank badges, capstone seal, and charter member badges.

Design notes:

- Card grid for outcomes.
- Badge catalog is content-rich but visually simple.

Reviewer prompts:

- Is the certification standard credible enough?
- Should rubrics, reviewer identity, review process, and verification mechanics be described?
- Is "conditionally certified" sufficiently explained from a user trust perspective?

### `/pricing`

Source: `src/app/(public)/pricing/page.tsx`

Purpose:

- Show charter tier pricing and drive applications.

Primary content:

- Header: "Founding Charter is open. Later tiers are preview only."
- Pricing tiers:
  - Founding Charter: $997, first 10 members, active.
  - Early Charter: $1,247, preview/closed.
  - Late Charter: $1,497, preview/closed.
  - Final Charter: $1,747, preview/closed.
  - Standard: $1,997, preview/closed.
- Active tier CTA: Apply for Founding Charter.
- Closed tiers show disabled "Opens after prior tier closes."
- Payment after acceptance explanation.

Design notes:

- Five-column grid on large screens.
- Founding tier is highlighted with navy border/ring.
- Benefits are short and repetitive.

Reviewer prompts:

- Does the price page justify value enough for a $997 to $1,997 professional program?
- Should it include what is included, what is not included, refund risk, support level, time expectations, and certification review details?
- Are "closed preview" tiers clear or confusing?

### `/directory`

Source: `src/app/(public)/directory/page.tsx`

Purpose:

- Reserve public directory positioning before certified profiles exist.

Primary content:

- Header: "The TenXPros Directory will open after certified profiles exist."
- Empty state: no public Certified TenXPro profiles yet.
- CTA: Apply for Founding Charter.

Design notes:

- Coming-soon page, no database query, no profile cards.

Reviewer prompts:

- Should a closed directory be in top nav before there are profiles?
- Should the page explain future profile controls and verification benefits?

### `/radar`

Source: `src/app/(public)/radar/page.tsx`

Purpose:

- Reserve alumni signal/update product positioning.

Primary content:

- Header: "TenXPro Radar is the alumni signal layer."
- Explains future post-program AI updates, scenario signals, and practice refreshers.
- Empty state: opens after first certified cohort.
- CTA: View the program.

Design notes:

- Coming-soon page.
- No subscription UI.

Reviewer prompts:

- Is Radar worth showing publicly now, or does it distract from launch conversion?
- Should the page capture interest or waitlist emails?

### `/about`

Source: `src/app/(public)/about/page.tsx`

Purpose:

- Explain philosophy and positioning.

Primary content:

- Header: "You bring the domain. We bring the AI method."
- Philosophy copy: AI adoption is professional judgment work.
- Three cards:
  - Partnership, not replacement.
  - Selective by design.
  - Adaptive, not generic.

Design notes:

- Minimal, text-only, no founder story or team information.

Reviewer prompts:

- Does "About" need founder credibility, origin story, methodology roots, or advisory proof?
- Is the philosophical framing enough for conversion?

### `/apply`

Source: `src/app/(public)/apply/page.tsx` and `src/components/marketing/application-form.tsx`

Purpose:

- Capture applications for Founding Charter.

Primary content:

- Header: "Apply for the Founding Charter with a real professional problem."
- Explains fit review and that payment happens only after acceptance.
- Guidance card: strong applications are specific.

Form sections:

- Professional context:
  - Full name.
  - Email.
  - Country.
  - Professional role.
  - Professional domain.
  - LinkedIn URL.
- Program fit:
  - AI experience: Beginner, Intermediate, Advanced.
  - Data sensitivity: Low, Moderate, High, Critical.
  - Weekly availability: 5 hours, 8 hours, 12+ hours.
- Long text:
  - Why TenXPros.
  - Real problem brief.
- Preferred language.
- Consent:
  - Confidentiality/data authority.
  - Terms/privacy/refund agreement.
- Hidden captured attribution:
  - UTM source, medium, campaign, term, content.
  - Landing page.
  - Referrer URL.

Validation:

- Why TenXPros and real problem brief require at least 80 characters.
- Consent checkboxes are required.
- Email and URL are validated.

Behavior:

- Submits to `submitApplication`.
- On success redirects to `/apply/thank-you?id=...`.
- Sends application received email and logs `APPLICATION_SUBMITTED`.

Design notes:

- Single long form in a card.
- Clear section headers.
- Good for serious applicants, but could be intimidating.

Reviewer prompts:

- Is the form length appropriate for selective positioning?
- Should the page show save/resume, expected review timing, data handling, or examples of strong answers?
- Does consent language sufficiently protect confidentiality risk?

### `/apply/thank-you`

Source: `src/app/(public)/apply/thank-you/page.tsx`

Purpose:

- Confirm application submission.

Primary content:

- "Application received."
- "Thank you for applying to TenXPros."
- Explains review team will assess fit, problem clarity, and readiness.
- Shows Application ID if query param is present.
- CTA: Return home.

Design notes:

- Centered card, simple.

Reviewer prompts:

- Should it set expectations for review timeline, next email, payment sequence, and support contact?

### `/terms`

Source: `src/app/(public)/terms/page.tsx`

Purpose:

- Launch terms placeholder.

Primary content:

- Explicit "Founder/legal review required before production launch."
- Program nature, no guaranteed outcome, participant responsibilities, responsible AI use, account access.

Design notes:

- Section cards.

Reviewer prompts:

- Needs legal review before production.
- Should include jurisdiction, payment terms, IP/content ownership, acceptable use, termination, limitation of liability, dispute handling.

### `/privacy`

Source: `src/app/(public)/privacy/page.tsx`

Purpose:

- Launch privacy placeholder.

Primary content:

- Explicit "Founder/legal review required before production launch."
- Covers collected data, use of data, confidentiality, public visibility, email and analytics.

Reviewer prompts:

- Needs legal review before production.
- Should specify controller/processor details, retention, deletion, rights, subprocessors, international transfer, cookies, analytics vendors, and data security.

### `/refund`

Source: `src/app/(public)/refund/page.tsx`

Purpose:

- Launch refund policy placeholder.

Primary content:

- Explicit "Founder/legal review required before production launch."
- Selective admission, manual launch payments, before enrollment, after access, certification outcomes, refund review.

Reviewer prompts:

- Needs legal review before production.
- Should include exact refund windows, non-refundable amounts, how refunds are processed, and edge cases.

## 6. Auth Page Details

### `/login`

Source: `src/app/(auth)/login/page.tsx`

Purpose:

- Credential login for participant or admin workspace.

Primary content and fields:

- Email.
- Password.
- Hidden callback URL.
- Error message for unrecognized credentials.
- Shared auth layout includes logo and "Need to apply first? Start an application."

Behavior:

- Uses NextAuth credentials provider.
- Default callback is `/portal`.
- Redirects to error query on credential failure.

Design notes:

- Centered card, compact, utilitarian.

Reviewer prompts:

- Should successful password setup show a message on login? Current login page ignores `setup=complete`.
- Should forgotten password exist?
- Should admin login require 2FA before production?

### `/register`

Source: `src/app/(auth)/register/page.tsx`

Purpose:

- Prevent open registration and route people to application.

Primary content:

- "Registration starts with application."
- Explains accounts are created after admission and manual enrollment.
- CTA: Start application.

Design notes:

- Good for selective model.

### `/set-password`

Source: `src/app/(auth)/set-password/page.tsx`

Purpose:

- Participant password setup after admin enrollment.

Fields:

- Password.
- Confirm password.
- Hidden email and token from URL params.

Validation:

- Token minimum length.
- Password minimum 10 characters.
- Passwords must match.

Behavior:

- Calls `setParticipantPassword`.
- Redirects to `/login?setup=complete` on success.
- Redirects back with error on failure.

Reviewer prompts:

- Should password requirements be visibly stated?
- Should token expiry or support recovery be explained?

## 7. Participant Portal Details

Participant layout:

- Protected by auth.
- If no user session, redirects to `/login`.
- Sidebar/top navigation with participant name and sign out.
- Background neutral, main content padded.

### `/portal` Participant Dashboard

Source: `src/app/(participant)/portal/page.tsx`

Purpose:

- Give participant a calm status overview and next action.

Data:

- Participant profile.
- Diagnostic.
- Participant modules.
- Dossier sections.
- Certification.

Primary cards:

- Status.
- Starter Pack completion.
- Modules submitted count.
- Dossier sections active count.

Next action logic:

- If Starter Pack incomplete: Complete Starter Pack.
- Else if Diagnostic incomplete: Submit Diagnostic Intake.
- Else if any module is `UNLOCKED`, `IN_PROGRESS`, or `REVISE`: Continue Modules.
- Else: Review Dossier.

Design notes:

- Four stat cards, one highlighted next-action card, one dashed notifications placeholder.

Reviewer prompts:

- Does the dashboard need progress visualization across 12 weeks?
- Should notifications be wired to the `Notification` model?
- Does "modules submitted" count `SUBMITTED` and `PASSED` but not `IN_PROGRESS`, which may be fine but should be intentional.

### `/portal/starter-pack`

Source: `src/app/(participant)/portal/starter-pack/page.tsx`

Purpose:

- Orient participant before diagnostic.

Primary content:

- Page header: Orientation, confidentiality discipline, program rhythm, dossier expectations.
- Intro card about protecting sensitive data and using real professional context.
- Three cards:
  - Program rhythm.
  - Confidentiality guardrails.
  - Dossier standards.

Interaction:

- Button to mark Starter Pack complete.
- Completion sets `starterPackCompletedAt` and moves status from `ONBOARDING` to `DIAGNOSTIC_PENDING`.

Reviewer prompts:

- Does "Starter Pack" need actual rich materials, checklists, downloads, or videos?
- Should the completion action require acknowledgment of confidentiality terms?

### `/portal/diagnostic`

Source: `src/app/(participant)/portal/diagnostic/page.tsx`

Purpose:

- Capture operating context for personalization.

Fields:

- Risk profile.
- AI literacy level.
- Stakeholder complexity.
- Regulatory weight.
- Time availability.
- Output type.
- Domain recognition.
- Solution pattern hint.
- Problem context.
- Problem clarity.
- Success criteria.
- Organizational context.
- Goals.
- Support needs.

Behavior:

- Save draft via `saveDiagnostic`.
- Submit final via `submitDiagnostic`.
- Draft fields are optional.
- Final submission requires the major diagnostic fields.
- On submit, participant status becomes `ACTIVE`.

Design notes:

- Single long form with select controls and textareas.
- Page copy says "Save a draft as you go", but there is no stepper UI even though schema has `currentStep`.

Reviewer prompts:

- Should this be a multi-step wizard for lower cognitive load?
- Are the diagnostic dimensions understandable without examples?
- Should risk/privacy warnings adjust dynamically for high/critical sensitivity?

### `/portal/path`

Source: `src/app/(participant)/portal/path/page.tsx`

Purpose:

- Show personalized path notes and module sequence.

Data:

- Program path.
- Diagnostic.
- Participant modules.

Primary content:

- Customization notes card.
- Pending review empty state if path is not admin-approved.
- Module cards with status badges and customization/core question.

Design notes:

- Path is primarily a display surface, not an interactive planning tool.

Reviewer prompts:

- Should path approval unlock module sequence or attach richer coach/admin guidance?
- Should participants see why their path was customized based on diagnostic dimensions?

### `/portal/modules`

Source: `src/app/(participant)/portal/modules/page.tsx`

Purpose:

- Show participant module list and status.

Primary content:

- Module number and phase.
- Title.
- Description.
- Locked message where applicable.
- Status badge.
- Open link for non-locked modules.

Empty state:

- No modules yet, with CTA to diagnostic.

Design notes:

- Simple list of large cards.

Reviewer prompts:

- Should module list show estimated hours, required artifact, pass criteria, coach feedback, and unlock conditions?
- Should locked modules explain exactly what will unlock them?

### `/portal/modules/[id]`

Source: `src/app/(participant)/portal/modules/[id]/page.tsx`

Purpose:

- Module detail and artifact submission.

Primary content:

- Page header title equals module title.
- Description equals core question.
- Status badge.
- Module description.
- Estimated hours and badge name.
- Locked message if locked.
- Start module form for `UNLOCKED` status.
- Artifact submission form:
  - Artifact content.
  - Artifact URL.

Behavior:

- `startModule` sets status to `IN_PROGRESS`.
- `submitModuleArtifact` validates at least 80 characters and optional URL, then sets status to `SUBMITTED`.

Design notes:

- No actual lesson content display beyond title, description, and metadata.
- Module schema includes learning objectives, content materials, exercises, artifact template, and pass criteria, but current participant detail page does not display all of these.

Reviewer prompts:

- Should participants see learning materials, artifact template, pass criteria, and examples?
- Should module submissions support file uploads or rich text?

### `/portal/dossier`

Source: `src/app/(participant)/portal/dossier/page.tsx`

Purpose:

- Dossier section index and review state.

Primary content:

- Header: Dossier Builder.
- Guidance card about draft, submit, and locking.
- Button: Preview Full Dossier.
- 12 section cards with section order, section type, status badge, last edited time, and open link.

Design notes:

- Grid of section cards.
- Section title formatting lowercases labels generated from enum names.

Reviewer prompts:

- Should section cards include completion quality, feedback count, due timing, or instructions?
- Is enum-derived title formatting polished enough?

### `/portal/dossier/[section]`

Source: `src/app/(participant)/portal/dossier/[section]/page.tsx` and `src/components/participant/dossier-section-editor.tsx`

Purpose:

- Edit, autosave, submit, and view feedback for one dossier section.

Primary content:

- Section title.
- Status badge.
- Section order.
- Last saved panel.
- Textarea editor.
- Save draft and Submit for review buttons.
- Feedback history.

Behavior:

- Editable statuses: `DRAFT`, `REVIEWED`, `REVISED`.
- Locked statuses: `SUBMITTED`, `APPROVED`.
- Autosaves every 30 seconds if dirty.
- Saves on blur after 800ms debounce.
- Submit saves content and sets status to `SUBMITTED`.

Design notes:

- Practical autosave.
- Plain textarea, no rich text or structure per section.

Reviewer prompts:

- Should dossier sections have guided prompts, examples, acceptance criteria, and checklist validation?
- Is plain textarea sufficient for a defensible professional artifact?
- Should feedback be linked to specific paragraphs rather than section-level only?

### `/portal/dossier/preview`

Source: `src/app/(participant)/portal/dossier/preview/page.tsx`

Purpose:

- Print-ready full dossier preview.

Primary content:

- Header showing Certified Dossier or Draft Dossier.
- Dossier title and participant identity.
- Print button.
- TenXPros status card.
- All sections in order with status badge and content.

Behavior:

- Certified if participant certification outcome is `CERTIFIED`.
- Print styles hide certain UI elements.

Design notes:

- Useful export surface, but no downloadable PDF generation.

Reviewer prompts:

- Is print output sufficient, or should stored PDF generation be added?
- Should the dossier preview include cover page, summary, reviewer notes, and verification URL?

### `/portal/tickets`

Source: `src/app/(participant)/portal/tickets/page.tsx`

Purpose:

- Participant support queue.

Primary content:

- Header: use tickets for module, dossier, evidence, workflow, foresight, capstone, or technical support.
- New ticket button.
- Ticket cards with subject, category, message count, status.
- Empty state explaining fair-use support.

Behavior:

- Lists tickets for current user.

Reviewer prompts:

- Should support expectations and response SLA be visible?
- Should ticket categories map to coach/founder workflows?

### `/portal/tickets/new`

Source: `src/app/(participant)/portal/tickets/new/page.tsx`

Purpose:

- Create support ticket.

Fields:

- Subject.
- Category.
- Message.

Categories:

- Module question.
- Dossier help.
- AI suitability.
- Evidence.
- Workflow.
- Foresight.
- Capstone.
- Technical.
- Other.

Behavior:

- Enforces monthly ticket limit from admin setting, default 4.
- Creates ticket and first message.
- Redirects to ticket detail.

Reviewer prompts:

- Should the monthly fair-use limit be shown before submission?
- Should urgent/technical categories have different handling?

### `/portal/tickets/[id]`

Source: `src/app/(participant)/portal/tickets/[id]/page.tsx`

Purpose:

- View and reply to a support thread.

Primary content:

- Subject.
- Category support thread description.
- Status badge.
- Message cards.
- Reply textarea.

Behavior:

- Participant reply adds message and sets status to `WAITING_RESPONSE`.

Reviewer prompts:

- Should closed/resolved tickets disable reply?
- Should attachments be supported? Schema has `attachmentUrl` on ticket messages, but UI does not expose attachments.

### `/portal/certification`

Source: `src/app/(participant)/portal/certification/page.tsx`

Purpose:

- Show certification outcome and badge status.

Primary content:

- Outcome/status badge.
- Reviewer notes if certification exists.
- Link to certificate if `certificateUrl` exists.
- Badge list with verification codes.
- Empty badge state with link to modules.

Design notes:

- Simple, status-based.

Reviewer prompts:

- Should this page explain certification readiness requirements?
- Should badge verification links be clickable?

### `/portal/profile`

Source: `src/app/(participant)/portal/profile/page.tsx`

Purpose:

- Manage directory profile settings and badge visibility view.

Fields:

- Display name.
- Public title.
- Domain.
- Location.
- LinkedIn URL.
- Website URL.
- Bio.
- Publish directory profile when eligible.

Primary content:

- Guidance card: nothing becomes public just because the participant fills it out.
- Badge visibility list.

Behavior:

- Upserts `DirectoryProfile`.
- Slug is generated from display name plus participant id suffix on create.

Reviewer prompts:

- Should profile eligibility rules be clearer?
- Should participants control individual badge public/private visibility? Current page only displays badge visibility.
- Should directory profile support languages, availability, contact email, photo, available-for fields? Schema supports many of these but UI does not expose all.

### `/portal/feedback`

Source: `src/app/(participant)/portal/feedback/page.tsx`

Purpose:

- Placeholder route.

Content:

- `RouteShell` titled "Feedback" with description "Coach feedback shell."
- Shows minimal launch view copy.

Navigation:

- This route is not listed in the current participant nav.

Reviewer prompts:

- Decide whether to remove, hide fully, or build a real coach feedback center.

## 8. Admin Portal Details

Admin layout:

- Protected by auth and `ADMIN` role.
- Non-admin authenticated users receive 404 behavior.
- Admin nav is long and operationally complete for launch.
- Sidebar shows admin badge, name, and environment.

### `/admin` Dashboard

Source: `src/app/(admin)/admin/page.tsx`

Purpose:

- Operational overview of launch queues.

Data:

- Application count.
- Participant count.
- Open/waiting ticket count.
- Submitted module count.
- Submitted dossier section count.
- Certification review count.
- Recent site events.

Primary content:

- Hero card: "Start with the queues that unblock people."
- Action cards:
  - Review applications.
  - Check tickets.
  - Review modules.
  - Review dossier sections.
- Metrics grid.
- Recent events list.

Reviewer prompts:

- Should counts distinguish new vs total applications?
- Should recent events include application submitted, enrollment, certification, ticket created, etc. consistently?
- Should dashboard prioritize by due date/SLA rather than raw count?

### `/admin/applications`

Source: `src/app/(admin)/admin/applications/page.tsx`

Purpose:

- Application review queue.

Table columns:

- Applicant.
- Domain.
- AI level.
- Tier.
- Status.
- Submitted date.

Design notes:

- Responsive horizontal table.
- Empty table row explains future review/payment/enrollment workflow.

Reviewer prompts:

- Should there be filters by status, tier, domain, risk, date, and search?
- Should application queue show conversion attribution or payment readiness?

### `/admin/applications/[id]`

Source: `src/app/(admin)/admin/applications/[id]/page.tsx`

Purpose:

- Application detail, status decision, payment/enrollment.

Primary content:

- Applicant name and professional role/domain/country.
- Status badge and applied timestamp.
- Email, LinkedIn, AI experience, time availability, data sensitivity, pricing tier snapshot.
- Why TenXPros.
- Real problem brief.
- Status transition forms:
  - Under review.
  - Accepted.
  - Revise and reapply.
  - Not accepted.
- Admin notes textarea for each transition.
- Enrollment card:
  - Mark payment received and enroll.
- Payments card.

Behavior:

- Accepting application creates pending payment and sends payment link email.
- Marking payment received enrolls the participant.

Important technical review note:

- The server actions in `src/lib/actions/applications.ts` should be reviewed for explicit admin authorization. `updateApplicationStatus` and `markPaymentReceivedAndEnroll` are called from admin-only pages, but the action functions themselves do not call a `requireAdmin` helper. For defense in depth, admin mutations should verify session and role inside the action.

Reviewer prompts:

- Should status transitions be consolidated into one select + notes form?
- Should acceptance email preview and payment link be visible before sending?
- Should enrollment be impossible unless a payment record is paid, rather than a single manual action that marks it paid?

### `/admin/participants`

Source: `src/app/(admin)/admin/participants/page.tsx`

Purpose:

- Participant lifecycle overview.

Table columns:

- Participant.
- Tier.
- Status.
- Modules passed.
- Enrolled date.

Empty state:

- Enrollment has not started, CTA to applications.

Reviewer prompts:

- Should there be filters for status, cohort, coach, module progress, or at-risk participants?
- Should expected end date and last activity be visible?

### `/admin/participants/[id]`

Source: `src/app/(admin)/admin/participants/[id]/page.tsx`

Purpose:

- Participant detail and module review.

Primary content:

- Participant header and tier/status.
- Workspace card with links to dossier and certification.
- Stat cards:
  - Status.
  - Diagnostic submitted/pending.
  - Dossier sections.
  - Certification outcome.
- Module review forms for each participant module.

Module review behavior:

- Admin selects `PASSED`, `REVISE`, or `HOLD`.
- Adds coach feedback.
- If `PASSED`, module badge may be issued.
- Rank badges may be issued after module thresholds.
- Audit log is written.

Important product review note:

- The review action does not visibly unlock the next module. Current progression appears manual or incomplete beyond the first module unlocked during enrollment.

Reviewer prompts:

- Should module review happen here, in `/admin/modules`, or both?
- Should artifact content and URL be displayed in the module review form? Current participant detail shows module status and feedback form but not the submitted artifact content.

### `/admin/diagnostics`

Source: `src/app/(admin)/admin/diagnostics/page.tsx`

Purpose:

- See draft and submitted diagnostic intakes.

Primary content:

- Diagnostic cards with participant link to path, completion state, and risk profile.
- Empty state with CTA to participants.

Reviewer prompts:

- Should admin see full diagnostic content on this page or a diagnostic detail route?
- Should risk/complexity flags prioritize path review?

### `/admin/paths`

Source: `src/app/(admin)/admin/paths/page.tsx`

Purpose:

- Path review and approval queue.

Primary content:

- Cards with participant name, customization notes, approved/draft badge.
- Empty state.

Reviewer prompts:

- Should path approval be tied to diagnostic completion?
- Should path queue show participants waiting longest?

### `/admin/paths/[id]`

Source: `src/app/(admin)/admin/paths/[id]/page.tsx`

Purpose:

- Approve and tune personalized path notes.

Primary content:

- Guidance card about tying notes to diagnostic risk, stakeholder complexity, and output type.
- Customization notes textarea.
- Approve path button.
- Module list with customization/core question.

Behavior:

- `approvePath` sets notes, `approvedByAdmin`, and `approvedAt`.
- Audit log is written.

Reviewer prompts:

- Should admin be able to set module emphasis, unlock order, readings, or custom notes per module? The schema supports some of this, but current UI does not expose it.

### `/admin/modules`

Source: `src/app/(admin)/admin/modules/page.tsx`

Purpose:

- Module library overview.

Primary content:

- Module cards with module number, title, core question, phase, version.

Reviewer prompts:

- Should this page show active/inactive, version history, participant counts, and submissions requiring review?

### `/admin/modules/[id]`

Source: `src/app/(admin)/admin/modules/[id]/page.tsx`

Purpose:

- Edit module library metadata and participant-facing instructions.

Fields:

- Title.
- Core question.
- Description.
- Artifact template.
- Pass criteria.
- Estimated hours.

Behavior:

- Saves module library item.

Reviewer prompts:

- Should editing module content create a new version rather than updating in place?
- Should learning objectives, content materials, and exercises JSON be editable through UI?

### `/admin/dossiers`

Source: `src/app/(admin)/admin/dossiers/page.tsx`

Purpose:

- Dossier review queue.

Primary content:

- Dossier cards with title/participant and submitted section count.
- Description says inline annotation is intentionally deferred.
- Empty state.

Reviewer prompts:

- Should queue show only dossiers with submitted sections?
- Should it sort by oldest submitted section rather than dossier updated date?

### `/admin/dossiers/[id]`

Source: `src/app/(admin)/admin/dossiers/[id]/page.tsx`

Purpose:

- Section-level dossier review.

Primary content:

- Dossier title and participant email.
- Guidance card.
- Each section card with order/type, status, content, review status select, feedback textarea, and Save feedback button.

Behavior:

- Admin status choices:
  - Reviewed.
  - Approved.
  - Revision requested.
- Writes Feedback record, updates section status/reviewedAt, writes audit log.

Reviewer prompts:

- Should reviewer be able to annotate inline?
- Should feedback require content when requesting revision?
- Should approved sections lock automatically for participants? Current participant editor locks `APPROVED`.

### `/admin/tickets`

Source: `src/app/(admin)/admin/tickets/page.tsx`

Purpose:

- Support queue.

Primary content:

- Ticket cards with subject, user email, category, updated date, SLA note, status badge.
- Empty state.

Reviewer prompts:

- Should SLA be computed and visualized?
- Should priority, assignment, and unread status be shown? Schema supports priority and assignedToId but UI does not use them.

### `/admin/tickets/[id]`

Source: `src/app/(admin)/admin/tickets/[id]/page.tsx`

Purpose:

- Admin ticket response.

Primary content:

- Ticket subject, user email, category.
- Status badge.
- Guidance card.
- Message history.
- Response form:
  - Status select: awaiting participant, resolved, closed.
  - Response textarea.

Behavior:

- Adds admin message and updates ticket status.

Reviewer prompts:

- Should resolved/closed require response body?
- Should participants be notified by email or notification model on admin response?

### `/admin/certifications`

Source: `src/app/(admin)/admin/certifications/page.tsx`

Purpose:

- Certification decision queue.

Primary content:

- Participant cards with name, modules passed count, current certification/status badge.
- Empty state.

Reviewer prompts:

- Should queue filter to participants ready for certification rather than all participants?
- Should readiness include 11/11 modules passed and 12/12 dossier sections approved?

### `/admin/certifications/[id]`

Source: `src/app/(admin)/admin/certifications/[id]/page.tsx`

Purpose:

- Record final certification outcome.

Primary content:

- Warning/guidance card.
- Stats:
  - Modules passed.
  - Dossier approved.
  - Current outcome.
- Outcome select:
  - Certified.
  - Conditionally certified.
  - Completed, not certified.
  - Not completed.
- Reviewer notes textarea.

Behavior:

- Upserts certification review.
- Updates participant status.
- If certified:
  - Issues capstone badge.
  - Adds certificate URL `/certificate/[review.id]`.
  - Creates a draft directory profile if missing.
  - Writes audit log.

Important product review note:

- The action does not enforce readiness prerequisites. Admin can certify regardless of module/dossier counts. This may be intentional manual control for launch, but should be explicitly reviewed.

### `/admin/directory`

Source: `src/app/(admin)/admin/directory/page.tsx`

Purpose:

- Directory draft/public profile management overview.

Primary content:

- Profile cards with display name, title, user email, public/draft badge.
- Empty state.

Limitations:

- No edit/detail page.
- Public `/directory` does not yet query and display public profiles.

Reviewer prompts:

- Should admin approve or moderate public profile fields?
- Should public directory launch require feature flag `directory_enabled`?

### `/admin/pricing`

Source: `src/app/(admin)/admin/pricing/page.tsx`

Purpose:

- Manual charter tier activation.

Primary content:

- Pricing tier cards with name, status, price, member count/limit, make active button.

Behavior:

- `setActivePricingTier` deactivates all tiers, activates chosen tier, sets opened/closed timestamps, writes audit log.

Reviewer prompts:

- Does enrollment increment `membersCount`? It does not appear to in current enrollment action.
- Should tier activation prevent activating a tier before previous capacity is filled?

### `/admin/payments`

Source: `src/app/(admin)/admin/payments/page.tsx`

Purpose:

- Manual payment record visibility.

Table columns:

- Person.
- Amount.
- Status.
- Paid date.

Empty state:

- Explains manual Stripe Payment Links after acceptance.

Reviewer prompts:

- Should payment records show payment link sent date, payment evidence, refund status, and admin notes?
- Should `FAILED` and `REFUNDED` flows have admin UI?

### `/admin/analytics`

Source: `src/app/(admin)/admin/analytics/page.tsx`

Purpose:

- Placeholder.

Content:

- RouteShell title "Analytics" with "Extended analytics shell."

### `/admin/analytics/funnel`

Source: `src/app/(admin)/admin/analytics/funnel/page.tsx`

Purpose:

- Placeholder.

Content:

- RouteShell title "Conversion Funnel" with "Extended analytics route shell."

### `/admin/analytics/marketing`

Source: `src/app/(admin)/admin/analytics/marketing/page.tsx`

Purpose:

- Placeholder.

Content:

- RouteShell title "Marketing Attribution" with "Extended analytics route shell."

### `/admin/analytics/cohorts`

Source: `src/app/(admin)/admin/analytics/cohorts/page.tsx`

Purpose:

- Placeholder.

Content:

- RouteShell title "Cohorts" with "Extended analytics route shell."

Reviewer prompts for analytics shells:

- Which metrics matter most: application conversion, acceptance rate, payment completion, starter pack completion, diagnostic completion, module pass/revision rates, dossier section approval, certification rate, ticket load?
- Should these pages be hidden until populated?

### `/admin/badges`

Source: `src/app/(admin)/admin/badges/page.tsx`

Purpose:

- Badge catalog and recent issued badges.

Primary content:

- Badge cards showing name and category.
- Recent issued badges list with user email and `/verify/[code]`.
- Empty state if catalog not seeded.

Limitations:

- Read-only launch view.
- Special manual issuance remains minimal.

Reviewer prompts:

- Should admins be able to issue/revoke special badges?
- Should verification links be clickable and copyable?

### `/admin/users`

Source: `src/app/(admin)/admin/users/page.tsx`

Purpose:

- User and coach management launch view.

Primary content:

- Up to 100 recent users.
- User cards with link and role badge.

Reviewer prompts:

- Should there be search, role filters, coach assignment, disable user, reset password, or 2FA status?

### `/admin/users/[id]`

Source: `src/app/(admin)/admin/users/[id]/page.tsx`

Purpose:

- Minimal user detail.

Primary content:

- User name/email and role.
- Cards for application status, participant status, directory slug, badge count.

Reviewer prompts:

- Should user detail expose audit log, tickets, emails, payments, and account security state?

### `/admin/email`

Source: `src/app/(admin)/admin/email/page.tsx`

Purpose:

- Transactional email log.

Primary content:

- Up to 50 recent email events.
- Template, recipient, subject, and sent/error status.
- Empty state.

Limitations:

- Template editing remains minimal.
- No resend action.

Reviewer prompts:

- Should there be email preview, resend, filtering, failure alerts, and template management?

### `/admin/email/log`

Source: `src/app/(admin)/admin/email/log/page.tsx`

Purpose:

- Placeholder.

Content:

- RouteShell title "Email Log" with "Sent email log shell."

### `/admin/email/templates`

Source: `src/app/(admin)/admin/email/templates/page.tsx`

Purpose:

- Placeholder.

Content:

- RouteShell title "Email Templates" with "Template management shell."

### `/admin/audit`

Source: `src/app/(admin)/admin/audit/page.tsx`

Purpose:

- Major admin state changes and significant actions.

Primary content:

- Up to 100 recent audit log entries with timestamp, action, entity, and actor.
- Empty state.

Reviewer prompts:

- Should audit log have filters, entity drilldown, diff viewer, IP/user-agent, export?

### `/admin/reports`

Source: `src/app/(admin)/admin/reports/page.tsx`

Purpose:

- Placeholder.

Content:

- RouteShell title "Reports" with "Reports and exports shell."

### `/admin/settings`

Source: `src/app/(admin)/admin/settings/page.tsx`

Purpose:

- Site-wide settings and feature flags.

Primary content:

- Form cards for each setting with label/key/category, value input, save button.

Seeded settings:

- `current_active_tier`
- `application_paused`
- `directory_enabled`
- `radar_enabled`
- `support_ticket_monthly_limit`

Reviewer prompts:

- Which settings are actually enforced in public/participant behavior?
- Should feature flags hide public Directory/Radar or pause applications?
- Should setting value types be validated instead of free text?

## 9. Verification and API Page Details

### `/verify/[code]`

Source: `src/app/(verify)/verify/[code]/page.tsx`

Purpose:

- Public badge verification page.

Primary content:

- Badge name.
- Badge description.
- Recipient.
- Earned date.
- Verification code.
- Status: ACTIVE if public, INACTIVE otherwise.

Behavior:

- Uses `verifyBadge`.
- 404 if code not found.
- Dynamic metadata includes badge/recipient when found.

Reviewer prompts:

- Should inactive/private badges return 404 instead of showing inactive status?
- Should verification page include issuer, credential standard, revocation state, and share metadata?

### `/certificate/[id]`

Source: `src/app/(verify)/certificate/[id]/page.tsx`

Purpose:

- Public printable certificate for certified participants.

Primary content:

- Print certificate button.
- TenXPros.
- Certified TenXPro.
- Recipient.
- Certification statement.
- Certification date.
- Credential name.
- Verification link or pending badge reference.

Behavior:

- Only renders if review exists and outcome is `CERTIFIED`.
- 404 otherwise.

Reviewer prompts:

- Should certificate URL be stable and branded?
- Should it include certificate ID, verifier QR code, legal issuer details, and expiration/renewal terms?

### `/api/health`

Source: `src/app/api/health/route.ts`

Purpose:

- Health check.

Response:

- `{ ok: true }`

### `/api/verify/[code]`

Source: `src/app/api/verify/[code]/route.ts`

Purpose:

- JSON badge verification.

Response includes:

- Badge name, description, category.
- Recipient name, public title, directory slug if public.
- Earned date.
- ACTIVE/INACTIVE status.

### `/api/auth/[...nextauth]`

Source: `src/app/api/auth/[...nextauth]/route.ts`

Purpose:

- NextAuth/Auth.js handlers.

## 10. Core Workflows

### Application and Enrollment Workflow

Public form submission:

1. Applicant submits `/apply`.
2. `submitApplication` validates input.
3. If an active application already exists for the email, submission is rejected.
4. User is upserted as `APPLICANT`.
5. Application is created with professional context, fit data, consent fields, pricing tier snapshot, and attribution.
6. `APPLICATION_SUBMITTED` site event is created.
7. Application received email is sent/logged.
8. Admin application pages are revalidated.

Admin review:

1. Admin opens application detail.
2. Admin can mark under review, accepted, revise and reapply, or not accepted.
3. Status transitions are validated by `assertApplicationTransition`.
4. Audit log is written.
5. Accepted status creates pending payment and sends manual payment link email.
6. Revise/not accepted sends status update email.

Enrollment:

1. Admin marks payment received and enrolls.
2. User role becomes `PARTICIPANT`.
3. Participant profile is created.
4. Program path is created.
5. Dossier is created.
6. 12 dossier sections are created.
7. Active modules are copied into participant modules.
8. First module is unlocked; remaining modules are locked.
9. Pending payment records are marked paid.
10. Application status becomes `ENROLLED`.
11. Password setup token is created.
12. Audit log is written.
13. Welcome email with set-password link is sent.

Review note:

- This is a strong MVP lifecycle.
- Payment and enrollment are manual by design.
- Admin action authorization should be explicitly hardened inside server actions.

### Participant Learning Workflow

1. Participant logs in.
2. Dashboard points them to Starter Pack.
3. Starter Pack completion updates status.
4. Diagnostic can be saved as draft or submitted.
5. Submission updates status to active.
6. Admin reviews/approves path.
7. Participant works on unlocked modules.
8. Module artifacts are submitted for review.
9. Admin reviews module as passed/revise/hold.
10. Passed module may issue module/rank badges.

Review note:

- Module content and progression need review. Current participant module pages do not surface full module materials from schema, and next-module unlock logic is not clearly implemented.

### Dossier Workflow

1. Enrollment creates dossier and 12 sections.
2. Participant edits sections with autosave/manual save/blur save.
3. Participant submits section for review.
4. Submitted sections lock.
5. Admin reviews section and leaves feedback.
6. Section status becomes reviewed, approved, or revised.
7. Reviewed/revised sections are editable again by participant.
8. Approved sections remain locked.
9. Participant can preview/print full dossier.

Review note:

- This is one of the strongest implemented workflows.
- It is section-level only; inline annotation is deferred.

### Ticket Workflow

1. Participant creates ticket.
2. Monthly ticket limit is enforced from admin setting, default 4.
3. Ticket creates initial message.
4. Admin replies and sets status.
5. Participant can reply, setting status to waiting response.

Review note:

- Schema supports priority, assignment, and attachments, but UI does not fully use them.
- Notification/email response workflow is not clearly wired.

### Certification and Badge Workflow

1. Admin reviews participant readiness.
2. Admin records certification outcome.
3. Participant status updates.
4. Certified outcome issues capstone badge, sets certificate URL, and creates draft directory profile.
5. Public certificate and badge verification pages become available.

Review note:

- Certification action does not enforce prerequisites; manual judgement is trusted.
- Certification rubric is stored as JSON but UI only captures a broad outcome and notes.

## 11. Data Model Summary

Main models:

- `User`: account identity, role, auth relations, application, participant profile, tickets, directory profile, badges, audit actor.
- `Application`: application form data, status, admin notes, pricing snapshot, attribution, payments.
- `ParticipantProfile`: tier, cohort, dates, coach assignment, onboarding, status, diagnostic, path, dossier, certification, modules.
- `DiagnosticIntake`: risk, AI literacy, stakeholders, regulatory weight, output type, context fields, draft/final state.
- `ProgramPath`: participant path notes and approval state.
- `Module`: versioned module library with phase, content, exercises, artifact template, pass criteria, badge, hours.
- `ParticipantModule`: participant-specific module status, artifact, feedback, customization, version snapshot.
- `Dossier`: participant dossier.
- `DossierSection`: section content, status, feedback.
- `Feedback`: section-level feedback.
- `Ticket` and `TicketMessage`: support workflow.
- `CertificationReview`: outcome, rubric scores, reviewer notes, certificate URL.
- `DirectoryProfile`: public profile fields and visibility.
- `PricingTier`: charter tiers and active state.
- `PaymentRecord`: manual/Stripe-ready payment state.
- `EmailEvent`: transactional email log.
- `SiteEvent`: business-critical analytics events.
- `Notification`: future notification system.
- `Badge` and `ParticipantBadge`: badge catalog and verification codes.
- `AuditLog`: state changes and admin actions.
- `AdminSetting`: site-wide settings and feature flags.

Roles:

- `APPLICANT`
- `PARTICIPANT`
- `COACH`
- `ADMIN`

Important statuses:

- Application: submitted, under review, accepted, revise and reapply, not accepted, enrolled.
- Participant: onboarding, diagnostic pending, active, capstone, under review, certified, conditionally certified, completed not certified, not completed, paused, withdrawn.
- Module: locked, unlocked, in progress, submitted, passed, revise, remedial, hold.
- Dossier section: draft, submitted, reviewed, revised, approved.
- Ticket: open, waiting response, awaiting participant, resolved, closed.
- Payment: pending, paid, failed, refunded.
- Certification: certified, conditionally certified, completed not certified, not completed.

## 12. Seeded Product Content

### Pricing Tiers

| Tier | Price | Member Limit | Public State |
| --- | ---: | ---: | --- |
| Founding Charter | $997 | 10 | Active |
| Early Charter | $1,247 | 20 | Closed preview |
| Late Charter | $1,497 | 30 | Closed preview |
| Final Charter | $1,747 | 40 | Closed preview |
| Standard | $1,997 | 99 | Closed preview |

### Program Modules

| Number | Phase | Title | Badge |
| ---: | --- | --- | --- |
| 1 | FRAME | AI Readiness & TenXPro Mindset | TenX Mindset Badge |
| 2 | FRAME | Practical AI Literacy & Hands-On Tool Fluency | AI Core Badge |
| 3 | FRAME | Responsible AI & Professional Boundaries | Responsible AI Badge |
| 4 | FRAME | Problem Discovery & Structured Framing | Problem Framing Badge |
| 5 | DESIGN | Context, Stakeholder & Initial Foresight Mapping | Context Mapper Badge |
| 6 | DESIGN | Data, Evidence & Verification Discipline | Evidence Discipline Badge |
| 7 | DESIGN | Workflow, Task & Human-AI Allocation | Workflow Designer Badge |
| 8 | DESIGN | Responsible AI Solution Design | Responsible Solution Badge |
| 9 | PROVE | Adoption, Communication & Change Design | Adoption Designer Badge |
| 10 | PROVE | Value, Roadmap & Proof Plan | Value Proof Badge |
| 11 | FORESEE | AI Foresight, Scenario Planning & Future-Proofing | Foresight Strategist Badge |

### Dossier Sections

1. Professional Context.
2. Problem Definition.
3. AI Suitability Assessment.
4. Context, Stakeholder & Initial Foresight Analysis.
5. Data & Evidence Review.
6. Workflow Before / After.
7. Risk, Ethics, Privacy & Compliance Review.
8. Responsible AI Solution Design.
9. Adoption & Communication Plan.
10. Value, Roadmap & Proof Plan.
11. Personal AI Foresight Plan.
12. Final Recommendation.

### Badge System

Badge categories:

- Module badges.
- Rank badges.
- Capstone seal.
- Special charter badges.

Rank thresholds:

- Modules 1-4 passed: AI-Ready Professional.
- Modules 1-8 passed: AI Problem Solver & Solution Designer.
- Modules 1-11 passed: Future-Ready AI Solution Designer.

Capstone:

- Certified TenXPro Capstone Seal issued on `CERTIFIED` outcome.

## 13. Launch State and Deferred Features

Clearly active:

- Public marketing pages.
- Public application form.
- Auth login/password setup.
- Admin application review.
- Manual payment/enrollment.
- Participant starter pack.
- Diagnostic intake.
- Participant module list/detail/submission.
- Dossier builder with autosave/submission/locking.
- Admin dossier review.
- Ticket support.
- Certification decisions.
- Badge verification.
- Print-ready dossier and certificate.
- Admin pricing/payment/settings/audit/email logs.

Coming soon or minimal:

- Public Directory profile listing.
- Radar subscription/alumni product.
- Participant Feedback route.
- Admin Analytics, Funnel, Marketing Attribution, Cohorts.
- Admin Reports.
- Admin Email Log route separate from main Email page.
- Admin Email Templates.
- Inline dossier annotations.
- Full Stripe automation.
- Admin 2FA.
- Stored PDF generation.
- Rich notification UI.
- Coach assignment/coach portal depth.

Potential inconsistencies or gaps:

- Public Directory and Radar are in top nav but closed.
- Public Apply may not honor `application_paused` setting.
- Public Directory may not honor `directory_enabled` setting.
- Public Radar may not honor `radar_enabled` setting.
- Pricing `membersCount` may not update during enrollment.
- Module progression/unlock after passing a module is not clearly implemented.
- Participant module detail does not expose full module learning content from schema.
- Certification can be recorded without enforced prerequisites.
- Application admin server actions should include explicit admin session checks.
- Login does not display password setup completion message despite redirect query.
- Public mobile nav lacks menu access to most public links.

## 14. Content and Positioning Review Angles

Key strengths:

- Positioning is coherent and repeated.
- Differentiation from passive courses is clear.
- "Dossier" gives the program a tangible core artifact.
- "Selective" and "reviewed" create seriousness.
- Confidentiality and responsible AI boundaries are emphasized.

Potential content issues:

- Several claims are conceptual but not yet evidenced with examples.
- The public site has minimal founder/team credibility.
- No testimonials, sample artifacts, screenshots, video, or cohort proof.
- Pricing page may not sufficiently explain value at the current price points.
- Dossier and certification concepts may require examples to feel concrete.
- Legal pages explicitly require founder/legal review.
- The application form asks serious questions but offers few examples.

Suggested questions for a content specialist or LLM:

1. What is unclear to a first-time visitor within the first 10 seconds?
2. Does "Living AI Solution Dossier" feel tangible enough?
3. Does the copy overuse "serious", "reviewed", and "professional" without enough proof?
4. What objections would stop a qualified applicant from applying?
5. What proof assets should be added first: founder credibility, sample dossier, rubric, certificate sample, FAQ, testimonials, or timeline?
6. Is Founding Charter pricing framed as opportunity, urgency, or discount clearly enough?
7. Which pages should be shortened, expanded, or merged?

## 15. UI/UX Review Angles

Key strengths:

- Consistent components.
- Clear form labeling.
- Status badges are easy to scan.
- Admin tables and queues are straightforward.
- Empty states explain launch state.
- Dossier autosave and locking are practical.

Potential UX issues:

- Public site is visually sparse and lacks real media.
- Public nav has no mobile menu.
- Admin nav is long and could be unwieldy on mobile.
- Participant diagnostic and application forms are long.
- Admin application detail has repeated status forms, one for each status.
- Participant module detail is too bare for a learning experience.
- Dossier editor is a plain textarea with no section-specific prompt guidance.
- Placeholder routes may reduce perceived maturity if visible to users/admins.

Suggested questions for a UI/UX specialist or LLM:

1. Where does the product feel trustworthy, and where does it feel unfinished?
2. Which routes need screenshots, examples, or richer interaction?
3. Is the admin workflow efficient for repeated daily use?
4. Should the participant portal feel more like a learning path, a workbench, or a certification dashboard?
5. How should mobile navigation be redesigned?
6. Which empty states should remain visible, and which routes should be hidden until active?
7. Does the visual design feel premium enough for a paid certification?

## 16. Technical and Security Review Angles

Positive technical signals:

- TypeScript, Next.js App Router, Tailwind, Prisma, NextAuth, Zod.
- Middleware protects `/portal` and `/admin`.
- Admin layout performs server-side role check.
- Prisma schema is broad and future-aware.
- Server actions validate most participant/application inputs.
- Email events are logged.
- Audit logs exist for many admin actions.
- Build, typecheck, and tests pass.

Security and correctness review areas:

- Add explicit admin authorization inside application admin server actions.
- Confirm all mutation server actions check the right role, not only page-level access.
- Review whether public badge verification should show inactive/private badges.
- Add admin 2FA before production if admin panel controls enrollment/certification.
- Review password reset/recovery absence.
- Validate settings by type, not free text.
- Ensure no secrets are committed or exposed in docs/screenshots.
- Ensure production `AUTH_SECRET`, `NEXTAUTH_SECRET`, and `SESSION_SECRET` are strong and consistent.
- Ensure legal pages are reviewed before launch.
- Confirm email delivery, SPF/DKIM/DMARC, and Stripe Payment Links before production.

## 17. Suggested Reviewer/LLM Prompt

Use the following prompt with a specialist LLM after attaching this report:

```text
You are reviewing the current TenXPros website and platform using the attached operational page report. Analyze the product from your specialty area. Focus on concrete, prioritized recommendations.

Please cover:
1. What is working well.
2. The highest-risk issues.
3. Missing information or unclear positioning.
4. UI/UX friction by route or workflow.
5. Content changes that would improve trust and conversion.
6. Product-structure changes that would improve the participant and admin experience.
7. Quick wins before launch.
8. Larger post-launch improvements.

When you make a recommendation, cite the page or workflow it applies to and explain the expected impact.
```

Specialist variants:

- Content reviewer: emphasize messaging clarity, proof, objections, CTAs, pricing explanation, and legal/FAQ gaps.
- UI/UX reviewer: emphasize navigation, hierarchy, forms, mobile, admin efficiency, participant progress, and visual polish.
- Product strategist: emphasize market positioning, offer structure, activation sequencing, retention, Radar/directory strategy, and pricing.
- Technical reviewer: emphasize auth, server actions, data model, state transitions, progression logic, operational safety, test coverage, and production readiness.

## 18. Recommended Next Documentation Artifacts

Useful follow-up documents for reviewers:

1. Screenshot deck of every public page, key participant states, and key admin states.
2. "Critical user journey walkthrough" with screenshots and expected state changes.
3. "Known gaps and launch acceptance criteria" extracted into a prioritized checklist.
4. Content inventory with all public copy grouped by funnel stage.
5. UX heuristic review with severity ratings.
6. Security review checklist for admin actions, auth, secrets, and production operations.

Existing related files:

- `docs/build/TenXPros_Build_Spec_v8.md`
- `docs/build/LAUNCH_READINESS_CHECKLIST.md`
- `docs/deployment/PRODUCTION_DEPLOYMENT_CHECKLIST.md`
- `docs/deployment/PRODUCTION_ENVIRONMENT.md`
- `docs/deployment/ADMIN_HARDENING.md`
- `docs/deployment/STRIPE_PAYMENT_LINKS.md`
- `docs/deployment/RESEND_SETUP.md`

## 19. Final Assessment

TenXPros currently reads as a serious, founder-led, selective certification MVP with an unusually complete operational backbone for a launch-stage product. The strongest parts are the application-to-enrollment lifecycle, dossier builder, admin review tooling, certification/badge model, and consistent sober brand language.

The main challenge is not that the architecture is missing. The main challenge is that the public experience and participant experience still need more proof, richer examples, more visible guidance, stronger mobile navigation, and clearer activation boundaries between launched features and deferred features. For expert reviewers and LLMs, the most productive critique will likely focus on turning the existing serious scaffold into a more persuasive, tangible, and operationally smooth product.
