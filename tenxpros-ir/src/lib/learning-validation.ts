import { z } from "zod";

import {
  DOSSIER_SECTION_COUNT,
  PROGRAM_MODULE_COUNT,
} from "@/lib/learning";

const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const optionalText = (maximum: number) =>
  z.preprocess(
    emptyToUndefined,
    z.string().trim().min(1).max(maximum).optional(),
  );

const optionalUrl = z.preprocess(
  emptyToUndefined,
  z
    .string()
    .trim()
    .url()
    .max(500)
    .refine((value) => {
      const protocol = new URL(value).protocol;
      return protocol === "https:" || protocol === "http:";
    }, "فقط URL با پروتکل http یا https پذیرفته می‌شود.")
    .optional(),
);

const optionalRating = z.preprocess(
  emptyToUndefined,
  z.coerce.number().int().min(1).max(5).optional(),
);

export const diagnosticSubmissionSchema = z
  .object({
    intent: z.enum(["save", "submit"]),
    strategyScore: optionalRating,
    workflowScore: optionalRating,
    dataScore: optionalRating,
    deliveryScore: optionalRating,
    governanceScore: optionalRating,
    primaryGoal: optionalText(5_000),
    coreChallenge: optionalText(5_000),
    evidenceContext: optionalText(5_000),
  })
  .superRefine((value, context) => {
    if (value.intent !== "submit") return;

    for (const field of [
      "strategyScore",
      "workflowScore",
      "dataScore",
      "deliveryScore",
      "governanceScore",
    ] as const) {
      if (value[field] === undefined) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: [field],
          message: "برای ارسال Diagnostic باید به این dimension امتیاز دهید.",
        });
      }
    }

    for (const [field, minimum] of [
      ["primaryGoal", 40],
      ["coreChallenge", 40],
      ["evidenceContext", 30],
    ] as const) {
      if (!value[field] || value[field].trim().length < minimum) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: [field],
          message: `برای ارسال نهایی حداقل ${minimum} کاراکتر لازم است.`,
        });
      }
    }
  });

export const diagnosticReviewSchema = z.object({
  diagnosticId: z.string().cuid(),
  reviewerNote: z.string().trim().min(20).max(5_000),
});

export const moduleProgressSchema = z
  .object({
    moduleNumber: z.coerce
      .number()
      .int()
      .min(1)
      .max(PROGRAM_MODULE_COUNT),
    intent: z.enum(["save", "complete"]),
    reflection: optionalText(5_000),
    evidenceUrl: optionalUrl,
  })
  .superRefine((value, context) => {
    if (
      value.intent === "complete" &&
      (!value.reflection || value.reflection.trim().length < 40)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["reflection"],
        message: "برای تکمیل Module حداقل ۴۰ کاراکتر reflection لازم است.",
      });
    }
  });

export const dossierSectionSchema = z.object({
  sectionNumber: z.coerce
    .number()
    .int()
    .min(1)
    .max(DOSSIER_SECTION_COUNT),
  content: z.string().trim().max(12_000),
  evidenceUrl: optionalUrl,
});

export const dossierReviewSchema = z
  .object({
    dossierId: z.string().cuid(),
    decision: z.enum(["approve", "request_changes"]),
    note: optionalText(5_000),
  })
  .superRefine((value, context) => {
    if (
      value.decision === "request_changes" &&
      (!value.note || value.note.trim().length < 20)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["note"],
        message: "برای درخواست اصلاح حداقل ۲۰ کاراکتر توضیح لازم است.",
      });
    }
  });

export const credentialIssueSchema = z.object({
  dossierId: z.string().cuid(),
});

export const credentialRevokeSchema = z.object({
  credentialId: z.string().cuid(),
  reason: z.string().trim().min(20).max(5_000),
});

export const credentialCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^DBC-IR-\d{4}-[A-F0-9]{12}$/);
