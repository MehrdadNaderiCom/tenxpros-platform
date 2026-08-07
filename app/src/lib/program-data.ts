import type { BadgeCategory, CharterTier, ProgramPhase } from "@prisma/client";

export const pricingTiers: Array<{
  name: string;
  tier: CharterTier;
  price: number;
  membersLimit: number;
  isActive: boolean;
  benefits: string[];
}> = [
  {
    name: "Founding Charter",
    tier: "FOUNDING",
    price: 997,
    membersLimit: 10,
    isActive: true,
    benefits: ["100-day TenXPros journey", "Living AI Solution Dossier", "Founding pricing", "Updates access"],
  },
  {
    name: "Early Charter",
    tier: "EARLY",
    price: 1247,
    membersLimit: 20,
    isActive: false,
    benefits: ["100-day TenXPros journey", "Living AI Solution Dossier", "Early member pricing"],
  },
  {
    name: "Late Charter",
    tier: "LATE",
    price: 1497,
    membersLimit: 30,
    isActive: false,
    benefits: ["100-day TenXPros journey", "Living AI Solution Dossier", "Late charter pricing"],
  },
  {
    name: "Final Charter",
    tier: "FINAL",
    price: 1747,
    membersLimit: 40,
    isActive: false,
    benefits: ["100-day TenXPros journey", "Living AI Solution Dossier", "Final charter pricing"],
  },
  {
    name: "Standard",
    tier: "STANDARD",
    price: 2497,
    membersLimit: 99,
    isActive: false,
    benefits: ["100-day TenXPros journey", "Living AI Solution Dossier", "Standard program access"],
  },
];

export const modules: Array<{
  number: number;
  phase: ProgramPhase;
  title: string;
  coreQuestion: string;
  description: string;
  badgeName: string;
  estimatedHours: number;
}> = [
  {
    number: 1,
    phase: "FRAME",
    title: "AI Readiness & TenXPro Mindset",
    coreQuestion: "Where do I stand, and what kind of AI-adopted professional am I becoming?",
    description: "Establishes the professional stance, learning contract, and practical orientation for the program.",
    badgeName: "TenX Mindset Badge",
    estimatedHours: 4,
  },
  {
    number: 2,
    phase: "FRAME",
    title: "Practical AI Literacy & Hands-On Tool Fluency",
    coreQuestion: "What can AI realistically do, and how do I use it responsibly in real work?",
    description: "Builds practical fluency with contemporary AI tools, limits, prompting, and verification habits.",
    badgeName: "AI Core Badge",
    estimatedHours: 5,
  },
  {
    number: 3,
    phase: "FRAME",
    title: "Responsible AI & Professional Boundaries",
    coreQuestion: "What should I not automate, disclose, or delegate?",
    description: "Defines confidentiality, accountability, ethics, and responsible use boundaries.",
    badgeName: "Responsible AI Badge",
    estimatedHours: 4,
  },
  {
    number: 4,
    phase: "FRAME",
    title: "Problem Discovery & Structured Framing",
    coreQuestion: "Which problem is worth solving with AI?",
    description: "Turns vague improvement ideas into a structured, evidence-ready problem frame.",
    badgeName: "Problem Framing Badge",
    estimatedHours: 5,
  },
  {
    number: 5,
    phase: "DESIGN",
    title: "Context, Stakeholder & Initial Foresight Mapping",
    coreQuestion: "Who is affected, and what changes around this solution over time?",
    description: "Maps stakeholders, constraints, adoption context, and early signals of change.",
    badgeName: "Context Mapper Badge",
    estimatedHours: 4,
  },
  {
    number: 6,
    phase: "DESIGN",
    title: "Data, Evidence & Verification Discipline",
    coreQuestion: "What evidence can be trusted enough to guide an AI-supported workflow?",
    description: "Builds data sensitivity, source quality, evidence review, and verification discipline.",
    badgeName: "Evidence Discipline Badge",
    estimatedHours: 5,
  },
  {
    number: 7,
    phase: "DESIGN",
    title: "Workflow, Task & Human-AI Allocation",
    coreQuestion: "What should the human do, what should AI assist, and where does judgment remain?",
    description: "Redesigns workflow before and after AI, including allocation of responsibility.",
    badgeName: "Workflow Designer Badge",
    estimatedHours: 5,
  },
  {
    number: 8,
    phase: "DESIGN",
    title: "Responsible AI Solution Design",
    coreQuestion: "How do I design a solution that is useful, safe, and accountable?",
    description: "Defines solution logic, constraints, risk controls, and governance requirements.",
    badgeName: "Responsible Solution Badge",
    estimatedHours: 5,
  },
  {
    number: 9,
    phase: "PROVE",
    title: "Adoption, Communication & Change Design",
    coreQuestion: "How will people understand, trust, and adopt the solution?",
    description: "Creates an adoption plan, communication strategy, and stakeholder enablement path.",
    badgeName: "Adoption Designer Badge",
    estimatedHours: 4,
  },
  {
    number: 10,
    phase: "PROVE",
    title: "Value, Roadmap & Proof Plan",
    coreQuestion: "How will I prove the solution is worth continuing?",
    description: "Defines value measures, proof plan, roadmap, and decision gates.",
    badgeName: "Value Proof Badge",
    estimatedHours: 4,
  },
  {
    number: 11,
    phase: "FORESEE",
    title: "AI Foresight, Scenario Planning & Future-Proofing",
    coreQuestion: "How do I keep this solution relevant as AI, work, and risk change?",
    description: "Builds scenario discipline and a personal AI foresight plan.",
    badgeName: "Foresight Strategist Badge",
    estimatedHours: 5,
  },
];

