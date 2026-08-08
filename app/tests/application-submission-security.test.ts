import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const tx = {
    application: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    applicationResume: {
      create: vi.fn(),
    },
    pricingTier: {
      findFirst: vi.fn(),
    },
    siteEvent: {
      create: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
    },
  };

  return {
    tx,
    transaction: vi.fn(),
    postCollisionEvent: vi.fn(),
    revalidatePath: vi.fn(),
    safeSendEmail: vi.fn(),
  };
});

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: mocks.transaction,
    siteEvent: { create: mocks.postCollisionEvent },
  },
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/lib/authz", () => ({
  requireAdminUser: vi.fn(),
  superAdminEmail: () => "owner@example.com",
}));
vi.mock("@/lib/utils", () => ({ absoluteUrl: (path: string) => `https://tenxpros.test${path}` }));
vi.mock("@/lib/services/email", () => ({ safeSendEmail: mocks.safeSendEmail }));
vi.mock("@/lib/validations/application", async () =>
  import("../src/lib/validations/application"),
);
vi.mock("@/lib/validations/auth", () => ({ setPasswordSchema: { safeParse: vi.fn() } }));
vi.mock("@/lib/services/status", () => ({ assertApplicationTransition: vi.fn() }));
vi.mock("@/lib/payment-terms", () => ({
  assertPaymentTransition: vi.fn(),
  parseApplicationPaymentOverride: vi.fn(),
  resolvePaymentTerms: vi.fn(),
}));
vi.mock("@/lib/program-data", () => ({
  dossierSections: [],
  pricingTiers: [{ tier: "FOUNDING", isActive: true }],
}));
vi.mock("@/lib/email/templates", () => {
  const template = () => ({ subject: "Subject", text: "Text", html: "<p>HTML</p>" });
  return {
    applicationNotifyAdminEmail: template,
    applicationReceivedEmail: template,
    applicationStatusEmail: template,
    enrollmentWelcomeEmail: template,
    paymentInstructionsEmail: template,
  };
});

import { submitApplication } from "../src/lib/actions/applications";

const EXISTING_MESSAGE =
  "An active application already exists for this email. Please log in or wait for review.";

function validApplicationForm(overrides: Record<string, string> = {}): FormData {
  const values = {
    fullName: "Attacker Controlled Name",
    email: "person@example.com",
    country: "United States",
    professionalRole: "Clinical Operations Lead",
    domain: "Healthcare operations",
    phone: "+1 415 555 0142",
    linkedinUrl: "https://www.linkedin.com/in/example-person",
    aiExperience: "INTERMEDIATE",
    whyTenXPros:
      "I need a structured professional path for adopting AI responsibly in a real evidence-heavy operating environment.",
    realProblemBrief:
      "My team needs to redesign a documentation workflow while protecting sensitive data, human review and accountability.",
    dataSensitivity: "HIGH",
    timeAvailability: "HOURS_8",
    preferredLanguage: "English",
    consentConfidentiality: "true",
    consentTerms: "true",
    ...overrides,
  };
  const formData = new FormData();
  for (const [key, value] of Object.entries(values)) formData.set(key, value);
  return formData;
}

function existingUser(
  role: "APPLICANT" | "PARTICIPANT" | "COACH" | "ADMIN" | "PARTNER",
  links: {
    application?: { id: string } | null;
    participantProfile?: { id: string } | null;
    partner?: { id: string } | null;
  } = {},
) {
  return {
    id: "existing-user",
    role,
    application: links.application ?? null,
    participantProfile: links.participantProfile ?? null,
    partner: links.partner ?? null,
  };
}

const createdApplication = {
  id: "application-1",
  userId: "existing-user",
  fullName: "Attacker Controlled Name",
  email: "person@example.com",
  country: "United States",
  professionalRole: "Clinical Operations Lead",
  domain: "Healthcare operations",
  phone: "+1 415 555 0142",
  linkedinUrl: "https://www.linkedin.com/in/example-person",
  aiExperience: "INTERMEDIATE",
  whyTenXPros: "why",
  realProblemBrief: "problem",
  dataSensitivity: "HIGH",
  timeAvailability: "HOURS_8",
  preferredLanguage: "English",
  consentConfidentiality: true,
  consentTerms: true,
  status: "SUBMITTED",
  adminNotes: null,
  reviewedAt: null,
  reviewedBy: null,
  pricingTierAtApply: "FOUNDING",
  utmSource: null,
  utmMedium: null,
  utmCampaign: null,
  utmTerm: null,
  utmContent: null,
  referrerUrl: null,
  landingPage: null,
  createdAt: new Date("2026-08-07T00:00:00.000Z"),
  updatedAt: new Date("2026-08-07T00:00:00.000Z"),
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.transaction.mockImplementation(
    async (callback: (tx: typeof mocks.tx) => Promise<unknown>) => callback(mocks.tx),
  );
  mocks.tx.application.findFirst.mockResolvedValue(null);
  mocks.tx.user.findUnique.mockResolvedValue(null);
  mocks.tx.user.create.mockResolvedValue({ id: "new-user", role: "APPLICANT" });
  mocks.tx.pricingTier.findFirst.mockResolvedValue({ tier: "FOUNDING" });
  mocks.tx.application.create.mockResolvedValue(createdApplication);
  mocks.tx.siteEvent.create.mockResolvedValue({ id: "event-1" });
  mocks.postCollisionEvent.mockResolvedValue({ id: "event-collision" });
  mocks.safeSendEmail.mockResolvedValue({ ok: true });
});

