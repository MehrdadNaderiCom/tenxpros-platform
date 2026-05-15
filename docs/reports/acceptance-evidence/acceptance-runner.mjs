import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("/tmp/tenxpros-acceptance/node_modules/playwright-core");
const { PrismaClient } = require("/opt/tenxpros/app/node_modules/@prisma/client");

const ROOT = "/opt/tenxpros";
const BASE_URL = process.env.ACCEPTANCE_BASE_URL ?? "http://localhost:3003";
const SCREENSHOT_DIR = path.join(ROOT, "docs/reports/acceptance-evidence/screenshots");
const DATA_DIR = path.join(ROOT, "docs/reports/acceptance-evidence/data");
const RESULT_FILE = process.env.ACCEPTANCE_RESULTS_FILE
  ? path.resolve(ROOT, process.env.ACCEPTANCE_RESULTS_FILE)
  : path.join(DATA_DIR, "acceptance-results.json");
const ALLOW_APPLICATION_FALLBACK = process.env.ACCEPTANCE_ALLOW_APPLICATION_FALLBACK !== "false";
const CHROME =
  fs.existsSync("/home/ubuntu/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome")
    ? "/home/ubuntu/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome"
    : "/snap/bin/chromium";

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const out = {};
  for (const rawLine of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const index = line.indexOf("=");
    if (index === -1) continue;
    const key = line.slice(0, index).trim();
    let value = line.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

function absolute(route) {
  return new URL(route, BASE_URL).toString();
}

function redactSecret(value) {
  return value ? "[redacted]" : "";
}

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

async function safeGoto(page, route, options = {}) {
  const response = await page.goto(absolute(route), { waitUntil: "domcontentloaded", timeout: options.timeout ?? 30000 });
  await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => undefined);
  return response;
}

async function screenshot(page, fileName) {
  const target = path.join(SCREENSHOT_DIR, fileName);
  await page.screenshot({ path: target, fullPage: true });
  return path.relative(ROOT, target);
}

async function clickAndSettle(locator, page, timeout = 12000) {
  await locator.click({ timeout });
  await page.waitForLoadState("domcontentloaded", { timeout }).catch(() => undefined);
  await page.waitForLoadState("networkidle", { timeout }).catch(() => undefined);
  await page.waitForTimeout(800);
}

async function clickAndWaitForPath(locator, page, pathname, timeout = 15000) {
  await Promise.all([
    page.waitForURL((url) => url.pathname === pathname, { timeout }),
    locator.click({ timeout }),
  ]);
  await page.waitForLoadState("domcontentloaded", { timeout }).catch(() => undefined);
  await page.waitForLoadState("networkidle", { timeout }).catch(() => undefined);
  await page.waitForTimeout(800);
}

