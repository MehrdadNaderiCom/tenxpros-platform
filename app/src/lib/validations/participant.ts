import { z } from "zod";

export const diagnosticSchema = z.object({
  riskProfile: z.enum(["LOW", "MODERATE", "HIGH", "CRITICAL"]).optional(),
  domainRecognition: z.string().trim().optional(),
  solutionPatternHint: z.string().trim().optional(),
  aiLiteracyLevel: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]).optional(),
  stakeholderComplexity: z.enum(["SOLO", "SMALL_TEAM", "DEPARTMENT", "MULTI_STAKEHOLDER"]).optional(),
  industryRegulatoryWeight: z.enum(["LIGHT", "MODERATE", "HEAVY"]).optional(),
  timeAvailability: z.enum(["HOURS_5", "HOURS_8", "HOURS_12_PLUS"]).optional(),
  outputType: z.enum(["INTERNAL", "CLIENT_FACING", "PUBLIC_FACING", "REGULATED"]).optional(),
  problemContext: z.string().trim().optional(),
  problemClarity: z.string().trim().optional(),
  successCriteria: z.string().trim().optional(),
  organizationalContext: z.string().trim().optional(),
  goals: z.string().trim().optional(),
  supportNeeds: z.string().trim().optional(),
  currentStep: z.coerce.number().int().min(1).max(5).default(1),
});

export const finalDiagnosticSchema = diagnosticSchema.required({
  riskProfile: true,
  domainRecognition: true,
  aiLiteracyLevel: true,
  stakeholderComplexity: true,
  industryRegulatoryWeight: true,
  timeAvailability: true,
  outputType: true,
  problemContext: true,
  problemClarity: true,
  successCriteria: true,
  organizationalContext: true,
  goals: true,
});

export const moduleArtifactSchema = z.object({
  participantModuleId: z.string().min(1),
  artifactContent: z.string().trim().min(80, "Submit at least 80 characters."),
  artifactUrl: z.string().trim().url().optional().or(z.literal("")),
});

export const dossierSectionSchema = z.object({
  sectionId: z.string().min(1),
  content: z.string().trim(),
});

export const ticketSchema = z.object({
  subject: z.string().trim().min(5),
  category: z.enum([
    "MODULE_QUESTION",
    "DOSSIER_HELP",
    "AI_SUITABILITY",
    "EVIDENCE",
    "WORKFLOW",
    "FORESIGHT",
    "CAPSTONE",
    "TECHNICAL",
    "OTHER",
  ]),
  body: z.string().trim().min(20),
});

export const ticketMessageSchema = z.object({
  ticketId: z.string().min(1),
  body: z.string().trim().min(2),
});
