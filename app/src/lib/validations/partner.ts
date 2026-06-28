import { z } from "zod";

// ---------------------------------------------------------------------------
// Public: partner application
// ---------------------------------------------------------------------------

const optionalUrl = z.union([z.string().trim().url("Enter a valid URL."), z.literal("")]).optional();

export const partnerApplicationSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name."),
  email: z.string().trim().toLowerCase().email("Enter a valid email."),
  // International-friendly: +, digits, spaces, hyphens, dots, parentheses; 6–25 chars.
  phone: z
    .union([
      z
        .string()
        .trim()
        .regex(/^[+]?[\d\s().-]{6,25}$/, "Enter a valid phone number (with country code)."),
      z.literal(""),
    ])
    .optional(),
  country: z.string().trim().min(2, "Enter your country."),
  region: z.string().trim().max(120).optional(),
  linkedinUrl: optionalUrl,
  background: z.string().trim().min(80, "Write at least 80 characters about your relevant background."),
  audience: z.enum(["B2C", "B2B", "BOTH"], { error: "Select who you would sell to." }),
  targetMarkets: z.string().trim().min(20, "Describe the markets, industries or organisations you would pursue."),
  accountJustification: z
    .string()
    .trim()
    .min(40, "Explain why it is reasonable for you to pursue these organisations (relationships, route in, experience)."),
  heardFrom: z.string().trim().max(200).optional(),
  consentNoEquity: z
    .boolean()
    .refine((v) => v, "Please confirm you have read and agree to the Partner Program Terms."),
  // Marketing attribution (captured silently)
  utmSource: z.string().optional(),
  utmMedium: z.string().optional(),
  utmCampaign: z.string().optional(),
  referrerUrl: z.string().optional(),
  landingPage: z.string().optional(),
});

export type PartnerApplicationInput = z.infer<typeof partnerApplicationSchema>;

// ---------------------------------------------------------------------------
// Optional application documents (resume / cover letter). PDF only, shared by
// the client form and the server action so the rule stays in one place.
// ---------------------------------------------------------------------------

export const PARTNER_DOC_MAX_BYTES = 5 * 1024 * 1024; // 5 MB

/** Validate an optional uploaded partner document. Returns a user-facing message or null. */
export function partnerDocumentFileError(
  file: { type: string; size: number } | null | undefined,
  label: string,
): string | null {
  if (!file) return null;
  if (file.type !== "application/pdf") return `${label} must be a PDF file.`;
  if (file.size <= 0) return `${label} file is empty.`;
  if (file.size > PARTNER_DOC_MAX_BYTES) return `${label} must be 5 MB or smaller.`;
  return null;
}

export const AUDIENCE_OPTIONS = [
  ["B2C", "Individual professionals (B2C)"],
  ["B2B", "Organisations / teams (B2B)"],
  ["BOTH", "Both"],
] as const;

// ---------------------------------------------------------------------------
// Partner panel: deal registration
// ---------------------------------------------------------------------------

export const DEAL_FUNCTION_OPTIONS = [
  ["ORIGINATION", "Origination (open the account)"],
  ["CLOSING", "Closing (lead the sale to signature)"],
  ["DELIVERY", "Delivery or Coaching"],
] as const;

export const dealRegistrationSchema = z.object({
  productLine: z.enum(["TENXPROS", "TENXOPS"], { error: "Select the type." }),
  offering: z.enum(["B2C_CHARTER", "B2B_ENGAGEMENT", "OTHER"], { error: "Select the offering in view." }),
  legalEntity: z.string().trim().min(2, "Name the exact legal entity or individual."),
  country: z.string().trim().min(2, "Enter the country."),
  businessUnit: z.string().trim().max(160).optional(),
  contactName: z.string().trim().max(160).optional(),
  contactTitle: z.string().trim().max(160).optional(),
  // Kept as validated strings (not z.coerce) so the form's RHF input/output types
  // align; converted to numbers in the server action.
  estSeats: z.string().trim().regex(/^\d*$/, "Enter a whole number.").optional(),
  estValueUsd: z.string().trim().regex(/^\d*(\.\d{1,2})?$/, "Enter a valid amount.").optional(),
  functionsIntended: z.array(z.enum(["ORIGINATION", "CLOSING", "DELIVERY"])).optional(),
  justification: z
    .string()
    .trim()
    .min(40, "Give your case for this account: relationship, warm contact, sector experience, or a concrete route in."),
  widerScopeRequested: z.string().trim().max(500).optional(),
});

export type DealRegistrationInput = z.infer<typeof dealRegistrationSchema>;

// ---------------------------------------------------------------------------
// Partner panel: TenXOps engagement request & profile
// ---------------------------------------------------------------------------

export const tenXOpsRequestSchema = z.object({
  registeredAccountId: z.string().min(1, "Choose the account you coach."),
  organisation: z.string().trim().min(2, "Name the organisation."),
  justification: z.string().trim().min(40, "Explain the coaching relationship and the case for an engagement."),
});

export const partnerProfileSchema = z.object({
  displayName: z.string().trim().min(2, "Enter a display name."),
  contactEmail: z.string().trim().toLowerCase().email("Enter a valid email."),
  country: z.string().trim().max(120).optional(),
});

// ---------------------------------------------------------------------------
// Admin: application review & deal decisions
// ---------------------------------------------------------------------------

export const reviewApplicationSchema = z.object({
  applicationId: z.string().min(1),
  decision: z.enum(["APPROVE", "REJECT", "UNDER_REVIEW"]),
  reviewerNotes: z.string().trim().max(2000).optional(),
});

export const confirmDealSchema = z.object({
  dealRegistrationId: z.string().min(1),
  confirmedScope: z.string().trim().min(2, "State the confirmed scope (entity, country, unit, offering)."),
  isHouseAccount: z.boolean().optional(),
});

export const declineDealSchema = z.object({
  dealRegistrationId: z.string().min(1),
  declineReason: z.string().trim().min(2, "Give a reason."),
});
