import type {
  AccountStage,
  CommissionStatus,
  DealRegStatus,
  EngagementStatus,
  OfferingType,
  PartnerApplicationStatus,
  PartnerFunction,
  PartnerStatus,
  PartnerTier,
  ScorecardDay,
  SeatStatus,
} from "@prisma/client";
import type { EffectiveConfig } from "./config";
import { formatMoney } from "./currency";

// ---------------------------------------------------------------------------
// Display labels for enums (stringly-typed labels, per repo convention)
// ---------------------------------------------------------------------------

export const PARTNER_STATUS_LABELS: Record<PartnerStatus, string> = {
  APPLICANT: "Applicant",
  PILOT: "Pilot (90 days)",
  TIER1: "Tier 1, Referral Partner",
  TIER2: "Tier 2, Certified Partner",
  TIER3: "Tier 3, Performance Territory Builder",
  INACTIVE: "Inactive",
  TERMINATED: "Terminated",
};

export const PARTNER_TIER_LABELS: Record<PartnerTier, string> = {
  TIER1: "Tier 1, Referral Partner",
  TIER2: "Tier 2, Certified Partner",
  TIER3: "Tier 3, Performance Territory Builder",
};

/** Tier recognition titles & credential wording (Schedule E). */
export const TIER_RECOGNITION: Record<PartnerTier, { title: string; credential: string }> = {
  TIER1: {
    title: "TenXPros Referral Partner",
    credential:
      "Authorised referral partner for TenXPros, a professional AI adoption certification program.",
  },
  TIER2: {
    title: "Certified TenXPros Partner (Sales and Delivery)",
    credential:
      "Certified partner authorised to introduce TenXPros, support approved sales discussions, and deliver approved components.",
  },
  TIER3: {
    title: "TenXPros Performance Territory Builder",
    credential:
      "Performance territory builder who originated and managed a defined vertical of TenXPros clients.",
  },
};

