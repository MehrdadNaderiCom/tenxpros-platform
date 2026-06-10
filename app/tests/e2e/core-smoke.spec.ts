import { test, expect } from "@playwright/test";
import { hash } from "bcryptjs";
import { PrismaClient } from "@prisma/client";

process.env.DATABASE_URL ??= "postgresql://tenxpros:tenxpros_dev@localhost:5433/tenxpros";

const prisma = new PrismaClient();
const adminEmail = process.env.E2E_ADMIN_EMAIL ?? "e2e.admin@tenxpros.test";
const adminPassword = process.env.E2E_ADMIN_PASSWORD ?? "E2eAdmin123!";

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  if (!process.env.DATABASE_URL?.includes("localhost") && process.env.E2E_ALLOW_NONLOCAL_DB !== "true") {
    throw new Error("Refusing to run E2E setup against a non-local database.");
  }

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      name: "TenXPros E2E Admin",
      role: "ADMIN",
      passwordHash: await hash(adminPassword, 12),
    },
    create: {
      email: adminEmail,
      name: "TenXPros E2E Admin",
      role: "ADMIN",
      passwordHash: await hash(adminPassword, 12),
    },
  });
});

test.afterAll(async () => {
  await prisma.$disconnect();
});

test("public launch routes load", async ({ page, request }) => {
  for (const route of ["/", "/pricing", "/apply", "/login"]) {
    const response = await page.goto(route);
    expect(response?.status(), route).toBeLessThan(400);
  }

  const health = await request.get("/api/health");
  expect(health.status()).toBe(200);
  await expect(health).toBeOK();
  await expect(await health.json()).toEqual({ ok: true });
});

test("protected routes redirect unauthenticated users to login", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/login\?callbackUrl=%2Fadmin$/);

  await page.goto("/portal");
  await expect(page).toHaveURL(/\/login\?callbackUrl=%2Fportal$/);
});

test("application form submits through the browser UI and creates records", async ({ page }) => {
  const email = `e2e.apply.${Date.now()}@tenxpros.test`;

  await page.goto("/apply?utm_source=e2e&utm_medium=playwright&utm_campaign=launch-hardening");
  await page.locator('input[name="fullName"]').fill("E2E Launch Applicant");
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="country"]').fill("United States");
  await page.locator('input[name="phone"]').fill("+1 415 555 0100");
  await page.locator('input[name="professionalRole"]').fill("Operations Director");
  await page.locator('input[name="domain"]').fill("Professional services operations");
  await page.locator('input[name="linkedinUrl"]').fill("https://www.linkedin.com/in/e2e-launch-applicant");
  await page.locator('select[name="aiExperience"]').selectOption("INTERMEDIATE");
  await page.locator('select[name="dataSensitivity"]').selectOption("MODERATE");
  await page.locator('select[name="timeAvailability"]').selectOption("HOURS_8");
  await page.locator('textarea[name="whyTenXPros"]').fill(
    "I need a rigorous AI adoption certification path that turns a real operations problem into a responsible, defensible solution dossier.",
  );
  await page.locator('textarea[name="realProblemBrief"]').fill(
    "Our client intake workflow is inconsistent across channels, creates duplicate manual review, and needs an AI-assisted triage design with human oversight.",
  );
  await page.locator('input[name="preferredLanguage"]').fill("English");
  await page.locator('input[name="consentConfidentiality"]').check();
  await page.locator('input[name="consentTerms"]').check();

  await Promise.all([
    page.waitForURL(/\/apply\/thank-you\?id=/),
    page.getByRole("button", { name: /submit application/i }).click(),
  ]);

  const application = await prisma.application.findFirst({
    where: { email },
    include: { user: true },
  });
  expect(application?.status).toBe("SUBMITTED");
  expect(application?.user.role).toBe("APPLICANT");
});

test("admin credentials login reaches dashboard", async ({ page }) => {
  await page.goto("/login?callbackUrl=/admin");
  await page.locator('input[name="email"]').fill(adminEmail);
  await page.locator('input[name="password"]').fill(adminPassword);

  await Promise.all([
    page.waitForURL(/\/admin$/),
    page.getByRole("button", { name: /sign in/i }).click(),
  ]);

  await expect(page.getByRole("heading", { name: /admin dashboard/i })).toBeVisible();
});
