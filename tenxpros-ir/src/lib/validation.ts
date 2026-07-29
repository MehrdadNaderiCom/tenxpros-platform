import { z } from "zod";
import {
  assertThirtyMinuteSlot,
  createThirtyMinuteSlots,
  IRAN_TIME_ZONE,
} from "./iran-week";

export const AI_EXPERIENCE_LEVELS = [
  "BEGINNER",
  "PRACTICAL",
  "ADVANCED",
] as const;

export const WEEKLY_AVAILABILITY_OPTIONS = [
  "THREE_TO_FIVE",
  "FIVE_TO_SEVEN",
  "SEVEN_PLUS",
] as const;

export const APPLICATION_STATUSES = [
  "SUBMITTED",
  "PENDING_REVIEW",
  "ACCEPTED_AWAITING_PAYMENT",
  "PAYMENT_UNDER_REVIEW",
  "ACTIVE",
  "REJECTED",
  "SUSPENDED",
  "GRADUATED",
  "WITHDRAWN",
] as const;

export const MEMBERSHIP_STATUSES = [
  "INVITED",
  "PENDING_PAYMENT",
  "ACTIVE",
  "SUSPENDED",
  "GRADUATED",
  "REVOKED",
] as const;

export const PAYMENT_RECEIPT_STATUSES = [
  "SUBMITTED",
  "PENDING_REVIEW",
  "APPROVED",
  "REJECTED",
  "SUPERSEDED",
] as const;

export const COACHING_INQUIRY_STATUSES = [
  "NEW",
  "CONTACTED",
  "SCHEDULED",
  "COMPLETED",
  "DECLINED",
] as const;

export const WEEKLY_GATHERING_STATUSES = [
  "DRAFT",
  "PUBLISHED",
  "CANCELLED",
  "COMPLETED",
] as const;

const controlCharacters =
  /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;
const persianInteger = new Intl.NumberFormat("fa-IR");

export function normalizeIranianDigits(value: string) {
  return value
    .replace(/[۰-۹]/g, (digit) =>
      String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)),
    )
    .replace(/[٠-٩]/g, (digit) =>
      String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)),
    );
}

export function normalizeIranianMobile(value: string) {
  let normalized = normalizeIranianDigits(value)
    .replace(/[\s\-().]/g, "")
    .trim();
  if (normalized.startsWith("0098")) normalized = `+98${normalized.slice(4)}`;
  if (normalized.startsWith("98")) normalized = `+${normalized}`;
  if (normalized.startsWith("09")) normalized = `+98${normalized.slice(1)}`;
  return normalized;
}

const requiredText = (minimum: number, maximum: number) =>
  z
    .string({
      required_error: "تکمیل این فیلد الزامی است.",
      invalid_type_error: "مقدار واردشده برای این فیلد معتبر نیست.",
    })
    .trim()
    .min(minimum, {
      message: `حداقل ${persianInteger.format(minimum)} کاراکتر وارد کنید.`,
    })
    .max(maximum, {
      message: `حداکثر ${persianInteger.format(maximum)} کاراکتر مجاز است.`,
    })
    .refine((value) => !controlCharacters.test(value), {
      message: "متن شامل نویسه کنترلی پشتیبانی‌نشده است.",
    });

const optionalText = (maximum: number) =>
  z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === ""
        ? undefined
        : value,
    requiredText(1, maximum).optional(),
  );

const emptyValueToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const checkedCheckbox = z.preprocess(
  (value) =>
    value === true ||
    value === "true" ||
    value === "1" ||
    value === "on",
  z.literal(true),
);

export const idSchema = z.string().cuid();
export const emailSchema = z
  .string()
  .trim()
  .email()
  .max(320)
  .transform((value) => value.toLocaleLowerCase("en-US"));
export const iranianMobileSchema = z
  .string()
  .transform(normalizeIranianMobile)
  .pipe(z.string().regex(/^\+989\d{9}$/));
export const passwordSchema = z
  .string()
  .min(10)
  .max(72)
  .refine((value) => new TextEncoder().encode(value).byteLength <= 72, {
    message: "Password exceeds bcrypt's 72-byte limit.",
  })
  .refine((value) => /[\p{L}]/u.test(value) && /\d/.test(value), {
    message: "Password must include at least one letter and one number.",
  });

export const adminLoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
});

export const loginSchema = adminLoginSchema;

export const applicantLoginSchema = z.object({
  email: emailSchema,
  credential: z.string().min(6).max(128),
});

export const memberLoginSchema = applicantLoginSchema;

export const applicationSubmissionSchema = z.object({
  fullName: requiredText(2, 200),
  email: emailSchema,
  phone: iranianMobileSchema,
  professionalRole: requiredText(2, 200),
  domain: requiredText(2, 200),
  organization: optionalText(200),
  experienceYears: z.preprocess(
    emptyValueToUndefined,
    z.coerce.number().int().min(0).max(70).optional(),
  ),
  linkedinUrl: z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === ""
        ? undefined
        : value,
    z
      .string()
      .trim()
      .url()
      .max(500)
      .refine((value) => {
        const url = new URL(value);
        return (
          url.protocol === "https:" &&
          (url.hostname === "linkedin.com" ||
            url.hostname.endsWith(".linkedin.com"))
        );
      }, "LinkedIn URL must use HTTPS on linkedin.com.")
      .optional(),
  ),
  aiExperience: z.enum(AI_EXPERIENCE_LEVELS),
  motivation: requiredText(30, 5_000),
  realProblem: requiredText(30, 5_000),
  challenge: optionalText(5_000),
  goals: optionalText(5_000),
  weeklyAvailability: z.enum(WEEKLY_AVAILABILITY_OPTIONS),
  weeklyCommitment: z.preprocess(
    emptyValueToUndefined,
    z.coerce.number().int().min(1).max(40).optional(),
  ),
  applicantNote: optionalText(3_000),
  password: passwordSchema,
  acceptTerms: checkedCheckbox,
  privacyAccepted: checkedCheckbox.optional(),
  website: z.string().trim().max(0).optional().default(""),
  source: optionalText(120),
  utmSource: optionalText(120),
  utmMedium: optionalText(120),
  utmCampaign: optionalText(160),
});

