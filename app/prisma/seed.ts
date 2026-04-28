/**
 * TenXPros seed.
 *
 * Idempotent: every record is upserted by a stable unique key (slug,
 * publicId, email). Safe to re-run after schema changes.
 *
 * Seeds:
 *   - 12 learning tracks (per the TenXPros spec) with modules + lessons
 *   - Scenario-rubric pairs at L1, L2, L3
 *   - Demo admin, reviewer, professional, employer accounts
 *   - One issued sample certificate so /verify works out of the box
 *
 * Run with `pnpm db:seed`.
 */

import { randomBytes } from "node:crypto";
import { PrismaClient, type CertificateLevel, type WorkMode } from "@prisma/client";
import { hashPassword } from "../src/lib/auth/password";
import { generatePublicCertificateId, slugify } from "../src/lib/utils";

const prisma = new PrismaClient();

// Demo users are gated behind ALLOW_DEMO_USERS so production never
// boots with the well-known passwords seeded for local development.
const ALLOW_DEMO_USERS = process.env.ALLOW_DEMO_USERS === "true";

// ---------------------------------------------------------------------------
// Tracks → Modules → Lessons
// ---------------------------------------------------------------------------

interface SeedLesson {
  slug: string;
  title: string;
  description: string;
  body: string;
  objectives: string[];
  estimatedMinutes?: number;
  certificateLevel?: CertificateLevel;
}

interface SeedModule {
  slug: string;
  title: string;
  description: string;
  estimatedMinutes?: number;
  lessons: SeedLesson[];
}

interface SeedTrack {
  slug: string;
  title: string;
  description: string;
  audience: string;
  level: CertificateLevel;
  estimatedHours: number;
  order: number;
  modules: SeedModule[];
}