export const badgeCatalog: Array<{
  slug: string;
  name: string;
  description: string;
  category: BadgeCategory;
  color: string;
  order: number;
}> = [
  ...modules.map((module) => ({
    slug: `module-${module.number}-${module.badgeName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`,
    name: module.badgeName,
    description: `Issued when Module ${module.number}, ${module.title}, is passed.`,
    category: "MODULE" as BadgeCategory,
    color: "#1F4E79",
    order: module.number,
  })),
  {
    slug: "rank-ai-ready-professional",
    name: "AI-Ready Professional",
    description: "Rank 1 credential for completing the Frame phase.",
    category: "RANK",
    color: "#2E75B6",
    order: 20,
  },
  {
    slug: "rank-ai-problem-solver-solution-designer",
    name: "AI Problem Solver & Solution Designer",
    description: "Rank 2 credential for completing the Design phase.",
    category: "RANK",
    color: "#2E75B6",
    order: 21,
  },
  {
    slug: "rank-future-ready-ai-solution-designer",
    name: "Future-Ready AI Solution Designer",
    description: "Rank 3 credential for completing the Prove and Foresee phases.",
    category: "RANK",
    color: "#2E75B6",
    order: 22,
  },
  {
    slug: "capstone-certified-tenxpro-seal",
    name: "Certified TenXPro Capstone Seal",
    description: "Issued when a participant is certified after capstone review.",
    category: "CAPSTONE",
    color: "#C9A961",
    order: 30,
  },
  {
    slug: "charter-founding-member",
    name: "Founding Charter Member",
    description: "Special badge for the first Founding Charter cohort.",
    category: "SPECIAL",
    color: "#C9A961",
    order: 40,
  },
  {
    slug: "charter-early-member",
    name: "Early Charter Member",
    description: "Special badge for Early Charter participants.",
    category: "SPECIAL",
    color: "#C9A961",
    order: 41,
  },
  {
    slug: "charter-late-member",
    name: "Late Charter Member",
    description: "Special badge for Late Charter participants.",
    category: "SPECIAL",
    color: "#C9A961",
    order: 42,
  },
  {
    slug: "charter-final-member",
    name: "Final Charter Member",
    description: "Special badge for Final Charter participants.",
    category: "SPECIAL",
    color: "#C9A961",
    order: 43,
  },
];

export const dossierSections = [
  ["PROFESSIONAL_CONTEXT", "Professional Context"],
  ["PROBLEM_DEFINITION", "Problem Definition"],
  ["AI_SUITABILITY", "AI Suitability Assessment"],
  ["CONTEXT_STAKEHOLDER_FORESIGHT", "Context, Stakeholder & Initial Foresight Analysis"],
  ["DATA_EVIDENCE", "Data & Evidence Review"],
  ["WORKFLOW_BEFORE_AFTER", "Workflow Before / After"],
  ["RISK_ETHICS_PRIVACY", "Risk, Ethics, Privacy & Compliance Review"],
  ["RESPONSIBLE_SOLUTION_DESIGN", "Responsible AI Solution Design"],
  ["ADOPTION_COMMUNICATION", "Adoption & Communication Plan"],
  ["VALUE_ROADMAP_PROOF", "Value, Roadmap & Proof Plan"],
  ["PERSONAL_FORESIGHT_PLAN", "Personal AI Foresight Plan"],
  ["FINAL_RECOMMENDATION", "Final Recommendation"],
] as const;
