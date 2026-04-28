import { z } from "zod";

export const signUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(2).max(120),
  intent: z.enum(["professional", "employer"]).default("professional"),
});

export const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const profileSchema = z.object({
  headline: z.string().max(160).optional().or(z.literal("")),
  currentRole: z.string().max(160).optional().or(z.literal("")),
  targetRole: z.string().max(160).optional().or(z.literal("")),
  industry: z.string().max(120).optional().or(z.literal("")),
  location: z.string().max(120).optional().or(z.literal("")),
  remotePreference: z.string().max(60).optional().or(z.literal("")),
  languages: z.string().max(400).optional().or(z.literal("")),
  skills: z.string().max(800).optional().or(z.literal("")),
  tools: z.string().max(800).optional().or(z.literal("")),
  aiToolsUsed: z.string().max(800).optional().or(z.literal("")),
  careerGoals: z.string().max(2000).optional().or(z.literal("")),
  resumeUrl: z.string().url().optional().or(z.literal("")),
  linkedinUrl: z.string().url().optional().or(z.literal("")),
  githubUrl: z.string().url().optional().or(z.literal("")),
  websiteUrl: z.string().url().optional().or(z.literal("")),
  visibility: z.enum(["PRIVATE", "REVIEWERS_ONLY", "EMPLOYER_VISIBLE", "PUBLIC"]).default("PRIVATE"),
});

export const diagnosticSchema = z.object({
  aiLiteracy: z.coerce.number().int().min(0).max(5),
  toolFamiliarity: z.coerce.number().int().min(0).max(5),
  prompting: z.coerce.number().int().min(0).max(5),
  automationAwareness: z.coerce.number().int().min(0).max(5),
  riskAwareness: z.coerce.number().int().min(0).max(5),
  outputEvaluation: z.coerce.number().int().min(0).max(5),
  roleSpecificUse: z.coerce.number().int().min(0).max(5),
  englishComm: z.coerce.number().int().min(0).max(5),
  jobSearchStatus: z.string().min(1).max(400),
  dailyTasks: z.string().min(1).max(2000),
  painPoints: z.string().min(1).max(2000),
  targetOutcomes: z.string().min(1).max(2000),
});

export const taskSchema = z.object({
  title: z.string().min(2).max(160),
  description: z.string().min(2).max(4000),
  roleContext: z.string().max(200).optional().or(z.literal("")),
  frequency: z.enum(["AD_HOC", "DAILY", "WEEKLY", "MONTHLY", "QUARTERLY"]).default("WEEKLY"),
  businessValue: z.coerce.number().int().min(1).max(5),
  complexity: z.coerce.number().int().min(1).max(5),
  riskLevel: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("LOW"),
  confidentiality: z.enum(["PUBLIC", "INTERNAL", "CONFIDENTIAL", "RESTRICTED"]).default("INTERNAL"),
  humanJudgment: z.coerce.number().int().min(1).max(5),
  aiSuitability: z.coerce.number().int().min(1).max(5),
  automationPotential: z.coerce.number().int().min(1).max(5),
  notes: z.string().max(2000).optional().or(z.literal("")),
});

export const evidenceSchema = z.object({
  title: z.string().min(2).max(160),
  type: z.enum([
    "BEFORE_AFTER_ARTIFACT",
    "PROMPT_CHAIN",
    "AI_WORKFLOW",
    "REPORT",
    "PRESENTATION",
    "DOC_IMPROVEMENT",
    "JOB_APPLICATION_IMPROVEMENT",
    "AUTOMATION_DESIGN",
    "SCENARIO_RESPONSE",
    "DECISION_LOG",
    "PORTFOLIO_LINK",
    "FILE_UPLOAD",
  ]),
  description: z.string().min(2).max(4000),
  roleContext: z.string().max(200).optional().or(z.literal("")),
  aiToolsUsed: z.string().max(400).optional().or(z.literal("")),
  humanContribution: z.string().min(2).max(2000),
  aiContribution: z.string().min(2).max(2000),
  risksConsidered: z.string().min(2).max(2000),
  externalUrl: z.string().url().optional().or(z.literal("")),
  visibility: z.enum(["PRIVATE", "REVIEWERS_ONLY", "EMPLOYER_VISIBLE", "PUBLIC"]).default("PRIVATE"),
});

export const scenarioSubmissionSchema = z.object({
  scenarioId: z.string().min(1),
  humanSteps: z.string().min(2).max(4000),
  aiSteps: z.string().min(2).max(4000),
  toolsUsed: z.string().max(400).optional().or(z.literal("")),
  promptOutline: z.string().min(2).max(4000),
  riskControls: z.string().min(2).max(2000),
  reviewProcess: z.string().min(2).max(2000),
  finalOutput: z.string().min(2).max(4000),
  workModeChoice: z.enum([
    "HUMAN_LED",
    "AI_ASSISTED",
    "RULES_BASED",
    "AUTOMATED",
    "AI_TOOL_CHAIN",
    "ESCALATE",
    "NOT_SUITABLE",
  ]),
  workModeReason: z.string().min(2).max(2000),
});

export const orgProfileSchema = z.object({
  name: z.string().min(2).max(160),
  industry: z.string().max(120).optional().or(z.literal("")),
  size: z.string().max(40).optional().or(z.literal("")),
  location: z.string().max(120).optional().or(z.literal("")),
  websiteUrl: z.string().url().optional().or(z.literal("")),
  description: z.string().max(4000).optional().or(z.literal("")),
  contactName: z.string().max(160).optional().or(z.literal("")),
  contactEmail: z.string().email().optional().or(z.literal("")),
});

export const roleNeedSchema = z.object({
  title: z.string().min(2).max(160),
  department: z.string().max(120).optional().or(z.literal("")),
  industry: z.string().max(120).optional().or(z.literal("")),
  requiredSkills: z.string().max(800).optional().or(z.literal("")),
  requiredWorkModes: z.array(z.enum([
    "HUMAN_LED", "AI_ASSISTED", "RULES_BASED", "AUTOMATED",
    "AI_TOOL_CHAIN", "ESCALATE", "NOT_SUITABLE",
  ])).default([]),
  taskExamples: z.string().max(4000).optional().or(z.literal("")),
  aiAdoptionExpectations: z.string().max(4000).optional().or(z.literal("")),
  location: z.string().max(120).optional().or(z.literal("")),
  employmentType: z.string().max(40).optional().or(z.literal("")),
  notes: z.string().max(2000).optional().or(z.literal("")),
});

export const employerRequestSchema = z.object({
  type: z.enum(["shortlist", "interview-support", "team-assessment", "candidate-assessment", "general"]),
  message: z.string().min(2).max(4000),
  roleNeedId: z.string().optional(),
});

export const contactSchema = z.object({
  name: z.string().min(2).max(160),
  email: z.string().email(),
  organization: z.string().max(160).optional().or(z.literal("")),
  intent: z.enum(["professional", "employer", "partnership", "press", "other"]).default("professional"),
  message: z.string().min(2).max(4000),
});