const TRACKS: SeedTrack[] = [
  {
    slug: "ai-literacy-for-professionals",
    title: "AI Literacy for Professionals",
    description: "What modern AI actually is, what it isn't, and the vocabulary you need to make sound decisions in real work.",
    audience: "All professionals",
    level: "L1_AI_READY",
    estimatedHours: 4,
    order: 10,
    modules: [
      {
        slug: "foundations",
        title: "Foundations",
        description: "Mental models for working with generative AI without overpromising or underestimating it.",
        lessons: [
          {
            slug: "what-modern-ai-is",
            title: "What modern AI actually is",
            description: "LLMs, fine-tuning, retrieval, agents — the words you need to decode every announcement.",
            body: "Modern professional AI is dominated by large language models that complete patterns from text. They are tools, not oracles. This lesson grounds the vocabulary you will use through the rest of TenXPros.",
            objectives: ["Define LLM, retrieval, fine-tuning, agent", "Identify three things LLMs do reliably and three they do not", "Explain why probabilistic systems need verification"],
          },
          {
            slug: "where-ai-helps-where-it-does-not",
            title: "Where AI helps and where it does not",
            description: "Tasks AI accelerates, tasks it complicates, and how to tell which is which before you commit to a workflow.",
            body: "We map your real tasks against AI suitability. Repetitive structuring, drafting and synthesis are typical wins; high-judgement, high-risk or confidentiality-sensitive work usually is not.",
            objectives: ["Apply the suitability heuristic to one of your own tasks", "Spot the three failure modes (hallucination, drift, leakage)"],
          },
        ],
      },
      {
        slug: "vocabulary-and-judgement",
        title: "Vocabulary and judgement",
        description: "How to read AI claims and how to talk credibly about your own AI work.",
        lessons: [
          {
            slug: "evaluating-ai-claims",
            title: "Evaluating AI claims",
            description: "The five questions that separate marketing from substance.",
            body: "Vendors will tell you the system is autonomous, accurate, and safe. You need to ask: 'compared to what, on which task, with what input distribution, with what oversight, with what failure cost?'",
            objectives: ["Evaluate one vendor claim using the five-question filter", "Write a paragraph defending a real claim about your own AI use"],
          },
        ],
      },
    ],
  },
  {
    slug: "personal-ai-productivity",
    title: "Personal AI Productivity",
    description: "Build the small set of repeatable AI workflows that gives you back five hours a week.",
    audience: "All professionals",
    level: "L2_AI_ADOPTED",
    estimatedHours: 5,
    order: 20,
    modules: [
      {
        slug: "the-toolbox",
        title: "Your daily toolbox",
        description: "Picking three AI tools and using them well, instead of ten tools and using none.",
        lessons: [
          {
            slug: "choosing-three-tools",
            title: "Choosing three tools",
            description: "Drafting, structuring, and verifying — the three jobs your AI stack must cover.",
            body: "Pick one tool for drafting, one for structuring (tables, plans, transformations) and one you trust enough to fact-check. Anything beyond three tools should justify its cost in friction.",
            objectives: ["Pick your three tools with rationale", "Document one pain each tool solves for you"],
          },
          {
            slug: "prompts-that-survive",
            title: "Prompts that survive next week",
            description: "Why a prompt is a small contract, and how to version it.",
            body: "Treat prompts like code: name them, version them, and store them where you can find them next week. Reusable prompts are the foundation of every productivity gain.",
            objectives: ["Build one named, versioned prompt for a real task", "Add evaluation criteria to that prompt"],
          },
        ],
      },
    ],
  },
  {
    slug: "ai-for-professional-english-and-communication",
    title: "AI for Professional English and Communication",
    description: "Use AI to communicate like a senior, not to fake one.",
    audience: "Non-native speakers and writing-heavy roles",
    level: "L1_AI_READY",
    estimatedHours: 4,
    order: 30,
    modules: [
      {
        slug: "voice-and-clarity",
        title: "Voice and clarity",
        description: "Editing without losing your voice; clarifying without sounding like a press release.",
        lessons: [
          {
            slug: "polishing-without-erasing-yourself",
            title: "Polishing without erasing yourself",
            description: "How to use AI as an editor that respects your judgement.",
            body: "AI is excellent at clarity passes, weak at deciding what you mean. Keep your structure, your facts and your stance; let AI tighten the prose.",
            objectives: ["Edit a real email twice — once with structure-preserving prompts, once badly — and compare"],
          },
        ],
      },
    ],
  },
  {
    slug: "ai-for-job-search-and-career-growth",
    title: "AI for Job Search and Career Growth",
    description: "Use AI to find the right opportunities, tell your story, and prepare honestly. No buzzword spam.",
    audience: "Active and passive candidates",
    level: "L1_AI_READY",
    estimatedHours: 5,
    order: 40,
    modules: [
      {
        slug: "narrative",
        title: "Narrative and resume",
        description: "AI-assisted resume tightening that highlights real impact.",
        lessons: [
          {
            slug: "rewriting-without-faking",
            title: "Rewriting without faking",
            description: "Tightening accomplishments without inventing metrics.",
            body: "AI will gladly invent percentages. Your job is to keep numbers truthful, swap vague verbs for concrete ones, and remove duplication.",
            objectives: ["Rewrite three bullets keeping every metric verifiable", "Generate three role-specific cover-letter intros to compare"],
          },
        ],
      },
      {
        slug: "interview-prep",
        title: "Interview prep",
        description: "Using AI to rehearse, not to script.",
        lessons: [
          {
            slug: "rehearsing-not-scripting",
            title: "Rehearsing, not scripting",
            description: "Generating realistic questions and self-critiquing answers.",
            body: "Use AI to surface questions you would not have anticipated. Practice answers out loud; do not memorise.",
            objectives: ["Generate 10 hard role-specific questions", "Self-critique two answers using a rubric"],
          },
        ],
      },
    ],
  },
  {
    slug: "ai-workflow-design",
    title: "AI Workflow Design",
    description: "Design multi-step AI workflows that are predictable, testable and reviewable.",
    audience: "Practitioners moving past one-off prompts",
    level: "L3_AI_AUGMENTED",
    estimatedHours: 6,
    order: 50,
    modules: [
      {
        slug: "decomposition",
        title: "Decomposition",
        description: "Turning a fuzzy task into a sequence with clear handoffs.",
        lessons: [
          {
            slug: "from-prompt-to-pipeline",
            title: "From prompt to pipeline",
            description: "When a single prompt becomes a sequence, and what each step owes the next.",
            body: "A pipeline declares its inputs, outputs, and verification at every step. This is the difference between a workflow you can hand to a colleague and a prompt only you can run.",
            objectives: ["Decompose one of your tasks into 3+ steps", "Specify input, output and verification per step"],
            certificateLevel: "L3_AI_AUGMENTED",
          },
        ],
      },
    ],
  },
  {
    slug: "ai-output-evaluation-and-quality-control",
    title: "AI Output Evaluation and Quality Control",
    description: "How to tell good AI output from confidently-wrong AI output, before you ship it.",
    audience: "Anyone shipping work touched by AI",
    level: "L2_AI_ADOPTED",
    estimatedHours: 4,
    order: 60,
    modules: [
      {
        slug: "verification",
        title: "Verification habits",
        description: "Lightweight quality checks you can apply every time.",
        lessons: [
          {
            slug: "the-three-pass-review",
            title: "The three-pass review",
            description: "Facts, structure, voice — in that order.",
            body: "Pass one verifies any factual claim against source. Pass two checks structure and reasoning. Pass three adjusts voice. Skipping pass one is how AI mistakes ship.",
            objectives: ["Apply the three-pass review to one AI-generated artifact", "Catch and document one factual issue"],
          },
        ],
      },
    ],
  },
  {
    slug: "ai-risk-privacy-and-responsible-use",
    title: "AI Risk, Privacy, and Responsible Use",
    description: "Avoid the obvious mistakes; explain your AI use to a sceptical colleague.",
    audience: "All professionals",
    level: "L1_AI_READY",
    estimatedHours: 4,
    order: 70,
    modules: [
      {
        slug: "data-handling",
        title: "Data handling",
        description: "Confidential data, customer data, regulated data — what does and does not belong in a prompt.",
        lessons: [
          {
            slug: "what-not-to-paste",
            title: "What not to paste",
            description: "A short, blunt list and the reasoning behind it.",
            body: "Customer PII, signed contracts, internal IP that you would not email to a vendor — none of it belongs in a public LLM prompt without explicit organisational policy.",
            objectives: ["Audit one of your real prompts for sensitive content"],
          },
        ],
      },
      {
        slug: "documenting-ai-use",
        title: "Documenting AI use",
        description: "Showing your work makes you trusted.",
        lessons: [
          {
            slug: "ai-disclosure-that-helps-you",
            title: "AI disclosure that helps you",
            description: "Why disclosing AI use credibly is better than hiding it.",
            body: "Reviewers and employers prefer documented, scoped AI use over hidden, plausible-deniability AI use. We show you how to write a credible AI use note.",
            objectives: ["Draft an AI use note for a recent artifact"],
          },
        ],
      },
    ],
  },
  {
    slug: "role-specific-ai-adoption-for-consultants",
    title: "Role-Specific AI Adoption for Consultants",
    description: "Diagnostic interviewing, deck synthesis, working hypothesis generation — what AI does and does not change for consultants.",
    audience: "Consultants and advisors",
    level: "L3_AI_AUGMENTED",
    estimatedHours: 5,
    order: 110,
    modules: [
      {
        slug: "research-to-deck",
        title: "Research to deck",
        description: "Compressing reading; protecting interpretation.",
        lessons: [
          {
            slug: "synthesizing-without-flattening",
            title: "Synthesising without flattening",
            description: "Keeping nuance when summarising 30 sources.",
            body: "AI flattens. Counter that by tagging your sources by perspective and asking AI to surface disagreement explicitly.",
            objectives: ["Run a structured multi-source synthesis on a real topic"],
          },
        ],
      },
    ],
  },
  {
    slug: "role-specific-ai-adoption-for-trainers",
    title: "Role-Specific AI Adoption for Trainers",
    description: "Designing curriculum, exercises, and assessments with AI without losing pedagogical intent.",
    audience: "Trainers and L&D",
    level: "L2_AI_ADOPTED",
    estimatedHours: 5,
    order: 120,
    modules: [
      {
        slug: "exercise-design",
        title: "Exercise design",
        description: "From learning objective to exercise to rubric.",
        lessons: [
          {
            slug: "from-objective-to-exercise",
            title: "From objective to exercise",
            description: "Letting AI propose; you decide.",
            body: "AI is a generator of options. Your job is to keep objectives anchored and reject lazy exercises. We practice the loop on a real curriculum slice.",
            objectives: ["Generate three exercise variants for one objective", "Score each against your real cohort"],
          },
        ],
      },
    ],
  },
  {
    slug: "role-specific-ai-adoption-for-project-managers",
    title: "Role-Specific AI Adoption for Project Managers",
    description: "Status reporting, risk surfacing, and meeting hygiene that actually saves the team time.",
    audience: "Project and program managers",
    level: "L2_AI_ADOPTED",
    estimatedHours: 5,
    order: 130,
    modules: [
      {
        slug: "status-and-risks",
        title: "Status and risks",
        description: "From notes to a status everyone trusts.",
        lessons: [
          {
            slug: "synthesised-status-without-spin",
            title: "Synthesised status without spin",
            description: "Keeping bad news in; keeping noise out.",
            body: "Optimistic AI summaries hide risk. Calibrate your prompts to surface risk explicitly and keep ownership clear.",
            objectives: ["Generate a project status from raw notes; flag two risks honestly"],
          },
        ],
      },
    ],
  },
  {
    slug: "role-specific-ai-adoption-for-hr-and-recruiters",
    title: "Role-Specific AI Adoption for HR / Recruiters",
    description: "Sourcing, screening and feedback — the responsible parts and the reckless parts.",
    audience: "HR, talent and recruiting",
    level: "L3_AI_AUGMENTED",
    estimatedHours: 5,
    order: 140,
    modules: [
      {
        slug: "screening-with-care",
        title: "Screening with care",
        description: "What AI can help with, and what AI must never decide alone.",
        lessons: [
          {
            slug: "ai-screening-boundaries",
            title: "AI screening boundaries",
            description: "Where automation accelerates and where it discriminates.",
            body: "AI can summarise resumes and generate first-pass questions. It must not single-handedly reject candidates, score humans on protected categories, or replace human review.",
            objectives: ["List 5 screening tasks AI can support", "List 5 screening decisions AI must not own"],
          },
        ],
      },
    ],
  },
  {
    slug: "role-specific-ai-adoption-for-business-analysts",
    title: "Role-Specific AI Adoption for Business Analysts",
    description: "Requirements drafting, data exploration, and stakeholder synthesis with AI as a careful collaborator.",
    audience: "Business and product analysts",
    level: "L3_AI_AUGMENTED",
    estimatedHours: 5,
    order: 150,
    modules: [
      {
        slug: "requirements",
        title: "Requirements",
        description: "Letting AI surface gaps without inventing scope.",
        lessons: [
          {
            slug: "draft-then-challenge",
            title: "Draft then challenge",
            description: "Use AI to challenge your requirements, not just to write them.",
            body: "Generate the first draft, then run a 'what would break this?' pass with AI in critic mode. Cheap, repeatable, surprisingly effective.",
            objectives: ["Run a draft + critic loop on one real requirement set"],
          },
        ],
      },
    ],
  },
  {
    slug: "role-specific-ai-adoption-for-founders",
    title: "Role-Specific AI Adoption for Founders",
    description: "Where AI gives early-stage founders leverage — and where it just gives them noise.",
    audience: "Founders and operators",
    level: "L4_AI_IMPLEMENTER",
    estimatedHours: 6,
    order: 160,
    modules: [
      {
        slug: "leverage",
        title: "Leverage areas",
        description: "Customer development, content, ops automation.",
        lessons: [
          {
            slug: "where-ai-pays-back",
            title: "Where AI pays back",
            description: "Three concrete leverage areas; the rest is mostly distraction.",
            body: "Customer interview synthesis, repeatable content production, and back-office automation deliver real ROI. Strategic positioning, hiring decisions and pricing usually do not.",
            objectives: ["Pick one leverage area and ship one real workflow"],
          },
        ],
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Rubrics + scenarios
// ---------------------------------------------------------------------------

interface SeedRubric {
  slug: string;
  title: string;
  description: string;
  criteria: { title: string; description: string; weight: number }[];
}

const RUBRICS: SeedRubric[] = [
  {
    slug: "scenario-core",
    title: "Core scenario rubric",
    description: "Used for L1–L2 scenarios. Evaluates judgement, AI tool fit, workflow design, output quality, risk awareness and clarity.",
    criteria: [
      { title: "Task judgement", description: "Did the candidate correctly identify what humans must do vs what AI may help with?", weight: 3 },
      { title: "AI tool selection", description: "Were the tool choices reasonable and justified?", weight: 2 },
      { title: "Workflow design", description: "Is the proposed workflow concrete and runnable?", weight: 3 },
      { title: "Output quality control", description: "Is there a credible verification step before shipping?", weight: 2 },
      { title: "Risk awareness", description: "Did the candidate name and address realistic risks?", weight: 3 },
      { title: "Role relevance", description: "Does the design match the role context provided?", weight: 1 },
      { title: "Clarity", description: "Is the submission readable and grounded?", weight: 1 },
      { title: "Evidence quality", description: "Are the artifacts described concrete and useful?", weight: 2 },
    ],
  },
  {
    slug: "scenario-advanced",
    title: "Advanced scenario rubric",
    description: "Used for L3–L4 scenarios. Adds implementation, oversight and cross-team adoption signals.",
    criteria: [
      { title: "Multi-step orchestration", description: "Are the steps decoupled, with explicit handoffs?", weight: 3 },
      { title: "Oversight design", description: "Where does a human approve, intervene or audit?", weight: 3 },
      { title: "Failure modes", description: "Did the candidate enumerate plausible failures?", weight: 2 },
      { title: "Measurable outcome", description: "Is there a clear success metric tied to business value?", weight: 2 },
      { title: "Adoption / handoff", description: "Could a teammate run this workflow with the artifact provided?", weight: 2 },
      { title: "Risk and governance", description: "Are sensitive data and policy boundaries respected?", weight: 3 },
    ],
  },
];

interface SeedScenario {
  slug: string;
  title: string;
  prompt: string;
  context?: string;
  roleFocus?: string;
  certificateLevel: CertificateLevel;
  rubricSlug: string;
}

const SCENARIOS: SeedScenario[] = [
  {
    slug: "weekly-status-report",
    title: "Synthesise a weekly status report from raw notes",
    prompt: "You receive 12 channel transcripts and 4 standup notes from a 6-person product team. Produce a one-page Friday status that an exec would trust. Show your prompts, your verification, and your decisions about what to omit.",
    roleFocus: "Project Manager",
    certificateLevel: "L1_AI_READY",
    rubricSlug: "scenario-core",
  },
  {
    slug: "candidate-summary-no-screening",
    title: "Build a recruiter cheat-sheet that does NOT screen",
    prompt: "Given five resumes, summarise each into a one-paragraph briefing that helps a hiring manager prepare for an interview. The summary must not score candidates, must not reference protected categories, and must be defensible in a hiring audit.",
    roleFocus: "HR / Recruiter",
    certificateLevel: "L2_AI_ADOPTED",
    rubricSlug: "scenario-core",
  },
  {
    slug: "client-deck-from-research",
    title: "Compress 30 sources into a credible client deck",
    prompt: "You have 30 mixed-quality sources on a market segment. Produce a 6-slide outline that a partner would defend in front of the client. The submission must show how you preserved disagreement between sources.",
    roleFocus: "Consultant",
    certificateLevel: "L3_AI_AUGMENTED",
    rubricSlug: "scenario-advanced",
  },
  {
    slug: "automation-handoff-design",
    title: "Design an automation handoff for a repetitive ops task",
    prompt: "Pick one of your real repetitive tasks. Specify how the AI-assisted version should evolve into a partly automated pipeline, including a verification loop, an alerting rule for drift, and an escalation owner.",
    roleFocus: "Founder / Operator",
    certificateLevel: "L4_AI_IMPLEMENTER",
    rubricSlug: "scenario-advanced",
  },
  {
    slug: "team-adoption-plan",
    title: "Draft a team-level AI adoption plan",
    prompt: "For a 10-person team in your domain, design an 8-week AI adoption plan: what people learn, what artifacts they ship, how risks are managed, how progress is measured, and how you will handle resistance.",
    roleFocus: "Adoption Lead",
    certificateLevel: "L5_AI_LEADER",
    rubricSlug: "scenario-advanced",
  },
];

// ---------------------------------------------------------------------------
// Demo accounts (only created if missing)
// ---------------------------------------------------------------------------

interface SeedUser {
  email: string;
  name: string;
  role: "ADMIN" | "REVIEWER" | "PROFESSIONAL" | "EMPLOYER";
  password: string;
  professional?: { headline: string; currentRole?: string; targetRole?: string; industry?: string; skills?: string[]; aiToolsUsed?: string[]; visibility?: "PRIVATE" | "EMPLOYER_VISIBLE" | "PUBLIC" };
  organization?: { name: string; industry?: string; verified?: boolean };
}

const USERS: SeedUser[] = [
  { email: "admin@tenxpros.test", name: "Admin Demo", role: "ADMIN", password: "tenxpros-admin-demo" },
  { email: "reviewer@tenxpros.test", name: "Reviewer Demo", role: "REVIEWER", password: "tenxpros-reviewer-demo" },
  {
    email: "demo.pro@tenxpros.test",
    name: "Demo Professional",
    role: "PROFESSIONAL",
    password: "tenxpros-pro-demo",
    professional: {
      headline: "AI-adopted Project Manager",
      currentRole: "Senior Project Manager",
      targetRole: "AI Adoption Lead",
      industry: "Professional services",
      skills: ["Project management", "Stakeholder communication", "Risk management"],
      aiToolsUsed: ["ChatGPT", "Claude", "Notion AI"],
      visibility: "PUBLIC",
    },
  },
  {
    email: "demo.org@tenxpros.test",
    name: "Demo Employer",
    role: "EMPLOYER",
    password: "tenxpros-org-demo",
    organization: { name: "Acme AI Adoption Co", industry: "Professional services", verified: true },
  },
];

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("⏳ Seeding TenXPros...");
  console.log(`   • mode: ${ALLOW_DEMO_USERS ? "DEV (demo users allowed)" : "PROD (demo users locked)"}`);

  // Always-safe content: tracks, rubrics, scenarios, prompt packs.
  await seedTracks();
  await seedRubricsAndScenarios();
  await seedGlobalPromptPacks();

  // User-creating steps. Demo users are gated; the secure admin is
  // always created if ADMIN_EMAIL + ADMIN_PASSWORD are present.
  await seedSecureAdmin();
  await seedUsers();
  await seedDemoCertificate();

  console.log("✅ Seed complete.");
}

async function seedTracks() {
  for (const t of TRACKS) {
    const track = await prisma.learningTrack.upsert({
      where: { slug: t.slug },
      update: {
        title: t.title,
        description: t.description,
        audience: t.audience,
        level: t.level,
        estimatedHours: t.estimatedHours,
        order: t.order,
        published: true,
      },
      create: {
        slug: t.slug,
        title: t.title,
        description: t.description,
        audience: t.audience,
        level: t.level,
        estimatedHours: t.estimatedHours,
        order: t.order,
        published: true,
      },
    });

    for (let mi = 0; mi < t.modules.length; mi++) {
      const m = t.modules[mi];
      const moduleRow = await prisma.learningModule.upsert({
        where: { trackId_slug: { trackId: track.id, slug: m.slug } },
        update: {
          title: m.title,
          description: m.description,
          estimatedMinutes: m.estimatedMinutes ?? 60,
          order: mi,
          published: true,
        },
        create: {
          trackId: track.id,
          slug: m.slug,
          title: m.title,
          description: m.description,
          estimatedMinutes: m.estimatedMinutes ?? 60,
          order: mi,
          published: true,
        },
      });

      for (let li = 0; li < m.lessons.length; li++) {
        const l = m.lessons[li];
        await prisma.lesson.upsert({
          where: { moduleId_slug: { moduleId: moduleRow.id, slug: l.slug } },
          update: {
            title: l.title,
            description: l.description,
            body: l.body,
            objectives: l.objectives,
            estimatedMinutes: l.estimatedMinutes ?? 15,
            certificateLevel: l.certificateLevel ?? t.level,
            order: li,
          },
          create: {
            moduleId: moduleRow.id,
            slug: l.slug,
            title: l.title,
            description: l.description,
            body: l.body,
            objectives: l.objectives,
            estimatedMinutes: l.estimatedMinutes ?? 15,
            certificateLevel: l.certificateLevel ?? t.level,
            order: li,
          },
        });
      }
    }
  }
  console.log(`   • ${TRACKS.length} tracks seeded`);
}

async function seedRubricsAndScenarios() {
  for (const r of RUBRICS) {
    const rubric = await prisma.rubric.upsert({
      where: { slug: r.slug },
      update: { title: r.title, description: r.description },
      create: { slug: r.slug, title: r.title, description: r.description },
    });
    // Reset criteria so the rubric stays in sync if we change it
    await prisma.rubricCriterion.deleteMany({ where: { rubricId: rubric.id } });
    for (const c of r.criteria) {
      await prisma.rubricCriterion.create({
        data: { rubricId: rubric.id, title: c.title, description: c.description, weight: c.weight },
      });
    }
  }
  console.log(`   • ${RUBRICS.length} rubrics seeded`);

  for (const s of SCENARIOS) {
    const rubric = await prisma.rubric.findUnique({ where: { slug: s.rubricSlug } });
    if (!rubric) continue;
    await prisma.scenario.upsert({
      where: { slug: s.slug },
      update: {
        title: s.title,
        prompt: s.prompt,
        context: s.context,
        roleFocus: s.roleFocus,
        certificateLevel: s.certificateLevel,
        rubricId: rubric.id,
        published: true,
      },
      create: {
        slug: s.slug,
        title: s.title,
        prompt: s.prompt,
        context: s.context,
        roleFocus: s.roleFocus,
        certificateLevel: s.certificateLevel,
        rubricId: rubric.id,
        published: true,
      },
    });
  }
  console.log(`   • ${SCENARIOS.length} scenarios seeded`);
}

async function seedSecureAdmin() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    console.log(`   • secure admin: skipped (ADMIN_EMAIL/ADMIN_PASSWORD not set)`);
    return;
  }
  if (password.length < 12) {
    console.warn(`   ! ADMIN_PASSWORD too short (<12 chars); refusing to set.`);
    return;
  }
  const passwordHash = await hashPassword(password);
  await prisma.user.upsert({
    where: { email },
    update: { passwordHash, role: "ADMIN" },
    create: { email, name: "Administrator", role: "ADMIN", passwordHash },
  });
  console.log(`   • secure admin user upserted: ${email}`);
}

async function seedUsers() {
  if (!ALLOW_DEMO_USERS) {
    // Production / unset: do NOT create demo users. If a previous seed
    // run created them with the well-known passwords, scramble those
    // passwords so they cannot be used to log in. The rows themselves
    // are kept so foreign keys (e.g. the demo certificate) remain intact.
    let locked = 0;
    for (const u of USERS) {
      const existing = await prisma.user.findUnique({ where: { email: u.email } });
      if (!existing) continue;
      const lockedHash = await hashPassword(`locked-${randomBytes(24).toString("hex")}`);
      await prisma.user.update({ where: { email: u.email }, data: { passwordHash: lockedHash } });
      locked += 1;
    }
    console.log(`   • demo users: not created (ALLOW_DEMO_USERS=false); ${locked} pre-existing demo passwords scrambled`);
    return;
  }

  for (const u of USERS) {
    const passwordHash = await hashPassword(u.password);
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, role: u.role, passwordHash },
      create: { email: u.email, name: u.name, role: u.role, passwordHash },
    });

    if (u.professional) {
      const baseSlug = slugify(u.name) || "pro";
      await prisma.professionalProfile.upsert({
        where: { userId: user.id },
        update: {
          headline: u.professional.headline,
          currentRole: u.professional.currentRole,
          targetRole: u.professional.targetRole,
          industry: u.professional.industry,
          skills: u.professional.skills ?? [],
          aiToolsUsed: u.professional.aiToolsUsed ?? [],
          visibility: u.professional.visibility ?? "PRIVATE",
        },
        create: {
          userId: user.id,
          slug: baseSlug,
          headline: u.professional.headline,
          currentRole: u.professional.currentRole,
          targetRole: u.professional.targetRole,
          industry: u.professional.industry,
          skills: u.professional.skills ?? [],
          aiToolsUsed: u.professional.aiToolsUsed ?? [],
          visibility: u.professional.visibility ?? "PRIVATE",
        },
      });
    }

    if (u.organization) {
      const baseSlug = slugify(u.organization.name) || "org";
      await prisma.organizationProfile.upsert({
        where: { userId: user.id },
        update: {
          name: u.organization.name,
          industry: u.organization.industry,
          verified: u.organization.verified ?? false,
        },
        create: {
          userId: user.id,
          slug: baseSlug,
          name: u.organization.name,
          industry: u.organization.industry,
          verified: u.organization.verified ?? false,
        },
      });
    }
  }
  console.log(`   • ${USERS.length} demo users seeded (DEV mode — passwords below are NOT secrets)`);
  for (const u of USERS) console.log(`     ${u.email}  →  ${u.password}`);
}

