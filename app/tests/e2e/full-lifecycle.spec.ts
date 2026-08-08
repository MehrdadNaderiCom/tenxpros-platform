import fs from "node:fs";
import path from "node:path";
import { expect, test, type Browser, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
import { badgeCatalog, modules, pricingTiers } from "../../src/lib/program-data";

process.env.DATABASE_URL ??= "postgresql://tenxpros:tenxpros_dev@localhost:5433/tenxpros";

const prisma = new PrismaClient();
const adminEmail = process.env.E2E_ADMIN_EMAIL ?? "e2e.admin@tenxpros.test";
const adminPassword = process.env.E2E_ADMIN_PASSWORD ?? "E2eAdmin123!";
const participantPassword = "E2eFullLifecycle123!";
const evidenceRoot = path.resolve(process.cwd(), "../docs/reports/full-lifecycle-e2e-sprint-1");
const screenshotsDir = path.join(evidenceRoot, "screenshots");
const resultsPath = path.join(evidenceRoot, "full-lifecycle-results.json");

type LifecycleSummary = {
  applicantEmail: string;
  applicationId: string | null;
  participantId: string | null;
  moduleStatus: string | null;
  dossierSectionStatus: string | null;
  ticketStatus: string | null;
  certificationOutcome: string | null;
  badgeVerificationCode: string | null;
  finalPass: boolean;
  failure?: string;
  screenshots: string[];
};

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  if (!process.env.DATABASE_URL?.includes("localhost") && process.env.E2E_ALLOW_NONLOCAL_DB !== "true") {
    throw new Error("Refusing to run full lifecycle E2E setup against a non-local database.");
  }

  fs.rmSync(screenshotsDir, { recursive: true, force: true });
  fs.mkdirSync(screenshotsDir, { recursive: true });
  fs.mkdirSync(path.dirname(resultsPath), { recursive: true });

  await ensureLaunchCatalog();
});

test.afterAll(async () => {
  await prisma.$disconnect();
});

test("complete TenXPros business lifecycle", async ({ browser }) => {
  test.setTimeout(240_000);

  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const applicantEmail = `e2e.full.lifecycle.${suffix}@tenxpros.test`;
  const applicantName = `E2E Full Lifecycle ${suffix}`;
  const summary: LifecycleSummary = {
    applicantEmail,
    applicationId: null,
    participantId: null,
    moduleStatus: null,
    dossierSectionStatus: null,
    ticketStatus: null,
    certificationOutcome: null,
    badgeVerificationCode: null,
    finalPass: false,
    screenshots: [],
  };

  const publicPage = await browser.newPage();
  const adminContext = await browser.newContext();
  const adminPage = await adminContext.newPage();
  const participantContext = await browser.newContext();
  const participantPage = await participantContext.newPage();

  try {
    await submitPublicApplication(publicPage, applicantName, applicantEmail);
    summary.applicationId = await applicationIdForEmail(applicantEmail);
    await screenshot(publicPage, "01-application-submitted-thank-you-page.png", summary);

    await login(adminPage, adminEmail, adminPassword, "/admin");
    await reviewAcceptAndEnrollApplication(adminPage, applicantName, applicantEmail, summary);
    await screenshot(adminPage, "02-admin-application-detail-enrolled-state.png", summary);

    await setupParticipantPassword(applicantEmail, participantPage);
    await login(participantPage, applicantEmail, participantPassword, "/portal");
    await expect(participantPage.getByRole("heading", { name: /participant dashboard/i })).toBeVisible();
    await screenshot(participantPage, "03-participant-dashboard-after-login.png", summary);

    await completeStarterPack(participantPage, summary.participantId);
    await submitDiagnostic(participantPage, summary.participantId);
    await verifyDiagnosticAsAdmin(adminPage, applicantName);
    await screenshot(adminPage, "04-diagnostic-submitted-state.png", summary);

    await approveParticipantPath(adminPage, summary.participantId);

    const moduleState = await completeModuleFlow(adminPage, participantPage, summary.participantId, summary);
    summary.moduleStatus = moduleState.status;

    const dossierState = await completeDossierFlow(adminPage, participantPage, summary.participantId, summary);
    summary.dossierSectionStatus = dossierState.status;

    const ticketState = await completeTicketFlow(adminPage, participantPage, summary);
    summary.ticketStatus = ticketState.status;

    const certificationState = await completeCertificationFlow(adminPage, participantPage, summary.participantId, summary);
    summary.certificationOutcome = certificationState.outcome;
    summary.badgeVerificationCode = certificationState.verificationCode;

    await verifyPublicBadge(browser, applicantName, certificationState.verificationCode, summary);

    summary.finalPass = true;
    writeSummary(summary);
  } catch (error) {
    summary.failure = error instanceof Error ? error.message : String(error);
    writeSummary(summary);
    throw error;
  } finally {
    await publicPage.close().catch(() => undefined);
    await adminContext.close().catch(() => undefined);
    await participantContext.close().catch(() => undefined);
  }
});

