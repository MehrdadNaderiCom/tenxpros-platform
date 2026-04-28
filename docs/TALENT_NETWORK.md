# Talent Network

The Talent Network is the **TenXPros-owned** layer that connects
certified, AI-adopted professionals with verified organisations who
are looking for AI-ready talent.

It is **not** a job board, it is **not** an automated matcher, and it
**does not guarantee employment**. It is a curated, advisory service
where TenXPros human reviewers and admins broker introductions when
there is real fit.

## What it covers

- **Certified professionals** — anyone with an `ISSUED` certificate
  who has opted into the talent pool.
- **Employer organisations** — `OrganizationProfile` rows whose
  `verified = true`. Verification is admin-controlled (light KYC).
- **Employer role needs** — `EmployerRoleNeed` definitions: title,
  skills, AI work modes, minimum certificate level, AI adoption
  expectations, status.
- **Candidate shortlists** — `EmployerMatch` rows curated by an admin
  for a specific role need.
- **Introduction requests** — `EmployerRequest` rows in the
  `intro` / `shortlist` / `advice` / `team-assessment` /
  `interview-support` flavours.
- **Interview support** — reviewer-led, optional service for
  AI-enabled roles.
- **Candidate AI-readiness assessment** — extra scenario / rubric
  evaluation requested by an organisation against a specific
  professional.
- **Organisation talent requests** — the request workflow as a
  whole, including admin handling and audit trail.
- **Relationship status tracking** — the per-professional and
  per-request state machines below.

## Statuses

### Professional talent-pool status

`TalentPoolStatus` enum (Prisma):

| Status | Meaning |
|--------|---------|
| `NOT_VISIBLE` | Default. Not in the pool. |
| `ELIGIBLE` | Has a certificate; admin has not yet promoted to visible. |
| `VISIBLE` | Discoverable to verified orgs in `/employer/browse`. |
| `SHORTLISTED` | Admin has placed on a specific employer's shortlist. |
| `INTRODUCED` | An employer has been put in contact (with consent). |
| `INTERVIEWING` | Active interview process. |
| `OFFER_DISCUSSION` | Offer or terms under discussion. |
| `HIRED` | Engagement formed. |
| `PAUSED` | Professional has paused visibility (sabbatical, life event, etc.). |

The status lives on `ProfessionalProfile.talentPoolStatus`.

### Employer request status

`EmployerRequestStatus` enum (Prisma) — current values:

| Status | Meaning |
|--------|---------|
| `NEW` | Just submitted. |
| `DISCOVERY` | TenXPros admin in conversation with the org. |
| `ROLE_DEFINED` | Role need is captured in `EmployerRoleNeed`. |
| `SHORTLIST_PREPARING` | Admin is curating the shortlist. |
| `SHORTLIST_SENT` | Shortlist has been delivered. |
| `INTERVIEWS_ACTIVE` | Org is interviewing the candidates. |
| `CLOSED_HIRED` | Successful close. |
| `CLOSED_NO_FIT` | Closed without a hire. |
| `PAUSED` | Org has paused the engagement. |
| `IN_REVIEW`, `CONTACTED`, `FULFILLED`, `REJECTED` | Legacy values kept for back-compat with existing data. |

## Discipline rules

- **Do not guarantee jobs.** Public copy and admin tooling avoid any
  language that implies guaranteed employment outcomes.
- **Do not automate rejection.** Decisions to remove a candidate from
  a shortlist or to close a request always have a human owner.
- **Recommendations are advisory.** Match scores and shortlists are
  inputs to a human-reviewed decision, never the decision itself.
- **Consent before introduction.** A professional's contact details
  reach an organisation only when the professional has consented.
- **Transparency.** A professional can see their own talent-pool
  status and the introductions made on their behalf.

## Relationship to TenXRole

- The Talent Network is TenXPros-owned.
- A successful introduction *can* generate a job-search artifact in
  TenXRole (e.g. an opportunity row), but **TenXRole owns** the
  actual application workflow.
- The TenXPros → TenXRole payload includes `talentPoolStatus` and
  `introductionHistory` so the career execution surface stays in
  sync.

## Where it shows up in the app

| Surface | Role | Function |
|---------|------|----------|
| `/admin/matches` | Admin | Curate matches between role needs and professionals |
| `/admin/employer-requests` | Admin | Move requests through the new statuses |
| `/admin/users` | Admin | Promote eligible professionals to `VISIBLE` |
| `/employer/browse` | Employer | Discover `VISIBLE` certified professionals |
| `/employer/matches` | Employer | See shortlists curated for the org |
| `/employer/request` | Employer | Submit an intro / shortlist / advice / team-assessment / interview-support request |
| `/public-profile` | Professional | Manage what's visible and to whom |
| `/dashboard` | Professional | KPI: employer visibility eligibility (in place) |
| `/opportunities` | Professional | TenXRole connection; talent-network status will surface here |

The matching scorer remains admin-curated for now. A scoring
heuristic — certificate-level fit + work-mode overlap + skill overlap
+ visibility — is on the roadmap, with all output staying advisory.
