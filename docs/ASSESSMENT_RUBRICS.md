# Assessment Rubrics

Scenario-based assessment is the core evidence-generating step of the
TenXPros lifecycle. A scenario is a real role-shaped problem; a
submission is the candidate's design, prompts, verification and
output. A reviewer scores it against a rubric.

## Submission shape

A `ScenarioSubmission` captures everything needed to evaluate
judgement, not just output:

| Field | Meaning |
|-------|---------|
| `humanSteps` | What the human does — discovery, judgement, sign-off |
| `aiSteps` | What AI is asked to do, and where it sits in the workflow |
| `toolsUsed[]` | Concrete tools (ChatGPT, Claude, Notion AI, etc.) |
| `promptOutline` | The prompts, in order, with inputs and expected outputs |
| `riskControls` | What confidentiality / accuracy / fairness controls were applied |
| `reviewProcess` | How the candidate verifies before shipping |
| `finalOutput` | The artifact the workflow produces |
| `workModeChoice` | Selected `WorkMode` for the underlying task |
| `workModeReason` | Why this mode and not another |

Status flow: `DRAFT → SUBMITTED → UNDER_REVIEW → ACCEPTED | NEEDS_REVISION | REJECTED`.
Score is optional and 0–100.

## Rubric criteria

Two seeded rubrics:

### `scenario-core` (L1–L2)

| Criterion | What it checks | Weight |
|-----------|----------------|-------:|
| Task judgement | Did the candidate split human work from AI work correctly? | 3 |
| AI tool selection | Were the tool choices reasonable and justified? | 2 |
| Workflow design | Is the proposed workflow concrete and runnable? | 3 |
| Output quality control | Is there a credible verification step before shipping? | 2 |
| Risk awareness | Did the candidate name and address realistic risks? | 3 |
| Role relevance | Does the design match the role context provided? | 1 |
| Clarity | Is the submission readable and grounded? | 1 |
| Evidence quality | Are the artifacts described concrete and useful? | 2 |

### `scenario-advanced` (L3–L5)

| Criterion | What it checks | Weight |
|-----------|----------------|-------:|
| Multi-step orchestration | Are the steps decoupled with explicit handoffs? | 3 |
| Oversight design | Where does a human approve / intervene / audit? | 3 |
| Failure modes | Did the candidate enumerate plausible failures? | 2 |
| Measurable outcome | Is there a clear success metric? | 2 |
| Adoption / handoff | Could a teammate run this with the artifact provided? | 2 |
| Risk and governance | Are sensitive data and policy boundaries respected? | 3 |

Weights are integers; the reviewer scores each criterion mentally and
records an overall numeric score 0–100. (A weighted-criterion form is
planned; until then the rubric is shown to the reviewer alongside the
submission for guidance.)

## Reviewer flow

- Submitted scenarios appear in `/admin/scenarios` (work in progress).
- Per-submission review records sit in `AssessmentReview` and roll up
  into the certificate eligibility check `reviewerApproved`.
- Reviewers can return a submission with `NEEDS_REVISION` and a note;
  the candidate revises and re-submits.

## Seeded scenarios

| Slug | Level | Role focus |
|------|-------|-----------|
| `weekly-status-report` | L1 | Project Manager |
| `candidate-summary-no-screening` | L2 | HR / Recruiter |
| `client-deck-from-research` | L3 | Consultant |
| `automation-handoff-design` | L4 | Founder / Operator |
| `team-adoption-plan` | L5 | Adoption Lead |

## Why this matters

Most "AI certifications" reward attendance. TenXPros rewards
*designed AI work that someone reviewed*. The submission shape and the
rubric are the contract that makes the certificate credible.