async function submitPublicApplication(page: Page, fullName: string, email: string) {
  await page.goto("/apply?utm_source=e2e-full&utm_medium=playwright&utm_campaign=full-lifecycle");
  await page.locator('input[name="fullName"]').fill(fullName);
  await page.locator('input[name="email"]').fill(email);
  await page.locator('select[name="country"]').selectOption("United States");
  await page.locator('input[name="phone"]').fill("+1 415 555 0100");
  await page.locator('input[name="professionalRole"]').fill("Operations Director");
  await page.locator('input[name="domain"]').fill("Professional services operations");
  await page.locator('input[name="linkedinUrl"]').fill("https://www.linkedin.com/in/e2e-full-lifecycle");
  await page.locator('select[name="aiExperience"]').selectOption("INTERMEDIATE");
  await page.locator('select[name="dataSensitivity"]').selectOption("MODERATE");
  await page.locator('select[name="timeAvailability"]').selectOption("HOURS_8");
  await page.locator('textarea[name="whyTenXPros"]').fill(
    "I want reviewed AI adoption work that turns a real operational problem into a defensible solution dossier.",
  );
  await page.locator('textarea[name="realProblemBrief"]').fill(
    "Our intake workflow creates duplicate review, inconsistent triage, and unclear escalation. I need a responsible AI-supported design with human oversight.",
  );
  await page.locator('input[name="consentConfidentiality"]').check();
  await page.locator('input[name="consentTerms"]').check();

  await Promise.all([
    page.waitForURL(/\/apply\/thank-you\?id=/),
    page.getByRole("button", { name: /submit application/i }).click(),
  ]);

  await expect(page.getByText(/application id/i)).toBeVisible();
  await expect
    .poll(async () => {
      const application = await prisma.application.findFirst({ where: { email }, include: { user: true } });
      return application ? `${application.status}:${application.user.role}` : null;
    })
    .toBe("SUBMITTED:APPLICANT");
}

async function login(page: Page, email: string, password: string, callbackUrl: string) {
  await page.goto(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);

  await Promise.all([
    page.waitForURL(new RegExp(`${callbackUrl.replace("/", "\\/")}$`)),
    page.getByRole("button", { name: /sign in/i }).click(),
  ]);
}

async function gotoAsAdmin(page: Page, pathName: string) {
  await page.goto(pathName);
  if (new URL(page.url()).pathname === "/login") {
    await login(page, adminEmail, adminPassword, pathName);
  }
}