async function seedDemoCertificate() {
  if (!ALLOW_DEMO_USERS) {
    // Don't create the demo certificate in production mode. Any existing
    // certificate from a prior dev seed stays in place — it is not
    // exploitable (the demo professional's password is now scrambled).
    return;
  }
  const proUser = await prisma.user.findUnique({
    where: { email: "demo.pro@tenxpros.test" },
    include: { professional: true },
  });
  const reviewer = await prisma.user.findUnique({ where: { email: "reviewer@tenxpros.test" } });
  if (!proUser?.professional || !reviewer) return;

  const existing = await prisma.certificate.findFirst({
    where: { professionalId: proUser.professional.id, level: "L1_AI_READY" },
  });
  if (existing) return;

  const publicId = generatePublicCertificateId();
  await prisma.certificate.create({
    data: {
      publicId,
      professionalId: proUser.professional.id,
      level: "L1_AI_READY",
      status: "ISSUED",
      issuedAt: new Date(),
      expiresAt: new Date(Date.now() + 365 * 24 * 3600 * 1000),
      roleFocus: "Project Manager",
      evidenceSummary:
        "Demonstrated baseline AI literacy, mapped 8 professional tasks with classifications, submitted 2 evidence artifacts, completed 3 scenarios. Reviewer approved.",
      assessmentScore: 84,
      verifyUrl: `/verify/${publicId}`,
      issuedByReviewerId: reviewer.id,
      requirements: {
        create: [
          { key: "diagnostic", label: "AI readiness diagnostic complete", satisfied: true },
          { key: "literacy", label: "Basic AI literacy module complete", satisfied: true },
          { key: "tasks_mapped", label: "5+ professional tasks mapped", satisfied: true },
          { key: "evidence", label: "Evidence artifact submitted", satisfied: true },
          { key: "scenarios", label: "2+ scenario assessments completed", satisfied: true },
          { key: "risk", label: "Risk & privacy awareness check passed", satisfied: true },
          { key: "reviewer_approval", label: "Reviewer approval", satisfied: true },
        ],
      },
    },
  });
  console.log(`   • demo certificate issued at /verify/${publicId}`);
}

