# Employer Portal

The employer portal is the surface where verified organisations engage
with the TenXPros **Talent Network**. It is part of the
TenXPros-owned employer relationship layer — see
[TALENT_NETWORK.md](TALENT_NETWORK.md) for the conceptual model and
[ECOSYSTEM_BOUNDARIES.md](ECOSYSTEM_BOUNDARIES.md) for why TenXPros,
not TenXRole, owns this surface (TenXRole is the candidate's career
execution product; the employer's relationship sits with TenXPros).

## Headline

> Find professionals who can actually work with AI.

## Sub-headline

> TenXPros helps organisations discover, assess, interview and connect
> with AI-adopted professionals who have evidence-backed certification
> and role-specific AI workflows.

## Who can use it

- A user with `role = EMPLOYER`. Sign-up creates an
  `OrganizationProfile` with a generated slug.
- The profile starts as `verified = false`. An admin verifies the org
  before its requests are honoured by the talent network. Unverified
  orgs can still browse but their requests are held in `DISCOVERY`.

## Surfaces

| Route | Purpose |
|-------|---------|
| `/employer/dashboard` | Overview: open role needs, recent matches, status of recent requests |
| `/employer/organization` | Edit org profile (name, industry, contact, description) |
| `/employer/roles` / `/employer/roles/new` | Define AI-ready role needs |
| `/employer/browse` | Browse professionals whose `visibility` is `EMPLOYER_VISIBLE` or `PUBLIC` and who hold an `ISSUED` certificate |
| `/employer/request` | Submit a talent / shortlist / advice / team-assessment / interview-support request |
| `/employer/matches` | Admin-curated shortlists for the org's role needs |
| `/employer/settings` | Account preferences |

## Role need shape (`EmployerRoleNeed`)

| Field | Notes |
|-------|-------|
| `title`, `description`, `department`, `industry`, `location`, `engagementType`, `budgetRange` | Standard role facts |
| `skillsRequired[]` | Free-form |
| `aiWorkModes[]` | Which `WorkMode` mix the role expects |
| `taskExamples` | Real tasks the hire will own |
| `aiAdoptionExpectations` | What "AI-adopted" looks like for this role |
| `minCertificateLevel` | Used for browse filter and shortlist eligibility |
| `status` | `OPEN` / `ON_HOLD` / `CLOSED` |

## Request kinds

`EmployerRequest.kind` is a free string; the seeded vocabulary:

- `intro` — meet a specific candidate
- `shortlist` — three credible candidates for a role
- `advice` — talk to TenXPros about your AI-adoption hiring needs
- `team-assessment` — TenXPros assesses an existing team's AI readiness
- `interview-support` — generated AI-relevant interview questions

## Request status lifecycle

`EmployerRequestStatus` (Prisma) — current values:

```
NEW → DISCOVERY → ROLE_DEFINED → SHORTLIST_PREPARING
   → SHORTLIST_SENT → INTERVIEWS_ACTIVE
   → CLOSED_HIRED  |  CLOSED_NO_FIT  |  PAUSED
```

Legacy statuses `IN_REVIEW`, `CONTACTED`, `FULFILLED`, `REJECTED` are
preserved for back-compat with existing rows.

## Talent-pool status (per professional)

`ProfessionalProfile.talentPoolStatus` tracks the relationship side:

```
NOT_VISIBLE → ELIGIBLE → VISIBLE → SHORTLISTED → INTRODUCED
            → INTERVIEWING → OFFER_DISCUSSION → HIRED  |  PAUSED
```

See [TALENT_NETWORK.md](TALENT_NETWORK.md) for the meaning of each
status.

## Matching

Matching is **admin-curated by default**. An admin opens a role need,
selects eligible professionals, and creates `EmployerMatch` rows with
a `score`, `rationale`, and `visibleToEmployer = false`. Visibility
flips only after candidate consent.

A future automated scorer (advisory only) is planned and will key on:

- certificate level meets `minCertificateLevel`
- `WorkMode` overlap between professional's tasks and `aiWorkModes`
- skill overlap
- visibility flag and explicit consent

The output stays advisory. Hiring decisions remain human, by design.

## Discipline rules (mirrored from Talent Network)

- **No automated rejection.** A status never advances to a "closed
  no fit" without an explicit human action.
- **No employment guarantees.** Public copy reflects this.
- **Consent before introduction.** Contact details flow only with
  candidate consent.
- **AI summaries are clearly marked and editable** by reviewers
  before they reach an employer.

## Verification

`OrganizationProfile.verified` is set by an admin in
`/admin/organizations` after light KYC. Unverified orgs can browse but
their requests are held at `DISCOVERY`.