describe("submitApplication existing-user security", () => {
  it.each(["ADMIN", "PARTNER", "PARTICIPANT", "COACH"] as const)(
    "rejects an existing %s account without mutating or linking it",
    async (role) => {
      mocks.tx.user.findUnique.mockResolvedValue(existingUser(role));

      const result = await submitApplication(validApplicationForm());

      expect(result).toEqual({ ok: false, message: EXISTING_MESSAGE });
      expect(mocks.tx.user.update).not.toHaveBeenCalled();
      expect(mocks.tx.user.upsert).not.toHaveBeenCalled();
      expect(mocks.tx.user.create).not.toHaveBeenCalled();
      expect(mocks.tx.application.create).not.toHaveBeenCalled();
      expect(mocks.tx.siteEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: null,
          eventType: "APPLICATION_SUBMISSION_BLOCKED",
          eventData: expect.objectContaining({ reason: "EXISTING_IDENTITY_OR_APPLICATION" }),
        }),
      });
      expect(mocks.safeSendEmail).not.toHaveBeenCalled();
    },
  );

  it("rejects a bare APPLICANT because the public form cannot prove email ownership", async () => {
    mocks.tx.user.findUnique.mockResolvedValue(existingUser("APPLICANT"));

    const result = await submitApplication(validApplicationForm());

    expect(result).toEqual({ ok: false, message: EXISTING_MESSAGE });
    expect(mocks.tx.user.update).not.toHaveBeenCalled();
    expect(mocks.tx.user.upsert).not.toHaveBeenCalled();
    expect(mocks.tx.user.create).not.toHaveBeenCalled();
    expect(mocks.tx.application.create).not.toHaveBeenCalled();
    expect(mocks.tx.siteEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ userId: null, eventType: "APPLICATION_SUBMISSION_BLOCKED" }),
    });
  });

  it.each([
    ["application", { application: { id: "old-application" } }],
    ["participant profile", { participantProfile: { id: "participant-1" } }],
    ["partner profile", { partner: { id: "partner-1" } }],
  ] as const)("does not attach a new application to an APPLICANT account with an existing %s", async (_label, links) => {
    mocks.tx.user.findUnique.mockResolvedValue(existingUser("APPLICANT", links));

    const result = await submitApplication(validApplicationForm());

    expect(result).toEqual({ ok: false, message: EXISTING_MESSAGE });
    expect(mocks.tx.application.create).not.toHaveBeenCalled();
    expect(mocks.tx.user.update).not.toHaveBeenCalled();
    expect(mocks.tx.user.upsert).not.toHaveBeenCalled();
    expect(mocks.tx.siteEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ userId: null, eventType: "APPLICATION_SUBMISSION_BLOCKED" }),
    });
  });

  it("creates an APPLICANT only when no User exists", async () => {
    const result = await submitApplication(validApplicationForm());

    expect(result).toEqual({ ok: true, id: "application-1" });
    expect(mocks.tx.user.create).toHaveBeenCalledWith({
      data: {
        email: "person@example.com",
        name: "Attacker Controlled Name",
        role: "APPLICANT",
      },
      select: { id: true, role: true },
    });
    expect(mocks.tx.user.update).not.toHaveBeenCalled();
    expect(mocks.tx.user.upsert).not.toHaveBeenCalled();
  });

  it("blocks an active application before touching its linked User", async () => {
    mocks.tx.application.findFirst.mockResolvedValue({ id: "active-application" });

    const result = await submitApplication(validApplicationForm());

    expect(result).toEqual({ ok: false, message: EXISTING_MESSAGE });
    expect(mocks.tx.user.findUnique).not.toHaveBeenCalled();
    expect(mocks.tx.user.create).not.toHaveBeenCalled();
    expect(mocks.tx.application.create).not.toHaveBeenCalled();
    expect(mocks.tx.siteEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ userId: null, eventType: "APPLICATION_SUBMISSION_BLOCKED" }),
    });
  });

  it("turns a concurrent uniqueness collision into the same safe public response", async () => {
    mocks.tx.user.create.mockRejectedValue(Object.assign(new Error("unique constraint"), { code: "P2002" }));

    const result = await submitApplication(validApplicationForm());

    expect(result).toEqual({ ok: false, message: EXISTING_MESSAGE });
    expect(mocks.tx.application.create).not.toHaveBeenCalled();
    expect(mocks.safeSendEmail).not.toHaveBeenCalled();
    expect(mocks.postCollisionEvent).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: null,
        eventType: "APPLICATION_SUBMISSION_BLOCKED",
        eventData: expect.objectContaining({
          reason: "CONCURRENT_IDENTITY_OR_APPLICATION_COLLISION",
        }),
      }),
    });
  });
});
