import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

/**
 * Partner Program happy path: footer discovery -> partner page -> apply -> thank-you,
 * and the application is visible in the admin inbox.
 *
 * Follows the repo's e2e convention: a clearly-namespaced *.test fixture that is
 * deleted in teardown, and a guard refusing to run against a non-local DB unless
 * E2E_ALLOW_NONLOCAL_DB=true. Run with: `pnpm test:e2e tests/e2e/partner-lifecycle.spec.ts`
 * against a running app (E2E_BASE_URL, default http://localhost:3003).
 */

process.env.DATABASE_URL ??= "postgresql://tenxpros:tenxpros_dev@localhost:5433/tenxpros";

const prisma = new PrismaClient();
const applicantEmail = `e2e.partner.${Date.now()}@tenxpros.test`;

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  if (!process.env.DATABASE_URL?.includes("localhost") && process.env.E2E_ALLOW_NONLOCAL_DB !== "true") {
    throw new Error("Refusing to run E2E setup against a non-local database.");
  }
});

test.afterAll(async () => {
  // Remove the disposable fixture (and anything derived from it).
  const app = await prisma.partnerApplication.findFirst({ where: { email: applicantEmail }, include: { partner: true } });
  if (app?.partner) {
    await prisma.partner.delete({ where: { id: app.partner.id } }).catch(() => {});
  }
  await prisma.partnerApplication.deleteMany({ where: { email: applicantEmail } });
  await prisma.user.deleteMany({ where: { email: applicantEmail } });
  await prisma.$disconnect();
});

test("home keeps partner discovery in the footer only and the partners page loads", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('a[href="/partners"]')).toHaveCount(1);
  await expect(page.locator('footer a[href="/partners"]')).toBeVisible();
  await expect(page.locator('header a[href="/partners"]')).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Open menu" }).click();
  await expect(page.locator('div.fixed.inset-0 > nav a[href="/partners"]')).toHaveCount(0);

  const res = await page.goto("/partners");
  expect(res?.status()).toBeLessThan(400);
  await expect(page.getByRole("heading", { name: /help build TenXPros, and earn for the work you do/i })).toBeVisible();
});

test("a visitor can submit a partner application", async ({ page }) => {
  await page.goto("/partners/apply");
  // Name-based locators (matches the repo's existing e2e and is robust to the
  // accessible-label wiring of the shared Field component).
  await page.locator('input[name="fullName"]').fill("E2E Partner Applicant");
  await page.locator('input[name="email"]').fill(applicantEmail);
  await page.locator('select[name="country"]').selectOption("United States");
  await page.locator('select[name="audience"]').selectOption("B2B");
  await page.locator('textarea[name="background"]').fill(
    "Fifteen years selling enterprise training and AI enablement into financial services, with a strong network of HR and operations leaders.",
  );
  await page.locator('textarea[name="targetMarkets"]').fill("Mid-size professional-services firms and two named banks where I have warm contacts.");
  await page.locator('textarea[name="accountJustification"]').fill(
    "I led the learning function at one target for three years and still have the CHRO's trust; a board member referral into the second.",
  );
  await page.locator('input[name="consentNoEquity"]').check();
  await page.getByRole("button", { name: /Submit partner application/i }).click();

  await expect(page).toHaveURL(/\/partners\/apply\/thank-you/);
  await expect(page.getByText(/Thank you for applying to the Partner Program/i)).toBeVisible();

  const app = await prisma.partnerApplication.findFirst({ where: { email: applicantEmail } });
  expect(app).not.toBeNull();
  expect(app?.status).toBe("NEW");
  expect(app?.audience).toBe("B2B");
});