async function reviewAcceptAndEnrollApplication(
  page: Page,
  applicantName: string,
  applicantEmail: string,
  summary: LifecycleSummary,
) {
  await gotoAsAdmin(page, "/admin/applications");
  await expect(page.getByText(applicantEmail)).toBeVisible();
  await page.getByRole("link", { name: applicantName }).click();
  await page.waitForURL(/\/admin\/applications\//);
  await expect(page.getByRole("heading", { name: applicantName })).toBeVisible();

  const acceptForm = page.locator("form").filter({ has: page.getByRole("button", { name: /mark accepted/i }) });
  await acceptForm.locator('textarea[name="adminNotes"]').fill("Accepted by full lifecycle E2E.");
  await acceptForm.getByRole("button", { name: /mark accepted/i }).click();

  await expect.poll(async () => (await prisma.application.findFirst({ where: { email: applicantEmail } }))?.status).toBe("ACCEPTED");
  await expect.poll(async () => (await prisma.paymentRecord.findFirst({ where: { application: { email: applicantEmail } } }))?.status).toBe("PENDING");

  await page.reload();
  await page.getByRole("button", { name: /mark payment received & enroll/i }).click();

  await expect.poll(async () => (await prisma.application.findFirst({ where: { email: applicantEmail } }))?.status).toBe("ENROLLED");
  const participant = await waitForRecord(
    () =>
      prisma.participantProfile.findFirst({
        where: { user: { email: applicantEmail } },
        include: { user: true },
      }),
    "participant profile",
  );
  summary.participantId = participant.id;

  await page.reload();
  await expect(page.getByText("ENROLLED").first()).toBeVisible();
  await expect(page.getByText("PAID").first()).toBeVisible();
}

async function setupParticipantPassword(email: string, page: Page) {
  const token = await waitForRecord(
    () => prisma.verificationToken.findFirst({ where: { identifier: email } }),
    "participant password setup token",
  );

  await page.goto(`/set-password?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token.token)}`);
  await page.locator('input[name="password"]').fill(participantPassword);
  await page.locator('input[name="confirmPassword"]').fill(participantPassword);

  await Promise.all([
    page.waitForURL(/\/login\?setup=complete/),
    page.getByRole("button", { name: /set password/i }).click(),
  ]);
}

async function completeStarterPack(page: Page, participantId: string | null) {
  if (!participantId) throw new Error("Participant ID missing before starter pack.");
  await page.goto("/portal/starter-pack");
  const button = page.getByRole("button", { name: /mark starter pack complete/i });
  if (await button.isEnabled()) await button.click();
  await expect
    .poll(async () => Boolean((await prisma.participantProfile.findUnique({ where: { id: participantId } }))?.starterPackCompletedAt))
    .toBe(true);
}

async function submitDiagnostic(page: Page, participantId: string | null) {
  if (!participantId) throw new Error("Participant ID missing before diagnostic.");
  await page.goto("/portal/diagnostic");
  await page.locator('select[name="riskProfile"]').selectOption("MODERATE");
  await page.locator('select[name="aiLiteracyLevel"]').selectOption("INTERMEDIATE");
  await page.locator('select[name="stakeholderComplexity"]').selectOption("DEPARTMENT");
  await page.locator('select[name="industryRegulatoryWeight"]').selectOption("MODERATE");
  await page.locator('select[name="timeAvailability"]').selectOption("HOURS_8");
  await page.locator('select[name="outputType"]').selectOption("INTERNAL");
  await page.locator('input[name="domainRecognition"]').fill("Professional services intake and routing");
  await page.locator('input[name="solutionPatternHint"]').fill("AI-assisted triage with human review");
  await page.locator('textarea[name="problemContext"]').fill("Requests arrive through email, forms, and direct messages with inconsistent routing.");
  await page.locator('textarea[name="problemClarity"]').fill("The bottleneck is first-pass classification and escalation quality.");
  await page.locator('textarea[name="successCriteria"]').fill("Fewer duplicate reviews, faster response, and clear escalation rules.");
  await page.locator('textarea[name="organizationalContext"]').fill("Small operations team serving multiple internal stakeholders.");
  await page.locator('textarea[name="goals"]').fill("Create a responsible workflow design that can be reviewed and improved.");
  await page.locator('textarea[name="supportNeeds"]').fill("Need feedback on risk controls and evidence quality.");

  await page.getByRole("button", { name: /submit diagnostic/i }).click();
  await expect.poll(async () => (await prisma.diagnosticIntake.findUnique({ where: { participantId } }))?.isComplete).toBe(true);
}

async function verifyDiagnosticAsAdmin(page: Page, applicantName: string) {
  await gotoAsAdmin(page, "/admin/diagnostics");
  await expect(page.getByRole("link", { name: applicantName })).toBeVisible();
  await expect(page.getByText(/complete: yes/i).first()).toBeVisible();
}

async function approveParticipantPath(page: Page, participantId: string | null) {
  if (!participantId) throw new Error("Participant ID missing before path approval.");
  const pathRecord = await waitForRecord(() => prisma.programPath.findUnique({ where: { participantId } }), "program path");
  await gotoAsAdmin(page, `/admin/paths/${pathRecord.id}`);
  await page.locator('textarea[name="customizationNotes"]').fill("E2E approved path focused on intake triage, evidence, and responsible workflow design.");
  await page.getByRole("button", { name: /approve path/i }).click();
  await expect.poll(async () => (await prisma.programPath.findUnique({ where: { id: pathRecord.id } }))?.approvedByAdmin).toBe(true);
}

async function completeModuleFlow(
  adminPage: Page,
  participantPage: Page,
  participantId: string | null,
  summary: LifecycleSummary,
) {
  if (!participantId) throw new Error("Participant ID missing before module flow.");
  const participantModule = await firstParticipantModule(participantId);

  await participantPage.goto(`/portal/modules/${participantModule.id}`);
  const startButton = participantPage.getByRole("button", { name: /start module/i });
  if (await startButton.isVisible()) {
    await startButton.click();
    await expect.poll(async () => (await prisma.participantModule.findUnique({ where: { id: participantModule.id } }))?.status).toBe("IN_PROGRESS");
    await participantPage.reload();
  }

  await participantPage.locator('textarea[name="artifactContent"]').fill(
    "E2E artifact: problem frame, workflow before/after, evidence review, risk guardrails, and next proof step.",
  );
  await participantPage.locator('input[name="artifactUrl"]').fill("https://example.com/e2e-artifact");
  await participantPage.getByRole("button", { name: /submit artifact for review/i }).click();
  await expect.poll(async () => (await prisma.participantModule.findUnique({ where: { id: participantModule.id } }))?.status).toBe("SUBMITTED");
  await participantPage.reload();
  await screenshot(participantPage, "05-module-submitted-state.png", summary);

  await gotoAsAdmin(adminPage, `/admin/participants/${participantId}`);
  const reviewForm = adminPage.locator("form").filter({ hasText: /module 1:/i }).first();
  await reviewForm.locator('select[name="status"]').selectOption("PASSED");
  await reviewForm.locator('textarea[name="coachFeedback"]').fill("Passed by full lifecycle E2E. Artifact is concrete enough for launch verification.");
  await reviewForm.getByRole("button", { name: /save review/i }).click();

  await expect.poll(async () => (await prisma.participantModule.findUnique({ where: { id: participantModule.id } }))?.status).toBe("PASSED");
  await expect
    .poll(async () => prisma.participantBadge.count({ where: { user: { participantProfile: { id: participantId } }, contextType: "MODULE" } }))
    .toBeGreaterThan(0);

  await participantPage.goto("/portal/modules");
  await expect(participantPage.getByText("PASSED").first()).toBeVisible();
  await screenshot(participantPage, "06-module-passed-state.png", summary);

  return prisma.participantModule.findUniqueOrThrow({ where: { id: participantModule.id } });
}

async function completeDossierFlow(
  adminPage: Page,
  participantPage: Page,
  participantId: string | null,
  summary: LifecycleSummary,
) {
  if (!participantId) throw new Error("Participant ID missing before dossier flow.");
  const dossier = await waitForRecord(
    () => prisma.dossier.findUnique({ where: { participantId }, include: { sections: { orderBy: { order: "asc" } } } }),
    "dossier",
  );
  const section = dossier.sections[0];
  if (!section) throw new Error("Dossier section missing.");

  await participantPage.goto(`/portal/dossier/${section.id}`);
  const dossierContent =
    "E2E dossier section: professional context, operational constraint, affected stakeholders, evidence needed, and responsible AI boundaries.";
  await participantPage.locator('textarea[name="content"]').fill(dossierContent);
  await participantPage.locator('textarea[name="content"]').blur();
  await expect.poll(async () => (await prisma.dossierSection.findUnique({ where: { id: section.id } }))?.content).toBe(dossierContent);
  await expect(participantPage.getByRole("button", { name: /submit for review/i })).toBeEnabled();
  await participantPage.getByRole("button", { name: /submit for review/i }).click();
  await expect(participantPage.getByText("This section is submitted for review.")).toBeVisible();
  await expect(participantPage.locator('textarea[name="content"]')).toHaveAttribute("aria-readonly", "true");
  await expect.poll(async () => (await prisma.dossierSection.findUnique({ where: { id: section.id } }))?.status).toBe("SUBMITTED");
  await screenshot(participantPage, "07-dossier-submitted-locked-state.png", summary);

  await gotoAsAdmin(adminPage, `/admin/dossiers/${dossier.id}`);
  await expect(adminPage.getByRole("heading", { name: dossier.title ?? /dossier/i })).toBeVisible();
  const reviewForm = adminPage.locator("form").filter({ has: adminPage.locator(`input[name="sectionId"][value="${section.id}"]`) });
  await expect(reviewForm.locator('select[name="status"]')).toBeVisible();
  await reviewForm.locator('select[name="status"]').selectOption("APPROVED");
  await reviewForm.locator('textarea[name="content"]').fill("Approved by full lifecycle E2E. Section-level feedback is visible to the participant.");
  await reviewForm.getByRole("button", { name: /save feedback/i }).click();

  await expect.poll(async () => (await prisma.dossierSection.findUnique({ where: { id: section.id } }))?.status).toBe("APPROVED");
  await expect.poll(async () => prisma.feedback.count({ where: { dossierSectionId: section.id } })).toBeGreaterThan(0);
  await adminPage.reload();
  await screenshot(adminPage, "08-admin-dossier-review-state.png", summary);

  await participantPage.reload();
  await expect(participantPage.getByText(/approved by full lifecycle e2e/i)).toBeVisible();

  return prisma.dossierSection.findUniqueOrThrow({ where: { id: section.id } });
}

async function completeTicketFlow(adminPage: Page, participantPage: Page, summary: LifecycleSummary) {
  const subject = `E2E support ticket ${Date.now()}`;
  await participantPage.goto("/portal/tickets/new");
  await participantPage.locator('input[name="subject"]').fill(subject);
  await participantPage.locator('select[name="category"]').selectOption("DOSSIER_HELP");
  await participantPage.locator('textarea[name="body"]').fill("Participant E2E message: please review my dossier evidence sequence.");
  await participantPage.getByRole("button", { name: /create ticket/i }).click();

  const createdTicket = await waitForRecord(
    () => prisma.ticket.findFirst({ where: { subject }, include: { messages: true } }),
    "created support ticket",
  );
  const ticketId = createdTicket.id;

  await participantPage.goto(`/portal/tickets/${ticketId}`);
  await expect(participantPage.getByRole("heading", { name: subject })).toBeVisible();
  await gotoAsAdmin(adminPage, `/admin/tickets/${ticketId}`);
  await expect(adminPage.locator('select[name="status"]')).toBeVisible();
  await adminPage.locator('select[name="status"]').selectOption("RESOLVED");
  await adminPage.locator('textarea[name="body"]').fill("Admin E2E response: the thread is resolved with a concrete next step.");
  await adminPage.getByRole("button", { name: /send response/i }).click();

  await expect.poll(async () => (await prisma.ticket.findUnique({ where: { id: ticketId } }))?.status).toBe("RESOLVED");
  await expect.poll(async () => prisma.ticketMessage.count({ where: { ticketId } })).toBe(2);

  await participantPage.goto(`/portal/tickets/${ticketId}`);
  await expect(participantPage.getByText(/participant e2e message/i)).toBeVisible();
  await expect(participantPage.getByText(/admin e2e response/i)).toBeVisible();
  await expect(participantPage.getByText("RESOLVED", { exact: true }).first()).toBeVisible();
  await screenshot(participantPage, "09-ticket-resolved-state.png", summary);

  return prisma.ticket.findUniqueOrThrow({ where: { id: ticketId } });
}

async function completeCertificationFlow(
  adminPage: Page,
  participantPage: Page,
  participantId: string | null,
  summary: LifecycleSummary,
) {
  if (!participantId) throw new Error("Participant ID missing before certification flow.");
  await gotoAsAdmin(adminPage, `/admin/certifications/${participantId}`);
  await expect(adminPage.locator('select[name="outcome"]')).toBeVisible();
  await adminPage.locator('select[name="outcome"]').selectOption("CERTIFIED");
  await adminPage.locator('textarea[name="reviewerNotes"]').fill("Certified by full lifecycle E2E after reviewed module, dossier, and support flow evidence.");
  await adminPage.getByRole("button", { name: /save certification decision/i }).click();

  const certification = await waitForRecord(
    () => prisma.certificationReview.findUnique({ where: { participantId } }),
    "certification review",
  );
  await expect.poll(async () => (await prisma.certificationReview.findUnique({ where: { participantId } }))?.outcome).toBe("CERTIFIED");
  await expect.poll(async () => Boolean((await prisma.certificationReview.findUnique({ where: { participantId } }))?.certificateUrl)).toBe(true);

  const capstoneBadge = await waitForRecord(
    () =>
      prisma.participantBadge.findFirst({
        where: { user: { participantProfile: { id: participantId } }, badge: { slug: "capstone-certified-tenxpro-seal" } },
        include: { badge: true, user: true },
      }),
    "capstone badge",
  );

  await participantPage.goto("/portal/certification");
  await expect(participantPage.getByText("CERTIFIED").first()).toBeVisible();
  await expect(participantPage.getByText(/certified by full lifecycle e2e/i)).toBeVisible();
  await expect(participantPage.getByText(capstoneBadge.verificationCode)).toBeVisible();
  await screenshot(participantPage, "10-certification-status-page.png", summary);

  return { outcome: certification.outcome, verificationCode: capstoneBadge.verificationCode };
}

async function verifyPublicBadge(browser: Browser, applicantName: string, verificationCode: string, summary: LifecycleSummary) {
  const verifyPage = await browser.newPage();
  try {
    await verifyPage.goto(`/verify/${verificationCode}`);
    await expect(verifyPage.getByRole("heading", { name: /certified tenxpro capstone seal/i })).toBeVisible();
    await expect(verifyPage.getByText(applicantName).first()).toBeVisible();
    await expect(verifyPage.getByText(verificationCode)).toBeVisible();
    await screenshot(verifyPage, "11-public-badge-verification-page.png", summary);
  } finally {
    await verifyPage.close().catch(() => undefined);
  }
}

async function firstParticipantModule(participantId: string) {
  return waitForRecord(
    () =>
      prisma.participantModule.findFirst({
        where: { participantId, module: { number: 1 } },
        include: { module: true },
      }),
    "participant module 1",
  );
}

async function applicationIdForEmail(email: string) {
  const application = await waitForRecord(() => prisma.application.findFirst({ where: { email } }), "submitted application");
  return application.id;
}

async function waitForRecord<T>(reader: () => Promise<T | null>, label: string, timeoutMs = 15_000): Promise<T> {
  const started = Date.now();
  let lastValue: T | null = null;
  while (Date.now() - started < timeoutMs) {
    lastValue = await reader();
    if (lastValue) return lastValue;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Timed out waiting for ${label}.${lastValue ? "" : ""}`);
}

async function screenshot(page: Page, filename: string, summary: LifecycleSummary) {
  const filePath = path.join(screenshotsDir, filename);
  await page.screenshot({ path: filePath, fullPage: true });
  summary.screenshots.push(`docs/reports/full-lifecycle-e2e-sprint-1/screenshots/${filename}`);
}

function writeSummary(summary: LifecycleSummary) {
  fs.mkdirSync(path.dirname(resultsPath), { recursive: true });
  fs.writeFileSync(resultsPath, `${JSON.stringify(summary, null, 2)}\n`);
}

async function ensureLaunchCatalog() {
  const passwordHash = await hash(adminPassword, 12);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { name: "TenXPros E2E Admin", role: "ADMIN", passwordHash },
    create: { email: adminEmail, name: "TenXPros E2E Admin", role: "ADMIN", passwordHash },
  });

  for (const tier of pricingTiers) {
    await prisma.pricingTier.upsert({
      where: { name: tier.name },
      update: {
        tier: tier.tier,
        price: tier.price,
        membersLimit: tier.membersLimit,
        isActive: tier.isActive,
        benefits: tier.benefits,
      },
      create: {
        name: tier.name,
        tier: tier.tier,
        price: tier.price,
        membersLimit: tier.membersLimit,
        isActive: tier.isActive,
        benefits: tier.benefits,
        openedAt: tier.isActive ? new Date() : null,
      },
    });
  }

  for (const module of modules) {
    await prisma.module.upsert({
      where: { number_version: { number: module.number, version: 1 } },
      update: {
        isActive: true,
        phase: module.phase,
        title: module.title,
        coreQuestion: module.coreQuestion,
        description: module.description,
        badgeName: module.badgeName,
        estimatedHours: module.estimatedHours,
      },
      create: {
        number: module.number,
        version: 1,
        phase: module.phase,
        title: module.title,
        coreQuestion: module.coreQuestion,
        description: module.description,
        learningObjectives: [`Understand ${module.title}`, "Apply the method to a real professional problem"],
        contentMaterials: [{ type: "reading", title: module.title, minutes: 45 }],
        exercises: [{ title: "Dossier contribution", required: true }],
        artifactTemplate: "Summarize the decision, evidence, workflow, and risks for this module.",
        passCriteria: "Submission is concrete, professionally relevant, and evidence-aware.",
        badgeName: module.badgeName,
        estimatedHours: module.estimatedHours,
      },
    });
  }

  for (const badge of badgeCatalog) {
    await prisma.badge.upsert({
      where: { slug: badge.slug },
      update: badge,
      create: badge,
    });
  }

  const settings = [
    ["current_active_tier", "FOUNDING", "PRICING", "Current active charter tier", true],
    ["application_paused", "false", "FEATURE_FLAGS", "Pause public applications", true],
    ["directory_enabled", "false", "FEATURE_FLAGS", "Enable public directory", true],
    ["radar_enabled", "false", "FEATURE_FLAGS", "Enable Radar subscription", true],
    ["support_ticket_monthly_limit", "4", "GENERAL", "Monthly fair-use ticket limit", false],
  ] as const;

  for (const [key, value, category, label, isPublic] of settings) {
    await prisma.adminSetting.upsert({
      where: { key },
      update: { value, category, label, isPublic },
      create: { key, value, category, label, isPublic },
    });
  }
}
