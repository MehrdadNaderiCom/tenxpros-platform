# Ecosystem Boundaries

> **Core sentence.** TenXRole powers AI-assisted career management.
> TenXPros certifies, coaches, and connects AI-adopted professionals.
> TenXOps helps organisations adopt AI and define the AI-ready talent
> they need.

This document is the single place that fixes the boundary between the
three TenX products. If a feature seems to belong to two products, read
this and pick one.

## TenXRole — career management product

TenXRole is the AI-powered career management product that owns the
end-to-end software experience for an individual managing their career
path and job search.

TenXRole owns:

- **Career path** — long-term roadmap, target roles, transitions.
- **Professional profile** — public and recruiter-facing profile.
- **Skill gaps** — gap radar, prioritisation, plan.
- **Opportunity radar** — market signal, role demand patterns,
  saved searches, notifications.
- **Applications** — discovery, draft, send, follow-up,
  application intelligence.
- **Networking** — contacts, outreach, follow-ups, intros.
- **Interview prep** — role-specific question generation,
  rehearsal loops, feedback capture.
- **Evidence trail** — application-side evidence, communication
  history, recruiter signals.
- **AI-assisted career execution** — drafting, review, decision support.

TenXRole is the **career execution engine.** TenXPros must not rebuild
any of these features in-app.

## TenXPros — service & certification layer

TenXPros is the service, learning, coaching, certification and
talent-network layer that helps a professional become AI-adopted and
become discoverable to organisations who need that capability.

TenXPros owns:

- **AI adoption diagnostic** — readiness score, strengths, gaps.
- **Customised learning paths** — tracks, modules, lessons aligned to
  certificate levels and to the professional's role and AI maturity.
- **Coaching / advisory** — reviewer-led coaching, structured
  feedback, decision support inside scenarios.
- **Prompt packs and model strategy** — role / career / job-search /
  interview / employer-specific prompts; provider routing.
- **Scenario-based assessment** — real-work scenarios with weighted
  rubrics and reviewer scoring.
- **Evidence vault and review** — submission, review queue,
  visibility controls.
- **Evidence-based certification** — five levels, public verification.
- **Talent network** — talent pool, candidate shortlists,
  introduction requests, interview support, candidate AI-readiness
  assessment, organisation talent requests, hiring relationship
  status tracking.
- **Employer relationships** — verified organisations, role-need
  definitions, advisory matching, introductions.
- **Connection to TenXRole** — sends AI readiness, certificate,
  prompt-pack and visibility signals into TenXRole; receives career
  path goals, opportunity history and outcomes back.

## TenXOps — organisational AI adoption

TenXOps is the AI adoption product for organisations.

TenXOps owns:

- **Workflow / task radar** at organisation level.
- **Roadmap and sprints** for AI adoption.
- **Proof pack** — structured rollout evidence.
- **Governance** — policies, risk, oversight.
- **Team enablement** — training delivery, change management.
- **Implementation and transformation consulting** — services that
  redesign work for AI adoption.

TenXOps generates demand for the talent TenXPros certifies. The two
products are designed to be sold together when an organisation is both
adopting AI and hiring AI-adopted talent.

## No-duplication rules

| Rule | Implication |
|------|-------------|
| TenXPros must not rebuild a full opportunity radar | TenXRole owns it. TenXPros may show *introduction status* and *talent-pool visibility status* — not job listings. |
| TenXPros must not rebuild full application management | TenXRole owns the application workflow. TenXPros may receive outcome signals to inform coaching. |
| TenXPros may show summaries, statuses, and outputs from TenXRole | This is the link surface, not a duplication. |
| TenXPros may send AI readiness, certificate and prompt-pack signals to TenXRole | This sharpens TenXRole; it doesn't compete with it. |
| TenXPros may receive career execution feedback from TenXRole | Application outcomes, repeated skill gaps, market signals inform TenXPros' coaching plan. |

## Data ownership

| Domain | Owner | Notes |
|--------|-------|-------|
| Career path data, applications, interview state, networking | **TenXRole** | TenXPros consumes summaries via integration |
| AI readiness diagnostic, coaching plan, evidence, certificates, talent network | **TenXPros** | TenXRole consumes summaries via integration |
| Organisation AI adoption plan, governance, rollout | **TenXOps** | TenXPros consumes role-need signals when an org is hiring |
| Shared professional profile fields (name, headline, target role, location) | Synchronised | TenXRole is authoritative for career-side fields; TenXPros is authoritative for AI-readiness-side fields |

## Headline reference

- **TenXPros homepage:** *Become an AI-Adopted Professional.* /
  *Get certified, coached, and connected for the AI era.*
- **TenXPros employer page:** *Find professionals who can actually
  work with AI.*
- **Ecosystem line everywhere:** *TenXRole manages the career journey.
  TenXPros develops and certifies the professional. TenXOps transforms
  the organisation.*
