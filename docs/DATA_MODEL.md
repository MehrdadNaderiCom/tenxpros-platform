# Data Model

The Prisma schema in [`app/prisma/schema.prisma`](../app/prisma/schema.prisma)
is the single source of truth.

## Groups

### Identity

- **User** — email, `passwordHash`, `role`, `name`. Has at most one
  `ProfessionalProfile` *or* one `OrganizationProfile`.
- **Session** — HMAC-signed cookie session.

### Professional

- **ProfessionalProfile** — slug, headline, role, languages, skills,
  AI tools, portfolio links, `visibility` (`PRIVATE` /
  `REVIEWERS_ONLY` / `EMPLOYER_VISIBLE` / `PUBLIC`), `readinessScore`.
- **AIReadinessDiagnostic** — eight 0–5 self-rated dimensions plus
  free-form fields (`dailyTasks`, `painPoints`, `targetOutcomes`,
  `jobSearchStatus`).
- **AIReadinessReport** — generated summary, strengths, gaps,
  recommendations, including `recommendedCertificate`. May be linked to
  an `aiRunId`.
- **ProfessionalTask** + **TaskAIClassification** — the personal Task
  Radar. Each task captures business value, complexity, risk,
  confidentiality, human-judgement and AI-suitability scores; each
  classification records the chosen `WorkMode` with a rationale.

### Learning

- **LearningTrack** → **LearningModule** → **Lesson** → optional
  **PracticeTask**. Lessons store body text + `objectives[]` and a
  `certificateLevel`.
- **LessonCompletion** — `(lessonId, professionalId)` unique.

### Assessment

- **Scenario** — published prompts; each scenario references a
  `Rubric` and optionally a `Lesson`.
- **Rubric** + **RubricCriterion** — weighted dimensions used by
  reviewers.
- **ScenarioSubmission** — humanSteps, aiSteps, toolsUsed,
  promptOutline, riskControls, reviewProcess, finalOutput,
  workModeChoice + workModeReason, status (`DRAFT` →
  `SUBMITTED` → `UNDER_REVIEW` → `ACCEPTED|NEEDS_REVISION|REJECTED`),
  optional score.
- **AssessmentReview** — reviewer note, status, score per submission.

### Evidence Vault

- **EvidenceArtifact** — title, `EvidenceType`, description,
  human/AI contribution, risks considered, file or external URL,
  `visibility`, `status` (`DRAFT|SUBMITTED|UNDER_REVIEW|APPROVED|NEEDS_REVISION|REJECTED`).
- **EvidenceReview** — reviewer decision (`APPROVED` /
  `REJECTED` / `NEEDS_REVISION`).

### Certification

- **Certificate** — `publicId` (ULID-style 12-char), `level`,
  `status` (`DRAFT|PENDING_REVIEW|ISSUED|EXPIRED|REVOKED`), issued/expires
  dates, `evidenceSummary`, `assessmentScore`, `roleFocus`,
  `revocationReason`, `verifyUrl`, `issuedByReviewerId`.
- **CertificateRequirement** — granular satisfied/not-satisfied checklist
  per certificate.
- **CertificateReview** — reviewer note + status.

### Public profile

- **PublicProfile** — what the professional chooses to show publicly
  (`bio`, `showContact`, `showCertificates`, `showEvidence`,
  `showSkills`, `workModesMastered[]`, `featuredEvidenceIds[]`).

### Employer + talent network

- **OrganizationProfile** — name, slug, industry, contact, `verified`.
- **EmployerRoleNeed** — title, description, skills required,
  `aiWorkModes[]`, `minCertificateLevel`, `status`.
- **EmployerRequest** — kind (`intro|shortlist|advice|team-assessment|interview-support`),
  message, `status` (`NEW|DISCOVERY|ROLE_DEFINED|SHORTLIST_PREPARING|SHORTLIST_SENT|INTERVIEWS_ACTIVE|CLOSED_HIRED|CLOSED_NO_FIT|PAUSED` plus legacy `IN_REVIEW|CONTACTED|FULFILLED|REJECTED`),
  internal notes.
- **EmployerMatch** — admin-curated match between a `RoleNeed` and a
  `ProfessionalProfile`, `score`, `rationale`, `visibleToEmployer` toggle.
- `ProfessionalProfile.talentPoolStatus` (`TalentPoolStatus`) tracks
  the per-professional state in the talent network — see
  [TALENT_NETWORK.md](TALENT_NETWORK.md).

### TenXRole integration

- **TenXRoleConnection** — one per `ProfessionalProfile`. Stores
  whether the professional has connected, which categories of data
  they consent to share (`shareReadiness`, `shareCertificate`,
  `shareWorkModes`, `sharePromptPacks`, `shareCoaching`),
  `lastSyncedAt`. The actual API contract is documented in
  [TENXROLE_INTEGRATION.md](TENXROLE_INTEGRATION.md).