export const PARTNER_APPLICATION_STATUS_LABELS: Record<PartnerApplicationStatus, string> = {
  NEW: "New",
  UNDER_REVIEW: "Under review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

export const DEAL_REG_STATUS_LABELS: Record<DealRegStatus, string> = {
  SUBMITTED: "Submitted",
  CONFIRMED: "Confirmed",
  DECLINED: "Declined",
  LAPSED: "Lapsed",
  WITHDRAWN: "Withdrawn",
  NEEDS_REVISION: "Needs revision",
};

export const OFFERING_LABELS: Record<OfferingType, string> = {
  B2C_CHARTER: "B2C Charter",
  B2B_ENGAGEMENT: "B2B Engagement",
  OTHER: "Other",
};

// ---------------------------------------------------------------------------
// Account pipeline (Registered Account stages) and the activity log
// ---------------------------------------------------------------------------

export const ACCOUNT_STAGE_LABELS: Record<AccountStage, string> = {
  REGISTERED: "Registered",
  CONTACTED: "Contacted",
  MEETING: "Meeting",
  PROPOSAL: "Proposal",
  CONVERTING: "Converting",
  WON: "Won",
  LOST: "Lost",
};

/** The stages in pipeline order, for a stepper and for the advance control. */
export const ACCOUNT_STAGE_ORDER: AccountStage[] = [
  "REGISTERED",
  "CONTACTED",
  "MEETING",
  "PROPOSAL",
  "CONVERTING",
  "WON",
  "LOST",
];

/** Maps a stage to a Badge status key for consistent colouring. */
export const ACCOUNT_STAGE_BADGE: Record<AccountStage, string> = {
  REGISTERED: "SUBMITTED",
  CONTACTED: "OPEN",
  MEETING: "UNDER_REVIEW",
  PROPOSAL: "WAITING_RESPONSE",
  CONVERTING: "IN_PROGRESS",
  WON: "APPROVED",
  LOST: "NOT_COMPLETED",
};

/**
 * Activity kinds a partner can log. STAGE_CHANGE is written by the system when a
 * stage is advanced, so it is not offered as a manual choice here.
 */
export const ACCOUNT_ACTIVITY_KIND_LABELS: Record<string, string> = {
  NOTE: "Note",
  MEETING: "Meeting held",
  NEXT_STEP: "Next step set",
  RESPONSE: "Response received",
  PROPOSAL: "Proposal sent",
  CONVERSION: "Conversion progress",
  STAGE_CHANGE: "Stage change",
};

/** Manually loggable activity kinds, in the order shown in the form. */
export const ACCOUNT_ACTIVITY_KINDS = [
  "NOTE",
  "MEETING",
  "NEXT_STEP",
  "RESPONSE",
  "PROPOSAL",
  "CONVERSION",
] as const;

export const COMMISSION_STATUS_LABELS: Record<CommissionStatus, string> = {
  ACCRUED: "Accrued",
  PAYABLE: "Payable",
  PAID: "Paid",
  REVERSED: "Reversed",
};

export const SEAT_STATUS_LABELS: Record<SeatStatus, string> = {
  PENDING: "Pending",
  PAID_COLLECTED: "Paid & collected",
  REFUNDED: "Refunded",
  CANCELLED: "Cancelled",
};

export const ENGAGEMENT_STATUS_LABELS: Record<EngagementStatus, string> = {
  REQUESTED: "Requested",
  CONFIRMED: "Confirmed",
  DECLINED: "Declined",
};

export const PARTNER_FUNCTION_LABELS: Record<PartnerFunction, string> = {
  BASIC_INTRO: "Basic Introduction",
  QUALIFIED_ORIGINATION: "Qualified Origination",
  STRONG_ORIGINATION: "Strong Origination",
  CLOSING: "Closing",
  DELIVERY: "Delivery / Coaching",
  OVERRIDE: "Origination Override",
  FOCUS_BONUS: "Tier 3 Focus Bonus",
  GROWTH_BONUS: "Growth Bonus",
};

export const SCORECARD_DAY_LABELS: Record<ScorecardDay, string> = {
  DAY_14: "Day 14",
  DAY_30: "Day 30",
  DAY_60: "Day 60",
  DAY_90: "Day 90",
};

// ---------------------------------------------------------------------------
// Activation Gate items (Schedule H2), created for each new partner
// ---------------------------------------------------------------------------

export const ACTIVATION_GATE_ITEMS: { key: string; label: string }[] = [
  { key: "onboarding_form", label: "Complete the onboarding form (identity, background, markets in view)" },
  { key: "approved_messaging", label: "Review and acknowledge the approved outreach messaging" },
  {
    key: "no_equity_ack",
    label: "Acknowledge: no equity, no country, no industry, no exclusivity, no long-term commitment",
  },
  { key: "anti_spam_ack", label: "Agree to use no spam, no bought/scraped lists, and no cold bulk messaging" },
  { key: "target_list", label: "Submit a first target list of accounts or B2C channels" },
];

// ---------------------------------------------------------------------------
// 90-day pilot scorecard checkpoints (Schedule H3), created for each partner
// ---------------------------------------------------------------------------

export const SCORECARD_CHECKPOINTS: { day: ScorecardDay; requiredEvidence: string }[] = [
  {
    day: "DAY_14",
    requiredEvidence:
      "At least 3 realistic target accounts or B2C channels, each with the partner's case for pursuing it.",
  },
  {
    day: "DAY_30",
    requiredEvidence:
      "At least 1 confirmed Qualified Lead, or documented progress on approved target accounts.",
  },
  {
    day: "DAY_60",
    requiredEvidence:
      "At least 1 prospect meeting, a proposal path, B2C conversion evidence, or an approved reason to continue.",
  },
  {
    day: "DAY_90",
    requiredEvidence: "Review: end, extend the pilot, keep Tier 1, or consider Tier 2. No automatic promotion.",
  },
];

// ---------------------------------------------------------------------------
// Config field metadata, powers the admin global editor and per-partner
// override editor. `unit` drives formatting; `group` drives sectioning.
// ---------------------------------------------------------------------------

export type ConfigUnit = "bp" | "cents" | "days" | "businessDays" | "months" | "hours" | "seats" | "count" | "bool" | "enum" | "text";

export interface ConfigFieldMeta {
  key: keyof EffectiveConfig;
  label: string;
  unit: ConfigUnit;
  group: string;
  /** Options for enum units. */
  options?: string[];
}

export const CONFIG_FIELD_META: ConfigFieldMeta[] = [
  // Commission rates
  { key: "basicIntroductionBp", label: "Basic Introduction rate", unit: "bp", group: "Commission rates" },
  { key: "qualifiedOriginationB2cBp", label: "Qualified Origination, B2C", unit: "bp", group: "Commission rates" },
  { key: "qualifiedOriginationB2bBp", label: "Qualified Origination, B2B", unit: "bp", group: "Commission rates" },
  { key: "strongOriginationB2cBp", label: "Strong Origination, B2C", unit: "bp", group: "Commission rates" },
  { key: "strongOriginationB2bBp", label: "Strong Origination, B2B", unit: "bp", group: "Commission rates" },
  { key: "strongOriginationUnlockSeats", label: "B2C strong rate unlocks after N seats", unit: "seats", group: "Commission rates" },
  { key: "closingB2cBp", label: "Closing, B2C", unit: "bp", group: "Commission rates" },
  { key: "closingB2bBp", label: "Closing, B2B", unit: "bp", group: "Commission rates" },
  { key: "deliveryMode", label: "Delivery pay mode", unit: "enum", group: "Commission rates", options: ["FIXED_FEE", "PERCENTAGE"] },
  { key: "deliveryPercentMinBp", label: "Delivery percent, min", unit: "bp", group: "Commission rates" },
  { key: "deliveryPercentMaxBp", label: "Delivery percent, max", unit: "bp", group: "Commission rates" },
  // Caps
  { key: "capB2cBp", label: "Cap per deal, B2C", unit: "bp", group: "Caps" },
  { key: "capB2bBp", label: "Cap per deal, B2B", unit: "bp", group: "Caps" },
  { key: "tier3FocusHardCeilingBp", label: "Tier 3 focus hard ceiling", unit: "bp", group: "Caps" },
  // Origination window & override
  { key: "originationWindowMonths", label: "Origination window", unit: "months", group: "Origination & windows" },
  { key: "overrideShareBp", label: "Override share of origination rate", unit: "bp", group: "Origination & windows" },
  { key: "majorNewEngagementMinSeats", label: "Major new engagement, min added seats", unit: "seats", group: "Origination & windows" },
  { key: "trailPeriodMonths", label: "Trail period", unit: "months", group: "Origination & windows" },
  // Tier eligibility
  { key: "tierQualifyingWindowMonths", label: "Tier qualifying window", unit: "months", group: "Tier eligibility" },
  { key: "tier2SeatThreshold", label: "Tier 2 seat threshold", unit: "seats", group: "Tier eligibility" },
  { key: "tier3FocusSeatThreshold", label: "Tier 3 focus seat threshold", unit: "seats", group: "Tier eligibility" },
  // Focus bonus
  { key: "focusBonusStartBp", label: "Focus bonus, start (year 1)", unit: "bp", group: "Tier 3 focus bonus" },
  { key: "focusBonusAnnualIncrementBp", label: "Focus bonus, annual increment", unit: "bp", group: "Tier 3 focus bonus" },
  { key: "focusBonusCeilingBp", label: "Focus bonus, ceiling", unit: "bp", group: "Tier 3 focus bonus" },
  // Growth bonus
  { key: "growthBonusOrgThreshold", label: "Growth bonus, new B2B orgs threshold", unit: "count", group: "Growth bonus" },
  { key: "growthBonusBp", label: "Growth bonus rate", unit: "bp", group: "Growth bonus" },
  // Limits
  { key: "maxOpenAccountsTier1", label: "Max open accounts, Tier 1", unit: "count", group: "Pipeline & limits" },
  { key: "maxOpenAccountsTier2", label: "Max open accounts, Tier 2", unit: "count", group: "Pipeline & limits" },
  { key: "maxOpenAccountsTier3", label: "Max open accounts, Tier 3", unit: "count", group: "Pipeline & limits" },
  { key: "pilotFirst30DaysMaxAccountsTier1", label: "Tier 1 pilot first-window max accounts", unit: "count", group: "Pipeline & limits" },
  { key: "pilotFirst30DaysWindowDays", label: "Tier 1 pilot first-window length", unit: "days", group: "Pipeline & limits" },
  { key: "pipelineProtectionDaysTier1", label: "Pipeline protection, Tier 1", unit: "days", group: "Pipeline & limits" },
  { key: "pipelineProtectionDaysTier2", label: "Pipeline protection, Tier 2", unit: "days", group: "Pipeline & limits" },
  { key: "pipelineProtectionDaysTier3", label: "Pipeline protection, Tier 3", unit: "days", group: "Pipeline & limits" },
  { key: "quietAccountLapseDaysTier1", label: "Quiet-account lapse, Tier 1", unit: "days", group: "Pipeline & limits" },
  { key: "quietAccountLapseDaysTier2", label: "Quiet-account lapse, Tier 2", unit: "days", group: "Pipeline & limits" },
  { key: "quietAccountLapseDaysTier3", label: "Quiet-account lapse, Tier 3", unit: "days", group: "Pipeline & limits" },
  { key: "firstRightHours", label: "First right", unit: "hours", group: "Pipeline & limits" },
  { key: "dealConfirmationWindowBusinessDays", label: "Deal confirmation window", unit: "businessDays", group: "Pipeline & limits" },
  // Active status
  { key: "activeStatusResponseBusinessDays", label: "Active Status response window", unit: "businessDays", group: "Active Status" },
  { key: "activeStatusCureDaysTier1", label: "Active Status cure, Tier 1", unit: "days", group: "Active Status" },
  { key: "activeStatusCureDaysTier2", label: "Active Status cure, Tier 2", unit: "days", group: "Active Status" },
  { key: "activeStatusCureDaysTier3", label: "Active Status cure, Tier 3", unit: "days", group: "Active Status" },
  { key: "transitionDays", label: "Transition period", unit: "days", group: "Active Status" },
  // Payment
  { key: "currency", label: "Payout currency", unit: "text", group: "Payment" },
  { key: "paymentBusinessDays", label: "Payment window", unit: "businessDays", group: "Payment" },
  { key: "smallPayoutThresholdCents", label: "Small payout threshold", unit: "cents", group: "Payment" },
  { key: "smallPayoutCarryForward", label: "Carry forward sub-threshold payouts", unit: "bool", group: "Payment" },
  // Clawback
  { key: "clawbackDays", label: "Clawback window", unit: "days", group: "Clawback" },
  // Pilot & termination
  { key: "pilotDays", label: "Pilot length", unit: "days", group: "Pilot & termination" },
  { key: "pilotTerminationNoticeDays", label: "Pilot termination notice", unit: "days", group: "Pilot & termination" },
  { key: "postPilotTerminationNoticeDays", label: "Post-pilot termination notice", unit: "days", group: "Pilot & termination" },
  { key: "materialBreachCureDays", label: "Material breach cure", unit: "days", group: "Pilot & termination" },
  { key: "windDownDays", label: "Wind-down period", unit: "days", group: "Pilot & termination" },
  { key: "programAmendmentNoticeDays", label: "Program amendment notice", unit: "days", group: "Pilot & termination" },
  // Restrictions
  { key: "nonCircumventionMonths", label: "Non-circumvention tail", unit: "months", group: "Restrictions" },
  { key: "nonSolicitationMonths", label: "Non-solicitation tail", unit: "months", group: "Restrictions" },
  { key: "lateStageTailDays", label: "Late-stage tail", unit: "days", group: "Restrictions" },
];

export const CONFIG_GROUPS = Array.from(new Set(CONFIG_FIELD_META.map((f) => f.group)));

/** Human-readable rendering of a config value given its unit. */
export function formatConfigValue(value: number | string | boolean | null | undefined, unit: ConfigUnit): string {
  if (value === null || value === undefined) return "-";
  switch (unit) {
    case "bp":
      return `${(Number(value) / 100).toFixed(Number(value) % 100 === 0 ? 0 : 2)}%`;
    case "cents":
      return `$${(Number(value) / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    case "days":
      return `${value} days`;
    case "businessDays":
      return `${value} business days`;
    case "months":
      return `${value} months`;
    case "hours":
      return `${value} hours`;
    case "seats":
      return `${value} seats`;
    case "count":
      return String(value);
    case "bool":
      return value ? "Yes" : "No";
    default:
      return String(value);
  }
}

/**
 * Format integer minor units as a currency string. Delegates to the currency-
 * aware formatter so non-2-decimal currencies (JPY=0, BHD=3) render correctly.
 * (Named formatCents for continuity; it handles any currency's minor units.)
 */
export function formatCents(minor: number | null | undefined, currency = "USD"): string {
  return formatMoney(minor, currency);
}

/** Format basis points as a percent string. */
export function formatBp(bp: number | null | undefined): string {
  if (bp === null || bp === undefined) return "-";
  return `${(bp / 100).toFixed(bp % 100 === 0 ? 0 : 2)}%`;
}
