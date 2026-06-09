import { describe, expect, it } from "vitest";
import { applicationSchema } from "../src/lib/validations/application";

const validApplication = {
  fullName: "Ada Participant",
  email: "ada@example.com",
  country: "United States",
  professionalRole: "Clinical Operations Lead",
  domain: "Healthcare operations",
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

  it("requires a valid LinkedIn URL (no longer optional)", () => {
    expect(applicationSchema.safeParse({ ...validApplication, linkedinUrl: "" }).success).toBe(false);
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