export const applicationSchema = applicationSubmissionSchema;

export const applicationReviewSchema = z.discriminatedUnion("decision", [
  z.object({
    applicationId: idSchema,
    decision: z.literal("ACCEPT"),
    reviewerNote: optionalText(3_000),
  }),
  z.object({
    applicationId: idSchema,
    decision: z.literal("REJECT"),
    reviewerNote: requiredText(3, 3_000),
  }),
]);

export const paymentReceiptSubmissionSchema = z.object({
  applicationId: idSchema,
  payerName: requiredText(2, 200),
  paidAt: z.coerce.date(),
  bankReference: requiredText(3, 100),
  sourceLastFour: z
    .string()
    .transform(normalizeIranianDigits)
    .pipe(z.string().regex(/^\d{4}$/)),
  applicantNote: optionalText(3_000),
});

export const receiptMetadataSchema = z.object({
  payerName: requiredText(2, 200),
  paidAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  amountToman: z.coerce.number().int().positive(),
  referenceNumber: requiredText(3, 100),
  sourceLastFour: z
    .string()
    .transform(normalizeIranianDigits)
    .pipe(z.string().regex(/^\d{4}$/)),
  note: optionalText(3_000),
  confirmPayment: checkedCheckbox,
});

export const paymentReceiptReviewSchema = z.discriminatedUnion("decision", [
  z.object({
    receiptId: idSchema,
    decision: z.literal("APPROVE"),
    reviewerNote: optionalText(3_000),
  }),
  z.object({
    receiptId: idSchema,
    decision: z.literal("REJECT"),
    reviewerNote: requiredText(3, 3_000),
  }),
]);

export const availabilityWindowSchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    startTime: z.string().regex(/^([01]\d|2[0-3]):(?:00|30)$/),
    endTime: z.string().regex(/^([01]\d|2[0-3]):(?:00|30)$/),
    note: optionalText(500),
  })
  .superRefine((value, context) => {
    try {
      createThirtyMinuteSlots(value);
    } catch (error) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endTime"],
        message:
          error instanceof Error
            ? error.message
            : "Availability is invalid.",
      });
    }
  });

export const slotRangeSchema = availabilityWindowSchema;

export const availabilitySlotCreateSchema = z
  .object({
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date(),
    note: optionalText(500),
  })
  .superRefine((value, context) => {
    try {
      assertThirtyMinuteSlot(value.startsAt, value.endsAt);
    } catch (error) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endsAt"],
        message:
          error instanceof Error ? error.message : "Slot is invalid.",
      });
    }
  });

export const officeHourBookingSchema = z.object({
  slotId: idSchema,
});

export const coachingInquirySchema = z.object({
  subject: requiredText(3, 200),
  message: requiredText(20, 5_000),
  preferredSchedule: optionalText(500),
  requestedMinutes: z.coerce
    .number()
    .int()
    .refine((value) => value === 60, {
      message: "هر درخواست Coaching دقیقاً برای ۶۰ دقیقه ثبت می‌شود.",
    }),
});

export const coachingInquiryUpdateSchema = z.object({
  inquiryId: idSchema,
  status: z.enum(COACHING_INQUIRY_STATUSES),
  adminNote: optionalText(3_000),
  scheduledAt: z.preprocess(
    emptyValueToUndefined,
    z.coerce.date().optional(),
  ),
});

export const weeklyGatheringCreateSchema = z
  .object({
    title: requiredText(3, 200),
    topic: requiredText(3, 300),
    description: optionalText(5_000),
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date(),
    timeZone: z.literal(IRAN_TIME_ZONE).default(IRAN_TIME_ZONE),
    capacity: z.preprocess(
      emptyValueToUndefined,
      z.coerce.number().int().min(1).max(10_000).optional(),
    ),
  })
  .superRefine((value, context) => {
    if (value.endsAt.getTime() - value.startsAt.getTime() !== 90 * 60_000) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endsAt"],
        message: "The weekly gathering must be exactly 90 minutes.",
      });
    }
  });

export const weeklyGatheringRegistrationSchema = z.object({
  gatheringId: idSchema,
});

export const weeklyGatheringStatusSchema = z.object({
  gatheringId: idSchema,
  status: z.enum(WEEKLY_GATHERING_STATUSES),
});

export function canSubmitPaymentReceipt(input: {
  applicationStatus: string;
  membershipStatus: string | null;
}) {
  return (
    input.applicationStatus === "ACCEPTED_AWAITING_PAYMENT" &&
    input.membershipStatus === "PENDING_PAYMENT"
  );
}

export function isOfficeHourEligible(membershipStatus: string | null) {
  return membershipStatus === "ACTIVE";
}

export function isWeeklyGatheringEligible(
  membershipStatus: string | null,
) {
  return (
    membershipStatus === "ACTIVE" ||
    membershipStatus === "GRADUATED"
  );
}
