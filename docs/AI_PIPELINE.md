# AI Pipeline

Every AI invocation in TenXPros is mediated by a single router that:

1. picks a provider from env config
2. logs the run before, during and after
3. records prompt version so output stays traceable across template
   changes
4. surfaces failures gracefully (never blocks the user with a hard 500)

## Provider abstraction

`src/lib/ai/provider.ts`

```ts
export interface AIProvider {
  name: string;
  supports(purpose: AIRunPurpose): boolean;
  complete(req: AIRunRequest, model: string): Promise<AIRunResult>;
}
```

`AIRunRequest` carries `purpose`, `messages`, `promptVersion`, and a
JSON `metadata` bag. `AIRunResult` carries `provider`, `model`,
`text`, optional `json`, `durationMs` and `usage`.

### Implementations

| Provider | Status | Location |
|----------|--------|----------|
| `mock` | always available; returns deterministic JSON | `src/lib/ai/providers/mock.ts` |
| `openrouter` | requires `OPENROUTER_API_KEY` | `src/lib/ai/providers/openrouter.ts` |

Adding a provider: implement `AIProvider`, register it in
`src/lib/ai/router.ts`. No call site changes.

## Router

`src/lib/ai/router.ts` exposes:

```ts
aiRouter.run({
  purpose: AIRunPurpose,
  messages: ChatMessage[],
  promptVersion: string,
  initiatorId?: string,
  metadata?: Record<string, unknown>,
}): Promise<AIRunResult>
```

The router:

1. Reads `AI_ENABLED`, `AI_PROVIDER`, `AI_MODEL` from env. If
   `AI_ENABLED=false`, falls through to the mock provider regardless.
2. Creates an `AIRunLog` row with `status=QUEUED`.
3. Calls `provider.complete()`.
4. Updates the log to `SUCCESS`/`FAILED` with `outputJson`,
   `outputText`, `durationMs`, `costUsd`, optional `errorMessage`.
5. Returns the result to the caller.

Every call site reads from the log table for replay / audit. Nothing
calls a provider directly.

## Prompt templates

`src/lib/ai/prompts/index.ts` exports versioned constants:

```ts
PROMPT_VERSIONS = {
  diagnosticReport: "diagnostic-report.v1",
  taskClassification: "task-classification.v1",
  scenarioGeneration: "scenario-generation.v1",
  interviewQuestions: "interview-questions.v1",
  evidenceSummary: "evidence-summary.v1",
  candidateSummary: "candidate-summary.v1",
}
```

When a prompt changes meaningfully, **bump the version** so logs reflect
which generation produced which output.

System prompts kept in the same file:

- `SYSTEM_DIAGNOSTIC` — readiness coach; no certification claims; strict JSON.
- `SYSTEM_INTERVIEW` — interview question generator; no buzzwords; strict JSON.
- `SYSTEM_EVIDENCE_SUMMARY` — neutral summarisation for reviewers; no
  hire/reject recommendations.

## Supported purposes

Mapped to `AIRunPurpose` in the schema:

| Purpose | Trigger | Output type |
|---------|---------|-------------|
| `DIAGNOSTIC_REPORT` | Submit AI readiness diagnostic | Strengths, gaps, recommendations |
| `TASK_CLASSIFICATION` | Add a personal task | Suggested `WorkMode` + rationale |
| `LEARNING_RECOMMENDATION` | After diagnostic | Recommended track slugs |
| `SCENARIO_GENERATION` | Admin requests new scenario | Scenario prompt + suggested rubric |
| `INTERVIEW_QUESTIONS` | Employer requests interview support | Role-shaped questions |
| `EVIDENCE_SUMMARY` | Reviewer queues an evidence artifact | Neutral summary |
| `CERTIFICATE_SUMMARY` | Certificate is issued | Public-facing evidence summary |
| `CANDIDATE_SUMMARY` | Employer requests intro | Employer-facing one-paragraph candidate brief |
| `GENERIC` | Catch-all for ad hoc admin runs | Free text |

## Discipline rules

- Every AI output is **stored with prompt version** and **provider/model**.
- Every AI output is **marked AI-generated** in the schema
  (`generatedByAI = true`, `aiRunId` reference).
- AI output is **editable by admin/user** where it surfaces
  (e.g. diagnostic report summary, candidate summary).
- AI output is **never used as the only basis for hiring decisions** —
  reviewers and admins always sit between the AI and a publicly
  visible decision.
- The mock provider must always work — CI runs against it.

## Local secrets

```
# .env
AI_ENABLED=false       # default; mock used regardless
AI_PROVIDER=mock       # or openrouter
# AI_PROVIDER=openrouter
# AI_MODEL=anthropic/claude-3.5-sonnet
# OPENROUTER_API_KEY=sk-or-...
```

Secrets must never appear in the repo. The `.env.example` is checked
in; the active `.env` is git-ignored.
