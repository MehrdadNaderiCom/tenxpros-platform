import { z } from "zod";

export const applicationSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name."),
  email: z.string().trim().toLowerCase().email("Enter a valid email."),
  country: z.string().trim().min(2, "Enter your country."),
  professionalRole: z.string().trim().min(2, "Enter your role or job function."),
  domain: z.string().trim().min(2, "Enter your field or industry."),
  phone: z
    .string()
    .trim()
    .min(7, "Enter a valid phone number.")
    .max(20, "Enter a valid phone number.")
    .regex(/^\+?[0-9(][0-9\s()-]{5,18}$/, "Enter a valid phone number (digits, spaces, +, -, parentheses)."),
  // Optional, but the submit flow requires EITHER LinkedIn OR an uploaded
  // resume PDF (see resumeRuleError below, enforced client- and server-side).
  linkedinUrl: z.union([z.string().trim().url("Enter a valid URL."), z.literal("")]).optional(),
  aiExperience: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"], {
    error: "Select the closest option.",
  }),
  whyTenXPros: z.string().trim().min(80, "Write at least 80 characters."),
  realProblemBrief: z.string().trim().min(80, "Write at least 80 characters."),
  dataSensitivity: z.enum(["LOW", "MODERATE", "HIGH", "CRITICAL"], {
    error: "Select the closest level.",
  }),
  timeAvailability: z.enum(["HOURS_5", "HOURS_8", "HOURS_12_PLUS"], {
    error: "Select your weekly availability.",
  }),
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

// ---------------------------------------------------------------------------
// Resume rules (pure, shared by the client form and the server action)
// ---------------------------------------------------------------------------

export const RESUME_MAX_BYTES = 5 * 1024 * 1024; // 5 MB

/** A PDF file starts with the magic bytes "%PDF-". */
export function isPdfMagic(bytes: Uint8Array): boolean {
  const magic = [0x25, 0x50, 0x44, 0x46, 0x2d]; // %PDF-
  if (bytes.length < magic.length) return false;
  return magic.every((value, index) => bytes[index] === value);
}

/**
 * Either LinkedIn or a resume must be provided. Returns a user-facing error
 * message, or null when the rule is satisfied.
 */
export function resumeRuleError(linkedinUrl: string | null | undefined, hasResume: boolean): string | null {
  const hasLinkedin = Boolean(linkedinUrl && linkedinUrl.trim().length > 0);
  if (hasLinkedin || hasResume) return null;
  return "Provide your LinkedIn URL or upload your resume as a PDF (at least one is required).";
}

/** Validate an uploaded resume's basic properties. Returns an error message or null. */
export function resumeFileError(file: { type: string; size: number } | null | undefined): string | null {
  if (!file) return null;
  if (file.type !== "application/pdf") return "Resume must be a PDF file.";
  if (file.size <= 0) return "Resume file is empty.";
  if (file.size > RESUME_MAX_BYTES) return "Resume must be 5 MB or smaller.";
  return null;
}

export const applicationStatusSchema = z.object({
  applicationId: z.string().min(1),
  status: z.enum(["SUBMITTED", "UNDER_REVIEW", "ACCEPTED", "REVISE_AND_REAPPLY", "NOT_ACCEPTED", "ENROLLED"]),
  adminNotes: z.string().trim().optional(),
});
