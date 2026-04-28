# Product Vision

## What TenXPros is

TenXPros is the **AI-adoption service layer** for individual
professionals. It provides diagnostics, customised learning, coaching,
prompt packs, role-specific AI workflows, scenario assessment,
evidence review, certification, and a curated talent network that
introduces certified professionals to organisations seeking AI-ready
talent.

It is **deliberately not** a career management product. Career path,
opportunity radar, applications, networking, and interview prep belong
to **TenXRole** — TenXPros sends signal into TenXRole and receives
career-execution feedback back, but does not duplicate that surface.

## Ecosystem one-liner

> TenXRole manages the career journey. TenXPros develops and certifies
> the professional. TenXOps transforms the organisation.

## Headlines

- **Public homepage:** *Become an AI-Adopted Professional.* /
  *Get certified, coached, and connected for the AI era.*
- **For Professionals:** *Get certified, coached, and connected for
  the AI era.*
- **For Organisations:** *Find professionals who can actually work
  with AI.*

## Subheadline

> TenXPros helps professionals become AI-adopted through diagnostics,
> customised learning, coaching, evidence-based certification, and
> connections with organisations seeking AI-ready talent — powered by
> TenXRole for career execution.

## What TenXPros is **not**

- Not the career-execution product (that's TenXRole).
- Not a job board.
- Not a generic course library.
- Not a prompt marketplace.
- Not an automated hiring system.
- Not a guarantee of employment.

## The lifecycle

```
Diagnose → Learn → Practice → Assess → Certify → Showcase → Connect
```

Each stage owes the next stage *evidence*, not just attendance.

| Stage | What the professional does | What the system records |
|-------|----------------------------|-------------------------|
| Diagnose | Self-rates literacy, tools, prompting, risk awareness; describes daily tasks and pain points | `AIReadinessDiagnostic` + `AIReadinessReport` |
| Learn | Works through customised tracks/modules/lessons (with optional coaching) | `LessonCompletion` |
| Practice | Maps real tasks; classifies them by `WorkMode` | `ProfessionalTask` + `TaskAIClassification` |
| Assess | Submits scenario responses; reviewers score against rubrics | `ScenarioSubmission` + `AssessmentReview` |
| Certify | Submits evidence; admin/reviewer approves; certificate issues | `EvidenceArtifact`, `Certificate` (`status=ISSUED`) |
| Showcase | Configures public profile (visibility, featured evidence) | `PublicProfile`, `ProfessionalProfile.visibility` |
| Connect | Opts into the talent network; admin curates introductions; or sends signal into TenXRole | `ProfessionalProfile.talentPoolStatus`, `EmployerMatch`, `EmployerRequest`, `TenXRoleConnection` |

## Audiences

### Individual professionals

The primary user. They come for the diagnostic; they stay for the
customised path; they leave with a verified certificate and either an
introduction to a verified organisation or a sharper signal flowing
into TenXRole.

### Organisations

A verified organisation can browse `EMPLOYER_VISIBLE` and `PUBLIC`
profiles, define `EmployerRoleNeed`s with AI work-mode requirements,
and request shortlists / intros / interview support / candidate
AI-readiness assessment / team assessment. The system is **advisory**
— admins curate, organisations decide. We never auto-screen,
auto-reject, or guarantee outcomes.

## Connection to the TenX ecosystem

| Property | Audience | Owns |
|----------|----------|------|
| **TenXRole** | Individual professionals | Career path, profile, opportunity radar, applications, networking, interview prep, career-execution evidence trail |
| **TenXPros** *(this product)* | Individual professionals + verified organisations | AI-adoption diagnostics, customised learning, coaching, prompt packs, scenario assessment, evidence review, certification, talent network |
| **TenXOps** | Organisations | Workflow / task radar, AI adoption roadmap, governance, team enablement, AI-ready role definitions |

See [ECOSYSTEM_BOUNDARIES.md](ECOSYSTEM_BOUNDARIES.md) for the
authoritative split, and [TENXROLE_INTEGRATION.md](TENXROLE_INTEGRATION.md)
for the integration contract.

## Honest scope

A TenXPros certificate verifies completion and evidence review *within
the TenXPros framework*. It does not represent external accreditation
unless explicitly stated. Every certificate has a public verification
page and a clear scope. Every introduction is advisory and human-reviewed.
