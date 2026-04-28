# Customisation System

TenXPros is a **service**. The same product looks materially different
to a project manager in financial services, a consultant in life
sciences, and a founder building a content business. This document
describes the seven dimensions of customisation and the supporting
runtime.

## Language

Use these words deliberately:

- **customised** — tailored to a specific person/role/context.
- **tailored** — same idea, marketing-friendly variant.
- **role-specific** — fits the professional's job family.
- **workflow-specific** — fits a recurring task or process.
- **model-routed** — different tasks get different LLMs.
- **prompt-engineered** — versioned, named prompts, not ad-hoc strings.
- **AI-adoption-ready** — the audience we serve.

Use **fine-tuned** *carefully*:

- Fine-tuned **workflows / prompts** are common and we say so.
- Fine-tuned **models** are optional and case-dependent. Do **not**
  imply we fine-tune a model per user. We don't.

## 1. Career customisation

Inputs (from TenXRole when connected; otherwise from the
`ProfessionalProfile`):

- target roles, geography, work-mode preference, seniority
- salary expectations, sector, market positioning

These shape every recommendation: which learning track to push, which
prompt pack to surface, which scenarios to assign, which level to aim
for.

## 2. Learning customisation

What we customise:

- **tracks** assigned (role-relevant first)
- **modules** ordered against current diagnostic gaps
- **scenarios** selected at the right certificate level
- **practice tasks** matched to the professional's actual `ProfessionalTask` list
- **assignments** for coaching cohorts
- **certificate pathway** — which level is realistic next; what is
  required to clear it

The eligibility evaluator (`src/lib/certification/eligibility.ts`)
already reads this state per request; the customisation layer
prioritises content based on it.

## 3. Prompt-pack customisation

Implemented by the `PromptPack` model:

- `category` — `role` / `career` / `job-search` / `interview` /
  `employer-specific` / `portfolio` / `evidence`.
- `audience` — `PM` / `Consultant` / `Trainer` / `Founder` / `All`.
- `prompts[]` (JSON) — `{ name, version, text }` records.
- `global` — whether the pack is platform-curated or user-owned.

Two **global** packs are seeded out of the box:

- `pm-status-pack` (status & risk synthesis)
- `career-positioning-pack` (resume / LinkedIn / TenXRole positioning)

Custom user-owned packs (`global = false`, `professionalId` set) are
the M2 surface — coaches generate them; professionals can edit and
re-version.

## 4. Model strategy customisation

Supported via `src/lib/ai/router.ts`:

- Provider-agnostic abstraction (mock / OpenRouter / future
  Anthropic / OpenAI direct).
- Model selected per `AIRunPurpose`:

| Purpose | Suggested class |
|---------|-----------------|
| simple rewrite, polish | a cheap fast model |
| reasoning, planning, scenario generation | a strong general model |
| coding / implementation design | a coding-tuned model |
| market intelligence / research | a research / RAG-friendly model |

Every run logs `provider`, `model`, `promptVersion`, `costUsd`,
`durationMs` to `AIRunLog` so we can track customisation outcomes.

> **Note.** This pass keeps the router simple — the env-driven default
> model. The per-purpose router is on the M2 roadmap; the schema is
> already shaped for it.

## 5. Workflow customisation

The platform composes per-professional workflows that span products:

- **career path → skill gap → learning plan** — TenXRole sends gaps
  in; TenXPros builds a coaching plan and assigns content.
- **job description → fit analysis → resume / profile update** — the
  job description comes from TenXRole; TenXPros provides the
  AI-adopted positioning copy and prompt pack; TenXRole owns the
  actual update.
- **scenario → evidence → certificate** — TenXPros' core internal
  workflow.
- **certificate → talent pool → employer introduction** — TenXPros
  brokered, advisory.

## 6. Tool stack customisation

TenXPros recognises and recommends from a non-exhaustive working set:

- **General LLMs** — ChatGPT, Claude, Gemini.
- **Search/research** — Perplexity, Elicit.
- **Code** — Cursor, Claude Code, GitHub Copilot.
- **Knowledge / docs** — Notion, Notion AI.
- **Career-side** — LinkedIn, GitHub.
- **Spreadsheets / BI** — Excel, Power BI, Sheets.
- **Automation** — Zapier, Make, n8n.
- **Career execution** — TenXRole.
- **Org adoption** — TenXOps.

The professional's `ProfessionalProfile.aiToolsUsed[]` and `tools[]`
fields capture their actual stack; recommendations key off that.

## 7. Real fine-tuning / custom AI creation

Reserved for cases where data, budget and use case actually justify
it:

- Custom assistants on top of a model.
- Retrieval / RAG systems for organisation-specific context.
- Workflow automation (e.g. n8n / Make / Zapier compositions).
- Prompt libraries — versioned, evaluated, owned.
- Fine-tuned **models**, only when the use case justifies the cost.

Marketing copy must avoid implying that every TenXPros user gets a
fine-tuned model. Most users get fine-tuned **workflows and
prompts**, which is plenty.

## Surfacing customisation in the product

- `/diagnostic` informs every customisation layer.
- `/learning`, `/learning/[slug]` — track / module ordering reflects
  the diagnostic and certificate-level gap.
- `/tasks` — the Personal Task Radar makes the customisation
  explicit per task.
- `/opportunities` — surfaces TenXRole-side career customisation.
- `/admin/learning`, `/admin/scenarios`, `/admin/rubrics` — the
  authoring surfaces a coach uses to deliver customised plans.
- `/admin/ai-runs` — auditable record of which model handled which
  purpose with which prompt.

## What customisation is not

- **Not personalisation theatre.** Default content is already
  defensible; customisation sharpens it.
- **Not a guarantee of better outcomes.** It increases relevance, not
  certainty.
- **Not opaque.** Every AI-generated customisation is logged with
  prompt version and is editable by the user or admin.
