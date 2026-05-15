import { z } from "zod";

export const applicationSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name."),
  email: z.string().trim().toLowerCase().email("Enter a valid email."),
  country: z.string().trim().min(2, "Enter your country."),
  professionalRole: z.string().trim().min(2, "Enter your professional role."),
  domain: z.string().trim().min(2, "Enter your professional domain."),
  linkedinUrl: z.union([z.string().trim().url("Enter a valid URL."), z.literal("")]).optional(),
  aiExperience: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]),
  whyTenXPros: z.string().trim().min(80, "Write at least 80 characters."),
  realProblemBrief: z.string().trim().min(80, "Write at least 80 characters."),
  dataSensitivity: z.enum(["LOW", "MODERATE", "HIGH", "CRITICAL"]),
  timeAvailability: z.enum(["HOURS_5", "HOURS_8", "HOURS_12_PLUS"]),
  preferredLanguage: z.string().trim().min(2),
  consentConfidentiality: z.boolean().refine((value) => value, "Confidentiality consent is required."),
  consentTerms: z.boolean().refine((value) => value, "Terms consent is required."),
  utmSource: z.string().optional(),
  utmMedium: z.string().optional(),
  utmCampaign: z.string().optional(),
  utmTerm: z.string().optional(),
  utmContent: z.string().optional(),
  referrerUrl: z.string().optional(),
  landingPage: z.string().optional(),
});

export type ApplicationInput = z.infer<typeof applicationSchema>;

export const applicationStatusSchema = z.object({
  applicationId: z.string().min(1),
  status: z.enum(["SUBMITTED", "UNDER_REVIEW", "ACCEPTED", "REVISE_AND_REAPPLY", "NOT_ACCEPTED", "ENROLLED"]),
  adminNotes: z.string().trim().optional(),
});
