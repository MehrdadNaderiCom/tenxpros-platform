import { describe, expect, it } from "vitest";
import {
  applicationSchema,
  isPdfMagic,
  resumeFileError,
  resumeRuleError,
  RESUME_MAX_BYTES,
} from "../src/lib/validations/application";

const validApplication = {
  fullName: "Ada Participant",
  email: "ada@example.com",
  country: "United States",
  professionalRole: "Clinical Operations Lead",
  domain: "Healthcare operations",
  phone: "+1 415 555 0142",
  linkedinUrl: "https://www.linkedin.com/in/ada-participant",
  aiExperience: "INTERMEDIATE",
  whyTenXPros:
    "I need a structured professional path for learning how to adopt AI responsibly in a real, evidence-heavy operating environment.",
  realProblemBrief:
    "My team needs to redesign triage and documentation workflows while protecting sensitive data, human review, and clear accountability.",
  dataSensitivity: "HIGH",
  timeAvailability: "HOURS_8",
  preferredLanguage: "English",
  consentConfidentiality: true,
  consentTerms: true,
};

describe("applicationSchema", () => {
  it("accepts a complete application", () => {
    expect(applicationSchema.safeParse(validApplication).success).toBe(true);
  });

  it("requires consent", () => {
    const result = applicationSchema.safeParse({ ...validApplication, consentTerms: false });
    expect(result.success).toBe(false);
  });

  it("requires a valid phone number", () => {
    expect(applicationSchema.safeParse({ ...validApplication, phone: "" }).success).toBe(false);
    expect(applicationSchema.safeParse({ ...validApplication, phone: "12" }).success).toBe(false);
    expect(applicationSchema.safeParse({ ...validApplication, phone: "not-a-phone" }).success).toBe(false);
    expect(applicationSchema.safeParse({ ...validApplication, phone: "+44 7700 900123" }).success).toBe(true);
    expect(applicationSchema.safeParse({ ...validApplication, phone: "(021) 1234-5678" }).success).toBe(true);
    expect(applicationSchema.safeParse({ ...validApplication, phone: "09121234567" }).success).toBe(true);
  });

  it("treats LinkedIn as optional at the schema level (either-or handled separately)", () => {
    expect(applicationSchema.safeParse({ ...validApplication, linkedinUrl: "" }).success).toBe(true);
    expect(applicationSchema.safeParse({ ...validApplication, linkedinUrl: "not-a-url" }).success).toBe(false);
  });

  it("returns helpful field-level validation messages", () => {
    const result = applicationSchema.safeParse({
      ...validApplication,
      fullName: "",
      email: "not-an-email",
      whyTenXPros: "too short",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      expect(errors.fullName?.[0]).toBe("Enter your full name.");
      expect(errors.email?.[0]).toBe("Enter a valid email.");
      expect(errors.whyTenXPros?.[0]).toBe("Write at least 80 characters.");
    }
  });
});

describe("resume rule (LinkedIn OR resume required)", () => {
  it("passes with LinkedIn only, resume only, or both", () => {
    expect(resumeRuleError("https://www.linkedin.com/in/x", false)).toBeNull();
    expect(resumeRuleError("", true)).toBeNull();
    expect(resumeRuleError(undefined, true)).toBeNull();
    expect(resumeRuleError("https://www.linkedin.com/in/x", true)).toBeNull();
  });

  it("fails when neither is provided", () => {
    expect(resumeRuleError("", false)).toMatch(/LinkedIn URL or upload your resume/);
    expect(resumeRuleError(undefined, false)).not.toBeNull();
    expect(resumeRuleError("   ", false)).not.toBeNull();
  });
});

describe("resume file validation", () => {
  it("accepts a PDF within the size limit", () => {
    expect(resumeFileError({ type: "application/pdf", size: 1024 })).toBeNull();
    expect(resumeFileError({ type: "application/pdf", size: RESUME_MAX_BYTES })).toBeNull();
  });

  it("rejects non-PDF, empty, and oversized files", () => {
    expect(resumeFileError({ type: "image/png", size: 1024 })).toMatch(/PDF/);
    expect(resumeFileError({ type: "application/pdf", size: 0 })).toMatch(/empty/);
    expect(resumeFileError({ type: "application/pdf", size: RESUME_MAX_BYTES + 1 })).toMatch(/5 MB/);
  });

  it("checks the %PDF- magic bytes", () => {
    expect(isPdfMagic(new TextEncoder().encode("%PDF-1.7 rest"))).toBe(true);
    expect(isPdfMagic(new TextEncoder().encode("PK zip"))).toBe(false);
    expect(isPdfMagic(new Uint8Array([]))).toBe(false);
  });
});
