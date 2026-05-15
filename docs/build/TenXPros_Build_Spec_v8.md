TenXPros

Platform Build Specification — v8 (final)

Complete Build Document — From Zero to Launch

Next.js + TypeScript + Tailwind + Prisma + PostgreSQL

Public Site + Participant Portal + Admin Portal

Use this document to drive Cursor / Windsurf / Claude Code


# Table of Contents

1. How to Use This Document

2. Product Recap (What You Are Building)

3. Technology Stack & Conventions

4. Information Architecture

5. Design System

6. Complete Prisma Schema

7. Authentication & Authorization

8. Public Site — Page Specifications

9. Application Flow & Admission System

10. Participant Portal — Page Specifications

11. Dossier Builder (Detailed)

12. Admin Portal — Page Specifications

13. API Routes & Server Actions

14. Email Templates & Transactional Flows

15. Phase-by-Phase Build Order

16. Acceptance Criteria per Phase

17. Test Data Strategy

18. Deployment & Infrastructure

19. Post-Launch Checklist

20. Analytics & Data Collection Strategy

21. Badge & Rank System Detail

22. Master Prompt for AI Coding Tools


# 1. How to Use This Document

This document is the complete specification for building the TenXPros platform — from an empty folder to a deployed, launch-ready system. It is structured to be handed directly to an AI coding assistant (Cursor, Windsurf, Claude Code) or used by a human developer as the source of truth.


## Document Philosophy

- Build the full architecture from day one; activate features in phases.
- Every page, model, route, and component is specified before coding begins.
- Phases are sequential but each phase produces a testable, runnable state.
- The site must feel like a serious certification platform, not a course landing page.

## How to Read It

- Sections 1-5 are context: what you are building, what stack, what design language.
- Section 6 is the database schema — the single source of truth for data modeling.
- Section 7 is the auth and authorization model.
- Sections 8-12 are the page specifications: public site, application flow, participant portal, dossier builder, admin portal.
- Section 13 is the API surface.
- Section 14 is the email and transactional flows.
- Sections 15-17 are the build order, acceptance criteria, and test data.
- Section 18 is deployment.
- Section 19 is the post-launch checklist.
- Section 20 is the analytics and data collection strategy.
- Section 21 is the badge and rank system detail.
- Section 22 is the master prompt — copy-paste into Cursor/Windsurf to start.

## Working Discipline

- Do not deviate from the schema in Section 6 without updating this document first.
- Build phase by phase. Do not jump ahead. Each phase has acceptance criteria.
- Activate features only when their phase opens. Keep coming-soon placeholders for the rest.
- Commit small, named changes. Each phase produces a clean commit history.
- Test after each phase against the acceptance criteria before moving forward.

| The non-negotiable principle&lt;br&gt;Architecture is full from day one. Activation is phased. All routes, all models, all layouts exist in the codebase. Only the routes needed for launch are activated. The rest show coming-soon states. |
| --- |


# 2. Product Recap (What You Are Building)


## The Product in One Sentence


| TenXPros&lt;br&gt;TenXPros is an adaptive, async-first, coach-supported AI certification platform for serious domain professionals. Each participant brings a real professional problem and, over 12 weeks, builds a Living AI Solution Dossier with their assigned coach. Upon meeting the standard, they become a Certified TenXPro and are featured in the public TenXPros Directory. |
| --- |


## The Three Identities of the Site

- Public marketing site — for prospects, applicants, and Directory visitors.
- Participant portal — for enrolled participants going through the 12-week journey.
- Admin portal — for the founder (and later, coaches) to manage applications, paths, dossiers, and certifications.

## The Three Brand Lines

- Headline: You bring the domain. We bring the AI method.
- Tagline: Frame. Design. Prove. Foresee.
- Differentiator: This is not a course. It is a certification produced by reviewed work.

## The Core User Journey


| Journey at a glance&lt;br&gt;Pro → Apply → Admission Review → Starter Pack → Diagnostic Intake → Personalized Path → Coach Assignment → 11 Modules across 4 Phases → Living Dossier → Capstone → Certified TenXPro → TenXPros Directory Profile → Updates Access → TenXPro Radar |
| --- |


## The Pricing Tiers


| Tier | Members | Price (USD) | Status at Launch |
| --- | --- | --- | --- |
| Founding Charter | 1-10 | $997 | Active |
| Early Charter | 11-20 | $1,247 | Closed (preview) |
| Late Charter | 21-30 | $1,497 | Closed (preview) |
| Final Charter | 31-40 | $1,747 | Closed (preview) |
| Standard | 41-99 | $1,997 | Closed (preview) |


## Critical Activation Rules at Launch

- Only Founding Charter (Tier 1) is active and accepting applications.
- Other tiers are visible on the Pricing page as upcoming tiers.
- Directory page is visible but shows: 'Profiles launching with first certified graduates.'
- Radar page is visible but shows: 'Alumni-only membership, opens after first cohort completes.'
- Coach Pipeline admin routes exist in code but are not surfaced in UI.
- Payment is via Stripe Payment Link sent manually after acceptance.

## The 11 Modules and 4 Phases


### Phase 1 — Frame (Weeks 1-4)

- Module 1: AI Readiness & TenXPro Mindset
- Module 2: Practical AI Literacy & Hands-On Tool Fluency
- Module 3: Responsible AI & Professional Boundaries
- Module 4: Problem Discovery & Structured Framing

### Phase 2 — Design (Weeks 5-8)

- Module 5: Context, Stakeholder & Initial Foresight Mapping
- Module 6: Data, Evidence & Verification Discipline
- Module 7: Workflow, Task & Human-AI Allocation
- Module 8: Responsible AI Solution Design

### Phase 3 — Prove (Weeks 9-10)

- Module 9: Adoption, Communication & Change Design
- Module 10: Value, Roadmap & Proof Plan

### Phase 4 — Foresee (Week 11)

- Module 11: AI Foresight, Scenario Planning & Future-Proofing

### Week 12 — Capstone Integration

- Integrate all 11 module artifacts into the final Living AI Solution Dossier.

# 3. Technology Stack & Conventions


## Core Stack

- Next.js 14+ with App Router.
- TypeScript (strict mode).
- Tailwind CSS for styling.
- Prisma ORM with PostgreSQL.
- NextAuth (Auth.js) v5 for authentication.
- React Hook Form + Zod for form validation.
- shadcn/ui as the component library base.
- Lucide React for icons.
- Resend (or SendGrid) for transactional email.
- Stripe (Payment Links initially; full integration later).
- Uploadthing or S3 for file uploads (added in Phase 2).

## Hosting & Infrastructure

- Vercel for application hosting.
- Neon, Supabase, or Railway for PostgreSQL.
- Cloudflare or Vercel domain management.
- Domain: tenxpros.com (or alternative).

| Stripe integration strategy — read carefully&lt;br&gt;Manual Stripe Payment Links are used in Phase 3 for enrollment emails. PaymentRecord is updated manually by admin after payment confirmation. Full Stripe integration (Checkout sessions, webhooks, automated status updates) is deferred to Phase 6 or later. Do NOT implement Stripe webhooks, Checkout sessions, or automated payment processing during Phases 1-5. The Stripe library and STRIPE_* env vars are not required until Phase 6. |
| --- |


## Folder Structure

tenxpros/

├── app/

│ ├── (public)/ # public marketing site

│ │ ├── page.tsx # Home

│ │ ├── program/page.tsx

│ │ ├── how-it-works/page.tsx

│ │ ├── dossier/page.tsx

│ │ ├── certification/page.tsx

│ │ ├── pricing/page.tsx

│ │ ├── directory/page.tsx

│ │ ├── radar/page.tsx

│ │ ├── about/page.tsx

│ │ └── apply/page.tsx

│ ├── (auth)/ # auth pages

│ │ ├── login/page.tsx

│ │ └── register/page.tsx

│ ├── (participant)/ # participant portal

│ │ └── portal/

│ │ ├── page.tsx # dashboard

│ │ ├── starter-pack/

│ │ ├── diagnostic/

│ │ ├── path/

│ │ ├── modules/

│ │ ├── dossier/

│ │ ├── tickets/

│ │ ├── certification/

│ │ └── profile/

│ ├── (admin)/ # admin portal

│ │ └── admin/

│ │ ├── page.tsx # admin dashboard

│ │ ├── applications/

│ │ ├── participants/

│ │ ├── diagnostics/

│ │ ├── paths/

│ │ ├── modules/

│ │ ├── dossiers/

│ │ ├── tickets/

│ │ ├── certifications/

│ │ ├── directory/

│ │ ├── pricing/

│ │ ├── payments/

│ │ ├── analytics/ # extended admin (route shells at launch)

│ │ ├── badges/

│ │ ├── users/

│ │ ├── email/

│ │ ├── audit/

│ │ ├── reports/

│ │ └── settings/

│ ├── (verify)/ # public verification

│ │ └── verify/

│ │ └── [code]/page.tsx

│ ├── api/ # api routes

│ │ ├── auth/

│ │ ├── applications/

│ │ ├── webhooks/

│ │ └── ...

│ └── layout.tsx

├── components/

│ ├── ui/ # shadcn primitives

│ ├── marketing/ # public site components

│ ├── portal/ # participant portal components

│ ├── admin/ # admin components

│ └── shared/ # shared components

├── lib/

│ ├── prisma.ts

│ ├── auth.ts

│ ├── email.ts

│ ├── stripe.ts

│ ├── validations/ # zod schemas

│ └── utils.ts

├── prisma/

│ ├── schema.prisma

│ ├── seed.ts

│ └── migrations/

├── emails/ # react-email templates

├── public/

└── types/


## Coding Conventions

- Server Components by default; mark Client Components explicitly with 'use client'.
- Use Server Actions for mutations where possible; API routes for webhooks and external integrations.
- Validate all inputs with Zod schemas in lib/validations/.
- Database access only through lib/prisma.ts (single Prisma client instance).
- Auth checks in middleware.ts for protected routes; role checks in page components.
- No business logic in components; extract to lib/services/.
- Type all responses; never use 'any'.

# 4. Information Architecture


## Three Identities, Three URL Trees


### Public Site (no auth required)

/ Home

/program Program overview

/how-it-works User journey

/dossier Living Dossier explainer

/certification Certified TenXPro explainer

/pricing Five-tier pricing table

/directory Public directory (coming-soon at launch)

/directory/[slug] Individual TenXPro profile (post-launch)

/radar Alumni Radar (coming-soon at launch)

/about Founder + philosophy

/apply Application form

/login Login

/register Register (participant)

/terms Terms of service

/privacy Privacy policy

/refund Refund policy


### Participant Portal (/portal/*) — auth: PARTICIPANT role

/portal Dashboard

/portal/starter-pack Starter pack onboarding

/portal/diagnostic Diagnostic intake form

/portal/path Personalized 12-week path

/portal/modules Module list (locked/unlocked)

/portal/modules/[id] Single module view

/portal/dossier Dossier builder (12 sections)

/portal/dossier/[section] Single dossier section editor

/portal/tickets Ticket list

/portal/tickets/new New ticket

/portal/tickets/[id] Ticket thread

/portal/feedback Coach feedback view

/portal/certification Certification status

/portal/profile Profile + directory settings


### Admin Portal (/admin/*) — auth: ADMIN role

/admin Admin dashboard (live KPIs + alerts)

/admin/analytics Analytics & insights dashboard

/admin/analytics/funnel Conversion funnel detail

/admin/analytics/cohorts Cohort engagement detail

/admin/analytics/marketing Marketing attribution detail

/admin/applications Application queue

/admin/applications/[id] Application review

/admin/participants Active participants

/admin/participants/[id] Single participant view

/admin/diagnostics Diagnostic intakes

/admin/paths Personalized paths

/admin/paths/[id] Path builder

/admin/modules Module library (CRUD + versioning)

/admin/modules/[id] Module editor

/admin/dossiers All dossiers

/admin/dossiers/[id] Dossier review + feedback

/admin/tickets All tickets queue

/admin/tickets/[id] Ticket response

/admin/certifications Certification reviews

/admin/certifications/[id] Single certification decision

/admin/badges Badge & rank system management

/admin/directory Directory profile management

/admin/pricing Pricing tier management

/admin/payments Payment records + enrollment

/admin/users User & coach management

/admin/users/[id] Single user (any role)

/admin/email Email templates + sent log

/admin/email/templates Template management

/admin/email/log Sent email log with delivery status

/admin/audit Audit log (every action recorded)

/admin/reports Reports & data exports

/admin/settings Site-wide settings & feature flags


### Public verification (/verify/*)

/verify/[code] Public badge verification page

Anyone with the URL can verify a TenXPro's badge.


## Navigation Components

