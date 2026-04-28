# TenXRole Integration

TenXRole is the AI-powered career management product that owns career
path, opportunity radar, application workflow, networking, interview
prep and the evidence trail of a job search. TenXPros must integrate
with TenXRole rather than duplicate it.

This document defines the integration contract.

## Integration modes

| Mode | Status | Description |
|------|:------:|-------------|
| Manual export / import | available | Professional copies certificate URL and AI readiness summary into TenXRole. |
| Mock API | scaffolded | The `TenXRoleConnection` schema and `/opportunities` UI are in place; calls go to a stub. |
| Production API | planned | Bidirectional sync via authenticated REST/RPC. Token storage out of scope for this repo (managed by `tenxops` infra). |

## Payload — TenXPros → TenXRole

Sent when the professional connects, and after subsequent material
changes (certificate issued, talent-pool status change, opt-in
toggle). Each field is opt-in via the `TenXRoleConnection` flags.

| Field | Meaning |
|-------|---------|
| `professionalId` | TenXPros internal id (idempotency key) |
| `aiReadinessScore` | 0–100 from latest `AIReadinessDiagnostic.computedScore` |
| `certificateLevel` | `L1_AI_READY` … `L5_AI_LEADER` |
| `certificateStatus` | `DRAFT` / `PENDING_REVIEW` / `ISSUED` / `EXPIRED` / `REVOKED` |
| `verifyUrl` | Public verification URL on TenXPros |
| `evidenceSummaries[]` | Approved evidence titles + categories (no full body) |
| `learningPathCompletion` | per-track percentages |
| `coachingNotesSummary` | Free-form, opt-in |
| `targetRoles[]` | What the professional is aiming at |
| `skillGaps[]` | From eligibility evaluator and reviewer notes |
| `recommendedPositioning` | One-paragraph positioning suggestion (AI-generated, editable) |
| `promptPackRefs[]` | Slugs of relevant prompt packs |
| `employerVisibility` | `visibility` enum (`PRIVATE` / `EMPLOYER_VISIBLE` / `PUBLIC`) |
| `talentPoolStatus` | `not_visible` / `eligible` / `visible` / `shortlisted` / `introduced` / `interviewing` / `offer_discussion` / `hired` / `paused` |
| `introductionHistory[]` | Anonymous summary: orgIndustry, status, date |

## Payload — TenXRole → TenXPros

Received on connection and on a periodic pull (or webhook).

| Field | Meaning |
|-------|---------|
| `careerPathGoals` | What the professional says they want |
| `jobTargets[]` | Specific role targets / saved searches |
| `opportunityHistory` | Counts and aggregates of opportunities the professional has engaged with |
| `applicationOutcomes` | Outcomes per application (interview / offer / decline) |
| `repeatedSkillGaps[]` | Gaps that keep recurring across applications |
| `interviewFeedback` | Anonymous interviewer feedback summaries |
| `marketSignals` | Demand patterns relevant to the professional's targets |
| `roleDemandPatterns` | Role + skill combinations seeing the most demand |
| `resumeStatus` | Has-resume / freshness |
| `profileStatus` | Public profile completeness on TenXRole |
| `networkingProgress` | Counts of outreach, replies, intros |

## Schema

`TenXRoleConnection` (see `prisma/schema.prisma`) — one per
`ProfessionalProfile`:

```ts
{
  professionalId: string,      // unique
  tenxroleUserId: string?,
  connected: boolean,
  shareReadiness: boolean,     // default true
  shareCertificate: boolean,   // default true
  shareWorkModes: boolean,     // default true
  sharePromptPacks: boolean,   // default false
  shareCoaching: boolean,      // default false
  lastSyncedAt: DateTime?,
  notes: string?,
  createdAt, updatedAt
}
```

The flags exist so the professional can refine which categories of
data flow into TenXRole. Without a flag set, the corresponding payload
field is omitted.

## API contract (planned)

> All endpoints require an `Authorization: Bearer <token>` header.
> Authentication is owned by the surrounding TenX platform and is
> outside the scope of this repo.

```
POST   /api/integrations/tenxrole/connect
       body: { tenxroleUserId, scopes: { readiness, certificate, workModes, promptPacks, coaching } }
       → 200 { connectionId, lastSyncedAt }

POST   /api/integrations/tenxrole/sync
       body: { triggeredBy: "user" | "system" }
       → 200 { sent, received, lastSyncedAt }

GET    /api/integrations/tenxrole/payload
       → 200 (TenXPros → TenXRole payload, current snapshot)

POST   /api/integrations/tenxrole/inbound
       body: (TenXRole → TenXPros payload)
       → 202

DELETE /api/integrations/tenxrole/connect
       → 204
```

The `/opportunities` page in `(app)/` is the user-facing surface for
this integration. It currently renders the manual handoff plus the
planned-payload preview cards.

## Data boundary

- **TenXRole owns** career execution data — applications, opportunity
  radar interactions, networking outreach, interview transcripts,
  resume revisions.
- **TenXPros owns** certification, coaching, learning, assessment,
  evidence review, and employer-relationship data.
- **Shared profile fields** (name, headline, target role, location)
  are synchronised carefully — when both products write to the same
  field, the user-visible "owner of truth" is shown. We aim for
  TenXRole-owns career-side fields, TenXPros-owns AI-readiness-side
  fields.

## Privacy posture

- Sync is opt-in per category.
- The professional can disconnect at any time; TenXPros deletes the
  connection record but does not delete the data already sent (that
  is owned by TenXRole and managed there).
- We never expose private TenXPros evidence on TenXRole; only
  approved-and-shareable summaries flow.