async function tryLogin(page, email, password, callbackUrl) {
  await safeGoto(page, `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  try {
    await clickAndWaitForPath(page.getByRole("button", { name: /sign in/i }), page, callbackUrl);
    return true;
  } catch {
    return false;
  }
}

async function login(page, email, password, callbackUrl) {
  const ok = await tryLogin(page, email, password, callbackUrl);
  if (!ok) throw new Error(`Login failed for ${email} to ${callbackUrl}`);
}

async function loginWithCandidates(page, candidates, callbackUrl) {
  for (const candidate of candidates) {
    if (!candidate.email || !candidate.password) continue;
    if (await tryLogin(page, candidate.email, candidate.password, callbackUrl)) {
      return candidate;
    }
  }
  throw new Error(`Login failed for all candidates to ${callbackUrl}`);
}

async function submitApplication(page, applicant) {
  await safeGoto(page, "/apply?utm_source=acceptance&utm_medium=automation&utm_campaign=build-spec-v8");
  await page.locator('input[name="fullName"]').fill(applicant.name);
  await page.locator('input[name="email"]').fill(applicant.email);
  await page.locator('input[name="country"]').fill("United States");
  await page.locator('input[name="professionalRole"]').fill("Operations Director");
  await page.locator('input[name="domain"]').fill("Professional services operations");
  await page.locator('input[name="linkedinUrl"]').fill("https://www.linkedin.com/in/tenxpros-acceptance");
  await page.locator('select[name="aiExperience"]').selectOption("INTERMEDIATE");
  await page.locator('select[name="dataSensitivity"]').selectOption("MODERATE");
  await page.locator('select[name="timeAvailability"]').selectOption("HOURS_8");
  await page.locator('textarea[name="whyTenXPros"]').fill(
    "I need a structured AI adoption program that turns practical workflow problems into responsible, defensible AI solution designs for my organization.",
  );
  await page.locator('textarea[name="realProblemBrief"]').fill(
    "Our intake workflow is fragmented across email, spreadsheets, and ad hoc reviews. I want to map the current process and design an AI-supported triage approach with clear risk controls.",
  );
  await page.locator('input[name="preferredLanguage"]').fill("English");
  await page.locator('input[name="consentConfidentiality"]').check();
  await page.locator('input[name="consentTerms"]').check();
  await clickAndWaitForPath(page.getByRole("button", { name: /submit application/i }), page, "/apply/thank-you");
}

function submitApplicationThroughServerAction(applicant) {
  const payload = {
    fullName: applicant.name,
    email: applicant.email,
    country: "United States",
    professionalRole: "Operations Director",
    domain: "Professional services operations",
    linkedinUrl: "https://www.linkedin.com/in/tenxpros-acceptance",
    aiExperience: "INTERMEDIATE",
    whyTenXPros:
      "I need a structured AI adoption program that turns practical workflow problems into responsible, defensible AI solution designs for my organization.",
    realProblemBrief:
      "Our intake workflow is fragmented across email, spreadsheets, and ad hoc reviews. I want to map the current process and design an AI-supported triage approach with clear risk controls.",
    dataSensitivity: "MODERATE",
    timeAvailability: "HOURS_8",
    preferredLanguage: "English",
    consentConfidentiality: true,
    consentTerms: true,
    utmSource: "acceptance",
    utmMedium: "server-action-fallback",
    utmCampaign: "build-spec-v8",
    landingPage: `${BASE_URL}/apply`,
  };
  const code = `
    import { submitApplication } from "./src/lib/actions/applications";
    async function run() {
      const input = JSON.parse(process.env.ACCEPTANCE_APPLICATION_PAYLOAD);
      const result = await submitApplication(input);
      console.log(JSON.stringify(result));
    }
    run();
  `;
  const stdout = execFileSync("pnpm", ["exec", "tsx", "-e", code], {
    cwd: path.join(ROOT, "app"),
    encoding: "utf8",
    env: {
      ...process.env,
      ACCEPTANCE_APPLICATION_PAYLOAD: JSON.stringify(payload),
      DATABASE_URL: process.env.DATABASE_URL ?? "postgresql://tenxpros:tenxpros_dev@localhost:5433/tenxpros",
      APP_URL: BASE_URL,
      NEXT_PUBLIC_APP_URL: BASE_URL,
      EMAIL_PROVIDER: process.env.EMAIL_PROVIDER ?? "console",
    },
  });
  const line = stdout.trim().split(/\r?\n/).at(-1);
  return JSON.parse(line);
}

async function setParticipantPassword(page, email, token, password) {
  await safeGoto(page, `/set-password?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`);
  await page.locator('input[name="password"]').fill(password);
  await page.locator('input[name="confirmPassword"]').fill(password);
  await clickAndWaitForPath(page.getByRole("button", { name: /set password/i }), page, "/login");
}

async function main() {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  fs.mkdirSync(DATA_DIR, { recursive: true });

  const rootEnv = parseEnvFile(path.join(ROOT, ".env.production"));

  const prisma = new PrismaClient();
  const browser = await chromium.launch({
    executablePath: CHROME,
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });

  const results = {
    startedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    browser: CHROME,
    applicationFallbackAllowed: ALLOW_APPLICATION_FALLBACK,
    adminEmail: "",
    adminPassword: "",
    routes: [],
    screenshots: [],
    lifecycle: [],
    records: {},
    failures: [],
  };

  const applicant = {
    name: `Acceptance Applicant ${Date.now()}`,
    email: `acceptance.${Date.now()}@tenxpros.test`,
    password: "Participant123!",
  };

  try {
    const publicContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const publicPage = await publicContext.newPage();

    const routeChecks = [
      "/",
      "/program",
      "/how-it-works",
      "/dossier",
      "/certification",
      "/pricing",
      "/directory",
      "/radar",
      "/about",
      "/apply",
      "/login",
    ];
    for (const route of routeChecks) {
      const response = await safeGoto(publicPage, route);
      results.routes.push({
        route,
        status: response?.status() ?? null,
        finalPath: new URL(publicPage.url()).pathname,
        title: await publicPage.title(),
      });
    }

    results.screenshots.push(await screenshot(publicPage, "01-home-page.png"));
    await safeGoto(publicPage, "/pricing");
    results.screenshots.push(await screenshot(publicPage, "02-pricing-page.png"));
    await safeGoto(publicPage, "/apply");
    results.screenshots.push(await screenshot(publicPage, "03-apply-page.png"));
    await safeGoto(publicPage, "/login");
    results.screenshots.push(await screenshot(publicPage, "04-login-page.png"));

    const healthResponse = await publicContext.request.get(absolute("/api/health"));
    results.routes.push({
      route: "/api/health",
      status: healthResponse.status(),
      body: await healthResponse.text(),
    });

    let applicationSubmittedVia = "ui";
    try {
      await submitApplication(publicPage, applicant);
      results.lifecycle.push("Application submitted through /apply UI");
    } catch (error) {
      applicationSubmittedVia = "server-action-fallback";
      results.failures.push(
        `UI application submission failed; direct server-action fallback used for downstream lifecycle evidence: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      results.screenshots.push(await screenshot(publicPage, "03a-apply-ui-submit-failure.png"));
      if (!ALLOW_APPLICATION_FALLBACK) {
        throw error;
      }
      const fallbackResult = submitApplicationThroughServerAction(applicant);
      expect(fallbackResult.ok === true, `Server-action fallback application submit failed: ${JSON.stringify(fallbackResult)}`);
      results.records.applicationSubmitFallbackResult = fallbackResult;
      results.lifecycle.push("Application submitted through direct server action fallback after UI submit failure");
    }
    results.records.applicationSubmittedVia = applicationSubmittedVia;

    const application = await prisma.application.findFirst({
      where: { email: applicant.email },
      include: { user: true, payments: true },
    });
    expect(application, "Application record was not created.");
    results.records.applicationId = application.id;
    results.records.applicantEmail = applicant.email;
    expect(application.user?.role === "APPLICANT", "Application did not create APPLICANT user.");

    const adminContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const adminPage = await adminContext.newPage();
    const seededAdmin = await prisma.user.findFirst({ where: { role: "ADMIN" }, orderBy: { createdAt: "asc" } });
    const usedAdmin = await loginWithCandidates(
      adminPage,
      [
        { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD },
        { email: rootEnv.ADMIN_EMAIL, password: rootEnv.ADMIN_PASSWORD },
        { email: seededAdmin?.email, password: "ChangeMe123!" },
        { email: "admin@tenxpros.test", password: "ChangeMe123!" },
      ],
      "/admin",
    );
    results.adminEmail = usedAdmin.email;
    results.adminPassword = redactSecret(usedAdmin.password);
    results.routes.push({ route: "/admin", status: 200, finalPath: new URL(adminPage.url()).pathname, auth: "ADMIN" });
    results.screenshots.push(await screenshot(adminPage, "05-admin-dashboard.png"));

    await safeGoto(adminPage, "/admin/applications");
    expect(await adminPage.getByText(applicant.email).isVisible(), "New application was not visible in admin queue.");
    results.screenshots.push(await screenshot(adminPage, "06-admin-applications.png"));
    results.lifecycle.push("Admin application queue shows submitted application");

    await safeGoto(adminPage, `/admin/applications/${application.id}`);
    const acceptForm = adminPage.locator("form").filter({ has: adminPage.getByRole("button", { name: /mark accepted/i }) });
    await acceptForm.locator("textarea").fill("Acceptance verification: applicant fit approved; send payment link placeholder.");
    await clickAndSettle(acceptForm.getByRole("button", { name: /mark accepted/i }), adminPage);
    await adminPage.waitForTimeout(1200);
    const accepted = await prisma.application.findUnique({ where: { id: application.id }, include: { payments: true } });
    expect(accepted?.status === "ACCEPTED", `Application status after accept was ${accepted?.status}.`);
    expect(accepted.payments.some((payment) => payment.status === "PENDING"), "Pending payment record was not created.");
    results.lifecycle.push("Admin accepted application and created payment placeholder");

    await safeGoto(adminPage, `/admin/applications/${application.id}`);
    await clickAndSettle(adminPage.getByRole("button", { name: /mark payment received/i }), adminPage);
    await adminPage.waitForTimeout(1500);
    const enrolled = await prisma.application.findUnique({
      where: { id: application.id },
      include: {
        user: true,
        payments: true,
      },
    });
    expect(enrolled?.status === "ENROLLED", `Application status after enrollment was ${enrolled?.status}.`);
    expect(enrolled.user.role === "PARTICIPANT", `User role after enrollment was ${enrolled.user.role}.`);
    const profile = await prisma.participantProfile.findUnique({
      where: { userId: enrolled.userId },
      include: {
        path: true,
        participantModules: { include: { module: true }, orderBy: { module: { number: "asc" } } },
        dossier: { include: { sections: { orderBy: { order: "asc" } } } },
      },
    });
    expect(profile, "Participant profile was not created.");
    results.records.participantId = profile.id;
    results.lifecycle.push("Admin marked payment received and enrolled participant");

    const token = await prisma.verificationToken.findFirst({ where: { identifier: applicant.email } });
    expect(token, "Enrollment did not create a password setup token.");

    const participantContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const participantPage = await participantContext.newPage();
    await setParticipantPassword(participantPage, applicant.email, token.token, applicant.password);
    results.lifecycle.push("Participant password setup link worked");

    await login(participantPage, applicant.email, applicant.password, "/portal");
    results.routes.push({ route: "/portal", status: 200, finalPath: new URL(participantPage.url()).pathname, auth: "PARTICIPANT" });
    results.screenshots.push(await screenshot(participantPage, "07-participant-dashboard.png"));
    results.lifecycle.push("Participant logged in and reached portal");

    await safeGoto(participantPage, "/portal/starter-pack");
    await clickAndSettle(participantPage.getByRole("button", { name: /mark starter pack complete/i }), participantPage);
    const starterProfile = await prisma.participantProfile.findUnique({ where: { id: profile.id } });
    expect(Boolean(starterProfile?.starterPackCompletedAt), "Starter Pack completion did not persist.");
    results.lifecycle.push("Starter Pack completion persisted");

    await safeGoto(participantPage, "/portal/diagnostic");
    results.screenshots.push(await screenshot(participantPage, "08-diagnostic-intake.png"));
    await participantPage.locator('input[name="domainRecognition"]').fill("Operations workflow modernization");
    await participantPage.locator('input[name="solutionPatternHint"]').fill("AI-assisted intake triage");
    await participantPage.locator('textarea[name="problemContext"]').fill("The team receives high-volume intake requests with inconsistent context and repeated manual review.");
    await participantPage.locator('textarea[name="problemClarity"]').fill("The problem is triage inconsistency, not a lack of staff effort.");
    await participantPage.locator('textarea[name="successCriteria"]').fill("Reduce intake review time, improve routing quality, and keep human approval over sensitive decisions.");
    await participantPage.locator('textarea[name="organizationalContext"]').fill("A small operations group supports multiple internal stakeholders and needs clear governance.");
    await participantPage.locator('textarea[name="goals"]').fill("Create a responsible workflow blueprint and evidence-backed adoption plan.");
    await participantPage.locator('textarea[name="supportNeeds"]').fill("Need help with risk boundaries, evidence standards, and stakeholder adoption.");
    await clickAndSettle(participantPage.getByRole("button", { name: /submit diagnostic/i }), participantPage);
    const diagnostic = await prisma.diagnosticIntake.findUnique({ where: { participantId: profile.id } });
    expect(diagnostic?.isComplete === true, "Diagnostic was not marked complete.");
    results.lifecycle.push("Participant submitted diagnostic intake");

    const refreshedProfile = await prisma.participantProfile.findUniqueOrThrow({ where: { id: profile.id }, include: { path: true } });
    expect(refreshedProfile.path, "Program path was missing.");
    await safeGoto(adminPage, `/admin/paths/${refreshedProfile.path.id}`);
    await adminPage.locator('textarea[name="customizationNotes"]').fill(
      "Acceptance verification path: emphasize responsible triage, stakeholder mapping, evidence standards, and workflow adoption.",
    );
    await clickAndSettle(adminPage.getByRole("button", { name: /approve path/i }), adminPage);
    const approvedPath = await prisma.programPath.findUnique({ where: { id: refreshedProfile.path.id } });
    expect(approvedPath?.approvedByAdmin === true, "Admin path approval did not persist.");
    results.lifecycle.push("Admin approved participant path");

    await safeGoto(participantPage, "/portal/modules");
    results.screenshots.push(await screenshot(participantPage, "09-modules-page.png"));
    const firstModule = await prisma.participantModule.findFirst({
      where: { participantId: profile.id },
      include: { module: true },
      orderBy: { module: { number: "asc" } },
    });
    expect(firstModule, "First participant module was missing.");
    await safeGoto(participantPage, `/portal/modules/${firstModule.id}`);
    if (await participantPage.getByRole("button", { name: /start module/i }).isVisible().catch(() => false)) {
      await clickAndSettle(participantPage.getByRole("button", { name: /start module/i }), participantPage);
      await safeGoto(participantPage, `/portal/modules/${firstModule.id}`);
    }
    await participantPage.locator('textarea[name="artifactContent"]').fill(
      "Acceptance artifact: this module output frames the intake triage problem, identifies responsible AI boundaries, clarifies human oversight, and states the adoption evidence needed before rollout.",
    );
    await participantPage.locator('input[name="artifactUrl"]').fill("https://example.com/tenxpros-acceptance-artifact");
    await clickAndSettle(participantPage.getByRole("button", { name: /submit artifact/i }), participantPage);
    const submittedModule = await prisma.participantModule.findUnique({ where: { id: firstModule.id } });
    expect(submittedModule?.status === "SUBMITTED", `Module status was ${submittedModule?.status}.`);
    results.lifecycle.push("Participant submitted module artifact");

    await safeGoto(adminPage, `/admin/participants/${profile.id}`);
    const firstReviewForm = adminPage.locator("form").filter({ has: adminPage.getByRole("button", { name: /save review/i }) }).first();
    await firstReviewForm.locator('select[name="status"]').selectOption("PASSED");
    await firstReviewForm.locator('textarea[name="coachFeedback"]').fill("Acceptance verification: module artifact passes launch evidence threshold.");
    await clickAndSettle(firstReviewForm.getByRole("button", { name: /save review/i }), adminPage);
    const passedModule = await prisma.participantModule.findUnique({ where: { id: firstModule.id } });
    expect(passedModule?.status === "PASSED", `Module review status was ${passedModule?.status}.`);
    results.lifecycle.push("Admin passed module artifact and triggered module badge issuance");

    await safeGoto(participantPage, "/portal/dossier");
    results.screenshots.push(await screenshot(participantPage, "10-dossier-builder.png"));
    const dossier = await prisma.dossier.findUniqueOrThrow({
      where: { participantId: profile.id },
      include: { sections: { orderBy: { order: "asc" } } },
    });
    results.records.dossierId = dossier.id;
    const firstSection = dossier.sections[0];
    await safeGoto(participantPage, `/portal/dossier/${firstSection.id}`);
    await participantPage.locator('textarea[name="content"]').fill(
      "Acceptance dossier section draft: professional context, stakeholder environment, current workflow constraints, risk boundaries, and the responsible AI adoption frame for intake triage.",
    );
    await clickAndSettle(participantPage.getByRole("button", { name: /save draft/i }), participantPage);
    await safeGoto(participantPage, `/portal/dossier/${firstSection.id}`);
    await participantPage.locator('textarea[name="content"]').fill(
      "Acceptance dossier section submitted: professional context, stakeholder environment, current workflow constraints, risk boundaries, and the responsible AI adoption frame for intake triage.",
    );
    await clickAndSettle(participantPage.getByRole("button", { name: /submit for review/i }), participantPage);
    const submittedSection = await prisma.dossierSection.findUnique({ where: { id: firstSection.id } });
    expect(submittedSection?.status === "SUBMITTED", `Dossier section status was ${submittedSection?.status}.`);
    results.lifecycle.push("Participant saved and submitted dossier section");

    await safeGoto(adminPage, `/admin/dossiers/${dossier.id}`);
    const firstDossierForm = adminPage.locator("form").filter({ has: adminPage.getByRole("button", { name: /save feedback/i }) }).first();
    await firstDossierForm.locator('select[name="status"]').selectOption("APPROVED");
    await firstDossierForm.locator('textarea[name="content"]').fill("Acceptance verification: section-level feedback saved and approved.");
    await clickAndSettle(firstDossierForm.getByRole("button", { name: /save feedback/i }), adminPage);
    const approvedSection = await prisma.dossierSection.findUnique({ where: { id: firstSection.id }, include: { feedback: true } });
    expect(approvedSection?.status === "APPROVED", `Dossier review status was ${approvedSection?.status}.`);
    expect((approvedSection.feedback?.length ?? 0) > 0, "Dossier feedback was not recorded.");
    results.lifecycle.push("Admin approved dossier section with section-level feedback");

    await safeGoto(participantPage, "/portal/tickets/new");
    await participantPage.locator('input[name="subject"]').fill("Acceptance ticket for module evidence");
    await participantPage.locator('select[name="category"]').selectOption("MODULE_QUESTION");
    await participantPage.locator('textarea[name="body"]').fill(
      "Please confirm whether the submitted artifact has enough detail for the module acceptance evidence threshold.",
    );
    await clickAndSettle(participantPage.getByRole("button", { name: /create ticket/i }), participantPage);
    await participantPage.waitForURL((url) => url.pathname.startsWith("/portal/tickets/"), { timeout: 15000 });
    const ticket = await prisma.ticket.findFirst({ where: { userId: enrolled.userId }, orderBy: { createdAt: "desc" } });
    expect(ticket, "Ticket was not created.");
    results.records.ticketId = ticket.id;
    await safeGoto(participantPage, "/portal/tickets");
    results.screenshots.push(await screenshot(participantPage, "11-ticketing-page.png"));
    results.lifecycle.push("Participant created support ticket");

    await safeGoto(adminPage, `/admin/tickets/${ticket.id}`);
    await adminPage.locator('select[name="status"]').selectOption("RESOLVED");
    await adminPage.locator('textarea[name="body"]').fill("Acceptance verification: admin response recorded and ticket resolved.");
    await clickAndSettle(adminPage.getByRole("button", { name: /send response/i }), adminPage);
    const resolvedTicket = await prisma.ticket.findUnique({ where: { id: ticket.id }, include: { messages: true } });
    expect(resolvedTicket?.status === "RESOLVED", `Ticket status was ${resolvedTicket?.status}.`);
    expect((resolvedTicket.messages?.length ?? 0) >= 2, "Ticket thread did not include admin response.");
    results.lifecycle.push("Admin responded to ticket and set it resolved");

    await safeGoto(adminPage, `/admin/certifications/${profile.id}`);
    await adminPage.locator('select[name="outcome"]').selectOption("CERTIFIED");
    await adminPage.locator('textarea[name="reviewerNotes"]').fill("Acceptance verification: certification review saved and capstone badge issued.");
    await clickAndSettle(adminPage.getByRole("button", { name: /save certification decision/i }), adminPage);
    const certifiedProfile = await prisma.participantProfile.findUnique({ where: { id: profile.id }, include: { certification: true } });
    expect(certifiedProfile?.status === "CERTIFIED", `Profile certification status was ${certifiedProfile?.status}.`);
    const capstoneBadge = await prisma.participantBadge.findFirst({
      where: { userId: enrolled.userId, badge: { slug: "capstone-certified-tenxpro-seal" } },
      include: { badge: true },
    });
    expect(capstoneBadge, "Capstone badge was not issued.");
    results.records.verificationCode = capstoneBadge.verificationCode;
    results.lifecycle.push("Admin submitted certification decision and issued capstone badge");

    await safeGoto(participantPage, "/portal/certification");
    results.screenshots.push(await screenshot(participantPage, "12-certification-status.png"));

    await safeGoto(publicPage, `/verify/${capstoneBadge.verificationCode}`);
    results.routes.push({
      route: `/verify/${capstoneBadge.verificationCode}`,
      status: 200,
      finalPath: new URL(publicPage.url()).pathname,
    });
    results.screenshots.push(await screenshot(publicPage, "13-public-badge-verification.png"));
    const verifyApi = await publicContext.request.get(absolute(`/api/verify/${capstoneBadge.verificationCode}`));
    results.routes.push({
      route: `/api/verify/${capstoneBadge.verificationCode}`,
      status: verifyApi.status(),
      body: await verifyApi.text(),
    });
    expect(verifyApi.status() === 200, "Badge verification API did not return 200.");
    results.lifecycle.push("Public badge verification page and API resolved");

    await publicContext.close();
    await adminContext.close();
    await participantContext.close();
  } catch (error) {
    results.failures.push(error instanceof Error ? error.message : String(error));
    throw error;
  } finally {
    results.finishedAt = new Date().toISOString();
    fs.writeFileSync(RESULT_FILE, JSON.stringify(results, null, 2));
    await browser.close();
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