### Customisation — Prompt packs

- **PromptPack** — slug, title, description, audience, category,
  `tags[]`, `prompts` (JSON array of `{ name, version, text }`),
  `global` flag (platform-curated vs user-owned), optional
  `professionalId` for user packs. See
  [CUSTOMIZATION_SYSTEM.md](CUSTOMIZATION_SYSTEM.md).

### Operational

- **AIRunLog** — every AI invocation: `purpose`, `provider`, `model`,
  `promptVersion`, full prompt input, output JSON / text, `status`,
  `errorMessage`, `durationMs`, `costUsd`, `reviewed` flag.
- **AuditLog** — actor, action, entity, meta JSON.
- **SystemSetting** — small key/value JSON registry for runtime config.

## Enum reference

| Enum | Members |
|------|---------|
| `UserRole` | `PROFESSIONAL`, `EMPLOYER`, `ADMIN`, `REVIEWER`, `INSTRUCTOR` |
| `VisibilityStatus` | `PRIVATE`, `REVIEWERS_ONLY`, `EMPLOYER_VISIBLE`, `PUBLIC` |
| `CertificateLevel` | `L1_AI_READY`, `L2_AI_ADOPTED`, `L3_AI_AUGMENTED`, `L4_AI_IMPLEMENTER`, `L5_AI_LEADER` |
| `CertificateStatus` | `DRAFT`, `PENDING_REVIEW`, `ISSUED`, `EXPIRED`, `REVOKED` |
| `WorkMode` | `HUMAN_LED`, `AI_ASSISTED`, `RULES_BASED`, `AUTOMATED`, `AI_TOOL_CHAIN`, `ESCALATE`, `NOT_SUITABLE` |
| `EvidenceType` | `BEFORE_AFTER_ARTIFACT`, `PROMPT_CHAIN`, `AI_WORKFLOW`, `REPORT`, `PRESENTATION`, `DOC_IMPROVEMENT`, `JOB_APPLICATION_IMPROVEMENT`, `AUTOMATION_DESIGN`, `SCENARIO_RESPONSE`, `DECISION_LOG`, `PORTFOLIO_LINK`, `FILE_UPLOAD` |
| `EvidenceStatus` | `DRAFT`, `SUBMITTED`, `UNDER_REVIEW`, `APPROVED`, `NEEDS_REVISION`, `REJECTED` |
| `TaskFrequency` | `AD_HOC`, `DAILY`, `WEEKLY`, `MONTHLY`, `QUARTERLY` |
| `RiskLevel` | `LOW`, `MEDIUM`, `HIGH`, `CRITICAL` |
| `ConfidentialityLevel` | `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED` |
| `EmployerRequestStatus` | `NEW`, `DISCOVERY`, `ROLE_DEFINED`, `SHORTLIST_PREPARING`, `SHORTLIST_SENT`, `INTERVIEWS_ACTIVE`, `CLOSED_HIRED`, `CLOSED_NO_FIT`, `PAUSED`, plus legacy `IN_REVIEW`, `CONTACTED`, `FULFILLED`, `REJECTED` |
| `RoleNeedStatus` | `OPEN`, `ON_HOLD`, `CLOSED` |
| `MatchStatus` | `OFFERED`, `INTRODUCED`, `INTERVIEWING`, `DECLINED_BY_PRO`, `DECLINED_BY_EMPLOYER`, `CLOSED` |
| `TalentPoolStatus` | `NOT_VISIBLE`, `ELIGIBLE`, `VISIBLE`, `SHORTLISTED`, `INTRODUCED`, `INTERVIEWING`, `OFFER_DISCUSSION`, `HIRED`, `PAUSED` |
| `AIRunPurpose` | `DIAGNOSTIC_REPORT`, `TASK_CLASSIFICATION`, `LEARNING_RECOMMENDATION`, `SCENARIO_GENERATION`, `INTERVIEW_QUESTIONS`, `EVIDENCE_SUMMARY`, `CERTIFICATE_SUMMARY`, `CANDIDATE_SUMMARY`, `GENERIC` |
| `AIRunStatus` | `QUEUED`, `RUNNING`, `SUCCESS`, `FAILED` |

> Note: the user-facing spec wording uses `FULLY_AUTOMATED` /
> `NEEDS_TECH_IMPLEMENTATION` / `NOT_SUITABLE_FOR_AI`. The schema uses the
> shorter `AUTOMATED` / `ESCALATE` / `NOT_SUITABLE`. UI labels map the
> short forms to the long human strings (see `src/lib/utils.ts`).

## Migrations

The current baseline migration is `app/prisma/migrations/20260427204555_init/`.
After schema edits run `pnpm db:migrate` (dev) or `pnpm db:deploy` (prod).