- PublicNav — shown on all (public) routes. Logo + nav links + Login/Apply CTAs.
- PortalNav — sidebar on /portal/* routes. Participant identity, progress indicator, nav links.
- AdminNav — sidebar on /admin/* routes. Admin identity, role badge, nav links.
- Footer — same on all public routes. Links + brand + legal.

## Layout Wrappers

- PublicLayout — used in app/(public)/layout.tsx. Includes PublicNav + Footer.
- AuthLayout — used in app/(auth)/layout.tsx. Centered card, no nav.
- PortalLayout — used in app/(participant)/portal/layout.tsx. PortalNav sidebar + main content.
- AdminLayout — used in app/(admin)/admin/layout.tsx. AdminNav sidebar + main content.

## Middleware Routing Rules

- /portal/* requires session.user.role === 'PARTICIPANT' or higher; redirect to /login if not.
- /admin/* requires session.user.role === 'ADMIN'; redirect to /login if not, 404 if logged in but not admin.
- /apply checks if applicant already has an active application; if so, redirect to /portal or /login.

# 5. Design System


## Visual Identity

TenXPros must feel like a premium executive education platform — serious, modern, confidence-inspiring. Not playful, not childish, not generic-SaaS. Think Harvard Business School Online crossed with Stripe's design clarity.


## Color Palette


| Name | Hex | Usage | Tailwind |
| --- | --- | --- | --- |
| Navy (Primary) | #1F4E79 | Headings, brand, CTAs | navy-900 |
| Slate Blue | #2E75B6 | Subheadings, accents | slate-600 |
| Soft Gold | #C9A961 | Highlights, badges, awards | gold-500 |
| Off-White | #FAFAFA | Backgrounds | neutral-50 |
| Dark Text | #1A202C | Body text | slate-900 |
| Mid Text | #4A5568 | Secondary text | slate-600 |
| Success | #10B981 | Pass states, certifications | emerald-500 |
| Warning | #F59E0B | Revise states | amber-500 |
| Danger | #EF4444 | Errors, holds | red-500 |


## Typography

- Headings: Inter, font-semibold, tracking-tight. H1: text-4xl/5xl. H2: text-3xl. H3: text-2xl. H4: text-xl.
- Body: Inter, font-normal, leading-relaxed. text-base default. Body-large: text-lg for hero sections.
- Monospace: JetBrains Mono or system monospace for code, IDs, technical fields.
- Numbers/Data: Inter with tabular-nums utility.
- Line-height: leading-relaxed (1.625) for body; leading-tight (1.25) for headings.

## Spacing & Layout

- Container max-width: max-w-7xl with px-6 md:px-8.
- Section vertical padding: py-16 md:py-24 for major sections.
- Card padding: p-6 md:p-8.
- Component spacing: use space-y-* utilities; avoid arbitrary margins.

## Component Patterns

- Buttons: rounded-md, font-medium, smooth transitions. Primary = navy bg + white text. Secondary = white bg + navy border + navy text. Ghost = transparent.
- Cards: bg-white, rounded-lg, border border-neutral-200, shadow-sm. Hover: shadow-md.
- Badges: rounded-full, text-xs, font-semibold, px-3 py-1. Color-coded by status.
- Forms: labels above inputs, font-medium. Inputs: rounded-md, border-neutral-300, focus:ring-2 focus:ring-navy-500.
- Tables: striped rows (alternate bg-neutral-50), navy header row, sticky header for long tables.
- Modals: shadcn Dialog, max-w-2xl default, no overlay click-to-close for destructive actions.

## Status Badge System (used everywhere)

- SUBMITTED — slate-100 / slate-700
- UNDER_REVIEW — blue-100 / blue-700
- ACCEPTED — emerald-100 / emerald-700
- ENROLLED — navy-100 / navy-700
- IN_PROGRESS — amber-100 / amber-700
- PASSED — emerald-100 / emerald-700
- REVISE — amber-100 / amber-800
- HOLD — red-100 / red-700
- CERTIFIED — gold-100 / gold-800 (with gold border)
- CONDITIONALLY_CERTIFIED — amber-100 / amber-800
- NOT_CERTIFIED — slate-100 / slate-600

## Tone of Voice in UI Copy

- Direct and substantive. No hype, no exclamation marks.
- Professional but warm. No corporate jargon.
- Active voice. "Submit your application" not "Applications can be submitted".
- Concrete numbers and outcomes. "12 weeks, 11 modules, 1 Dossier."
- Never apologize for selectivity or pricing. The program is what it is.

# 6. Complete Prisma Schema

This is the complete database schema. All 26 models are defined here. Build phases activate features; the schema itself is built fully on day one.


| Pre-Phase 1: Schema validation pass&lt;br&gt;Before writing any application code, run a schema validation pass: (1) verify all relations are bidirectional where needed, (2) confirm NextAuth Prisma Adapter compatibility (User, Account, Session, VerificationToken all present), (3) run `prisma format` and `prisma validate`, (4) run an initial `prisma migrate dev --name init` against a fresh database, (5) create a minimal seed.ts that creates one admin user and one pricing tier and run it. Only proceed to Phase 1 layout work after this passes cleanly. |
| --- |


## Full schema.prisma

// prisma/schema.prisma

generator client {

provider = "prisma-client-js"

}

datasource db {

provider = "postgresql"

url = env("DATABASE_URL")

}

// ============================================================

// USER & AUTH

// ============================================================

model User {

id String @id @default(cuid())

email String @unique

emailVerified DateTime?

name String?

image String?

role UserRole @default(APPLICANT)

passwordHash String?

createdAt DateTime @default(now())

updatedAt DateTime @updatedAt

application Application?

participantProfile ParticipantProfile?

tickets Ticket[]

ticketMessages TicketMessage[]

directoryProfile DirectoryProfile?

sessions Session[]

accounts Account[]

// Coach relation (self-referential via ParticipantProfile)

coachedParticipants ParticipantProfile[] @relation("CoachParticipants")

// Engagement & system relations

notifications Notification[]

earnedBadges ParticipantBadge[]

auditEntries AuditLog[] @relation("AuditActor")

}

enum UserRole {

APPLICANT

PARTICIPANT

COACH

ADMIN

}

model Account {

id String @id @default(cuid())

userId String

type String

provider String

providerAccountId String

refresh_token String? @db.Text

access_token String? @db.Text

expires_at Int?

token_type String?

scope String?

id_token String? @db.Text

session_state String?

user User @relation(fields: [userId], references: [id], onDelete: Cascade)

@@unique([provider, providerAccountId])

}

model Session {

id String @id @default(cuid())

sessionToken String @unique

userId String

expires DateTime

user User @relation(fields: [userId], references: [id], onDelete: Cascade)

}

// Required by NextAuth Prisma Adapter for email verification and password reset

model VerificationToken {

identifier String

token String @unique

expires DateTime

@@unique([identifier, token])

}

// ============================================================

// APPLICATION

// ============================================================

model Application {

id String @id @default(cuid())

userId String @unique

user User @relation(fields: [userId], references: [id])

fullName String

email String

country String

professionalRole String

domain String

linkedinUrl String?

aiExperience AIExperienceLevel

whyTenXPros String @db.Text

realProblemBrief String @db.Text

dataSensitivity DataSensitivity

timeAvailability TimeAvailability

preferredLanguage String @default("English")

consentConfidentiality Boolean @default(false)

consentTerms Boolean @default(false)

status ApplicationStatus @default(SUBMITTED)

adminNotes String? @db.Text

reviewedAt DateTime?

reviewedBy String?

pricingTierAtApply String? // snapshot

// Marketing attribution (captured at submission)

utmSource String?

utmMedium String?

utmCampaign String?

utmTerm String?

utmContent String?

referrerUrl String?

landingPage String?

// Back relation to payments

payments PaymentRecord[]

createdAt DateTime @default(now())

updatedAt DateTime @updatedAt

}

enum ApplicationStatus {

SUBMITTED

UNDER_REVIEW

ACCEPTED

REVISE_AND_REAPPLY

NOT_ACCEPTED

ENROLLED

}

enum AIExperienceLevel {

BEGINNER

INTERMEDIATE

ADVANCED

}

enum DataSensitivity {

LOW

MODERATE

HIGH

CRITICAL

}

enum TimeAvailability {

HOURS_5

HOURS_8

HOURS_12_PLUS

}

// ============================================================

// PARTICIPANT PROFILE

// ============================================================

model ParticipantProfile {

id String @id @default(cuid())

userId String @unique

user User @relation(fields: [userId], references: [id])

tier CharterTier

cohortNumber Int?

enrolledAt DateTime @default(now())

startsAt DateTime

expectedEndAt DateTime

assignedCoachId String?

assignedCoach User? @relation("CoachParticipants", fields: [assignedCoachId], references: [id])

coachAssignedAt DateTime?

// Onboarding progress tracking

starterPackCompletedAt DateTime?

status ParticipantStatus @default(ONBOARDING)

diagnostic DiagnosticIntake?

path ProgramPath?

dossier Dossier?

certification CertificationReview?

participantModules ParticipantModule[]

// Back relation to payments

payments PaymentRecord[]

createdAt DateTime @default(now())

updatedAt DateTime @updatedAt

}

enum CharterTier {

FOUNDING

EARLY

LATE

FINAL

STANDARD

}

enum ParticipantStatus {

ONBOARDING

DIAGNOSTIC_PENDING

ACTIVE

CAPSTONE

UNDER_REVIEW

CERTIFIED

CONDITIONALLY_CERTIFIED

COMPLETED_NOT_CERTIFIED

NOT_COMPLETED

PAUSED

WITHDRAWN

}

Schema continued:

// ============================================================

// DIAGNOSTIC INTAKE

// ============================================================

// All fields are nullable to support multi-step draft save.

// Final validation (all fields required) is enforced at submission time

// via Zod schema in lib/validations/diagnostic.ts, not at the database level.

model DiagnosticIntake {

id String @id @default(cuid())

participantId String @unique

participant ParticipantProfile @relation(fields: [participantId], references: [id])

// 8 customization dimensions (nullable for draft save)

riskProfile DataSensitivity?

domainRecognition String?

solutionPatternHint String?

aiLiteracyLevel AIExperienceLevel?

stakeholderComplexity StakeholderComplexity?

industryRegulatoryWeight RegulatoryWeight?

timeAvailability TimeAvailability?

outputType OutputType?

// detailed responses (nullable for draft save)

problemContext String? @db.Text

problemClarity String? @db.Text

successCriteria String? @db.Text

organizationalContext String? @db.Text

goals String? @db.Text

supportNeeds String? @db.Text

// draft progress tracking

currentStep Int @default(1)

isComplete Boolean @default(false)

submittedAt DateTime?

reviewedAt DateTime?

createdAt DateTime @default(now())

updatedAt DateTime @updatedAt

}

enum StakeholderComplexity {

SOLO

SMALL_TEAM

DEPARTMENT

MULTI_STAKEHOLDER

}

enum RegulatoryWeight {

LIGHT

MODERATE

HEAVY

}

enum OutputType {

INTERNAL

CLIENT_FACING

PUBLIC_FACING

REGULATED

}

// ============================================================

// PROGRAM PATH

// ============================================================

model ProgramPath {

id String @id @default(cuid())

participantId String @unique

participant ParticipantProfile @relation(fields: [participantId], references: [id])

customizationNotes String? @db.Text

generatedAt DateTime?

approvedByAdmin Boolean @default(false)

approvedAt DateTime?

createdAt DateTime @default(now())

updatedAt DateTime @updatedAt

}

// ============================================================

// MODULES (library)

// ============================================================

model Module {

id String @id @default(cuid())

number Int // 1-11 (not unique alone — see @@unique below)

phase ProgramPhase

title String

coreQuestion String @db.Text

description String @db.Text

learningObjectives Json

contentMaterials Json

exercises Json

artifactTemplate String @db.Text

passCriteria String @db.Text

badgeName String

estimatedHours Float

// Version control: participants are locked to the version they started with

// (snapshot in ParticipantModule.moduleVersion). isActive controls whether new

// participants get this version when their path is generated.

version Int @default(1)

isActive Boolean @default(true)

createdAt DateTime @default(now())

updatedAt DateTime @updatedAt

participantModules ParticipantModule[]

@@unique([number, version])

}

enum ProgramPhase {

FRAME

DESIGN

PROVE

FORESEE

}

model ParticipantModule {

id String @id @default(cuid())

participantId String

participant ParticipantProfile @relation(fields: [participantId], references: [id])

moduleId String

module Module @relation(fields: [moduleId], references: [id])

status ModuleStatus @default(LOCKED)

unlockedAt DateTime?

startedAt DateTime?

submittedAt DateTime?

passedAt DateTime?

artifactContent String? @db.Text

artifactUrl String?

coachFeedback String? @db.Text

feedbackAt DateTime?

feedbackBy String?

revisionCount Int @default(0)

badgeEarned Boolean @default(false)

// Path Builder personalization (set by admin during path approval)

customizationNotes String? @db.Text

emphasisLevel ModuleEmphasis @default(STANDARD)

additionalReadings Json? // structured list of {title, url, note}

// Module version snapshot (locks participant to the module version they started with)

moduleVersion Int @default(1)

createdAt DateTime @default(now())

updatedAt DateTime @updatedAt

@@unique([participantId, moduleId])

}

enum ModuleStatus {

LOCKED

UNLOCKED

IN_PROGRESS

SUBMITTED

PASSED

REVISE

REMEDIAL

HOLD

}

enum ModuleEmphasis {

LIGHT

STANDARD

EXTENDED

}

Schema continued:

// ============================================================

// DOSSIER

// ============================================================

model Dossier {

id String @id @default(cuid())

participantId String @unique

participant ParticipantProfile @relation(fields: [participantId], references: [id])

title String?

summary String? @db.Text

finalizedAt DateTime?

sections DossierSection[]

createdAt DateTime @default(now())

updatedAt DateTime @updatedAt

}

model DossierSection {

id String @id @default(cuid())

dossierId String

dossier Dossier @relation(fields: [dossierId], references: [id])

sectionType DossierSectionType

order Int

content String @db.Text

status DossierSectionStatus @default(DRAFT)

lastEditedAt DateTime?

reviewedAt DateTime?

feedback Feedback[]

createdAt DateTime @default(now())

updatedAt DateTime @updatedAt

@@unique([dossierId, sectionType])

}

enum DossierSectionType {

PROFESSIONAL_CONTEXT

PROBLEM_DEFINITION

AI_SUITABILITY

CONTEXT_STAKEHOLDER_FORESIGHT

DATA_EVIDENCE

WORKFLOW_BEFORE_AFTER

RISK_ETHICS_PRIVACY

RESPONSIBLE_SOLUTION_DESIGN

ADOPTION_COMMUNICATION

VALUE_ROADMAP_PROOF

PERSONAL_FORESIGHT_PLAN

FINAL_RECOMMENDATION

}

enum DossierSectionStatus {

DRAFT

SUBMITTED

REVIEWED

REVISED

APPROVED

}

// ============================================================

// TICKETS

// ============================================================

model Ticket {

id String @id @default(cuid())

userId String

user User @relation(fields: [userId], references: [id])

subject String

category TicketCategory

status TicketStatus @default(OPEN)

priority TicketPriority @default(NORMAL)

assignedToId String?

closedAt DateTime?

messages TicketMessage[]

createdAt DateTime @default(now())

updatedAt DateTime @updatedAt

}

enum TicketCategory {

MODULE_QUESTION

DOSSIER_HELP

AI_SUITABILITY

EVIDENCE

WORKFLOW

FORESIGHT

CAPSTONE

TECHNICAL

OTHER

}

enum TicketStatus {

OPEN

WAITING_RESPONSE

AWAITING_PARTICIPANT

RESOLVED

CLOSED

}

enum TicketPriority {

LOW

NORMAL

HIGH

}

model TicketMessage {

id String @id @default(cuid())

ticketId String

ticket Ticket @relation(fields: [ticketId], references: [id])

userId String

user User @relation(fields: [userId], references: [id])

body String @db.Text

attachmentUrl String?

createdAt DateTime @default(now())

}

// ============================================================

// FEEDBACK (section-level at launch; inline annotation is a post-launch enhancement)

// ============================================================

model Feedback {

id String @id @default(cuid())

dossierSectionId String?

dossierSection DossierSection? @relation(fields: [dossierSectionId], references: [id])

type FeedbackType

content String @db.Text

authorId String

authorName String

createdAt DateTime @default(now())

}

enum FeedbackType {

MILESTONE

GENERAL

REVISION_REQUEST

APPROVAL

}

// ============================================================

// CERTIFICATION

// ============================================================

model CertificationReview {

id String @id @default(cuid())

participantId String @unique

participant ParticipantProfile @relation(fields: [participantId], references: [id])

outcome CertificationOutcome

rubricScores Json

reviewerNotes String @db.Text

reviewedBy String

reviewedAt DateTime @default(now())

badgeIssuedAt DateTime?

certificateUrl String?

createdAt DateTime @default(now())

updatedAt DateTime @updatedAt

}

enum CertificationOutcome {

CERTIFIED

CONDITIONALLY_CERTIFIED

COMPLETED_NOT_CERTIFIED

NOT_COMPLETED

}

// ============================================================

// DIRECTORY

// ============================================================

model DirectoryProfile {

id String @id @default(cuid())

userId String @unique

user User @relation(fields: [userId], references: [id])

slug String @unique

displayName String

title String

domain String

bio String @db.Text

photoUrl String?

location String?

languages String[]

availability AvailabilityStatus @default(NOT_AVAILABLE)

availableFor String[]

linkedinUrl String?

websiteUrl String?

contactEmail String?

isPublic Boolean @default(false)

isFeatured Boolean @default(false)

createdAt DateTime @default(now())

updatedAt DateTime @updatedAt

}

enum AvailabilityStatus {

AVAILABLE

LIMITED

NOT_AVAILABLE

}

// ============================================================

// PRICING & PAYMENT

// ============================================================

model PricingTier {

id String @id @default(cuid())

name String @unique

tier CharterTier

price Int

membersLimit Int

membersCount Int @default(0)

isActive Boolean @default(false)

openedAt DateTime?

closedAt DateTime?

benefits Json

createdAt DateTime @default(now())

updatedAt DateTime @updatedAt

}

model PaymentRecord {

id String @id @default(cuid())

applicationId String?

application Application? @relation(fields: [applicationId], references: [id])

participantId String?

participant ParticipantProfile? @relation(fields: [participantId], references: [id])

amount Int

currency String @default("USD")

stripeSessionId String? @unique

stripeChargeId String? @unique

status PaymentStatus

paidAt DateTime?

createdAt DateTime @default(now())

updatedAt DateTime @updatedAt

}

enum PaymentStatus {

PENDING

PAID

FAILED

REFUNDED

}

// ============================================================

// EMAIL EVENTS

// ============================================================

// Schema present from day one; logging activated in Phase 4.

model EmailEvent {

id String @id @default(cuid())

to String

subject String

template String

status String

error String? @db.Text

sentAt DateTime?

createdAt DateTime @default(now())

}

// ============================================================

// ANALYTICS & SITE EVENTS

// ============================================================

// Captures both authenticated and anonymous events for product, marketing, and ops analytics.

// External analytics (PostHog/Plausible) handle page views and high-volume events.

// This model captures business-critical events that admins query directly in the dashboard.

model SiteEvent {

id String @id @default(cuid())

userId String? // null for anonymous visitors

sessionId String?

eventType String // see enum-like constants in lib/analytics/events.ts

eventData Json?

url String?

referrer String?

userAgent String?

ipHash String? // hashed for privacy

createdAt DateTime @default(now())

@@index([eventType])

@@index([userId])

@@index([createdAt])

}

// Standard event type constants (defined in lib/analytics/events.ts):

// PAGE_VIEW, CTA_CLICK_APPLY, CTA_CLICK_PRICING, APPLICATION_STARTED,

// APPLICATION_SUBMITTED, APPLICATION_ACCEPTED, PAYMENT_INITIATED, ENROLLMENT_COMPLETED,

// STARTER_PACK_COMPLETED, DIAGNOSTIC_STARTED, DIAGNOSTIC_SUBMITTED, MODULE_STARTED,

// MODULE_SUBMITTED, MODULE_PASSED, DOSSIER_SECTION_SAVED, DOSSIER_SECTION_SUBMITTED,

// CAPSTONE_SUBMITTED, CERTIFICATION_DECISION, TICKET_CREATED, EMAIL_OPENED, EMAIL_CLICKED.

// ============================================================

// NOTIFICATIONS

// ============================================================

model Notification {

id String @id @default(cuid())

userId String

user User @relation(fields: [userId], references: [id], onDelete: Cascade)

type NotificationType

title String

body String @db.Text

url String? // deep link into portal/admin

isRead Boolean @default(false)

readAt DateTime?

createdAt DateTime @default(now())

@@index([userId, isRead])

}

enum NotificationType {

MODULE_UNLOCKED

COACH_FEEDBACK

REVISION_REQUESTED

TICKET_RESPONSE

CERTIFICATION_DECISION

DOSSIER_REVIEWED

BADGE_EARNED

ANNOUNCEMENT

SYSTEM

}

// ============================================================

// BADGES & RANKS

// ============================================================

model Badge {

id String @id @default(cuid())

slug String @unique // e.g., "tenx-mindset", "rank-ai-ready-professional"

name String

description String @db.Text

category BadgeCategory

iconUrl String?

color String? // hex

order Int @default(0)

isActive Boolean @default(true)

participantBadges ParticipantBadge[]

createdAt DateTime @default(now())

updatedAt DateTime @updatedAt

}

enum BadgeCategory {

MODULE // 11 per-module badges (TenX Mindset, AI Core, Frame Badge, etc.)

RANK // 3 ranks (AI-Ready Professional, AI Problem Solver, Future-Ready)

CAPSTONE // Capstone Seal

SPECIAL // Foresight Strategist, Founding Member, future special badges

}

model ParticipantBadge {

id String @id @default(cuid())

userId String

user User @relation(fields: [userId], references: [id], onDelete: Cascade)

badgeId String

badge Badge @relation(fields: [badgeId], references: [id])

// Public verification: each issued badge has a unique URL at /verify/[verificationCode]

verificationCode String @unique @default(cuid())

earnedAt DateTime @default(now())

isPublic Boolean @default(true)

// Optional context (which module/path triggered this badge)

contextType String? // "MODULE", "RANK", "CAPSTONE"

contextRef String? // module id, rank slug, capstone id

@@unique([userId, badgeId])

@@index([verificationCode])

}

// ============================================================

// AUDIT LOG

// ============================================================

// Records every state change and admin action for accountability and forensics.

// Used to populate /admin/audit log view.

model AuditLog {

id String @id @default(cuid())

actorId String? // user who performed the action; null for system actions

actor User? @relation("AuditActor", fields: [actorId], references: [id])

actorRole String? // snapshot of role at time of action

action String // CREATE, UPDATE, DELETE, STATUS_CHANGE, LOGIN, EXPORT, etc.

entity String // model name (Application, ParticipantProfile, Dossier, etc.)

entityId String?

changes Json? // { before: {...}, after: {...} } for updates

metadata Json? // additional context

ipHash String?

userAgent String?

createdAt DateTime @default(now())

@@index([entity, entityId])

@@index([actorId])

@@index([createdAt])

}

// ============================================================

// ADMIN SETTINGS

// ============================================================

// Key-value store for site-wide configuration adjustable by admin without code changes.

// Examples: maintenance_mode, application_paused, current_active_tier, brand_logo_url,

// loyalty_discount_percentages, support_response_sla_hours.

model AdminSetting {

id String @id @default(cuid())

key String @unique

value String @db.Text

category String // GENERAL, EMAIL, PRICING, FEATURE_FLAGS, BRANDING

label String? // human-readable label for admin UI

isPublic Boolean @default(false) // can be read by public site (e.g., brand colors)

updatedAt DateTime @updatedAt

updatedBy String?

}


## Schema Notes for Implementation

- VerificationToken is required by NextAuth Prisma Adapter — do not skip it. Used for email verification and password reset flows.
- EmailEvent schema is present from day one but logging is activated only in Phase 4. Earlier phases may pass emails through without DB logging.
- PaymentRecord has nullable relations to both Application and ParticipantProfile because payment can be tied to either depending on the lifecycle stage.
- The coach relation on ParticipantProfile uses the named relation 'CoachParticipants' to avoid ambiguity with the user relation.
- DiagnosticIntake fields are deliberately nullable to support multi-step draft save. Final validation (all required fields present) is enforced at submission time via Zod schema, not the database. The isComplete flag and currentStep track draft progress.
- ParticipantModule includes customizationNotes, emphasisLevel (LIGHT / STANDARD / EXTENDED), and additionalReadings — these are set by the admin during Path Builder approval and surfaced to the participant in their personalized path.
- Module is versioned via (number, version) composite unique. Participants are locked to the version they started with through ParticipantModule.moduleVersion. isActive on Module controls which version new participants receive when their path is generated.
- ParticipantProfile.starterPackCompletedAt tracks Starter Pack completion. The Diagnostic Intake page is gated behind this completion.
- Participant current week is COMPUTED from startsAt and current date — not stored. Formula: Math.ceil((now - startsAt) / 7 days), clamped to [1, 12]. This avoids data drift and ensures consistency.
- Dossier Feedback at launch is section-level only. Inline annotation (anchorText, anchorStart, anchorEnd, status) is a post-launch enhancement and intentionally not in the launch schema.
- Application captures UTM and referrer fields at submission time for marketing attribution. Capture happens from URL query params and document.referrer on /apply load (stored in sessionStorage and submitted with the form).
- SiteEvent is the flexible event log for analytics. High-volume events (page views, scrolls) go to PostHog/Plausible; business-critical events (application stages, module completions, certification decisions) also go to SiteEvent so admin can query them directly.
- Notification powers in-portal notifications. Created by server actions when meaningful events happen. Read state tracked per user.
- Badge and ParticipantBadge implement the rank/badge system as first-class entities. Each ParticipantBadge has a unique verificationCode that produces a public verification URL at /verify/[code]. Badges are seeded during schema initialization.
- AuditLog captures every admin action, status change, and significant participant event. Populates the /admin/audit view. Never deleted; retained indefinitely.
- AdminSetting is a key-value store for site-wide configuration (active tier, feature flags, branding) that admin can change without code deploys.

# 7. Authentication & Authorization


## Auth Provider

Use NextAuth (Auth.js) v5 with Prisma adapter. Credentials provider for email/password initially; Google OAuth can be added in Phase 4.


## User Roles

- APPLICANT — created when someone submits an application. Cannot access /portal or /admin.
- PARTICIPANT — promoted from APPLICANT when admin enrolls them after payment. Can access /portal.
- COACH — assigned by admin. Can access limited admin views for their assigned participants.
- ADMIN — full access to /admin/*. Only the founder at launch.

## Auth Flow at Launch

- Visitor goes to /apply.
- Submits application — User created with role APPLICANT.
- Email confirmation sent.
- Admin reviews; sets ACCEPTED or other status.
- On ACCEPTED: admin sends Stripe Payment Link via email.
- After payment: admin manually marks application ENROLLED and promotes user to PARTICIPANT.
- Welcome email sent with login credentials reset link.
- Participant logs in at /login, redirects to /portal.

## Middleware Rules (middleware.ts)

// middleware.ts

import { auth } from "@/lib/auth";

export default auth((req) => {

const { nextUrl, auth: session } = req;

const path = nextUrl.pathname;

// /portal/* requires PARTICIPANT, COACH, or ADMIN

if (path.startsWith("/portal")) {

if (!session) return Response.redirect(new URL("/login", nextUrl));

if (!["PARTICIPANT", "COACH", "ADMIN"].includes(session.user.role)) {

return Response.redirect(new URL("/", nextUrl));

}

}

// /admin/* requires ADMIN only

if (path.startsWith("/admin")) {

if (!session) return Response.redirect(new URL("/login", nextUrl));

if (session.user.role !== "ADMIN") {

return new Response("Not Found", { status: 404 });

}

}

});

export const config = {

matcher: ["/portal/:path*", "/admin/:path*"]

};


## Session Object

- session.user.id — user id
- session.user.email — email
- session.user.name — name
- session.user.role — UserRole enum
- session.user.participantId — set if user is a PARTICIPANT, null otherwise

## Password Reset

- Standard flow: enter email → token email → reset form → new password.
- Tokens stored in database with 1-hour expiry.
- After admin enrolls a participant, system sends them a password reset link to set their password.

# 8. Public Site — Page Specifications

Each public page below has a clear purpose, structure, and content. Build them in order. Use placeholder copy where final marketing copy is not yet written, but structure must match this spec.


## 8.1 Home (/)

Goal: convey the program identity and route serious prospects to Apply.

Sections (top to bottom):

- Hero: full-width navy bg. Headline 'You bring the domain. We bring the AI method.' Subhead: '12-week certification for serious professionals.' Two CTAs: 'Apply for Founding Charter' (primary) and 'How it works' (ghost).
- Three Questions strip: 'Where do I start? — How do I do it? — How do I evaluate and improve it?' with brief descriptions.
- Program overview: 4 phases (Frame, Design, Prove, Foresee) shown as a horizontal timeline with brief description of each.
- The Dossier section: explain Living AI Solution Dossier in 3-4 sentences with link to /dossier.
- Who this is for: list of professional categories (consultants, trainers, managers, founders, researchers, high-accountability roles).
- Founding Charter CTA card: $997 for first 10. Time to apply. Link to /pricing.
- Founder note: brief intro to the founder and the doctoral research foundation.
- Final CTA: 'Apply for Founding Charter' with note that admission is selective.

## 8.2 Program (/program)

Sections:

- Hero: 'The 12-week TenXPros Charter Program'.
- The 4 phases expanded: each phase has its weeks, learning focus, and key outputs.
- The 11 modules listed with their core questions and badges.
- The Capstone explained: integration of all 11 modules into the Dossier.
- Coach support: explanation of personal coach model.
- Delivery format: async-first, weekly unlocks, no mandatory live.
- Footer CTA to /apply.

## 8.3 How It Works (/how-it-works)

Sections:

- Hero: 'The journey from Pro to Certified TenXPro.'
- Step-by-step journey visualization: Apply → Admission → Starter Pack → Diagnostic → Personalized Path → Coach Assignment → 11 Modules → Living Dossier → Capstone → Certified TenXPro → Directory → Radar.
- Each step has a card with: name, brief description, what the participant does, what they receive.
- Timeline overview showing 12 weeks broken into phases.
- Footer CTA to /apply.

## 8.4 Dossier (/dossier)

Sections:

- Hero: 'The Living AI Solution Dossier.'
- Explanation: what makes it Living, why it is not a course portfolio.
- The 12 sections of the Dossier listed with brief descriptions of each.
- How it grows across the 11 modules.
- Why this is what makes TenXPros different from courses.
- Example placeholder: 'Sample Dossier coming soon as first cohort completes.'
- Footer CTA to /apply.

## 8.5 Certification (/certification)

Sections:

- Hero: 'Certified TenXPro: AI-Ready Problem Solver, Responsible AI Solution Designer, Strategic Foresight Practitioner.'
- What the credential signals (the 12 capabilities).
- The 3 ranks explained (AI-Ready Professional, AI Problem Solver & Solution Designer, Future-Ready AI Solution Designer).
- Badge gallery: all 11 module badges + Foresight Strategist + Capstone Seal.
- The 4 possible outcomes (Certified, Conditionally, Completed Not Certified, Not Completed).
- Why this is harder than a certificate of attendance — and why that matters.
- Footer CTA to /apply.

## 8.6 Pricing (/pricing)

Sections:

- Hero: 'Five-tier charter pricing. Honest scarcity. Transparent transitions.'
- Active tier card prominent: Founding Charter $997, 1-10 members, founder-led coaching. CTA: Apply.
- Upcoming tiers shown smaller, in order. Each shows price, member range, status 'Opens after previous tier closes.'
- What is included (list).
- Charter benefits table by tier (loyalty discount %, updates duration).
- Add-on services table.
- Refund policy summary with link to /refund.
- FAQ accordion: payment plans, refunds, what if I miss a module, what if I don't get certified, etc.

## 8.7 Directory (/directory)

At launch this page is functional but shows an empty state.

Sections:

- Hero: 'The TenXPros Directory.'
- Explainer: what the Directory is, who is featured, how organizations use it.
- Coming-soon banner at launch: 'Profiles launching with first certified graduates. Check back after [Month X].'
- Once profiles exist: searchable grid with filters by domain, location, availability.
- Footer CTA: for visitors: 'See more after first cohort completes.' For prospects: 'Apply to join.'

## 8.8 Radar (/radar)

At launch this page is informational only.

Sections:

- Hero: 'TenXPro Radar — alumni-only ongoing intelligence.'
- Explainer: what Radar is, what it includes, who it is for.
- Pricing: $99/month, alumni-only.
- Launch status: 'Radar opens after the first cohort completes — approximately Month 6-9 of the program's life.'

## 8.9 About (/about)

Sections:

- Hero: 'Why TenXPros exists.'
- The founder's story: doctoral research in workforce learning and AI adoption, what was missing from existing certifications.
- The philosophy: partnership of domain and AI, not lecturer-and-student.
- The methodology origin: how the 11 modules and Dossier structure were designed.
- Contact and connect.

## 8.10 Apply (/apply)

This is the most important conversion page. See Section 9 for the full application flow.

Sections:

- Hero: 'Apply for the Founding Charter.'
- Quality filter notice: not every applicant is admitted; admission decisions within 2-3 business days.
- The application form (see Section 9.2).
- Confidentiality notice.

# 9. Application Flow & Admission System


## 9.1 Application Statuses

- SUBMITTED — initial state after form submission.
- UNDER_REVIEW — admin opens the application; first review notes added.
- ACCEPTED — admin decides to accept; payment link sent.
- REVISE_AND_REAPPLY — applicant has potential but application needs more clarity.
- NOT_ACCEPTED — final negative decision.
- ENROLLED — payment received and applicant promoted to PARTICIPANT.

## 9.2 Application Form Fields


### Section A — Identity

- Full name (required)
- Email (required, unique)
- Country (required, dropdown)
- Preferred language (required, dropdown: English / other)
- LinkedIn URL (optional but encouraged)

### Section B — Professional Background

- Current role (required, text)
- Field or domain (required, dropdown + free text)
- Years of professional experience (required, range select)
- Organization context (required, options: Solo independent / Small team / Department / Multi-stakeholder organization)

### Section C — AI Context

- AI experience level (required, options: Beginner / Intermediate / Advanced)
- AI tools used (multi-select: ChatGPT, Claude, Gemini, NotebookLM, Custom GPTs, Agentic tools, Other)
- Brief description of how AI has been used in your work so far (optional, textarea, 500 chars max)

### Section D — The Problem

- Initial problem brief (required, textarea, 200-1000 chars): 'Describe a real professional problem you would bring into the program.'
- Why this problem matters (required, textarea, 100-500 chars)
- Data sensitivity exposure (required, options: Low / Moderate / High / Critical)
- Stakeholders involved (required, textarea, 100-300 chars)

### Section E — Commitment

- Time availability per week (required, options: 5 hrs / 8 hrs / 12+ hrs)
- Desired start date (required, date)
- Why TenXPros — what outcomes are you seeking (required, textarea, 200-800 chars)

### Section F — Consent

- Confidentiality acknowledgment checkbox (required)
- Terms of service acceptance checkbox (required)
- Privacy policy acknowledgment checkbox (required)

## 9.3 Submission Flow

- Visitor on /apply fills form. Form uses React Hook Form + Zod for validation.
- On submit: POST to /api/applications or Server Action.
- Create User with role=APPLICANT if email is new; otherwise check for existing application.
- Create Application record with status=SUBMITTED.
- Send confirmation email to applicant (template in Section 14).
- Send admin notification email.
- Redirect to /apply/thank-you with submission summary.

## 9.4 Admin Review Flow

- Admin sees new application in /admin/applications queue.
- Clicks into /admin/applications/[id].
- Sees full application data + admin notes field.
- Can update status with required justification note.
- On ACCEPTED: admin clicks 'Send Payment Link' which triggers email with Stripe Payment Link (manual paste of link initially).
- On payment confirmed: admin manually marks ENROLLED, which creates ParticipantProfile and promotes user role.
- System sends welcome email with password setup link.

## 9.5 Edge Cases

- Duplicate applications: if an existing User has a non-terminal application, block new submission and show: 'You already have an application in progress.'
- REVISE_AND_REAPPLY: applicant can edit and resubmit. Status returns to SUBMITTED.
- Tier capacity: if Founding Charter is full, application form shows banner and disables submission for that tier; switches to next tier.
- Late drop: if an enrolled participant withdraws, their tier slot does NOT reopen (this prevents gaming the tier system).

# 10. Participant Portal — Page Specifications

The participant portal is where the 12-week journey happens. Every page here is gated behind authentication and the PARTICIPANT role.


## 10.1 Portal Layout

- Sidebar navigation on the left with the participant's name, tier badge, and current week number (computed from startsAt and now, not stored).
- Main content area on the right.
- Top bar with notifications icon, profile dropdown, logout.
- Progress strip across the top of every page showing 12-week timeline with current position highlighted.

## 10.2 Dashboard (/portal)

Sections:

- Welcome banner with participant name and current week.
- 'Next action' card prominent: e.g., 'Complete your Diagnostic Intake' or 'Start Module 3' or 'Submit Capstone'.
- Module progress grid: 11 module cards showing status (locked, unlocked, in progress, submitted, passed, revise).
- Dossier completeness widget: 12 sections, percent complete.
- Recent feedback from coach (last 3 items).
- Open tickets summary.
- Certification status badge with link to /portal/certification.

## 10.3 Starter Pack (/portal/starter-pack)

Structure:

- Read-only document with navigation sidebar of sub-sections.
- Sub-sections: What is TenXPros, What is a TenXPro, The 11 Modules, The Dossier, How Assessment Works, Coach & Community, Confidentiality Rules, AI Usage Guidelines, Preparing for the Diagnostic.
- Mark-as-read tracking; participant must complete Starter Pack before unlocking Diagnostic Intake.
- Completion checkbox at bottom.

## 10.4 Diagnostic Intake (/portal/diagnostic)

Structure:

- Multi-step form (5-7 steps) with progress indicator at top.
- Step 1: Role and professional domain deep-dive.
- Step 2: AI literacy assessment with specific tool fluency questions.
- Step 3: Problem clarity and underlying drivers.
- Step 4: Risk exposure (privacy, compliance, security, ethical).
- Step 5: Stakeholder context and adoption complexity.
- Step 6: Goals and success criteria.
- Step 7: Confirm and submit.
- Each step saves as draft on next-click; participant can return and continue.
- On final submit: status changes to DIAGNOSTIC_PENDING; admin reviews and assigns path.

## 10.5 Personalized Path (/portal/path)

Structure:

- Shown after admin has approved the path.
- Visual 12-week timeline showing all 11 modules with personalized notes.
- For each module: estimated hours, key focus areas tailored to participant, dependencies.
- Customization summary: which Risk Profile, Domain Recognition, Solution Pattern, etc. apply.
- Download as PDF option.

## 10.6 Modules List (/portal/modules)

Structure:

- Grid of 11 module cards in order.
- Each card shows: number, title, phase, status badge, estimated hours, badge to earn.
- Locked modules grayed out with unlock criteria shown.
- Hover state shows brief description.

## 10.7 Single Module (/portal/modules/[id])

Structure:

- Module header with title, phase, core question.
- Tabs: Learn / Exercise / Submit / Feedback.
Learn tab:

- Learning objectives list.
- Content sections (MDX rendered) — readings, embedded videos, examples.
- Resources and references.
Exercise tab:

- Hands-on activities specific to module.
- Worked examples.
- Reflection prompts.
Submit tab:

- Artifact submission area: rich text editor + optional file upload.
- Pass criteria displayed.
- Auto-save draft.
- Submit for review button.
Feedback tab:

- Coach feedback history.
- Revision requests with required actions.

## 10.8 Dossier Builder (/portal/dossier)

This is the central artifact. See Section 11 for the full Dossier Builder specification.


## 10.9 Tickets List (/portal/tickets)

Structure:

- Table of participant's tickets with subject, category, status, last update.
- Filter by status.
- 'New Ticket' button (disabled if at fair-use limit).
- Fair-use indicator: 'X of 3 active tickets this week.'

## 10.10 New Ticket (/portal/tickets/new)

Form:

- Subject (required)
- Category (required, dropdown from TicketCategory enum)
- Priority (optional, default NORMAL)
- Body (required, rich text)
- Attachment (optional)

## 10.11 Single Ticket (/portal/tickets/[id])

Structure:

- Ticket thread view: messages in chronological order.
- Participant and coach messages visually distinguished.
- Reply box at bottom.
- Close ticket button (with confirmation).

## 10.12 Certification Status (/portal/certification)

Structure:

- Current status displayed prominently.
- If pre-Capstone: progress toward certification eligibility.
- If under review: 'Your Dossier is being reviewed. Expected decision: [date].'
- If certified: full certificate display, badge collection, Directory profile setup link.
- If conditional: revision requirements clearly listed with deadline.
- If not certified: gentle messaging explaining what was missing, re-entry option.

## 10.13 Profile & Directory Settings (/portal/profile)

The profile page is where participants curate their public identity as a TenXPro. After certification, this is the primary surface for their professional presence. Pre-certification, it's where they set up everything that activates the moment they pass.

Profile Completion Meter (top of page):

- Visual percentage indicator (0-100%) of profile completion.
- Components: photo (10%), bio (15%), location (5%), languages (5%), title (10%), availability set (10%), LinkedIn (10%), website (5%), certified status (30%).
- Each incomplete item linked to its edit location.
- Encouragement message at top: 'Complete your profile to maximize Directory visibility once certified.'
Personal Information section:

- Display name (defaults to legal name; can be edited).
- Email (read-only; change via separate flow).
- Photo upload (drag-and-drop, 5MB max, square crop).
- Location (city, country).
- Languages spoken (multi-select).
- Pronouns (optional).
Professional Identity section:

- Public title (e.g., 'Pediatric Pulmonologist & AI-Ready Practitioner').
- Domain (auto-populated from application; editable).
- Bio (rich text, 200-1000 chars). Help text: 'How would you describe yourself to a colleague who could refer you work?'
- Years of experience.
- Specializations (free tags).
Badges & Achievements section:

- Grid of all badges earned (ParticipantBadge records).
- Each badge shows: icon, name, earned date, public/private toggle.
- Click badge to see: full description, public verification URL (with copy button), share-to-LinkedIn button.
- Locked badges (not yet earned) shown grayed with name and 'how to earn' tooltip — gives participant a roadmap.
- Special section for ranks: AI-Ready Professional → AI Problem Solver & Solution Designer → Future-Ready AI Solution Designer (progression visual).
Achievement Timeline:

- Vertical timeline showing milestones earned: enrollment date, starter pack completed, diagnostic submitted, first module passed, each subsequent module, capstone submitted, certified.
- Each item has date and optional snapshot.
- Helps participant feel progress; helps in shareable LinkedIn moments.
Directory Profile section (visibility-gated):

- Section is read-only until CERTIFIED status, with banner 'Your Directory profile activates upon certification.'
- Once certified: full editor for public profile.
- Availability status (AVAILABLE, LIMITED, NOT_AVAILABLE).
- Available for (multi-select): consulting, coaching, projects, employment, speaking, collaborations.
- Public LinkedIn URL.
- Public website URL.
- Contact email (mediated through TenXPros; not displayed publicly).
- Profile slug (e.g., /directory/david-mehrjuyi-md) — auto-generated, editable once.
Public Preview:

- Live preview of how the Directory profile will appear to public visitors.
- Updates as participant edits.
- 'Open public page' button (opens /directory/[slug] in new tab after certification).
Verification & Sharing:

- Section showing all earned badge verification URLs.
- 'Add to LinkedIn' helpers: pre-formatted text for credential and per-badge posts.
- Download certificate PDF (post-certification).
Privacy Controls section:

- Directory profile visibility (master toggle).
- Per-badge visibility (individual control).
- Show in featured section (admin-controlled, displayed as status).
- Anonymized Dossier sharing consent (for case study use; opt-in).
Account section:

- Password change.
- Two-factor authentication (post-launch enhancement).
- Notification preferences (email, in-portal, frequency).
- Connected accounts (LinkedIn OAuth if added post-launch).
- Data export (download all personal data per GDPR).
- Account deletion request (initiates 30-day removal process).

# 11. Dossier Builder (Detailed)

The Dossier Builder is the most important UI in the participant portal. It is where the Living AI Solution Dossier is built section by section across the 12 weeks. This page is where the credential is earned.


## 11.1 Dossier Builder Layout

- Left sidebar: list of 12 Dossier sections with status indicators (Draft, Submitted, Reviewed, Revised, Approved).
- Main area: rich text editor for the selected section.
- Right sidebar: section guidance, related module reference, feedback history.
- Top bar: Dossier title, last saved timestamp, completeness percentage.
- Bottom bar: Save Draft, Submit for Review, Preview Full Dossier.

## 11.2 The 12 Dossier Sections


### Section 1: Professional Context

- Linked to: pre-program intake.
- Content: who the participant is, their field, their role, their organizational context.
- Pre-filled from Diagnostic Intake; participant refines.

### Section 2: Problem Definition

- Linked to: Module 4 (Problem Discovery & Structured Framing).
- Content: the real problem, framed structurally with root drivers, stakeholders affected, cost of inaction.

### Section 3: AI Suitability Assessment

- Linked to: Modules 2 (AI Literacy) and 3 (Responsible AI).
- Content: assessment of whether and where AI is appropriate for this problem.

### Section 4: Context, Stakeholder & Initial Foresight Analysis

- Linked to: Module 5.
- Content: environment, affected parties, initial AI signals to watch, market and regulatory context.

### Section 5: Data & Evidence Review

- Linked to: Module 6.
- Content: what is known, what is assumed, evidence table, claim ledger, verification approach.

### Section 6: Workflow Before / After

- Linked to: Module 7.
- Content: current workflow map, proposed workflow map with AI integration, human-AI allocation matrix.

### Section 7: Risk, Ethics, Privacy & Compliance Review

- Linked to: Modules 3 and 8.
- Content: full risk treatment, privacy considerations, compliance requirements, ethical red lines, mitigation strategies.

### Section 8: Responsible AI Solution Design

- Linked to: Module 8.
- Content: the proposed AI-enabled solution, its safeguards, human oversight design, escalation paths, failure modes.

### Section 9: Adoption & Communication Plan

- Linked to: Module 9.
- Content: stakeholder communication, training plan, change management, behavior change strategy, adoption signals.

### Section 10: Value, Roadmap & Proof Plan

- Linked to: Module 10.
- Content: value drivers, KPIs, baseline definitions, proof plan, roadmap, continue/pivot/stop logic.

### Section 11: Personal AI Foresight Plan

- Linked to: Module 11.
- Content: 3-4 plausible scenarios, signals to monitor, regulatory horizon, strategic position, 24-month update discipline.

### Section 12: Final Recommendation

- Linked to: Capstone integration.
- Content: the participant's professional position, defensible recommendation, summary of evidence, confidence level.

## 11.3 Section Status Flow

- DRAFT — participant is editing. Auto-saves every 30 seconds.
- SUBMITTED — participant clicks 'Submit for Review.' Coach is notified. Section is locked for editing.
- REVIEWED — coach has given feedback. Participant can revise.
- REVISED — participant has edited and resubmitted.
- APPROVED — coach has approved. Section is final; locked except for late-stage revisions during Capstone.

## 11.4 Section Editor Features

- Rich text editor with: bold, italic, headings, lists, links, code, blockquote, tables.
- Word count and character count displayed.
- Minimum content length per section (configurable, typically 200-500 words).
- Image upload support for diagrams (max 5 per section).
- Citation helper: structured way to reference sources and AI tool outputs.
- AI-disclosure helper: structured way to note where AI was used in producing the content.

## 11.5 Coach Feedback in Dossier


| Launch scope: section-level feedback only&lt;br&gt;At launch, coach feedback is section-level. The coach reviews a submitted section and provides one structured feedback entry per section, linked via the Feedback model. Inline annotation with anchor text and ranges is intentionally NOT in launch scope — it adds significant UI complexity without proportional value for the first cohorts. Inline annotation is a post-launch enhancement to be implemented after the first 10-20 participants have completed the program. |
| --- |

- Each Dossier section may have multiple Feedback entries over time (one per review cycle).
- Feedback types: MILESTONE, GENERAL, REVISION_REQUEST, APPROVAL.
- On REVISION_REQUEST, participant edits the section and resubmits; section status returns to SUBMITTED.
- On APPROVAL, section is locked except during Capstone integration.
- All feedback is preserved as a chronological audit trail visible to both participant and admin.
- Future enhancement (post-launch): inline annotations with anchor text, character ranges, open/resolved status.

## 11.6 Capstone Submission

- Once all 12 sections are APPROVED (or all 11 module artifacts are passed and final integration is ready), the participant can submit the full Dossier as Capstone.
- Capstone submission: lock all sections, generate PDF, mark participant status as UNDER_REVIEW.
- Optional video presentation upload (URL or file).
- Capstone submission triggers admin notification for Certification Review.

## 11.7 Preview & Export

- Preview button shows the full Dossier as a single readable document.
- Export to PDF available at any time, with watermark 'Draft' until certified.
- Final certified Dossier: clean PDF with TenXPros branding, certification seal.

# 12. Admin Portal — Page Specifications

The admin portal is where the founder runs the program. At launch, only the founder has ADMIN access. Coach access (limited admin views) is added in a later phase.


## 12.1 Admin Layout

- Left sidebar with admin-specific navigation.
- Top bar with admin identity, role badge, environment indicator (PROD / STAGING).
- Activity stream on dashboard.

## 12.2 Admin Dashboard (/admin)

The dashboard is the founder's command center. Every key signal lives here. Designed for daily 10-minute checkins and weekly 30-minute reviews.

Top KPI row (real-time):

- Active applications awaiting review (count + age of oldest).
- Active participants by status (ONBOARDING, ACTIVE, CAPSTONE, UNDER_REVIEW).
- Open tickets (count + SLA breach count).
- Dossier sections awaiting review (count + age of oldest).
- Revenue this month (paid) vs target.
- Active tier capacity utilization (e.g., Founding Charter: 7 of 10).
Conversion funnel snapshot (last 30 days):

- Visitors → Applications submitted → Accepted → Enrolled → Active in modules.
- Per-stage drop-off rate.
- Link to /admin/analytics/funnel for detail.
Today's actions:

- Review next application (oldest unread).
- Respond to oldest open ticket.
- Review next dossier section (oldest submitted).
- Process pending certification decisions.
Cohort health strip:

- Per active participant: avatar + current week + on-track indicator (green = active in last 7 days; yellow = 8-14 days; red = 15+ days inactive).
- Click participant to jump to detail.
Marketing pulse:

- Top traffic sources (last 30 days) from UTM data.
- Top converting CTAs (from SiteEvent data).
- Link to /admin/analytics/marketing for detail.
Recent activity stream:

- Last 20 events across applications, payments, tickets, dossier submissions, certifications, badges earned.
- Each event clickable to source record.
Alerts & system status:

- Email delivery failures in last 24h (if any).
- Tickets approaching SLA breach.
- Participants inactive 14+ days.
- Capacity warning if active tier 80%+ full.

## 12.3 Applications (/admin/applications)

List view:

- Table with: applicant name, email, country, domain, AI experience, submitted date, status.
- Filters: status, tier, country, AI experience level.
- Search by name or email.
- Sort by date or status.
- Click row to open detail.

## 12.4 Application Detail (/admin/applications/[id])

Sections:

- Full application data displayed in organized sections matching the application form.
- Admin notes field (rich text, internal only).
- Status change panel: dropdown with required justification note.
- Action buttons: Accept / Revise & Reapply / Not Accept.
- If Accept: 'Send Payment Link' button which composes email and inserts Stripe link.
- If payment received: 'Mark Enrolled' button which creates ParticipantProfile and promotes user role.
- Activity log: every status change with timestamp and admin who made it.

## 12.5 Participants (/admin/participants)

List view:

- Table with: name, tier, cohort, current week, status, assigned coach, dossier completeness.
- Filters: tier, status, coach, cohort.
- Click row to open detail.

## 12.6 Participant Detail (/admin/participants/[id])

Tabs:

- Overview: enrollment info, current week, status, coach assignment.
- Diagnostic: full diagnostic intake.
- Path: personalized path with edit capability.
- Modules: 11 module progress with quick-feedback option.
- Dossier: full dossier with review interface.
- Tickets: this participant's ticket history.
- Certification: certification status with decision interface.
- Payments: payment history.
- Activity log: full participant activity.

## 12.7 Diagnostics (/admin/diagnostics)

- Queue of new diagnostic intakes awaiting review and path generation.
- Per intake: review participant, write personalization notes, generate path.

## 12.8 Paths (/admin/paths)

Path Builder interface:

- For each participant, view their 11 modules with the standard configuration.
- Edit per-module: customization notes, emphasis level (standard / extended), additional readings.
- Set the 8 customization dimensions: Risk Profile, Domain Recognition, Solution Pattern, AI Literacy, Stakeholder Complexity, Industry Regulatory Weight, Time Availability, Output Type.
- Approve path button — releases path to participant and unlocks Module 1.

## 12.9 Modules (/admin/modules)

Module library management:

- List of 11 modules with version status.
- Edit module content: learning objectives, content materials (MDX), exercises, artifact template, pass criteria.
- Preview module as participant would see it.
- Version control: modules have versions; participants are locked to the version they started with unless explicitly upgraded.

## 12.10 Dossiers (/admin/dossiers)

Dossier review queue:

- List of dossier sections awaiting review.
- Sort by submission date or by participant urgency.
- Open section to see participant content with feedback interface.
Section review interface (launch scope):

- View participant content in full.
- Add one structured feedback entry per review cycle (FeedbackType: MILESTONE / GENERAL / REVISION_REQUEST / APPROVAL).
- Feedback editor: rich text with referenced pass criteria from the related module.
- Decision buttons: Approve / Request Revision / Mark for Hold.
- Previous feedback history visible as chronological list.
- Note: inline annotations (anchored to specific text ranges) are deferred to post-launch as documented in Section 11.5.

## 12.11 Tickets (/admin/tickets)

Ticket queue:

- All open tickets across all participants.
- Filters: category, priority, status, assigned-to.
- Sort by oldest first by default.
- SLA indicator: tickets within 72-hour window vs over.
- Open ticket to respond inline.

## 12.12 Certifications (/admin/certifications)

Certification review queue:

- List of participants who have submitted Capstone.
- Per participant: full Dossier display, optional Capstone video.
- Rubric scoring interface: 8 criteria (problem framing, AI suitability, evidence rigor, risk treatment, solution responsibility, adoption realism, value defensibility, foresight quality, overall coherence). Each criterion scored 1-5.
- Reviewer notes (long-form).
- Decision: Certified / Conditionally Certified / Completed Not Certified / Not Completed.
- On Certified: generate certificate, assign badge, create Directory Profile draft.
- Send certification email.

## 12.13 Directory (/admin/directory)

Profile management:

- List of all Directory Profiles with visibility status.
- Edit profile (admin override for moderation).
- Feature/unfeature profiles for hero section of /directory.
- Moderate profile content.
- Note: at launch, this view exists but is mostly empty until first certifications.

## 12.14 Pricing (/admin/pricing)

Tier management:

- 5 tier rows with current member count, capacity, active/closed status, price.
- Open/close tier toggle (manual control during charter phase).
- View tier transition log: when each tier opened and closed.
- Edit tier benefits (loyalty discount %, updates duration, etc.) — versioned.

## 12.15 Payments (/admin/payments)

Payment records:

- Table of all payment records with application/participant link.
- Filter by status, date range.
- Reconciliation view: match Stripe records to internal records.
- Manual marking of payment received (used during initial Payment Link phase).

## 12.16 Analytics (/admin/analytics)

Where data turns into decisions. This is the strategic command center: marketing decisions, product decisions, capacity decisions all start here.

Overview dashboard:

- Conversion funnel summary (last 7/30/90 days, custom range).
- Top traffic sources (UTM breakdown) with conversion rate per source.
- Application source quality: which sources produce ACCEPTED rate above average.
- Tier velocity: time from open to close per tier.
- Module completion rates and average time-to-complete per module.
- Dossier section completion rates.
- Average time from enrollment to certification.
- Certification outcome breakdown (CERTIFIED / CONDITIONALLY / NOT_CERTIFIED / NOT_COMPLETED).
- Ticket volume by category (signals where participants struggle most).
- Net Promoter signals if collected.
Sub-pages:

- /admin/analytics/funnel — full conversion funnel with stage-by-stage drop-off, cohort segmentation by tier, by source, by month.
- /admin/analytics/cohorts — cohort engagement matrix: each cohort vs each module showing completion %, on-time %, revision rate. Highlights modules where multiple cohorts struggle (a signal that the module needs revision).
- /admin/analytics/marketing — marketing attribution: full UTM table, landing page performance, content engagement, referral source analysis, conversion path (multi-touch where data exists).
Filters available everywhere:

- Date range, tier, cohort, country, AI experience level, source, status.
Export:

- Every view supports CSV export. Heavy queries asynchronous; exports notify admin when ready.

## 12.17 Users & Coach Management (/admin/users)

Separate from Participants — manages anyone with platform access: applicants, participants, coaches, admins. Critical for managing the coach pipeline as it grows.

List view:

- Table with: name, email, role, status, last login, related entity (application/participant).
- Filters: role (APPLICANT, PARTICIPANT, COACH, ADMIN), status, last activity.
- Search by name or email.
Single user view (/admin/users/[id]):

- Identity tab: name, email, role, dates, photo.
- Activity tab: full session history, last actions taken.
- Permissions tab: role assignment with reason note (required for any role change; logged to audit).
- Relations tab: application, participant profile, directory profile, badges earned, coached participants.
- Coach management tab (if role=COACH): assigned participants, training status, performance metrics, revenue share total.
- Actions: promote/demote, suspend, reset password, send custom email.
Coach promotion flow:

- Select a CERTIFIED participant → promote to COACH role.
- Assign coach training cohort.
- Set revenue share % (default 35%).
- Activate coach in pipeline when training complete.

## 12.18 Email Management (/admin/email)

Template management (/admin/email/templates):

- List of all email templates with last modified date, last used date, send count.
- Preview each template with sample data.
- Edit template content (MDX or React Email JSX).
- Version history: every edit creates a version; can roll back.
- Test send to admin's own email before saving.
Sent log (/admin/email/log):

- Every email sent (EmailEvent table) with: recipient, template, subject, status (SENT, BOUNCED, FAILED, OPENED, CLICKED if tracked), timestamp.
- Filters: template, status, date range, recipient.
- Click row to see full payload and delivery details.
- Resend failed emails.
- Aggregate stats: send volume, delivery rate, bounce rate by template.

## 12.19 Audit Log (/admin/audit)

Every meaningful action recorded. Used for forensics, accountability, and trust if the program grows to multiple admins or coaches.

List view:

- Reverse-chronological table: actor, action, entity, entityId, timestamp.
- Filters: actor (any user), action type, entity type, date range.
- Search by entity ID.
- Click row to see full changes diff (before/after JSON).
Tracked actions:

- All status changes (Application, ParticipantProfile, ParticipantModule, DossierSection, CertificationReview).
- All admin overrides on participant data.
- Login events for admin and coach roles.
- Role assignments and revocations.
- Tier opens and closes.
- Pricing changes.
- Data exports.
- Email template edits.
- Setting changes.
Retention:

- Indefinite. Audit log is append-only. Never deleted.

## 12.20 Reports & Exports (/admin/reports)

Pre-built reports for recurring needs plus raw data exports.

Pre-built reports:

- Monthly revenue report (paid, refunded, net) by tier.
- Cohort completion report (per cohort: enrolled, active, completed, certified).
- Coach performance report (when coaches exist): participants coached, satisfaction proxy, revenue share earned.
- Marketing source ROI: applications and revenue attributed to each UTM source.
- Participant time-investment report: time-on-platform per participant, time-per-module distribution.
- Dossier quality report: rubric score distribution, certification outcome by domain.
Raw exports:

- Applications CSV (with UTM).
- Participants CSV.
- Payments CSV.
- Email events CSV.
- Site events CSV (for external analysis).
- Audit log CSV.
- All exports respect data minimization: sensitive fields like passwords excluded.

## 12.21 Settings (/admin/settings)

Site-wide configuration. Changes happen without code deploys. All edits logged to audit.

Categories:

- General: site name, support email, current active tier (manual control), application paused mode.
- Email: from name, from address, reply-to, default footer.
- Pricing: loyalty discount percentages by tier, updates duration by tier, add-on prices.
- Feature flags: directory_public_enabled, radar_signups_open, coach_pipeline_visible, custom_signup_capture.
- Branding: logo URL, primary color, accent color (with caution — design system is the canonical source).
- Operational: ticket SLA hours, dossier review SLA days, coach default capacity.
Behavior:

- Each setting has a label, current value, last edited by, last edited at.
- Editing requires confirmation for production-affecting settings.
- Read-only settings (e.g., total enrolled count) shown but not editable.

## 12.22 Badge Management (/admin/badges)

Manages the badge and rank system. Badges seed at initialization; admin manages exceptions, special badges, and issuance.

Badge library:

- List of all Badge records by category (MODULE, RANK, CAPSTONE, SPECIAL).
- Each badge: name, slug, description, icon, color, order, active status.
- Edit badge metadata (descriptions, icons).
- Create special badges (e.g., 'Founding Charter Member', 'Domain Pioneer').
Issued badges:

- Table of ParticipantBadge records: who earned which badge, when, verification code, public status.
- Filter by badge, by participant, by date range.
- Manually issue special badges (e.g., 'Founding Charter' to first 10 enrolled).
- Revoke badge with reason (audit-logged); revocation is rare and serious.
Verification page:

- Each badge's public verification URL shown: /verify/[code].
- Preview the public verification page from admin view.

# 13. API Routes & Server Actions

Prefer Server Actions for mutations triggered from forms. Use API routes for webhooks, third-party integrations, and any endpoint that must be programmatically accessible.


## 13.1 Server Actions


### Application Actions (lib/actions/applications.ts)

- submitApplication(formData) — public; creates User + Application; sends emails.
- updateApplicationStatus(id, status, note) — admin; updates status and triggers downstream effects.
- enrollApplication(id) — admin; promotes to PARTICIPANT, creates ParticipantProfile, sends welcome email.
- sendPaymentLink(applicationId, stripeUrl) — admin; sends payment email.

### Participant Actions (lib/actions/participants.ts)

- completeStarterPack(participantId) — participant; marks Starter Pack as complete.
- submitDiagnostic(participantId, data) — participant; saves Diagnostic Intake.
- assignCoach(participantId, coachId) — admin; assigns coach.
- updateParticipantStatus(id, status) — admin; updates participant status.
- pauseParticipant(id, reason) — admin; pauses participant with reason.

### Module Actions (lib/actions/modules.ts)

- unlockModule(participantId, moduleNumber) — admin; unlocks next module.
- submitModuleArtifact(participantId, moduleId, content) — participant; submits artifact.
- reviewModuleArtifact(participantModuleId, decision, feedback) — coach/admin; passes or requests revision.

### Path Actions (lib/actions/paths.ts)

- generatePath(participantId) — admin; creates Path with default 11 modules.
- customizePath(pathId, customizations) — admin; applies 8 customization dimensions.
- approvePath(pathId) — admin; releases path to participant.

### Dossier Actions (lib/actions/dossier.ts)

- saveDraftSection(sectionId, content) — participant; auto-save.
- submitSection(sectionId) — participant; locks section, notifies coach.
- addSectionFeedback(sectionId, type, content) — coach/admin; adds one section-level feedback entry. Inline annotations are out of launch scope.
- reviewDossierSection(sectionId, decision, feedback) — coach/admin; approves, requests revision, or holds a section.
- approveSection(sectionId) — coach; marks approved.
- submitCapstone(participantId) — participant; locks all sections, triggers review.

### Ticket Actions (lib/actions/tickets.ts)

- createTicket(userId, data) — participant; checks fair-use limit.
- replyToTicket(ticketId, body) — both; appends TicketMessage.
- closeTicket(ticketId) — both; marks closed.

### Certification Actions (lib/actions/certification.ts)

- submitCertificationReview(participantId, rubric, notes, outcome) — admin; finalizes decision.
- generateCertificate(participantId) — admin; generates PDF certificate.
- createDirectoryProfile(userId) — admin or participant; creates initial profile.

### Directory Actions (lib/actions/directory.ts)

- updateDirectoryProfile(profileId, data) — participant; edits own profile.
- toggleProfileVisibility(profileId, isPublic) — participant; controls visibility.
- featureProfile(profileId) — admin; feature/unfeature profile.

### Badge Actions (lib/actions/badges.ts)

- issueBadge(userId, badgeSlug, context) — system/admin; idempotent issuance of a badge. context = { type: 'MODULE' | 'RANK' | 'CAPSTONE' | 'SPECIAL', ref: string }. Creates ParticipantBadge with unique verificationCode, emits BADGE_EARNED SiteEvent, creates Notification.
- revokeBadge(participantBadgeId, reason) — admin only; sets badge inactive with audit trail. Rare and serious.
- verifyBadge(code) — public; resolves a verificationCode to badge + recipient details for /verify/[code] page. Public-safe (no sensitive data).
- toggleBadgePublic(participantBadgeId, isPublic) — participant; controls individual badge visibility.
- autoIssueModuleBadge(participantModuleId) — system; called when ParticipantModule status transitions to PASSED.
- autoIssueRankBadge(participantId, rank) — system; called when rank threshold reached.

### Notification Actions (lib/actions/notifications.ts)

- createNotification(userId, type, title, body, url) — system; creates in-app notification.
- markNotificationRead(notificationId) — user; marks as read.
- markAllNotificationsRead(userId) — user; bulk action.
- listNotifications(userId, options) — user; paginated list for UI.

### Audit Actions (lib/actions/audit.ts)

- writeAuditLog(actorId, action, entity, entityId, changes, metadata) — system; called from every mutation action that affects audited entities. Append-only.
- listAuditEntries(filters) — admin; paginated query for /admin/audit page.
- exportAuditCsv(filters) — admin; deferred to post-launch.

### Settings Actions (lib/actions/settings.ts)

- updateAdminSetting(key, value, updatedBy) — admin; updates value with audit trail.
- getAdminSetting(key) — server-only; reads a single setting.
- getPublicSettings() — server-only; returns only settings marked isPublic=true for use on public site (e.g., brand tokens, application paused mode).
- listSettingsByCategory(category) — admin; for /admin/settings UI.

### Analytics Actions (lib/actions/analytics.ts)

- trackSiteEvent(eventType, eventData, userId, sessionId) — system/server; writes to SiteEvent. Called from server actions at key business transitions.
- trackClientEvent(eventType, eventData) — invoked by usePosthog() hook on client; forwards to PostHog and selectively to SiteEvent via API route.
- getFunnelMetrics(stages, dateRange, filters) — admin; for /admin/analytics/funnel.
- getCohortMetrics(cohortNumber, dateRange) — admin; for /admin/analytics/cohorts.
- getMarketingAttribution(dateRange, filters) — admin; aggregates UTM data from Application table.
- Full implementations of getFunnelMetrics / getCohortMetrics / getMarketingAttribution are iterative; minimum viable read-only summaries at launch (see Section 15 Phase 5 extended admin scope).

## 13.2 API Routes


### Auth

- GET/POST /api/auth/* — NextAuth handler.
- POST /api/auth/reset-password — password reset request.
- POST /api/auth/set-password — password setup after reset token.

### Webhooks

- POST /api/webhooks/stripe — Stripe payment webhook. Deferred to Phase 6 or later. At launch, payment status is updated manually by admin after receiving payment confirmation.
- POST /api/webhooks/email — email delivery status webhook (Phase 4+).

### Public

- GET /api/directory — public directory search (Phase 5+).
- GET /api/directory/[slug] — single profile (Phase 5+).
- POST /api/directory/[slug]/contact — mediated contact form (Phase 5+).

### File uploads

- POST /api/upload — Uploadthing endpoint.

## 13.3 Validation Schemas (lib/validations/)

Every input is validated with Zod. Key schemas to create:

- applicationSchema — full application form validation.
- diagnosticSchema — diagnostic intake validation (full validation enforced at submit, not on draft saves).
- moduleSubmissionSchema — module artifact submission.
- dossierSectionSchema — dossier section content.
- ticketSchema — ticket creation.
- certificationRubricSchema — rubric scoring.
- directoryProfileSchema — directory profile data.
- badgeIssueSchema — badge issuance context.
- settingsSchema — admin setting updates per category.
- siteEventSchema — event tracking payload validation.

## 13.4 Public API Routes for verification

- GET /api/verify/[code] — public; resolves badge verification code. Returns badge details, recipient (name + public title only), earned date, status. Used by the /verify/[code] page.

## 13.5 Error Handling Conventions

- Server Actions return { success: boolean, data?, error? }.
- API routes return appropriate HTTP status codes.
- Validation errors: 400 with field-level errors.
- Auth errors: 401 (unauthenticated) or 403 (unauthorized).
- Not found: 404.
- Server errors: 500 with logged context, generic message to client.

# 14. Email Templates & Transactional Flows

All transactional emails use React Email components for consistency. Sent via Resend or SendGrid. Every email has plain-text fallback.


## 14.1 Email Templates Required


### Applicant-facing

- application_received — confirmation after application submission. Sets expectation: decision within 2-3 business days.
- application_accepted_payment_link — sent on ACCEPTED; includes Stripe Payment Link, instructions, what comes next.
- application_revise — sent on REVISE_AND_REAPPLY; specific guidance from admin notes.
- application_not_accepted — sent on NOT_ACCEPTED; respectful and brief.
- enrollment_welcome — sent on ENROLLED; includes password setup link, link to /portal, Starter Pack note.

### Participant-facing

- coach_assigned — sent when coach is assigned; coach name and intro.
- path_ready — sent when admin approves personalized path.
- module_unlocked — sent when each module unlocks.
- milestone_feedback — sent when coach provides feedback at a milestone.
- revision_requested — sent when an artifact or Dossier section needs revision.
- capstone_received — confirmation when Capstone is submitted.
- certification_decision — sent on Certification Review with outcome.
- directory_profile_ready — sent when Directory Profile is created.

### Admin-facing (internal)

- new_application_notification — admin email when new application submitted.
- payment_received_notification — when payment marked received.
- dossier_submitted_for_review — when participant submits Dossier section.
- capstone_submitted_for_review — when participant submits full Capstone.
- ticket_response_overdue — SLA breach warning.

## 14.2 Email Brand Standards

- From: 'TenXPros' <hello@tenxpros.com>
- Reply-To: hello@tenxpros.com
- Logo at top, navy color, max-width 600px.
- Body font: Inter or system-ui fallback.
- Single primary CTA per email, navy button.
- Footer with TenXPros tagline, address, unsubscribe (for non-transactional).

## 14.3 Email Template Examples (key ones)


### application_received

Subject: Your TenXPros application is received

Hi [Name],

Thank you for applying to TenXPros — TXP Charter Program.

We have received your application and will review it within 2-3 business days.

You will hear from us by email with one of three outcomes:

- Accepted with payment instructions

- Revise & reapply with specific guidance

- Not accepted with a brief explanation

Frame. Design. Prove. Foresee.

— TenXPros Team


### application_accepted_payment_link

Subject: You are accepted to the TenXPros Founding Charter

Hi [Name],

Congratulations. Your application has been accepted to the TenXPros Founding Charter.

You are one of our first 10 members. The founder will personally coach you through the 12-week program.

To complete enrollment, please complete payment:

[Pay $997 via Stripe →]

What happens next:

1. Complete payment via the link above

2. We'll send your welcome email with portal access

3. You begin with the Starter Pack and Diagnostic Intake

4. Your personalized path is built around your real problem

Frame. Design. Prove. Foresee.

— TenXPros Team


### enrollment_welcome

Subject: Welcome to TenXPros — set up your portal access

Hi [Name],

Welcome to TenXPros. Payment received. You are now enrolled as Member #[N] of the Founding Charter.

Set up your portal access:

[Set your password →]

Once logged in, your first steps:

1. Read the Starter Pack

2. Complete the Diagnostic Intake

3. Receive your personalized 12-week path

4. Begin Module 1: AI Readiness & TenXPro Mindset

Your founder-coach will reach out to you within 48 hours after you complete the Diagnostic.

Frame. Design. Prove. Foresee.

— TenXPros Team


## 14.4 Email Sending Logic

- All emails go through lib/email.ts which wraps Resend client.
- Email events logged to database via the EmailEvent model (defined in Section 6 schema from day one).
- Logging is wired in Phase 4; earlier phases may pass emails through without DB logging if not yet implemented.
- Retries on transient failures (3 attempts with backoff).
- In development, emails preview to console; in production, send via Resend.

# 15. Phase-by-Phase Build Order

Build in this order. Each phase produces a runnable, testable state. Do not skip ahead. Do not over-engineer.


## Phase 1 — Foundation

Goal: project running locally with empty pages and clean architecture.

- Initialize Next.js project with TypeScript, Tailwind, App Router.
- Install all dependencies: Prisma, NextAuth, Zod, React Hook Form, shadcn/ui, Lucide, Resend.
- Set up environment variables (.env.example with all required vars).
- Initialize Prisma with full schema from Section 6.
- Run initial migration; verify database connection.
- Create folder structure per Section 3.
- Implement four layouts: PublicLayout, AuthLayout, PortalLayout, AdminLayout.
- Implement navigation components: PublicNav, PortalNav, AdminNav.
- Implement Footer.
- Implement design tokens in Tailwind config (colors, typography).
- Create placeholder pages for all public routes with TODO content.
- Implement NextAuth with Credentials provider.
- Implement middleware.ts with role-based routing.
- Verify: deploy to Vercel staging; smoke test all routes load.

## Phase 2 — Public Site

Goal: complete marketing site that can drive traffic and convey the program.

- Home page with all sections from Section 8.1.
- Program page from Section 8.2.
- How It Works page from Section 8.3.
- Dossier page from Section 8.4.
- Certification page from Section 8.5.
- Pricing page from Section 8.6 — show only Tier 1 active.
- Directory page from Section 8.7 — coming-soon state.
- Radar page from Section 8.8 — informational only.
- About page from Section 8.9.
- Legal pages: Terms, Privacy, Refund.
- SEO setup: metadata, sitemap, robots.txt.
- Verify: full marketing site reviewable end-to-end.

## Phase 3 — Application System

Goal: applications can be submitted, reviewed, and enrolled.

- Application form on /apply per Section 9.2.
- Form validation with Zod.
- submitApplication Server Action.
- application_received email.
- Thank-you page.
- Admin Applications queue at /admin/applications.
- Application detail view at /admin/applications/[id].
- Status change actions with notes.
- All applicant-facing emails: accepted, revise, not accepted, enrollment welcome.
- Password setup flow for newly enrolled participants.
- Verify: end-to-end test — apply, review, accept, manually pay, enroll, login.

## Phase 4 — Participant Portal

Goal: enrolled participants have a functional portal to complete the 12-week journey.

- Portal dashboard at /portal.
- Starter Pack page with content and completion tracking.
- Diagnostic Intake multi-step form.
- Personalized Path view (read-only for participant).
- Modules list and single-module pages.
- Module artifact submission flow.
- Dossier Builder per Section 11.
- Tickets list and creation.
- Certification status page.
- Profile and directory settings.
- Verify: a participant can complete a module end-to-end.

## Phase 5 — Admin Operations

Goal: admin has all tools to manage the program end-to-end.

Core operational admin (fully functional):

- Admin dashboard with KPIs, funnel snapshot, cohort health, marketing pulse, activity stream, alerts.
- Participants list and detail views.
- Diagnostics queue.
- Path Builder with 8 customization dimensions, per-module customization notes, emphasisLevel, additionalReadings.
- Module library management with versioning.
- Dossier review interface with section-level feedback, approval, revision request, hold decisions (inline annotations are deferred to post-launch enhancement, out of launch scope).
- Ticket queue and response with SLA indicators.
- Certification review interface with rubric scoring.
- Directory profile management (admin moderation view).
- Pricing tier management with open/close controls and benefit editing.
- Payment records and manual marking.
Extended admin (route shells + read-only or minimal functionality at launch):


| Scope guidance for extended admin&lt;br&gt;The following admin areas must exist as admin route shells with placeholder, read-only, or minimal-write views at launch. Full operational functionality may be completed after core lifecycle flows are stable and the first cohort is in motion. This is consistent with the document&#x27;s core principle: architecture is full from day one, activation is phased. |
| --- |

- /admin/analytics — analytics dashboard with funnel, cohort, marketing sub-pages. Launch state: read-only summary using SiteEvent and existing tables; full filtering and export can be iterated.
- /admin/badges — badge library and issued badges view. Launch state: read-only library (badges seeded), automatic issuance wired, manual issuance UI minimal.
- /admin/users — user and coach management. Launch state: list view + basic role view. Coach promotion workflow can be minimal until the first certified graduates exist.
- /admin/email — templates list (read-only) and sent log. Launch state: sent log functional via EmailEvent; template editing UI minimal (editing via code commits is acceptable at launch).
- /admin/audit — audit log view. Launch state: functional read-only view of AuditLog records. Filters can be iterated.
- /admin/reports — pre-built reports and exports. Launch state: minimum 2-3 essential reports (revenue, applications by source). Additional reports added as needed.
- /admin/settings — site-wide settings. Launch state: functional for critical settings (active tier, application paused mode, feature flags). Branding and operational settings can be iterated.
- Verify: admin can run full participant lifecycle from application to certification. Extended admin routes exist and load without errors.

## Phase 6 — Polish & Launch

Goal: production-ready.

- Responsive design on all pages.
- Final marketing copy from copy doc.
- Empty states for every list view.
- Loading states for every async operation.
- Error boundaries on all major routes.
- SEO refinement, OG images, structured data.
- Analytics (Plausible or PostHog).
- Cookie consent if EU traffic expected.
- Final legal pages reviewed by founder.
- Test data cleanup; production database empty and ready.
- Stripe Payment Links generated for Tier 1.
- Domain configured, DNS, SSL verified.
- Email sending verified from production domain.
- Backup strategy in place for database.
- Launch.

# 16. Acceptance Criteria per Phase

Each phase is complete only when its acceptance criteria pass. Do not begin the next phase before passing these.


## Phase 1 Acceptance

- STEP 0 — Schema validation pass complete: all 26 models present, `prisma validate` passes, initial migration applies cleanly against fresh DB, full seed runs (admin user, 5 pricing tiers, badge catalog, AdminSetting records).
- Repository created, README written, .env.example complete.
- npm run dev starts the app without errors.
- All 4 layouts render correctly on their respective routes.
- Tailwind colors and typography match Section 5 design system.
- NextAuth login flow works with seeded admin account (Credentials provider).
- VerificationToken model is present in the schema (required by NextAuth Prisma Adapter). The full password reset email flow is implemented in Phase 3 alongside enrollment and email templates — Phase 1 only requires the model to exist.
- Middleware redirects unauthenticated users away from /portal and /admin.
- Vercel staging deployment succeeds; all public routes return 200.

## Phase 2 Acceptance

- All 10 public pages render with correct structure.
- Navigation works on desktop and mobile.
- All internal links resolve.
- Pricing page shows Tier 1 active, others closed-preview.
- Directory and Radar show appropriate coming-soon states.
- Legal pages (Terms, Privacy, Refund) exist with founder-approved content.
- Lighthouse scores: Performance > 85, Accessibility > 90, SEO > 90.
- Mobile responsive: all pages usable on 375px width.

## Phase 3 Acceptance

- Application form submission creates User + Application + sends confirmation email.
- Admin can see new application in queue.
- Admin can change status with note; transitions are logged.
- Acceptance email is sent and includes payment link field.
- Manual ENROLLED status creates ParticipantProfile correctly.
- Welcome email sent with working password setup link.
- Participant can set password and log in.
- On login, participant redirects to /portal correctly.
- Duplicate application by same email is blocked with clear message.

## Phase 4 Acceptance

- Dashboard shows correct next action based on participant state.
- Starter Pack content displays; completion checkbox persists.
- Diagnostic Intake saves drafts; final submission updates status.
- Personalized Path displays correctly after admin approval.
- Modules list shows correct lock/unlock state.
- Module artifact submission flow works; submission is visible to admin.
- Dossier Builder: all 12 sections accessible; auto-save works; submit-for-review locks section.
- Coach section-level feedback appears in the Dossier feedback history. Inline annotations are not required for launch and are deferred to post-launch.
- Capstone submission generates PDF and changes participant status to UNDER_REVIEW.
- Tickets: creation respects fair-use limit; threading works.
- Certification status page shows current state accurately.

## Phase 5 Acceptance

- Admin dashboard metrics are accurate (matches database counts).
- Participants list filters and sorts work.
- Participant detail tabs show correct data.
- Path Builder allows setting 8 customization dimensions and per-module customizationNotes, emphasisLevel, additionalReadings.
- Module library editor saves content and renders correctly with version control.
- Dossier review interface allows section-level feedback, approval, revision request, and hold decisions. Inline annotations are deferred to post-launch enhancement and out of launch scope.
- Ticket response works; status transitions correctly.
- Certification rubric calculates and saves correctly.
- On Certified outcome, certificate PDF generates, email sends, badges are issued (module, rank, capstone), Directory profile is created.
- Pricing tier transitions update active status correctly.
- Extended admin routes all load without errors: /admin/analytics, /admin/badges, /admin/users, /admin/email, /admin/audit, /admin/reports, /admin/settings.
- Audit log records every admin status change and significant action.
- Settings page allows changing at least: active tier, application paused mode, feature flags.
- Badge automatic issuance is wired (passing a module issues the module badge; rank thresholds issue rank badges; certification issues Capstone Seal).
- Public verification page /verify/[code] resolves and shows correct badge details.

## Phase 6 Acceptance

- All pages responsive on mobile, tablet, desktop.
- All empty states designed and implemented.
- All loading states use consistent skeleton or spinner.
- Error boundary catches errors and shows friendly message.
- OG images render correctly when sharing links.
- Sitemap.xml and robots.txt deployed.
- Analytics tracking verified (page views, key events).
- Production database is empty of test data.
- Stripe Payment Links generated and tested.
- Custom domain DNS configured; SSL certificate active.
- Email sending from custom domain verified (SPF, DKIM, DMARC).
- Backup automation verified.
- Admin account uses strong password; 2FA enabled if supported.

# 17. Test Data Strategy

Use prisma/seed.ts to create realistic test data for development. Never seed production. Wipe and reseed local database during development as needed.


## 17.1 Seed Data Required


### Users

- 1 admin: admin@tenxpros.com (the founder).
- 2 applicants in SUBMITTED state.
- 1 applicant in UNDER_REVIEW state.
- 1 applicant in ACCEPTED state (awaiting payment).
- 3 participants at different stages: one in Diagnostic, one mid-program, one Capstone-ready.
- 1 certified participant (for Directory testing).

### Pricing Tiers

- All 5 tiers seeded with correct prices, capacities, and benefits.
- Tier 1 active with 3 enrolled, capacity 10.
- Other tiers inactive.

### Modules

- All 11 modules seeded with full content matching Section 2.
- Each module has placeholder learning materials, exercises, artifact template, pass criteria.
- Real content replaces placeholders during Phase 6.

### Sample Participant Journey

- Test participant 'Sara' — Founding Charter, healthcare professional, week 5.
- Has completed Modules 1-4 (Frame phase). Earned 4 badges.
- Currently in Module 5 (in progress).
- Dossier sections 1-4 are APPROVED, section 5 is DRAFT.
- Has 2 closed tickets, 1 open ticket.

### Sample Certified Participant

- Test participant 'David' — Founding Charter, completed, CERTIFIED.
- Full Dossier with all 12 sections APPROVED.
- Directory Profile public with full data.
- Badges: all 11 modules + Capstone Seal + Foresight Strategist.

## 17.2 Seed File Structure

// prisma/seed.ts

import { PrismaClient } from "@prisma/client";

import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {

// 1. Pricing tiers

await seedPricingTiers();

// 2. Modules library

await seedModules();

// 3. Admin user

await seedAdmin();

// 4. Sample applicants

await seedApplicants();

// 5. Sample participants

await seedParticipants();

// 6. Sample tickets

await seedTickets();

// 7. One certified participant with Directory profile

await seedCertifiedParticipant();

}

main()

.catch((e) => { console.error(e); process.exit(1); })

.finally(() => prisma.$disconnect());


## 17.3 Environment Separation

- Local development: full seed data, test emails go to console.
- Staging: minimal seed (admin only); real Resend in test mode.
- Production: zero seed data; real Resend in production mode.
- Never run seed.ts against production database. Add safeguard check: refuse to seed if NODE_ENV === 'production'.

# 18. Deployment & Infrastructure


## 18.1 Hosting

- Application: Vercel (Free tier initially; Pro when traffic warrants).
- Database: Neon (serverless Postgres, free tier suitable for launch) or Supabase or Railway.
- Email: Resend (developer-friendly, generous free tier).
- File uploads: Uploadthing or AWS S3 (added in Phase 4).
- Payment: Stripe (Payment Links initially; full integration later).
- Analytics: Plausible or PostHog (privacy-friendly).

## 18.2 Environment Variables

# .env.example

# Database

DATABASE_URL=postgresql://user:pass@host:5432/tenxpros

# Auth

NEXTAUTH_SECRET=generate-with-openssl-rand-base64-32

NEXTAUTH_URL=http://localhost:3000

# Email

RESEND_API_KEY=re_...

EMAIL_FROM="TenXPros <hello@tenxpros.com>"

EMAIL_FROM_NAME="TenXPros"

# Stripe (Phase 6+ — not needed until full integration)

STRIPE_SECRET_KEY=sk_test_...

STRIPE_WEBHOOK_SECRET=whsec_...

STRIPE_PUBLISHABLE_KEY=pk_test_...

# App

NEXT_PUBLIC_APP_URL=http://localhost:3000

NEXT_PUBLIC_ENV=development

# Optional: file uploads (Phase 4+)

UPLOADTHING_SECRET=

UPLOADTHING_APP_ID=

# Optional: analytics (Phase 6+)

NEXT_PUBLIC_PLAUSIBLE_DOMAIN=tenxpros.com


## 18.3 Deployment Pipeline

- Code pushed to GitHub main branch.
- Vercel auto-deploys preview for PRs, production for main.
- Prisma migrations run on Vercel build step OR triggered manually for production.
- Environment variables configured in Vercel project settings (separate dev, staging, prod).

## 18.4 Database Migrations

- Local development: npx prisma migrate dev.
- Production: npx prisma migrate deploy (in CI/CD or one-time via console).
- Never run migrations directly against production; always test in staging first.
- Backup database before production migrations.

## 18.5 Domain & SSL

- Domain: tenxpros.com (purchase via registrar).
- DNS: managed via Vercel or Cloudflare.
- SSL: automatic via Vercel.
- Email domain authentication: SPF, DKIM, DMARC records for hello@tenxpros.com.

## 18.6 Monitoring & Logging

- Vercel logs for runtime errors.
- Sentry (optional, Phase 6+) for error tracking.
- Database backups: automatic via Neon/Supabase.
- Status page: optional (Phase 6+).

## 18.7 Cost Estimate at Launch

- Vercel: $0 (Free tier) or $20/mo (Pro).
- Neon Postgres: $0 (Free tier) or $19/mo (Launch).
- Resend: $0 (Free 3,000 emails/mo).
- Domain: ~$12/year.
- Stripe: 2.9% + $0.30 per transaction.
- Total monthly fixed: $0-40 at launch; $40-80 after first 10 members.

# 19. Post-Launch Checklist

After Phase 6 ships, run through this checklist before announcing the launch publicly.


## 19.1 Technical Verification

- Verify all pages load on production domain.
- Submit a test application; verify confirmation email arrives.
- Verify admin can see the test application.
- Run through full applicant → enrolled → first module flow with a test account.
- Verify password setup email works.
- Verify portal access after login.
- Test Dossier auto-save and submit flow.
- Test ticket creation and admin response.
- Verify Stripe Payment Link works end-to-end.
- Delete all test data from production database.

## 19.2 Legal & Compliance

- Terms of Service finalized and reviewed.
- Privacy Policy finalized and reviewed.
- Refund Policy finalized and clearly visible on Pricing page.
- Cookie consent if required for your jurisdiction.
- GDPR considerations if EU traffic expected.

## 19.3 Marketing Readiness

- All marketing copy finalized (no Lorem Ipsum, no TODOs).
- Final founder photo and bio on About page.
- Final hero image and OG image.
- Pricing page accurately reflects Tier 1 active status.
- Sample Dossier section (optional but powerful) on /dossier page.
- Founder LinkedIn post drafted for launch day.
- First 5 LinkedIn content pieces drafted for week 1-2 of launch.
- Outreach list of 30-50 warm contacts compiled.
- Outreach message template approved.

## 19.4 Operational Readiness

- Admin dashboard tested with realistic scenarios.
- Founder comfortable with status change workflows.
- Calendar blocks for first cohort coaching time.
- Email templates reviewed and approved by founder.
- Slack/Discord community workspace created and tested.
- Loom or video recording workflow tested.
- Notion or document workspace for Dossier reviews prepared.

## 19.5 Launch-Day Tasks

- Final smoke test on production: load home, apply, login, portal.
- Announce launch on LinkedIn with founder personal post.
- Send launch email to warm network list.
- Monitor application submissions hourly for first 24 hours.
- Respond to first applications within hours, not days.
- Track first signups, share traction publicly when authentic to do so.

## 19.6 First Week After Launch

- Daily review of application queue.
- Daily LinkedIn engagement: 3-5 substantive comments + 1 post.
- Track and log: traffic sources, conversion rate, friction points reported by users.
- Week 1 retrospective: what worked, what to adjust.
- Reach out to first applicants (whether accepted or not) for feedback on the application experience.

# 20. Analytics & Data Collection Strategy

TenXPros is designed to be a data-rich operation from day one. Every meaningful action is captured so that marketing, product, capacity, and pricing decisions are grounded in evidence — not guesses. This section defines what is captured, where, and how it flows into decision-making.


| The data philosophy&lt;br&gt;Capture business-critical events in the database where the founder can query them directly. Send high-volume behavioral events to PostHog or Plausible where aggregation and visualization are cheap. Never collect more than is needed. Never store personally identifying data we cannot justify keeping. The goal is decisions, not surveillance. |
| --- |


## 20.1 Data Capture Architecture

Two layers:

- Layer 1 (Database) — business-critical events captured via SiteEvent model + transitions captured by existing models (Application status, ParticipantModule status, etc.). Queryable directly by admin.
- Layer 2 (External) — PostHog or Plausible for high-volume behavioral analytics: page views, scroll depth, time on page, click heatmaps. Privacy-friendly choices, no cookies required for Plausible.
Where they meet:

- Critical business events go to BOTH: database (for ground truth, exportable) AND external (for cohort and behavior analysis).
- Pure UI events (page views, scroll) go only to external.
- Pure operational events (status changes, payments) go only to database — they're already there via the model state.

## 20.2 What We Capture


### Acquisition events (public site)

- PAGE_VIEW — landing page, program, pricing, apply, etc. (External + first-time-per-session in DB)
- CTA_CLICK_APPLY — clicks on any 'Apply' CTA from any page (External + DB)
- CTA_CLICK_PRICING — clicks to pricing page (External)
- PRICING_TIER_VIEWED — which tier panel was clicked or hovered (External)
- APPLY_FORM_STARTED — user begins filling /apply (DB SiteEvent)
- APPLY_FORM_FIELD_ABANDONED — last field touched before exit (External; helps identify friction)
- UTM capture — utm_source, utm_medium, utm_campaign, utm_term, utm_content, plus referrer and landing page snapshot on /apply load (stored in sessionStorage and attached to Application on submit)

### Conversion events

- APPLICATION_SUBMITTED — Application created (DB Application + SiteEvent + External)
- APPLICATION_REVIEWED — admin opens application (DB SiteEvent)
- APPLICATION_DECISION — accepted, revise, not accepted (DB Application status change + SiteEvent + AuditLog)
- PAYMENT_LINK_SENT — accepted email with payment link sent (DB EmailEvent + SiteEvent)
- PAYMENT_RECEIVED — admin marks payment received (DB PaymentRecord + SiteEvent + AuditLog)
- ENROLLMENT_COMPLETED — applicant promoted to participant (DB ParticipantProfile + SiteEvent + AuditLog)

### Activation events (participant portal)

- FIRST_LOGIN — first portal login (DB SiteEvent)
- STARTER_PACK_COMPLETED — DB ParticipantProfile.starterPackCompletedAt + SiteEvent
- DIAGNOSTIC_STARTED — DB SiteEvent
- DIAGNOSTIC_STEP_COMPLETED — each step in the multi-step form (External)
- DIAGNOSTIC_SUBMITTED — DB DiagnosticIntake.submittedAt + SiteEvent
- PATH_APPROVED — admin approves path; participant is notified (DB ProgramPath.approvedAt + SiteEvent + Notification)

### Engagement events

- MODULE_STARTED — first time participant opens a module (DB ParticipantModule.startedAt + SiteEvent)
- MODULE_LEARN_TIME_LOGGED — time spent in Learn tab per session (External, aggregated daily into DB)
- MODULE_SUBMITTED — artifact submitted (DB ParticipantModule.submittedAt + SiteEvent)
- MODULE_PASSED — coach marks passed (DB ParticipantModule.passedAt + SiteEvent + Notification)
- MODULE_REVISE_REQUESTED — coach requests revision (DB ParticipantModule status + revisionCount increment + SiteEvent)
- DOSSIER_SECTION_OPENED — first open of a section (External)
- DOSSIER_SECTION_SAVED — every auto-save (External only; do not flood DB)
- DOSSIER_SECTION_SUBMITTED — submit for review (DB DossierSection status + SiteEvent)
- TICKET_CREATED — DB Ticket + SiteEvent
- TICKET_RESPONDED — DB TicketMessage + SiteEvent
- TICKET_CLOSED — DB Ticket.closedAt + SiteEvent

### Outcome events

- CAPSTONE_SUBMITTED — DB ParticipantProfile status + SiteEvent
- CERTIFICATION_DECISION — CERTIFIED, CONDITIONAL, NOT_CERTIFIED, NOT_COMPLETED (DB CertificationReview + SiteEvent + AuditLog)
- BADGE_EARNED — each badge issuance (DB ParticipantBadge + SiteEvent + Notification)
- DIRECTORY_PROFILE_PUBLISHED — first time profile goes public (DB DirectoryProfile.isPublic + SiteEvent)
- DIRECTORY_PROFILE_VIEWED — public view of a profile (External; aggregated weekly into DB for participant's own stats)
- BADGE_VERIFICATION_VIEWED — /verify/[code] page view (DB + External)

### Retention events

- INACTIVE_7_DAYS — participant hasn't logged in for 7 days (DB computed daily; triggers Notification + admin alert)
- INACTIVE_14_DAYS — escalated check (Notification + email + admin dashboard alert)
- RE_ENGAGED — participant returns after inactive period (SiteEvent)

### Communication events

- EMAIL_SENT — every transactional email (DB EmailEvent)
- EMAIL_DELIVERED — webhook from Resend (DB EmailEvent.status update)
- EMAIL_OPENED — webhook (DB + SiteEvent if material email)
- EMAIL_CLICKED — webhook (DB + SiteEvent if material email)
- EMAIL_BOUNCED — webhook (DB + admin alert)

## 20.3 Key Funnels Tracked


### Acquisition funnel

Home/Landing visit

→ Pricing or Apply page visit (X% of step 1)

→ Application form started (X% of step 2)

→ Application submitted (X% of step 3)

→ Application accepted (X% of step 4)

→ Payment completed (X% of step 5)

→ First portal login (X% of step 6)

→ Starter Pack completed (X% of step 7)

→ Diagnostic submitted (X% of step 8)

→ Path approved & Module 1 started (X% of step 9)

Each stage tracked with timestamp; admin can see drop-off rate per stage, segmented by UTM source, country, AI experience, and tier.


### Activation funnel (post-enrollment)

Enrollment

→ Starter Pack completed within 7 days (target: 90%+)

→ Diagnostic submitted within 14 days (target: 85%+)

→ Module 1 started within 21 days (target: 80%+)

→ Module 1 passed within 28 days (target: 75%+)

Activation milestones are leading indicators of completion. A participant who hits these thresholds is on track.


### Completion funnel

Module 1 started → Module 4 passed (Frame phase complete)

→ Module 8 passed (Design phase complete)

→ Module 10 passed (Prove phase complete)

→ Module 11 passed (Foresee phase complete)

→ Capstone submitted

→ Certification decision

Per-cohort, per-module conversion. Reveals where in the program participants struggle most.


## 20.4 Marketing Attribution

- UTM parameters captured on every /apply load and persisted to Application record.
- Referrer URL captured separately.
- Landing page captured (first page of session before /apply visit).
- Attribution analysis: revenue per UTM source, applications per source, accepted rate per source, certification rate per source.
- This reveals which channels produce not just applicants but quality participants.

## 20.5 Cohort Analysis

- Every participant assigned to a cohort (cohortNumber on ParticipantProfile).
- Cohort metrics: enrollment date range, completion rate, certification rate, average time-to-certification, NPS if collected, support ticket volume, dossier quality distribution.
- Cross-cohort comparison reveals program improvements: does cohort 2 outperform cohort 1 after methodology refinements?

## 20.6 Privacy & Compliance

- No third-party cookies on public site (Plausible is cookie-free; PostHog can be configured cookie-free).
- IP addresses are hashed before storage; raw IPs never persisted.
- Personal data minimization: SiteEvent.eventData should not contain PII; user identity is via userId reference.
- EU/GDPR: cookie consent banner if PostHog with cookies is used; data export and deletion supported via account settings.
- Retention: SiteEvent retained 24 months by default; aggregated metrics retained indefinitely. Personal data linked to a deleted account is anonymized within 30 days.

## 20.7 Decision Framework

Data exists to inform decisions. Pre-defined decision triggers:

- If application-to-acceptance rate < 40%, review admission criteria or qualifying messaging on public site.
- If enrollment-to-Module-1-passed rate < 75%, investigate onboarding friction.
- If a module has > 40% revision rate across cohorts, the module needs revision.
- If a UTM source has > 2x average conversion, increase investment in that channel.
- If a UTM source has < 0.5x average conversion, reduce or eliminate investment.
- If certification rate < 70%, review either admission standards or assessment rigor.
- If average time-to-certification > 16 weeks, review pacing and unblocking signals.
- If support ticket volume in a category > 2x average, build a self-serve resource for that category.

## 20.8 Implementation Notes

- PostHog or Plausible: choose one. PostHog has more product analytics features; Plausible is simpler and more privacy-friendly. Recommendation: PostHog.
- Server-side events are logged via lib/analytics/track.ts which writes to SiteEvent and forwards relevant ones to PostHog.
- Client-side events captured via posthog-js wrapped in a typed hook usePosthog().
- Event naming uses SCREAMING_SNAKE_CASE constants, exported from lib/analytics/events.ts.
- Wire analytics in Phase 6 (Polish & Launch). During Phases 1-5, infrastructure is in place but tracking calls can be no-ops in dev.

# 21. Badge & Rank System Detail

The TenXPros badge and rank system is not decoration. It is how the credential becomes visible, shareable, and verifiable in the wider professional world. Every certified TenXPro carries badges that are individually verifiable by anyone with a URL — a stronger trust signal than a generic certificate of completion.


## 21.1 The Three Ranks

Ranks mark progression milestones. A TenXPro earns each rank as they complete the corresponding phase of work.


| Rank | Earned After | Meaning |
| --- | --- | --- |
| AI-Ready Professional | Phase 1 (Frame): Modules 1-4 | Demonstrated mindset, literacy, responsibility, and problem framing. |
| AI Problem Solver &amp; Solution Designer | Phase 2 + 3 (Design + Prove): Modules 5-10 | Can design responsible AI solutions and plan their adoption with evidence. |
| Future-Ready AI Solution Designer | Phase 4 + Capstone: Module 11 + Capstone passed | Final rank. Certified TenXPro with strategic foresight discipline. |


## 21.2 The Eleven Module Badges

Each module has a badge earned upon passing. The badge encodes the specific competency demonstrated.

- Module 1: TenX Mindset Badge — readiness and posture for AI work.
- Module 2: AI Core Badge — practical AI literacy and tool fluency.
- Module 3: Responsible Practitioner Badge — risk, ethics, professional boundaries.
- Module 4: Frame Badge — structured problem framing.
- Module 5: Context & Stakeholder Badge — situational analysis and stakeholder mapping.
- Module 6: Evidence Badge — data and verification discipline.
- Module 7: Workflow Designer Badge — human-AI workflow allocation.
- Module 8: Solution Architect Badge — responsible AI solution design.
- Module 9: Adoption Strategist Badge — change and communication design.
- Module 10: Value & Proof Badge — value definition and roadmap discipline.
- Module 11: Foresight Strategist Badge — scenario planning and future-proofing. This is the program's signature badge.

## 21.3 Capstone & Special Badges

- Capstone Seal — earned when the full Dossier passes Capstone review with CERTIFIED outcome.
- Founding Charter Member — automatically issued to members 1-10 (Tier 1) on enrollment.
- Early Charter Member — members 11-20 on enrollment.
- Late Charter Member — members 21-30 on enrollment.
- Final Charter Member — members 31-40 on enrollment.
- Future special badges may be issued (e.g., community contribution, domain pioneer, certified coach).

## 21.4 Badge Lifecycle

Issuance:

- Server action issues badge when triggering event occurs (module passed, capstone certified, tier enrollment, etc.).
- Creates ParticipantBadge with unique verificationCode (cuid).
- Sends Notification to participant.
- Emits BADGE_EARNED SiteEvent.
- Sends email if material milestone (rank, capstone).
Display:

- Profile page (private view) — full grid with all earned and locked.
- Directory profile (public, post-certification) — public badges shown.
- Public verification page /verify/[code] — anyone can verify a specific badge.
Sharing:

- Each badge has a copy-able verification URL.
- Pre-formatted LinkedIn share text generated for each badge.
- 'Add to LinkedIn' deep link for the platform's credential feature.
- Optional: downloadable badge image with verification URL embedded as QR code.
Verification:

- /verify/[code] is public, no auth required.
- Shows: badge name, description, recipient name and title, earned date, recipient's Directory link (if public).
- Shows verification status: ACTIVE (valid), REVOKED (rare; with reason if appropriate), INACTIVE (recipient hid the badge).
- Page is shareable with OG image showing badge + recipient name for previews on LinkedIn, Twitter, etc.

## 21.5 Public Verification Page (/verify/[code])

Layout:

- Centered card on TenXPros-branded background.
- Badge icon (large).
- Badge name (large heading).
- Status indicator: 'Verified' (green check) or 'Not active' (gray).
- Recipient: name, title (linked to Directory profile if public).
- Earned date.
- Badge description.
- Verification URL displayed (the page's own URL).
- TenXPros branding and link back to /.
Behavior:

- Loads under 1 second.
- Indexable by search engines (so verification URLs surface in results).
- OG metadata includes badge + recipient name for rich previews.

## 21.6 Badge Issuance Rules

- MODULE badges issued automatically when ParticipantModule.status transitions to PASSED.
- RANK badges issued automatically when the corresponding module set is complete (Frame rank when Modules 1-4 all PASSED; etc.).
- CAPSTONE badge issued when CertificationReview.outcome = CERTIFIED.
- Charter Member badges issued automatically on enrollment based on tier.
- Special badges issued manually by admin via /admin/badges UI.
- Idempotency: re-running the issuance logic does not create duplicate badges (enforced by @@unique([userId, badgeId])).

## 21.7 Badge Schema Reminder

Badge and ParticipantBadge models are defined in Section 6. Key fields:

- Badge: slug (unique identifier), name, description, category, iconUrl, color, order, isActive.
- ParticipantBadge: userId, badgeId, verificationCode (cuid, unique), earnedAt, isPublic, contextType, contextRef.
- Badges are seeded as part of schema initialization (Step 0) with the full catalog above.

# 22. Master Prompt for AI Coding Tools

Copy this prompt into Cursor, Windsurf, or Claude Code as the starting point for the project. Provide this entire document as context attachment.


## 22.1 Initial Setup Prompt

You are helping me build the production-ready first version of TenXPros, an adaptive AI certification platform.

I have attached the complete Build Specification document. This document is the source of truth. Follow it carefully.

Key principles:

- Build the full architecture from day one; activate features in phases.

- Use Next.js 14+ App Router, TypeScript, Tailwind, Prisma, PostgreSQL, NextAuth v5.

- Premium executive education aesthetic — dark navy, slate, white, soft gold accents.

- No hype language. Professional, substantive copy.

- Do not over-engineer. Build a serious MVP that can grow.

START WITH A SCHEMA VALIDATION PASS (mandatory before any other code):

Step 0 — Schema validation pass:

1. Create the Next.js project skeleton with TypeScript and Prisma initialized.

2. Copy the complete Prisma schema from Section 6 of the spec into prisma/schema.prisma exactly as written.

3. Run `npx prisma format` and `npx prisma validate`.

4. Confirm all 26 models are present: User, Account, Session, VerificationToken, Application, ParticipantProfile, DiagnosticIntake, ProgramPath, Module, ParticipantModule, Dossier, DossierSection, Ticket, TicketMessage, Feedback, CertificationReview, DirectoryProfile, PricingTier, PaymentRecord, EmailEvent, SiteEvent, Notification, Badge, ParticipantBadge, AuditLog, AdminSetting.

5. Confirm all relations resolve (no Prisma validation errors).

6. Confirm NextAuth Prisma Adapter compatibility (User, Account, Session, VerificationToken present and correct).

7. Run `npx prisma migrate dev --name init` against a fresh local PostgreSQL database.

8. Create prisma/seed.ts that seeds: (a) one admin user, (b) all 5 pricing tiers with Tier 1 active and others inactive, (c) the full Badge catalog (11 module badges, 3 rank badges, 1 Capstone Seal, 4 Charter Member badges = 19 badges total), (d) initial AdminSetting records. Run it; verify all records exist.

9. Report success and any issues encountered.

Only AFTER Step 0 passes cleanly, proceed with the rest of Phase 1:

- Implement the four layouts (PublicLayout, AuthLayout, PortalLayout, AdminLayout).

- Implement NextAuth with Credentials provider.

- Implement middleware.ts with role-based routing.

- Create placeholder pages for all public routes.

- Match the design system in Section 5.

PHASE 1 SCOPE DISCIPLINE (do not violate):

During Phase 1, do NOT implement any of the following — these belong to later phases:

- Application form submission logic (Phase 3)

- Admin application review (Phase 3)

- Email sending (Phase 3+)

- Diagnostic Intake form (Phase 4)

- Module content delivery (Phase 4)

- Dossier Builder functionality (Phase 4)

- Ticket creation or response (Phase 4)

- Path Builder (Phase 5)

- Module library management (Phase 5)

- Dossier review interface (Phase 5)

- Certification review (Phase 5)

- Directory profile management (Phase 5)

- Payment processing automation (manual Stripe Payment Links sent in Phase 3 are OK; full Stripe integration is Phase 6+)

- Stripe webhooks, Checkout sessions, or automated payment status updates (Phase 6+)

Phase 1 creates ONLY: project structure, schema, auth scaffolding, layouts, navigation, and empty/placeholder route shells. Any business logic for later phases is explicitly out of scope and must be deferred even if it seems convenient to implement now.

CROSS-PHASE GUARDRAIL — Extended admin scope:

For extended admin areas introduced in Section 12.16–12.22 (Analytics, Users & Coach Management, Email Management, Audit Log, Reports & Exports, Settings, Badge Management), create route shells and minimal/read-only views unless the current phase explicitly requires full functionality. Do not implement full analytics dashboards with custom filtering, advanced report generation, audit log exports, email template editing UI, or coach pipeline automation before core lifecycle flows (application → enrollment → modules → dossier → certification) are stable in production. Architecture is full; activation of extended admin features is iterative.

Before writing code in Step 0, tell me your plan. After Step 0 completes, ask for confirmation before continuing to the rest of Phase 1.

Reference sections of the document by number when you have questions.


## 22.2 Phase-by-Phase Continuation Prompts

Use these short prompts to advance after completing each phase:


### After Phase 1

Phase 1 is complete and passes acceptance criteria from Section 16. Proceed with Phase 2: Public Site. Build the 10 public pages per Section 8 specifications. Match the design system in Section 5. Use placeholder copy where final marketing copy is not provided; structure must match exactly.


### After Phase 2

Phase 2 is complete. Proceed with Phase 3: Application System. Implement the application form per Section 9.2, the submission flow per Section 9.3, the admin review flow per Section 9.4, and the email templates per Section 14. Edge cases per Section 9.5 must be handled.


### After Phase 3

Phase 3 is complete. Proceed with Phase 4: Participant Portal. Implement all participant portal pages per Section 10. The Dossier Builder per Section 11 is the most important piece — give it extra care.


### After Phase 4

Phase 4 is complete. Proceed with Phase 5: Admin Operations. Implement all admin portal pages per Section 12. Pay particular attention to the Path Builder (Section 12.8), Dossier review (Section 12.10), and Certification review (Section 12.12).


### After Phase 5

Phase 5 is complete. Proceed with Phase 6: Polish & Launch. Refine responsive design, finalize copy, implement empty/loading/error states, configure SEO and analytics, prepare production for launch per Section 18 deployment guidelines. Use the post-launch checklist in Section 19 before going live.


## 22.3 Working Discipline Reminders

- Always read the specification before writing code. Do not invent.
- Match the schema in Section 6 exactly; if a change is needed, propose it explicitly.
- Match the design system in Section 5; do not introduce new colors or fonts.
- Commit small, named changes per phase milestone.
- Test against acceptance criteria before declaring a phase done.
- If you encounter an ambiguity in the spec, flag it and ask before guessing.
- Do not skip the coming-soon states for Directory, Radar, and tiers other than Tier 1.

## 22.4 Final Note from the Founder


| This is the build commitment&lt;br&gt;TenXPros is not a side project. It is a serious certification platform with a real credential and real participants. The codebase reflects that seriousness. Every page, every model, every flow respects the participant&#x27;s investment of $997 to $1,997 and their professional time. Build with that respect in mind. |
| --- |


## End of Build Specification

TenXPros

Frame. Design. Prove. Foresee.

Build well. Launch with discipline. Honor the credential.