async function seedGlobalPromptPacks() {
  const packs = [
    {
      slug: "pm-status-pack",
      title: "Project Manager · Status & Risk pack",
      description:
        "Versioned prompts for synthesising honest weekly status, surfacing real risk, and turning standup notes into a one-page exec brief.",
      audience: "Project Manager",
      category: "role",
      tags: ["status", "risk", "synthesis"],
      prompts: [
        { name: "Weekly status (raw notes → exec brief)", version: "v1", text: "Synthesise a weekly status from these notes. Keep risks visible. Do not soften bad news. Output: 1 paragraph context, 3 bullets progress, 3 bullets risks (with owners)." },
        { name: "Risk surfacing", version: "v1", text: "Read the following team transcripts and list the three risks most likely to derail this milestone. For each: owner, impact, leading indicator." },
      ],
    },
    {
      slug: "career-positioning-pack",
      title: "Career positioning pack",
      description:
        "Prompts that help you describe your AI-adopted profile honestly — for resumes, LinkedIn, and TenXRole. Use the certificate, not buzzwords.",
      audience: "All",
      category: "career",
      tags: ["resume", "linkedin", "tenxrole"],
      prompts: [
        { name: "AI-adopted summary line", version: "v1", text: "Write a one-line professional summary that describes a [ROLE] who has earned a TenXPros [LEVEL] certificate and uses these AI tools: [TOOLS]. No buzzwords, no invented metrics." },
        { name: "Resume bullet rewrite", version: "v1", text: "Rewrite this resume bullet so it makes the AI-assisted nature of the work explicit, keeps every metric verifiable, and stays under 28 words: [BULLET]" },
      ],
    },
  ];

  for (const p of packs) {
    await prisma.promptPack.upsert({
      where: { slug: p.slug },
      update: {
        title: p.title,
        description: p.description,
        audience: p.audience,
        category: p.category,
        tags: p.tags,
        prompts: p.prompts,
        global: true,
      },
      create: {
        slug: p.slug,
        title: p.title,
        description: p.description,
        audience: p.audience,
        category: p.category,
        tags: p.tags,
        prompts: p.prompts,
        global: true,
      },
    });
  }
  console.log(`   • ${packs.length} global prompt packs seeded`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

// keep WorkMode import alive for tooling that strips unused type imports
export type _WorkMode = WorkMode;
