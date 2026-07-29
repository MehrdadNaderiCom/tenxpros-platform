import { describe, expect, it } from "vitest";

import {
  credentialCodeSchema,
  credentialRevokeSchema,
  diagnosticSubmissionSchema,
  dossierReviewSchema,
  moduleProgressSchema,
} from "@/lib/learning-validation";

const completeDiagnostic = {
  intent: "submit",
  strategyScore: "5",
  workflowScore: "4",
  dataScore: "3",
  deliveryScore: "4",
  governanceScore: "5",
  primaryGoal: "یک هدف حرفه‌ای روشن که بیش از چهل کاراکتر محتوای واقعی دارد",
  coreChallenge:
    "یک مسئله واقعی در Workflow که زمینه و پیامدهای آن به روشنی ثبت شده است",
  evidenceContext: "شواهد اولیه و داده‌های قابل بررسی برای شروع پروژه موجود است",
};

describe("Diagnostic validation", () => {
  it("accepts a complete final submission and coerces ratings", () => {
    const parsed = diagnosticSubmissionSchema.parse(completeDiagnostic);
    expect(parsed.strategyScore).toBe(5);
    expect(parsed.intent).toBe("submit");
  });

  it("allows an incomplete draft but not an incomplete submission", () => {
    expect(
      diagnosticSubmissionSchema.safeParse({
        intent: "save",
        primaryGoal: "",
      }).success,
    ).toBe(true);
    expect(
      diagnosticSubmissionSchema.safeParse({
        intent: "submit",
        primaryGoal: "کوتاه",
      }).success,
    ).toBe(false);
  });
});

describe("Module and Dossier validation", () => {
  it("requires a substantial Reflection only for Module completion", () => {
    expect(
      moduleProgressSchema.safeParse({
        moduleNumber: 1,
        intent: "save",
        reflection: "",
      }).success,
    ).toBe(true);
    expect(
      moduleProgressSchema.safeParse({
        moduleNumber: 1,
        intent: "complete",
        reflection: "کوتاه",
      }).success,
    ).toBe(false);
    expect(
      moduleProgressSchema.safeParse({
        moduleNumber: 1,
        intent: "complete",
        reflection:
          "این Reflection تصمیم، نتیجه و Evidence مرحله را با جزئیات کافی توضیح می‌دهد",
      }).success,
    ).toBe(true);
  });

  it("requires a review note for Request Changes but not approval", () => {
    const dossierId = "clz123456789012345678901";
    expect(
      dossierReviewSchema.safeParse({
        dossierId,
        decision: "approve",
        note: "",
      }).success,
    ).toBe(true);
    expect(
      dossierReviewSchema.safeParse({
        dossierId,
        decision: "request_changes",
        note: "خیلی کوتاه",
      }).success,
    ).toBe(false);
    expect(
      dossierReviewSchema.safeParse({
        dossierId,
        decision: "request_changes",
        note: "این بخش باید با Evidence روشن‌تر و منطق تصمیم کامل اصلاح شود",
      }).success,
    ).toBe(true);
  });
});

describe("Credential validation", () => {
  it("normalizes and validates a public Credential code", () => {
    expect(
      credentialCodeSchema.parse(" dbc-ir-2026-a1b2c3d4e5f6 "),
    ).toBe("DBC-IR-2026-A1B2C3D4E5F6");
    expect(credentialCodeSchema.safeParse("DBC-IR-DEMO").success).toBe(false);
  });

  it("requires at least twenty characters for revocation reason", () => {
    const credentialId = "clz123456789012345678901";
    expect(
      credentialRevokeSchema.safeParse({
        credentialId,
        reason: "دلیل کوتاه",
      }).success,
    ).toBe(false);
    expect(
      credentialRevokeSchema.safeParse({
        credentialId,
        reason: "این Credential به دلیل مستند و قابل بررسی باید لغو شود",
      }).success,
    ).toBe(true);
  });
});
