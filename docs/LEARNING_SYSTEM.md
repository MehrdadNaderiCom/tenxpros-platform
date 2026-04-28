# Learning System

## Hierarchy

```
LearningTrack
  └─ LearningModule
       └─ Lesson
            └─ PracticeTask (optional)
            └─ Scenario     (optional, scenario.lessonId)
```

Each `Lesson` owns the body, objectives, estimated minutes, and a target
`certificateLevel`. The `LessonCompletion` join table is unique on
`(lessonId, professionalId)`.

## Initial tracks (seeded)

The seed creates the 13 tracks listed in the product spec:

**Core (7 tracks)**

- AI Literacy for Professionals — `L1_AI_READY`
- Personal AI Productivity — `L2_AI_ADOPTED`
- AI for Professional English and Communication — `L1_AI_READY`
- AI for Job Search and Career Growth — `L1_AI_READY`
- AI Workflow Design — `L3_AI_AUGMENTED`
- AI Output Evaluation and Quality Control — `L2_AI_ADOPTED`
- AI Risk, Privacy, and Responsible Use — `L1_AI_READY`

**Role-specific (6 tracks)**

- Consultants — `L3_AI_AUGMENTED`
- Trainers — `L2_AI_ADOPTED`
- Project Managers — `L2_AI_ADOPTED`
- HR / Recruiters — `L3_AI_AUGMENTED`
- Business Analysts — `L3_AI_AUGMENTED`
- Founders — `L4_AI_IMPLEMENTER`

Authoring tracks/modules/lessons happens in
[`app/prisma/seed.ts`](../app/prisma/seed.ts) for now. Admin UI under
`/admin/learning` exists; full CRUD for tracks/modules/lessons is on the
roadmap (currently read + manage status; structural edits via seed).

## Lesson format

```ts
{
  slug: string                    // unique within module
  title: string
  description: string             // shows on track / module overview
  body: string                    // long-form lesson text (Markdown-ready)
  objectives: string[]            // bullets shown above the body
  estimatedMinutes: number        // shown on cards
  certificateLevel: CertificateLevel  // contributes to that level's eligibility
  required: boolean
}
```

Lessons can attach `PracticeTask` items (homework — captured manually) and
`Scenario` items (assessable — captured as `ScenarioSubmission`).

## Tracks → certificate eligibility

Tracks contribute to `basicLiteracyModulesCompleted` and
`rolePathModulesCompleted` in the eligibility inputs (see
`CERTIFICATION_FRAMEWORK.md`). Tracks tagged at the relevant level count
toward that level's path.

## Authoring conventions

- Slugs are stable identifiers — never reuse a slug for a new lesson.
- Track ordering is by `order asc, level asc`; modules and lessons are
  by `order asc`.
- A lesson at level *N* can sit inside a track at level *N* (typical) or
  at lower levels (cross-cutting prerequisite).
- Body text is rendered as Markdown by the lesson view (planned —
  currently rendered as plain text).

## Re-running the seed

The seed is idempotent: it upserts by slug. Running `pnpm db:seed`
again applies only differences — content edits propagate, ids do not
churn.
