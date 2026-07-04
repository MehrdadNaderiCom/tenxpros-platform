import { z } from "zod";

// ---------------------------------------------------------------------------
// Public: partner application
// ---------------------------------------------------------------------------

const optionalUrl = z.union([z.string().trim().url("Enter a valid URL."), z.literal("")]).optional();

export const partnerApplicationSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name."),
  email: z.string().trim().toLowerCase().email("Enter a valid email."),
  // International-friendly: +, digits, spaces, hyphens, dots, parentheses; 6-25 chars.
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
  ["BASIC_INTRO", "Basic Introduction (introduce and step away)"],
  ["ORIGINATION", "Origination (open the account)"],
  ["CLOSING", "Closing (lead the sale to signature)"],
  ["DELIVERY", "Delivery or Coaching"],
] as const;

/**
 * Per-function evidence at registration. Every evidence field is OPTIONAL: it is
 * strongly encouraged (it materially affects confirmation and classification) but
 * never blocks a submission. The ONE exception is the warm-relationship attestation
 * when Basic Introduction is claimed, mirroring the engine's pay-time requirement.
 */
export const dealRegistrationSchema = z
  .object({
    productLine: z.enum(["TENXPROS", "TENXOPS"], { error: "Select the type." }),
    offering: z.enum(["B2C_CHARTER", "B2B_ENGAGEMENT", "OTHER"], { error: "Select the offering in view." }),
    legalEntity: z.string().trim().min(2, "Name the exact legal entity or individual."),
    // Canonical company identity for the objective newness / origination rule. Optional
    // at submission (an individual may have none), normalized server side before storage.
    domain: z.string().trim().max(253).optional(),
    country: z.string().trim().min(2, "Enter the country."),
    businessUnit: z.string().trim().max(160).optional(),
    contactName: z.string().trim().max(160).optional(),
    contactTitle: z.string().trim().max(160).optional(),
    // Kept as validated strings (not z.coerce) so the form's RHF input/output types
    // align; converted to numbers in the server action.
    estSeats: z.string().trim().regex(/^\d*$/, "Enter a whole number.").optional(),
    estValueUsd: z.string().trim().regex(/^\d*(\.\d{1,2})?$/, "Enter a valid amount.").optional(),
    functionsIntended: z.array(z.enum(["BASIC_INTRO", "ORIGINATION", "CLOSING", "DELIVERY"])).optional(),
    // Basic Introduction claim evidence (encouraged, not blocking).
    introContactName: z.string().trim().max(160).optional(),
    introRelationship: z.string().trim().max(2000).optional(),
    introHow: z.string().trim().max(2000).optional(),
    // The one hard requirement when Basic Introduction is claimed.
    introWarmAttested: z.boolean().optional(),
    // Origination and Closing involvement statements (encouraged, not blocking).
    originationInvolvement: z.string().trim().max(2000).optional(),
    closingPlan: z.string().trim().max(2000).optional(),
    deliveryScope: z.string().trim().max(2000).optional(),
    justification: z
      .string()
      .trim()
      .min(40, "Give your case for this account: relationship, warm contact, sector experience, or a concrete route in."),
    widerScopeRequested: z.string().trim().max(500).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.functionsIntended?.includes("BASIC_INTRO") && !data.introWarmAttested) {
      ctx.addIssue({
        code: "custom",
        path: ["introWarmAttested"],
        message: "A Basic Introduction claim needs your attestation of a genuine, pre-existing warm relationship.",
      });
    }
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
// Partner panel: account pipeline (stage moves + activity log)
// ---------------------------------------------------------------------------

export const ACCOUNT_STAGE_VALUES = [
  "REGISTERED",
  "CONTACTED",
  "MEETING",
  "PROPOSAL",
  "CONVERTING",
  "WON",
  "LOST",
] as const;

export const ACCOUNT_ACTIVITY_KIND_VALUES = [
  "NOTE",
  "MEETING",
  "NEXT_STEP",
  "RESPONSE",
  "PROPOSAL",
  "CONVERSION",
] as const;

export const advanceAccountStageSchema = z.object({
  registeredAccountId: z.string().min(1, "Missing account."),
  stage: z.enum(ACCOUNT_STAGE_VALUES, { error: "Choose a stage." }),
  note: z.string().trim().max(2000).optional(),
});

export const logAccountActivitySchema = z.object({
  registeredAccountId: z.string().min(1, "Missing account."),
  kind: z.enum(ACCOUNT_ACTIVITY_KIND_VALUES, { error: "Choose an activity type." }),
  note: z.string().trim().min(3, "Add a short note describing the activity."),
});

// ---------------------------------------------------------------------------
// Partner panel: opportunity thread + edit/resubmit (NEEDS_REVISION loop)
// ---------------------------------------------------------------------------

export const dealMessageSchema = z.object({
  dealRegistrationId: z.string().min(1, "Missing opportunity."),
  body: z.string().trim().min(2, "Write a message.").max(4000),
});

/** Admin asks a partner to revise an opportunity: a feedback message is required. */
export const dealRevisionRequestSchema = z.object({
  dealRegistrationId: z.string().min(1),
  feedback: z.string().trim().min(4, "Explain what needs to change."),
});

/** Partner edits and resubmits a NEEDS_REVISION opportunity. Same shape as the
 *  original registration, minus the immutable product line. */
export const resubmitDealSchema = z
  .object({
    dealRegistrationId: z.string().min(1),
    offering: z.enum(["B2C_CHARTER", "B2B_ENGAGEMENT", "OTHER"], { error: "Select the offering in view." }),
    legalEntity: z.string().trim().min(2, "Name the exact legal entity or individual."),
    // Canonical company identity for the objective newness / origination rule. Optional
    // at submission (an individual may have none), normalized server side before storage.
    domain: z.string().trim().max(253).optional(),
    country: z.string().trim().min(2, "Enter the country."),
    businessUnit: z.string().trim().max(160).optional(),
    contactName: z.string().trim().max(160).optional(),
    contactTitle: z.string().trim().max(160).optional(),
    estSeats: z.string().trim().regex(/^\d*$/, "Enter a whole number.").optional(),
    estValueUsd: z.string().trim().regex(/^\d*(\.\d{1,2})?$/, "Enter a valid amount.").optional(),
    functionsIntended: z.array(z.enum(["BASIC_INTRO", "ORIGINATION", "CLOSING", "DELIVERY"])).optional(),
    introContactName: z.string().trim().max(160).optional(),
    introRelationship: z.string().trim().max(2000).optional(),
    introHow: z.string().trim().max(2000).optional(),
    introWarmAttested: z.boolean().optional(),
    originationInvolvement: z.string().trim().max(2000).optional(),
    closingPlan: z.string().trim().max(2000).optional(),
    deliveryScope: z.string().trim().max(2000).optional(),
    justification: z
      .string()
      .trim()
      .min(40, "Give your case for this account: relationship, warm contact, sector experience, or a concrete route in."),
    widerScopeRequested: z.string().trim().max(500).optional(),
    note: z.string().trim().max(2000).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.functionsIntended?.includes("BASIC_INTRO") && !data.introWarmAttested) {
      ctx.addIssue({
        code: "custom",
        path: ["introWarmAttested"],
        message: "A Basic Introduction claim needs your attestation of a genuine, pre-existing warm relationship.",
      });
    }
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

// ---------------------------------------------------------------------------
// Special-deal requests (partner submits; superadmin decides overall + per item)
// ---------------------------------------------------------------------------

export const specialDealRequestSchema = z.object({
  title: z.string().trim().min(4, "Give the request a short title.").max(160),
  context: z
    .string()
    .trim()
    .min(20, "Explain the situation and why the standard contract does not fit."),
  dealRegistrationId: z.string().trim().optional(),
  items: z
    .array(z.string().trim().min(3, "Each detail needs a short description."))
    .min(1, "Add at least one out-of-rule detail.")
    .max(20, "That is a lot of details. Please consolidate to 20 or fewer."),
});

export const decideSpecialDealItemSchema = z.object({
  itemId: z.string().min(1),
  decision: z.enum(["APPROVE", "REJECT"], { error: "Choose approve or reject." }),
  decisionNote: z.string().trim().max(2000).optional(),
});

export const decideSpecialDealRequestSchema = z.object({
  requestId: z.string().min(1),
  decision: z.enum(["APPROVE_ALL", "REJECT_ALL", "FINALIZE_FROM_ITEMS"], {
    error: "Choose how to finalize.",
  }),
  decisionNote: z.string().trim().max(2000).optional(),
});

// ---------------------------------------------------------------------------
// Partner Toolkit repository (superadmin authoring)
// ---------------------------------------------------------------------------

export const TOOLKIT_MAX_FILE_BYTES = 15 * 1024 * 1024; // 15 MB per file
export const TOOLKIT_MAX_FILES = 10;
export const TOOLKIT_MAX_LINKS = 12;

const slugRule = z
  .string()
  .trim()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use a URL-friendly slug: lowercase letters, numbers, and hyphens.")
  .max(120)
  .optional();

export const toolkitPostSchema = z.object({
  id: z.string().trim().optional(),
  title: z.string().trim().min(3, "Give the post a title.").max(200),
  slug: slugRule,
  // Managed category reference drives grouping. The free-text `category` string
  // is derived from the chosen category's title in the action (back-compat) and
  // is accepted here only as an optional fallback.
  categoryId: z.string().trim().optional(),
  category: z.string().trim().max(80).optional(),
  bodyHtml: z.string().trim().min(1, "Write the post body."),
  order: z.string().trim().regex(/^\d*$/, "Order must be a whole number.").optional(),
  isPublished: z.boolean().optional(),
});

/** Managed Toolkit category (superadmin authoring). */
export const toolkitCategorySchema = z.object({
  id: z.string().trim().optional(),
  title: z.string().trim().min(2, "Give the category a title.").max(80),
  slug: slugRule,
  description: z.string().trim().max(300).optional(),
  order: z.string().trim().regex(/^\d*$/, "Order must be a whole number.").optional(),
  isPublished: z.boolean().optional(),
});

// ---------------------------------------------------------------------------
// Discussion board (partner experience sharing; superadmin moderates)
// ---------------------------------------------------------------------------

export const discussionPostSchema = z.object({
  title: z.string().trim().min(4, "Give your post a clear title.").max(200),
  body: z.string().trim().min(30, "Share enough of your experience to be useful (at least 30 characters)."),
  category: z.string().trim().max(80).optional(),
});

export const discussionCommentSchema = z.object({
  postId: z.string().min(1),
  body: z.string().trim().min(2, "Write a comment.").max(4000),
});

export const moderateDiscussionSchema = z.object({
  postId: z.string().min(1),
  decision: z.enum(["PUBLISH", "REJECT"], { error: "Choose publish or reject." }),
  title: z.string().trim().min(4, "The title is required.").max(200),
  body: z.string().trim().min(10, "The body is required."),
  category: z.string().trim().max(80).optional(),
});

// ---------------------------------------------------------------------------
// Partner support tickets (also emailed to the program owner)
// ---------------------------------------------------------------------------

export const supportTicketSchema = z.object({
  subject: z.string().trim().min(4, "Give the issue a short subject.").max(200),
  body: z.string().trim().min(10, "Describe the problem so we can help."),
});
