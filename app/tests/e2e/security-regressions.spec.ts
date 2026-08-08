import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { hash } from "bcryptjs";
import { PrismaClient, type UserRole } from "@prisma/client";
import { recordClosedDealMilestonesAtomically } from "../../src/lib/partner/deal-lifecycle";
import { applyRefundAtomically } from "../../src/lib/partner/refunds";
import { badgeCatalog, modules } from "../../src/lib/program-data";

process.env.DATABASE_URL ??=
  "postgresql://tenxpros:tenxpros_dev@localhost:5433/tenxpros_security_e2e";

const prisma = new PrismaClient();
const runId = `${Date.now()}-${randomUUID().slice(0, 8)}`;

test.describe.configure({ mode: "serial" });

test.beforeAll(() => {
  const databaseUrl = process.env.DATABASE_URL;
  const parsedDatabaseUrl = databaseUrl ? new URL(databaseUrl) : null;
  const databaseHost = parsedDatabaseUrl?.hostname ?? "";
  const databaseName = parsedDatabaseUrl?.pathname.replace(/^\//, "") ?? "";
  const isLoopback = ["localhost", "127.0.0.1", "::1"].includes(databaseHost);
  if (!isLoopback && process.env.E2E_ALLOW_NONLOCAL_DB !== "true") {
    throw new Error("Refusing to run security E2E against a non-local database.");
  }
  const clearlyDisposable = /security[_-]?e2e/i.test(databaseName);
  if (!clearlyDisposable && process.env.SECURITY_E2E_DISPOSABLE_DB !== "true") {
    throw new Error(
      "Security E2E creates immutable ledger fixtures. Use a disposable database whose name contains security_e2e, or explicitly set SECURITY_E2E_DISPOSABLE_DB=true.",
    );
  }
});

test.afterAll(async () => {
  // Financial facts are intentionally immutable. The enclosing database is a
  // disposable per-run resource, so cleanup means dropping its container/database
  // after Playwright exits—not weakening production triggers to delete fixtures.
  await prisma.$disconnect();
});

test("public Apply cannot mutate existing Admin or Partner identities", async ({ page }) => {
  const passwordHash = await hash("SecurityApply123!", 12);
  for (const role of ["ADMIN", "PARTNER"] as const) {
    const email = `security.apply.${role.toLowerCase()}.${runId}@tenxpros.test`;
    const user = await prisma.user.create({
      data: { email, name: `Protected ${role}`, role, passwordHash, emailVerified: new Date() },
    });
    const before = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });

    await submitApplicationForm(page, email, `Malicious overwrite ${role}`);
    await expect(page.getByText(/application or account already exists|active application already exists/i)).toBeVisible();

    const after = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(after).toMatchObject({
      id: before.id,
      email: before.email,
      name: before.name,
      role: before.role,
      passwordHash: before.passwordHash,
      authVersion: before.authVersion,
    });
    expect(await prisma.application.count({ where: { userId: user.id } })).toBe(0);
  }
});

test("database trigger versions every security change but not profile-only edits", async () => {
  const user = await prisma.user.create({
    data: {
      email: `security.trigger.${runId}@tenxpros.test`,
      name: "Version Trigger",
      role: "APPLICANT",
      passwordHash: await hash("TriggerStart123!", 12),
    },
  });
  expect(user.authVersion).toBe(0);

  await prisma.user.update({ where: { id: user.id }, data: { name: "Name only" } });
  expect((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).authVersion).toBe(0);

  const changes: Array<Record<string, unknown>> = [
    { role: "COACH" satisfies UserRole },
    { email: `security.trigger.changed.${runId}@tenxpros.test` },
    { passwordHash: await hash("TriggerChanged123!", 12) },
    { isActive: false },
    { isActive: true },
  ];
  for (const [index, data] of changes.entries()) {
    await prisma.user.update({ where: { id: user.id }, data });
    expect((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).authVersion).toBe(index + 1);
  }
  await prisma.user.update({ where: { id: user.id }, data: { authVersion: 0 } });
  expect((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).authVersion).toBe(6);

  const auditActor = await prisma.user.create({
    data: {
      email: `security.audit.${runId}@tenxpros.test`,
      name: "Immutable Audit Actor",
      role: "ADMIN",
    },
  });
  const audit = await prisma.auditLog.create({
    data: {
      actorId: auditActor.id,
      // A caller cannot forge attribution; the database snapshots the live role.
      actorRole: "PARTNER",
      action: "SECURITY_AUDIT_FIXTURE",
      entity: "User",
      entityId: auditActor.id,
    },
  });
  expect(audit).toMatchObject({
    actorUserIdSnapshot: auditActor.id,
    actorEmailSnapshot: auditActor.email,
    actorNameSnapshot: auditActor.name,
    actorRole: auditActor.role,
  });
  await expect(
    prisma.auditLog.update({ where: { id: audit.id }, data: { action: "TAMPERED" } }),
  ).rejects.toThrow();
  await expect(prisma.auditLog.delete({ where: { id: audit.id } })).rejects.toThrow();
  await prisma.user.delete({ where: { id: auditActor.id } });
  expect(await prisma.auditLog.findUniqueOrThrow({ where: { id: audit.id } })).toMatchObject({
    actorId: null,
    actorUserIdSnapshot: auditActor.id,
    actorEmailSnapshot: auditActor.email,
    actorNameSnapshot: auditActor.name,
    action: "SECURITY_AUDIT_FIXTURE",
  });
});

test("stale Admin, Partner, suspended and password-changed sessions fail on the next boundary", async ({ browser }) => {
  test.setTimeout(120_000);
  const originalPassword = "FreshAuth123!";

  const admin = await createLoginUser("ADMIN", "revoked-admin", originalPassword);
  const adminPage = await browser.newPage();
  const initialAdminBoundary = waitForFreshBoundary(adminPage, "admin");
  await login(adminPage, admin.email, originalPassword, "/admin");
  await initialAdminBoundary;
  await expect(adminPage.getByRole("heading", { name: /mission control/i })).toBeVisible();

  await prisma.user.update({ where: { id: admin.id }, data: { role: "APPLICANT" } });
  // Exercise a client-side Next Link transition while the admin layout remains
  // mounted. The desktop sidebar is intentionally hidden at Playwright's mobile
  // breakpoint, so dispatch the DOM click directly instead of waiting for CSS
  // visibility.
  await adminPage.locator('a[href="/admin/applications"]').first().evaluate((link: HTMLAnchorElement) => link.click());
  await expect(adminPage).toHaveURL(/\/admin\/applications|\/login/);
  await expect(adminPage.getByRole("heading", { name: /^applications$/i })).not.toBeVisible();
  const staleExport = await adminPage.request.get("/admin/reports/export/applications");
  expect(staleExport.status()).toBe(401);
  await prisma.user.update({ where: { id: admin.id }, data: { role: "ADMIN" } });
  await adminPage.goto("/admin");
  await expect(adminPage).toHaveURL(/\/login|\/admin/);
  await expect(adminPage.getByRole("heading", { name: /mission control/i })).not.toBeVisible();
  await adminPage.close();

  const partnerUser = await createLoginUser("PARTNER", "revoked-partner", originalPassword);
  const partner = await prisma.partner.create({
    data: {
      userId: partnerUser.id,
      status: "TIER1",
      tier: "TIER1",
      displayName: "Security Partner",
      contactEmail: partnerUser.email,
      activeStatus: true,
    },
  });
  const partnerPage = await browser.newPage();
  const initialPartnerBoundary = waitForFreshBoundary(partnerPage, "partner");
  await login(partnerPage, partnerUser.email, originalPassword, "/partner");
  await initialPartnerBoundary;
  await expect(partnerPage).toHaveURL(/\/partner/);
  await prisma.user.update({ where: { id: partnerUser.id }, data: { role: "APPLICANT" } });
  await partnerPage.goto("/partner/profile");
  await expect(partnerPage).toHaveURL(/\/login/);
  await partnerPage.close();

  // Partner lifecycle revocation does not change User.authVersion, so this
  // separately proves the DB-fresh Partner.status boundary.
  await prisma.user.update({ where: { id: partnerUser.id }, data: { role: "PARTNER" } });
  await prisma.partner.update({ where: { id: partner.id }, data: { status: "TIER1" } });
  const terminatedPartnerPage = await browser.newPage();
  const terminatedPartnerBoundary = waitForFreshBoundary(terminatedPartnerPage, "partner");
  await login(terminatedPartnerPage, partnerUser.email, originalPassword, "/partner");
  await terminatedPartnerBoundary;
  await prisma.partner.update({ where: { id: partner.id }, data: { status: "TERMINATED", terminatedAt: new Date() } });
  await terminatedPartnerPage.goto("/partner/profile");
  await expect(terminatedPartnerPage).toHaveURL(/\/login/);
  await terminatedPartnerPage.close();

  const suspended = await createLoginUser("ADMIN", "suspended-admin", originalPassword);
  const suspendedPage = await browser.newPage();
  await login(suspendedPage, suspended.email, originalPassword, "/admin");
  await prisma.user.update({ where: { id: suspended.id }, data: { isActive: false } });
  expect((await suspendedPage.request.get("/admin/reports/export/applications")).status()).toBe(401);
  await suspendedPage.close();

  const passwordChanged = await createLoginUser("ADMIN", "password-admin", originalPassword);
  const passwordPage = await browser.newPage();
  await login(passwordPage, passwordChanged.email, originalPassword, "/admin");
  await prisma.user.update({
    where: { id: passwordChanged.id },
    data: { passwordHash: await hash("ChangedPassword123!", 12) },
  });
  expect((await passwordPage.request.get("/admin/reports/export/applications")).status()).toBe(401);
  await passwordPage.close();

  const deleted = await createLoginUser("ADMIN", "deleted-admin", originalPassword);
  const deletedPage = await browser.newPage();
  await login(deletedPage, deleted.email, originalPassword, "/admin");
  await prisma.user.delete({ where: { id: deleted.id } });
  expect((await deletedPage.request.get("/admin/reports/export/applications")).status()).toBe(401);
  await deletedPage.close();
});

test("a demoted Admin cannot submit a previously rendered Server Action", async ({ browser }) => {
  test.setTimeout(60_000);
  const admin = await createLoginUser("ADMIN", "action-admin", "ActionAdmin123!");
  const applicant = await createLoginUser("APPLICANT", "action-applicant", "ActionApplicant123!");
  const application = await prisma.application.create({
    data: {
      userId: applicant.id,
      fullName: "Action Security Applicant",
      email: applicant.email,
      country: "United States",
      professionalRole: "Security reviewer",
      domain: "Authorization",
      phone: "+1 415 555 0199",
      linkedinUrl: "https://www.linkedin.com/in/action-security",
      aiExperience: "ADVANCED",
      whyTenXPros: "A sufficiently detailed application rationale used only to verify stale administrative Server Action authorization boundaries.",
      realProblemBrief: "A sufficiently detailed real problem statement used only to verify that the database remains unchanged after authorization is revoked.",
      dataSensitivity: "HIGH",
      timeAvailability: "HOURS_8",
      consentConfidentiality: true,
      consentTerms: true,
    },
  });
  const page = await browser.newPage();
  const initialAdminBoundary = waitForFreshBoundary(page, "admin");
  await login(page, admin.email, "ActionAdmin123!", `/admin/applications/${application.id}`);
  await initialAdminBoundary;
  await prisma.user.update({ where: { id: admin.id }, data: { role: "APPLICANT" } });
  await page.getByRole("button", { name: /mark under review/i }).click();
  await expect.poll(async () =>
    (await prisma.application.findUniqueOrThrow({ where: { id: application.id } })).status,
  ).toBe("SUBMITTED");
  await page.close();
});

test("refund retries and concurrent requests create one immutable, bounded ledger", async () => {
  const actor = await createLoginUser("ADMIN", "refund-actor", "RefundActor123!");
  const partner = await prisma.partner.create({
    data: {
      status: "TIER1",
      tier: "TIER1",
      displayName: "Refund Security Partner",
      contactEmail: `refund.partner.${runId}@tenxpros.test`,
    },
  });
  const now = new Date();
  const deal = await prisma.closedDeal.create({
    data: {
      partnerId: partner.id,
      dealType: "B2B",
      netReceiptsCents: 100_000,
      currency: "USD",
      signedAt: now,
      clawbackDaysAtClose: 120,
      clawbackWindowEndsAt: new Date(now.getTime() + 120 * 86_400_000),
    },
  });
  const commission = await prisma.commissionEntry.create({
    data: {
      partnerId: partner.id,
      closedDealId: deal.id,
      function: "CLOSING",
      rateBp: 1_000,
      baseAmountCents: deal.netReceiptsCents,
      amountCents: 10_000,
    },
  });

  // Direct/future writers cannot bypass lifecycle entry points by inserting a
  // commission that is already paid, reversed, or otherwise internally split.
  await expect(
    prisma.commissionEntry.create({
      data: {
        partnerId: partner.id,
        closedDealId: deal.id,
        function: "DELIVERY",
        rateBp: 500,
        baseAmountCents: deal.netReceiptsCents,
        amountCents: 5_000,
        status: "PAID",
      },
    }),
  ).rejects.toThrow();
  await expect(
    prisma.commissionEntry.create({
      data: {
        partnerId: partner.id,
        closedDealId: deal.id,
        function: "DELIVERY",
        rateBp: 500,
        baseAmountCents: deal.netReceiptsCents,
        amountCents: 5_000,
        reversedCents: 500,
      },
    }),
  ).rejects.toThrow();
  await expect(
    prisma.commissionEntry.create({
      data: {
        partnerId: partner.id,
        closedDealId: deal.id,
        function: "DELIVERY",
        rateBp: 500,
        baseAmountCents: deal.netReceiptsCents,
        amountCents: 5_000,
        status: "REVERSED",
      },
    }),
  ).rejects.toThrow();

  // Recompute may finalize calculation fields before settlement/refunds, but
  // identity/provenance is immutable from the moment the line is inserted.
  await prisma.commissionEntry.update({
    where: { id: commission.id },
    data: { rateBp: 1_100, amountCents: 11_000, payableOn: new Date(now.getTime() + 86_400_000) },
  });
  await prisma.commissionEntry.update({
    where: { id: commission.id },
    data: { rateBp: 1_000, amountCents: 10_000, payableOn: null },
  });
  await expect(
    prisma.commissionEntry.update({ where: { id: commission.id }, data: { currency: "EUR" } }),
  ).rejects.toThrow();

  // Lifecycle is forward-only and PAID requires a payment timestamp.
  await prisma.commissionEntry.update({
    where: { id: commission.id },
    data: { status: "PAYABLE" },
  });
  await prisma.commissionEntry.update({
    where: { id: commission.id },
    data: { status: "PAID", paidOn: now },
  });
  await expect(
    prisma.commissionEntry.update({ where: { id: commission.id }, data: { status: "PAYABLE" } }),
  ).rejects.toThrow();
  const paidSeat = await prisma.seatRecord.create({
    data: { closedDealId: deal.id, count: 4, status: "PAID_COLLECTED" },
  });
  await expect(
    prisma.seatRecord.create({ data: { closedDealId: deal.id, count: 0, status: "PAID_COLLECTED" } }),
  ).rejects.toThrow();
  await expect(
    prisma.seatRecord.create({ data: { closedDealId: deal.id, count: -5, status: "PAID_COLLECTED" } }),
  ).rejects.toThrow();

  const sameReference = `provider-refund-${randomUUID()}`;
  const command = {
    closedDealId: deal.id,
    type: "REFUND" as const,
    amountCents: 20_000,
    seatsRefunded: 1,
    sourceReference: sameReference,
    actor: { id: actor.id, role: "ADMIN" as const },
    occurredAt: now,
    note: "Provider event refund-security-1",
  };
  const duplicateResults = await Promise.all([
    applyRefundAtomically(prisma, command),
    applyRefundAtomically(prisma, command),
  ]);
  expect(duplicateResults.filter((result) => result.duplicate)).toHaveLength(1);
  expect(await prisma.refundEvent.count({ where: { closedDealId: deal.id } })).toBe(1);
  expect(await prisma.commissionClawbackAllocation.count({ where: { commissionEntryId: commission.id } })).toBe(1);
  expect((await prisma.commissionEntry.findUniqueOrThrow({ where: { id: commission.id } })).reversedCents).toBe(2_000);
  await expect(
    prisma.commissionEntry.create({
      data: {
        partnerId: partner.id,
        closedDealId: deal.id,
        function: "DELIVERY",
        rateBp: 500,
        baseAmountCents: deal.netReceiptsCents,
        amountCents: 5_000,
      },
    }),
  ).rejects.toThrow();
  await expect(
    prisma.seatRecord.create({ data: { closedDealId: deal.id, count: 10, status: "PAID_COLLECTED" } }),
  ).rejects.toThrow();
  await expect(
    prisma.seatRecord.update({ where: { id: paidSeat.id }, data: { count: 999, status: "REFUNDED" } }),
  ).rejects.toThrow();

  // The first refund freezes recomputable fields. Reversal cannot be changed
  // directly either: its deferred constraint requires a matching allocation.
  await expect(
    prisma.commissionEntry.update({ where: { id: commission.id }, data: { amountCents: 10_001 } }),
  ).rejects.toThrow();
  await expect(
    prisma.commissionEntry.update({ where: { id: commission.id }, data: { reversedCents: 2_001 } }),
  ).rejects.toThrow();
  await expect(
    prisma.commissionEntry.update({ where: { id: commission.id }, data: { reversedCents: 1_999 } }),
  ).rejects.toThrow();
  await expect(
    prisma.commissionEntry.update({ where: { id: commission.id }, data: { status: "REVERSED" } }),
  ).rejects.toThrow();
  await prisma.commissionEntry.update({
    where: { id: commission.id },
    data: { queryFlag: true, queryNote: "Allowed dispute metadata after refund." },
  });

  const retry = await applyRefundAtomically(prisma, command);
  expect(retry).toMatchObject({ duplicate: true, cumulativeRefundedCents: 20_000, incrementalReversedCents: 2_000 });
  const retryAfterRerender = await applyRefundAtomically(prisma, {
    ...command,
    sourceReference: `  ${sameReference.toUpperCase()}  `,
  });
  expect(retryAfterRerender).toMatchObject({ duplicate: true, refundEventId: retry.refundEventId });
  await expect(
    applyRefundAtomically(prisma, { ...command, amountCents: 20_001 }),
  ).rejects.toThrow(/different refund request/i);

  await Promise.all(
    [2, 3].map((sequence) =>
      applyRefundAtomically(prisma, {
        ...command,
        sourceReference: `provider-refund-${randomUUID()}`,
        amountCents: 10_000,
        seatsRefunded: 1,
        note: `Provider event refund-security-${sequence}`,
      }),
    ),
  );
  const finalCommission = await prisma.commissionEntry.findUniqueOrThrow({ where: { id: commission.id } });
  expect(finalCommission.reversedCents).toBe(4_000);
  expect(await prisma.refundEvent.count({ where: { closedDealId: deal.id } })).toBe(3);
  const seats = await prisma.seatRecord.findMany({ where: { closedDealId: deal.id } });
  expect(seats.reduce((sum, seat) => sum + seat.count, 0)).toBe(4);
  expect(seats.filter((seat) => seat.status === "REFUNDED").reduce((sum, seat) => sum + seat.count, 0)).toBe(3);
  expect(await prisma.seatRefundAllocation.count({ where: { refundEvent: { closedDealId: deal.id } } })).toBe(3);

  // A full monetary refund derives the actual seat movement instead of trusting
  // a caller-provided count that could make the immutable ledger inconsistent.
  const fullRefund = await applyRefundAtomically(prisma, {
    ...command,
    sourceReference: `provider-refund-${randomUUID()}`,
    amountCents: 60_000,
    seatsRefunded: 0,
    note: "Final provider refund",
  });
  const fullEvent = await prisma.refundEvent.findUniqueOrThrow({ where: { id: fullRefund.refundEventId } });
  expect(fullEvent.seatsRefunded).toBe(1);
  expect((await prisma.commissionEntry.findUniqueOrThrow({ where: { id: commission.id } })).reversedCents).toBe(10_000);
  const seatAllocations = await prisma.seatRefundAllocation.findMany({
    where: { refundEvent: { closedDealId: deal.id } },
  });
  expect(seatAllocations).toHaveLength(4);
  expect(seatAllocations.reduce((sum, seatAllocation) => sum + seatAllocation.deltaSeats, 0)).toBe(4);
  const allocation = await prisma.commissionClawbackAllocation.findFirstOrThrow({
    where: { commissionEntryId: commission.id },
  });
  await expect(prisma.refundEvent.delete({ where: { id: fullEvent.id } })).rejects.toThrow();
  await expect(prisma.commissionClawbackAllocation.delete({ where: { id: allocation.id } })).rejects.toThrow();
  await expect(prisma.seatRefundAllocation.delete({ where: { id: seatAllocations[0]!.id } })).rejects.toThrow();
  await expect(prisma.commissionEntry.delete({ where: { id: commission.id } })).rejects.toThrow();
  await expect(prisma.closedDeal.delete({ where: { id: deal.id } })).rejects.toThrow();
  await expect(prisma.partner.delete({ where: { id: partner.id } })).rejects.toThrow();
  await expect(
    prisma.closedDeal.create({
      data: {
        partnerId: partner.id,
        dealType: "B2B",
        netReceiptsCents: 1_000,
        currency: "USD",
        signedAt: now,
        clawbackDaysAtClose: -1,
        clawbackWindowEndsAt: now,
      },
    }),
  ).rejects.toThrow();
  await expect(
    prisma.closedDeal.create({
      data: {
        partnerId: partner.id,
        dealType: "B2B",
        netReceiptsCents: 1_000,
        currency: "USD",
        signedAt: now,
        clawbackDaysAtClose: 120,
        clawbackWindowEndsAt: new Date(now.getTime() - 1),
      },
    }),
  ).rejects.toThrow();
  await expect(
    prisma.closedDeal.create({
      data: {
        partnerId: partner.id,
        dealType: "B2B",
        netReceiptsCents: 1_000,
        currency: "USD",
        signedAt: now,
        clawbackDaysAtClose: 120,
        clawbackWindowEndsAt: new Date(now.getTime() + 30 * 86_400_000),
        underlyingRefundWindowEndsAt: new Date(now.getTime() + 31 * 86_400_000),
      },
    }),
  ).rejects.toThrow();
  await expect(
    prisma.closedDeal.create({
      data: {
        partnerId: partner.id,
        dealType: "B2B",
        netReceiptsCents: -1,
        currency: "USD",
        signedAt: now,
        clawbackDaysAtClose: 120,
        clawbackWindowEndsAt: new Date(now.getTime() + 120 * 86_400_000),
      },
    }),
  ).rejects.toThrow();
  await expect(
    prisma.closedDeal.create({
      data: {
        partnerId: partner.id,
        dealType: "B2B",
        netReceiptsCents: 1_000,
        currency: "USD",
        signedAt: now,
        clawbackDaysAtClose: 0,
        clawbackWindowEndsAt: new Date(now.getTime() + 365 * 86_400_000),
      },
    }),
  ).rejects.toThrow();

  const expiredDeal = await prisma.closedDeal.create({
    data: {
      partnerId: partner.id,
      dealType: "B2B",
      netReceiptsCents: 50_000,
      currency: "USD",
      signedAt: new Date("2025-01-01T00:00:00Z"),
      clawbackDaysAtClose: 120,
      clawbackWindowEndsAt: new Date("2025-05-01T00:00:00Z"),
    },
  });
  const expiredCommission = await prisma.commissionEntry.create({
    data: {
      partnerId: partner.id,
      closedDealId: expiredDeal.id,
      function: "CLOSING",
      rateBp: 1_000,
      baseAmountCents: 50_000,
      amountCents: 5_000,
    },
  });
  await expect(
    prisma.refundEvent.create({
      data: {
        closedDealId: expiredDeal.id,
        type: "REFUND",
        amountCents: 1_000,
        occurredAt: new Date("2025-02-01T00:00:00.000Z"),
        withinWindow: true,
        reversedCommissionCents: 0,
        note: "Legacy binary shape without idempotency provenance",
      },
    }),
  ).rejects.toThrow();

  const insideOccurredAt = new Date("2025-02-01T00:00:00.000Z");
  await expect(
    prisma.refundEvent.create({
      data: {
        closedDealId: expiredDeal.id,
        type: "REFUND",
        amountCents: 10_000,
        occurredAt: insideOccurredAt,
        withinWindow: true,
        reversedCommissionCents: 0,
        idempotencyKey: "a".repeat(64),
        sourceReference: `raw-under-reversal-${runId}`,
        requestFingerprint: "b".repeat(64),
        clawbackDaysAtEvent: expiredDeal.clawbackDaysAtClose,
        clawbackWindowEndsAt: expiredDeal.clawbackWindowEndsAt,
        seatsRefunded: 0,
        initiatedByUserId: actor.id,
        cumulativeRefundedCentsAfter: 10_000,
        cumulativeEligibleCentsAfter: 10_000,
      },
    }),
  ).rejects.toThrow();
  await expect(
    prisma.refundEvent.create({
      data: {
        closedDealId: expiredDeal.id,
        type: "REFUND",
        amountCents: 10_000,
        occurredAt: insideOccurredAt,
        withinWindow: true,
        reversedCommissionCents: 0,
        idempotencyKey: "e".repeat(64),
        sourceReference: `raw-missing-actor-${runId}`,
        requestFingerprint: "f".repeat(64),
        clawbackDaysAtEvent: expiredDeal.clawbackDaysAtClose,
        clawbackWindowEndsAt: expiredDeal.clawbackWindowEndsAt,
        seatsRefunded: 0,
        initiatedByUserId: `missing-${runId}`,
        cumulativeRefundedCentsAfter: 10_000,
        cumulativeEligibleCentsAfter: 10_000,
      },
    }),
  ).rejects.toThrow();
  expect(
    await prisma.refundEvent.count({ where: { sourceReference: `raw-missing-actor-${runId}` } }),
  ).toBe(0);

  const overEventId = `raw-over-${randomUUID()}`;
  await expect(
    prisma.$transaction([
      prisma.commissionEntry.update({
        where: { id: expiredCommission.id },
        data: { reversedCents: 1_500 },
      }),
      prisma.refundEvent.create({
        data: {
          id: overEventId,
          closedDealId: expiredDeal.id,
          type: "REFUND",
          amountCents: 10_000,
          occurredAt: insideOccurredAt,
          withinWindow: true,
          reversedCommissionCents: 1_500,
          idempotencyKey: "c".repeat(64),
          sourceReference: `raw-over-reversal-${runId}`,
          requestFingerprint: "d".repeat(64),
          clawbackDaysAtEvent: expiredDeal.clawbackDaysAtClose,
          clawbackWindowEndsAt: expiredDeal.clawbackWindowEndsAt,
          seatsRefunded: 0,
          initiatedByUserId: actor.id,
          cumulativeRefundedCentsAfter: 10_000,
          cumulativeEligibleCentsAfter: 10_000,
        },
      }),
      prisma.commissionClawbackAllocation.create({
        data: {
          refundEventId: overEventId,
          commissionEntryId: expiredCommission.id,
          deltaCents: 1_500,
          reversedBeforeCents: 0,
          reversedAfterCents: 1_500,
          statusBefore: "ACCRUED",
          statusAfter: "ACCRUED",
        },
      }),
    ]),
  ).rejects.toThrow();
  expect((await prisma.commissionEntry.findUniqueOrThrow({ where: { id: expiredCommission.id } })).reversedCents).toBe(0);

  // Allocation-side validation independently rejects a cross-deal ledger link.
  await expect(
    prisma.commissionClawbackAllocation.create({
      data: {
        refundEventId: fullEvent.id,
        commissionEntryId: expiredCommission.id,
        deltaCents: 1,
        reversedBeforeCents: 0,
        reversedAfterCents: 1,
        statusBefore: "ACCRUED",
        statusAfter: "ACCRUED",
      },
    }),
  ).rejects.toThrow();
  const outside = await applyRefundAtomically(prisma, {
    ...command,
    closedDealId: expiredDeal.id,
    sourceReference: `provider-refund-${randomUUID()}`,
    amountCents: 10_000,
    seatsRefunded: 0,
    occurredAt: new Date("2025-05-01T00:00:00.001Z"),
    note: "Outside the snapshotted window",
  });
  expect(outside).toMatchObject({ withinWindow: false, incrementalReversedCents: 0 });
  expect((await prisma.commissionEntry.findUniqueOrThrow({ where: { id: expiredCommission.id } })).reversedCents).toBe(0);

  const financialForeignKeys = await prisma.$queryRawUnsafe<Array<{ conname: string; delete_action: string }>>(`
    SELECT constraint_row.conname, constraint_row.confdeltype::text AS delete_action
    FROM pg_constraint constraint_row
    WHERE constraint_row.conname IN (
      'ClosedDeal_partnerId_fkey',
      'CommissionEntry_partnerId_fkey',
      'CommissionEntry_closedDealId_fkey',
      'RefundEvent_closedDealId_fkey'
    )
    ORDER BY constraint_row.conname
  `);
  expect(financialForeignKeys).toHaveLength(4);
  expect(financialForeignKeys.every((foreignKey) => foreignKey.delete_action === "r")).toBe(true);

  const validatedWindowChecks = await prisma.$queryRawUnsafe<Array<{ conname: string; convalidated: boolean }>>(`
    SELECT constraint_row.conname, constraint_row.convalidated
    FROM pg_constraint constraint_row
    WHERE constraint_row.conname IN (
      'ClosedDeal_clawbackWindow_order_check',
      'ClosedDeal_underlyingWindow_order_check'
    )
    ORDER BY constraint_row.conname
  `);
  expect(validatedWindowChecks).toEqual([
    { conname: "ClosedDeal_clawbackWindow_order_check", convalidated: true },
    { conname: "ClosedDeal_underlyingWindow_order_check", convalidated: true },
  ]);
});

test("ClosedDeal milestones are serialized, set-once, audited and frozen after refunds", async () => {
  const actor = await createLoginUser("ADMIN", "milestone-actor", "MilestoneActor123!");
  const partner = await prisma.partner.create({
    data: {
      status: "TIER1",
      tier: "TIER1",
      displayName: "Milestone Security Partner",
      contactEmail: `milestone.partner.${runId}@tenxpros.test`,
    },
  });
  const now = new Date();
  const signedAt = new Date(now.getTime() - 4 * 86_400_000);
  const deal = await prisma.closedDeal.create({
    data: {
      partnerId: partner.id,
      dealType: "B2B",
      netReceiptsCents: 100_000,
      currency: "USD",
      signedAt,
      clawbackDaysAtClose: 120,
      clawbackWindowEndsAt: new Date(signedAt.getTime() + 120 * 86_400_000),
    },
  });
  const actorInput = { id: actor.id, role: "ADMIN" as const };
  const deliveredAt = new Date(now.getTime() - 3 * 86_400_000);

  const duplicateDelivery = await Promise.all([
    recordClosedDealMilestonesAtomically(prisma, {
      closedDealId: deal.id,
      deliveredAt,
      actor: actorInput,
    }),
    recordClosedDealMilestonesAtomically(prisma, {
      closedDealId: deal.id,
      deliveredAt,
      actor: actorInput,
    }),
  ]);
  expect(duplicateDelivery.map((result) => result.changed).sort()).toEqual([false, true]);
  expect(
    await prisma.auditLog.count({
      where: { entityId: deal.id, action: "CLOSED_DEAL_MILESTONES_RECORDED" },
    }),
  ).toBe(1);

  const competingPaymentDates = [
    new Date(now.getTime() - 2 * 86_400_000),
    new Date(now.getTime() - 1 * 86_400_000),
  ];
  const competingPayments = await Promise.allSettled(
    competingPaymentDates.map((paymentClearedAt) =>
      recordClosedDealMilestonesAtomically(prisma, {
        closedDealId: deal.id,
        paymentClearedAt,
        actor: actorInput,
      }),
    ),
  );
  expect(competingPayments.filter((result) => result.status === "fulfilled")).toHaveLength(1);
  expect(competingPayments.filter((result) => result.status === "rejected")).toHaveLength(1);

  const stored = await prisma.closedDeal.findUniqueOrThrow({ where: { id: deal.id } });
  expect(competingPaymentDates.map((date) => date.getTime())).toContain(stored.paymentClearedAt?.getTime());
  expect(stored.conversionDate?.getTime()).toBe(stored.paymentClearedAt?.getTime());
  expect(
    await prisma.auditLog.count({
      where: { entityId: deal.id, action: "CLOSED_DEAL_MILESTONES_RECORDED" },
    }),
  ).toBe(2);
  await expect(
    prisma.closedDeal.update({
      where: { id: deal.id },
      data: { deliveredAt: new Date(deliveredAt.getTime() + 86_400_000) },
    }),
  ).rejects.toThrow();
  await expect(
    prisma.closedDeal.update({ where: { id: deal.id }, data: { netReceiptsCents: 99_999 } }),
  ).rejects.toThrow();

  const refundedSignedAt = new Date(now.getTime() - 2 * 86_400_000);
  const refundedDeal = await prisma.closedDeal.create({
    data: {
      partnerId: partner.id,
      dealType: "B2B",
      netReceiptsCents: 50_000,
      currency: "USD",
      signedAt: refundedSignedAt,
      clawbackDaysAtClose: 120,
      clawbackWindowEndsAt: new Date(refundedSignedAt.getTime() + 120 * 86_400_000),
    },
  });
  await applyRefundAtomically(prisma, {
    closedDealId: refundedDeal.id,
    type: "REFUND",
    amountCents: 1_000,
    seatsRefunded: 0,
    sourceReference: `milestone-refund-${randomUUID()}`,
    actor: actorInput,
    occurredAt: now,
    note: "Freeze the deal lifecycle after the first refund event",
  });
  await expect(
    recordClosedDealMilestonesAtomically(prisma, {
      closedDealId: refundedDeal.id,
      deliveredAt,
      actor: actorInput,
    }),
  ).rejects.toThrow(/locked after a refund event/i);
  await expect(
    prisma.closedDeal.update({
      where: { id: refundedDeal.id },
      data: { deliveredAt },
    }),
  ).rejects.toThrow();
});

test("concurrent module reviews serialize rank credential synchronization", async ({ browser }) => {
  test.setTimeout(120_000);
  const admin = await createLoginUser("ADMIN", "rank-sync-admin", "RankSyncAdmin123!");
  const participantUser = await createLoginUser(
    "PARTICIPANT",
    "rank-sync-participant",
    "RankSyncParticipant123!",
  );
  const now = new Date();
  const participant = await prisma.participantProfile.create({
    data: {
      userId: participantUser.id,
      tier: "FOUNDING",
      startsAt: now,
      expectedEndAt: new Date(now.getTime() + 90 * 86_400_000),
      status: "ACTIVE",
    },
  });

  const neededBadgeSlugs = new Set([
    badgeCatalog.find((badge) => badge.name === modules[3].badgeName)?.slug,
    badgeCatalog.find((badge) => badge.name === modules[7].badgeName)?.slug,
    "rank-ai-ready-professional",
    "rank-ai-problem-solver-solution-designer",
  ]);
  for (const badge of badgeCatalog.filter((entry) => neededBadgeSlugs.has(entry.slug))) {
    await prisma.badge.upsert({
      where: { slug: badge.slug },
      update: {
        name: badge.name,
        description: badge.description,
        category: badge.category,
        isActive: true,
      },
      create: {
        slug: badge.slug,
        name: badge.name,
        description: badge.description,
        category: badge.category,
        color: badge.color,
        order: badge.order,
      },
    });
  }

  const participantModules = new Map<number, string>();
  for (const definition of modules.slice(0, 9)) {
    const moduleRecord = await prisma.module.upsert({
      where: { number_version: { number: definition.number, version: 991 } },
      update: { badgeName: definition.badgeName, isActive: true },
      create: {
        number: definition.number,
        version: 991,
        phase: definition.phase,
        title: `${definition.title} (security concurrency)`,
        coreQuestion: definition.coreQuestion,
        description: definition.description,
        learningObjectives: [],
        contentMaterials: [],
        exercises: [],
        artifactTemplate: "Security concurrency artifact.",
        passCriteria: "Current pass state is authoritative.",
        badgeName: definition.badgeName,
        estimatedHours: definition.estimatedHours,
      },
    });
    const item = await prisma.participantModule.create({
      data: {
        participantId: participant.id,
        moduleId: moduleRecord.id,
        moduleVersion: moduleRecord.version,
        status: [4, 8, 9].includes(definition.number) ? "SUBMITTED" : "PASSED",
        passedAt: [4, 8, 9].includes(definition.number) ? null : now,
      },
    });
    participantModules.set(definition.number, item.id);
  }

  const destination = `/admin/participants/${participant.id}`;
  const firstPage = await browser.newPage();
  const secondPage = await browser.newPage();
  const firstBoundary = waitForFreshBoundary(firstPage, "admin");
  const secondBoundary = waitForFreshBoundary(secondPage, "admin");
  await Promise.all([
    login(firstPage, admin.email, "RankSyncAdmin123!", destination),
    login(secondPage, admin.email, "RankSyncAdmin123!", destination),
  ]);
  await Promise.all([firstBoundary, secondBoundary]);

  const formFor = (page: Page, moduleNumber: 4 | 8 | 9) =>
    page.locator(
      `form:has(input[name="participantModuleId"][value="${participantModules.get(moduleNumber)}"])`,
    );
  await formFor(firstPage, 4).locator('select[name="status"]').selectOption("PASSED");
  await formFor(secondPage, 8).locator('select[name="status"]').selectOption("PASSED");
  await Promise.all([
    formFor(firstPage, 4).getByRole("button", { name: /save review/i }).click(),
    formFor(secondPage, 8).getByRole("button", { name: /save review/i }).click(),
  ]);

  await expect.poll(async () =>
    prisma.participantModule.count({
      where: { participantId: participant.id, status: "PASSED" },
    }),
  ).toBe(8);
  await expect.poll(async () =>
    prisma.participantBadge.count({
      where: {
        userId: participantUser.id,
        status: "ACTIVE",
        badge: {
          slug: {
            in: [
              "rank-ai-ready-professional",
              "rank-ai-problem-solver-solution-designer",
            ],
          },
        },
      },
    }),
  ).toBe(2);

  // An unrelated review may synchronize rank eligibility, but it is not an
  // explicit renewal decision and therefore must not revive an expired rank.
  const expiredRank = await prisma.participantBadge.findFirstOrThrow({
    where: { userId: participantUser.id, badge: { slug: "rank-ai-ready-professional" } },
  });
  const expiredAt = new Date(Date.now() - 60_000);
  await prisma.participantBadge.update({
    where: { id: expiredRank.id },
    data: { expiresAt: expiredAt },
  });
  const unrelatedReviewForm = formFor(firstPage, 9);
  await unrelatedReviewForm.locator('select[name="status"]').selectOption("HOLD");
  await unrelatedReviewForm.getByRole("button", { name: /save review/i }).click();
  const stillExpired = await prisma.participantBadge.findUniqueOrThrow({
    where: { id: expiredRank.id },
  });
  expect(stillExpired.verificationCode).toBe(expiredRank.verificationCode);
  expect(stillExpired.expiresAt?.getTime()).toBe(expiredAt.getTime());
  const expiredRankVerification = await firstPage.request.get(
    `/api/verify/${expiredRank.verificationCode}`,
  );
  expect(await expiredRankVerification.json()).toMatchObject({ ok: true, status: "EXPIRED" });
  await firstPage.close();
  await secondPage.close();
});

test("public credential lookup handles invalid, oversized, and repeated code searches generically", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/verify");

  await expect(page.getByRole("heading", { name: /verify a tenxpros credential/i })).toBeVisible();
  const codeInput = page.getByLabel("Credential code");
  await expect(codeInput).toBeVisible();
  await expect(page.getByRole("button", { name: /verify credential/i })).toBeVisible();
  await expect(page.locator("body")).not.toHaveCSS("overflow-x", "scroll");

  const invalidCode = `unknown-${runId}`;
  const invalidLegacyResponse = await page.request.get(`/verify/${invalidCode}`);
  const invalidLegacyBody = await invalidLegacyResponse.text();
  expect(invalidLegacyResponse.status()).toBe(404);
  expect(invalidLegacyResponse.headers()["content-security-policy"]).toContain("default-src 'self'");
  expect(invalidLegacyResponse.headers()["x-content-type-options"]).toBe("nosniff");
  expect(invalidLegacyBody).toMatch(/404|not found/i);
  expect(invalidLegacyBody).toMatch(/<meta[^>]+name="robots"[^>]+content="noindex"/i);
  expect(invalidLegacyBody).not.toMatch(/PrismaClient|participantBadge\.findUnique|database error/i);
  expect((await page.request.head(`/verify/${invalidCode}`)).status()).toBe(404);
  const invalidApiResponse = await page.request.get(`/api/verify/${invalidCode}`);
  expect(invalidApiResponse.status()).toBe(404);
  expect(await invalidApiResponse.json()).toEqual({ ok: false, error: "Badge not found" });
  expect((await page.request.get(`/verify?code=${invalidCode}`)).status()).toBe(200);

  const invalidLegacyNavigation = await page.goto(`/verify/${invalidCode}`);
  expect(invalidLegacyNavigation?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: /page not found/i })).toBeVisible();
  await expect(page.locator("body")).not.toContainText(invalidCode);
  await page.goto("/verify");

  await codeInput.fill(`  ${invalidCode}  `);
  await Promise.all([
    page.waitForURL((url) => url.pathname === "/verify" && url.searchParams.has("code")),
    page.getByRole("button", { name: /verify credential/i }).click(),
  ]);
  await expect(page.getByTestId("credential-verification-invalid")).toBeVisible();
  await expect(page.getByRole("heading", { name: /credential not verified/i })).toBeVisible();
  await expect(page.getByTestId("credential-verification-result")).toHaveCount(0);
  await expect(page.getByLabel("Credential code")).toHaveValue("");

  await page.goto(`/verify?code=${"x".repeat(129)}`);
  await expect(page.getByTestId("credential-verification-invalid")).toBeVisible();
  await expect(page.getByTestId("credential-verification-result")).toHaveCount(0);
  await expect(page.getByLabel("Credential code")).toHaveValue("");

  await page.goto("/verify?code=first-value&code=second-value");
  await expect(page.getByTestId("credential-verification-invalid")).toBeVisible();
  await expect(page.getByTestId("credential-verification-result")).toHaveCount(0);
  await expect(page.getByLabel("Credential code")).toHaveValue("");
});

test("certification downgrade and expiry immediately change public verification", async ({ page, browser }) => {
  test.setTimeout(120_000);
  const admin = await createLoginUser("ADMIN", "credential-admin", "CredentialAdmin123!");
  const participantUser = await createLoginUser("PARTICIPANT", "credential-user", "CredentialUser123!");
  const start = new Date();
  const participant = await prisma.participantProfile.create({
    data: {
      userId: participantUser.id,
      tier: "FOUNDING",
      startsAt: start,
      expectedEndAt: new Date(start.getTime() + 90 * 86_400_000),
      status: "UNDER_REVIEW",
    },
  });
  await prisma.badge.upsert({
    where: { slug: "capstone-certified-tenxpro-seal" },
    update: { isActive: true, category: "CAPSTONE" },
    create: {
      slug: "capstone-certified-tenxpro-seal",
      name: "Certified TenXPro Capstone Seal",
      description: "Security regression capstone credential.",
      category: "CAPSTONE",
    },
  });
  const moduleBadge = await prisma.badge.upsert({
    where: { slug: "module-1-tenx-mindset-badge" },
    update: { isActive: true, category: "MODULE", name: "TenX Mindset Badge" },
    create: {
      slug: "module-1-tenx-mindset-badge",
      name: "TenX Mindset Badge",
      description: "Non-capstone badge used to prove stale certification details stay private.",
      category: "MODULE",
    },
  });
  const moduleCredential = await prisma.participantBadge.create({
    data: { userId: participantUser.id, badgeId: moduleBadge.id, isPublic: true },
  });
  const moduleRecord = await prisma.module.upsert({
    where: { number_version: { number: 91, version: 1 } },
    update: { badgeName: "TenX Mindset Badge", isActive: true },
    create: {
      number: 91,
      version: 1,
      phase: "FRAME",
      title: "Security Regression Module",
      coreQuestion: "Does current module state govern its public badge?",
      description: "Disposable module for credential lifecycle regression coverage.",
      learningObjectives: [],
      contentMaterials: [],
      exercises: [],
      artifactTemplate: "Disposable security artifact.",
      passCriteria: "Pass state must be current.",
      badgeName: "TenX Mindset Badge",
      estimatedHours: 1,
    },
  });
  const participantModule = await prisma.participantModule.create({
    data: {
      participantId: participant.id,
      moduleId: moduleRecord.id,
      moduleVersion: moduleRecord.version,
      status: "PASSED",
      passedAt: start,
    },
  });

  await login(page, admin.email, "CredentialAdmin123!", `/admin/certifications/${participant.id}`);
  await saveCertification(page, "CERTIFIED");
  const activeBadge = await prisma.participantBadge.findFirstOrThrow({
    where: { userId: participantUser.id, badge: { slug: "capstone-certified-tenxpro-seal" } },
  });
  let verification = await page.request.get(`/api/verify/${activeBadge.verificationCode}`);
  expect(verification.status()).toBe(200);
  expect(await verification.json()).toMatchObject({ ok: true, status: "ACTIVE" });

  const publicVerificationPage = await browser.newPage();
  await publicVerificationPage.goto("/verify");
  await publicVerificationPage.getByLabel("Credential code").fill(`  ${activeBadge.verificationCode}  `);
  await Promise.all([
    publicVerificationPage.waitForURL(
      (url) => url.pathname === "/verify" && url.searchParams.has("code"),
    ),
    publicVerificationPage.getByRole("button", { name: /verify credential/i }).click(),
  ]);
  await expect(
    publicVerificationPage.getByRole("heading", { name: /certified tenxpro capstone seal/i }),
  ).toBeVisible();
  await expect(publicVerificationPage.getByLabel("Credential status: ACTIVE")).toBeVisible();
  await expect(publicVerificationPage.getByText(participantUser.name ?? "Security credential-user")).toBeVisible();
  await expect(publicVerificationPage.getByText(activeBadge.verificationCode)).toBeVisible();
  expect(await publicVerificationPage.content()).not.toContain(participantUser.email);

  const activeLegacyResponse = await publicVerificationPage.goto(
    `/verify/${activeBadge.verificationCode}`,
  );
  expect(activeLegacyResponse?.status()).toBe(200);
  await expect(publicVerificationPage.getByLabel("Credential status: ACTIVE")).toBeVisible();
  await expect(publicVerificationPage.getByText(activeBadge.verificationCode)).toBeVisible();

  await publicVerificationPage.goto(
    `/verify?code=${activeBadge.verificationCode}&code=another-value`,
  );
  await expect(publicVerificationPage.getByTestId("credential-verification-invalid")).toBeVisible();
  await expect(publicVerificationPage.getByTestId("credential-verification-result")).toHaveCount(0);
  if (participantUser.name) {
    await expect(publicVerificationPage.getByText(participantUser.name, { exact: true })).toHaveCount(0);
  }

  const review = await prisma.certificationReview.findUniqueOrThrow({ where: { participantId: participant.id } });
  const activeCertificate = await page.request.get(`/certificate/${review.id}`);
  expect(await activeCertificate.text()).toContain(participantUser.name);
  await prisma.participantBadge.update({ where: { id: activeBadge.id }, data: { isPublic: false } });
  verification = await page.request.get(`/api/verify/${activeBadge.verificationCode}`);
  expect(await verification.json()).toMatchObject({ ok: true, status: "PRIVATE", recipient: { name: null } });
  expect((await page.request.get(`/verify/${activeBadge.verificationCode}`)).status()).toBe(200);
  await publicVerificationPage.goto(`/verify?code=${activeBadge.verificationCode}`);
  await expect(publicVerificationPage.getByLabel("Credential status: PRIVATE")).toBeVisible();
  await expect(publicVerificationPage.getByText("Private", { exact: true })).toBeVisible();
  if (participantUser.name) {
    await expect(publicVerificationPage.getByText(participantUser.name, { exact: true })).toHaveCount(0);
  }
  expect(await publicVerificationPage.content()).not.toContain(participantUser.email);
  expect(await publicVerificationPage.content()).not.toContain("Security engineering");
  expect(await publicVerificationPage.content()).not.toContain("Authorization integrity");
  await expectCertificateUnavailable(page, review.id, participantUser);
  await prisma.participantBadge.update({ where: { id: activeBadge.id }, data: { isPublic: true } });

  await prisma.directoryProfile.update({ where: { userId: participantUser.id }, data: { isPublic: true } });
  await saveCertification(page, "CONDITIONALLY_CERTIFIED");
  const revoked = await prisma.participantBadge.findUniqueOrThrow({ where: { id: activeBadge.id } });
  expect(revoked.status).toBe("REVOKED");
  expect(revoked.revokedAt).not.toBeNull();
  expect((await page.request.get(`/verify/${activeBadge.verificationCode}`)).status()).toBe(200);
  await publicVerificationPage.goto(`/verify?code=${activeBadge.verificationCode}`);
  await expect(publicVerificationPage.getByLabel("Credential status: REVOKED")).toBeVisible();
  if (participantUser.name) {
    await expect(publicVerificationPage.getByText(participantUser.name, { exact: true })).toBeVisible();
  }
  expect(await publicVerificationPage.content()).not.toContain(participantUser.email);
  expect(await publicVerificationPage.content()).not.toContain("Security engineering");
  expect(await publicVerificationPage.content()).not.toContain("Authorization integrity");
  if (revoked.revocationReason) {
    expect(await publicVerificationPage.content()).not.toContain(revoked.revocationReason);
  }
  expect((await prisma.directoryProfile.findUniqueOrThrow({ where: { userId: participantUser.id } })).isPublic).toBe(false);
  const participantPage = await browser.newPage();
  const participantBoundary = waitForFreshBoundary(participantPage, "portal");
  await login(participantPage, participantUser.email, "CredentialUser123!", "/portal/profile");
  await participantBoundary;
  const directoryForm = participantPage.locator('form:has(input[name="isPublic"])');
  await directoryForm.locator('input[name="isPublic"]').check();
  const rejectedPublish = participantPage.waitForResponse(
    (response) => response.request().method() === "POST" && response.url().includes("/portal/profile"),
  );
  await directoryForm.getByRole("button", { name: /save profile/i }).click();
  await rejectedPublish;
  await expect.poll(async () =>
    (await prisma.directoryProfile.findUniqueOrThrow({ where: { userId: participantUser.id } })).isPublic,
  ).toBe(false);

  const moduleBoundary = waitForFreshBoundary(participantPage, "portal");
  await participantPage.goto(`/portal/modules/${participantModule.id}`);
  await moduleBoundary;
  await participantPage.locator('textarea[name="artifactContent"]').fill(
    "A malicious resubmission attempt must not regress a module that has already been reviewed and passed, or leave its public credential stale.",
  );
  const submitArtifact = participantPage.getByRole("button", {
    name: /submit artifact for review/i,
  });
  await expect(submitArtifact).toBeDisabled();
  const rejectedResubmission = participantPage.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      response.url().includes(`/portal/modules/${participantModule.id}`),
  );
  await submitArtifact.evaluate((button: HTMLButtonElement) => {
    button.disabled = false;
    button.form?.requestSubmit(button);
  });
  await rejectedResubmission;
  expect(
    (await prisma.participantModule.findUniqueOrThrow({ where: { id: participantModule.id } })).status,
  ).toBe("PASSED");
  expect(
    (await prisma.participantBadge.findUniqueOrThrow({ where: { id: moduleCredential.id } })).status,
  ).toBe("ACTIVE");
  await participantPage.close();
  // Even a stale/out-of-band public-directory flag cannot make downgraded
  // certification identity fields public through another still-active badge.
  await prisma.directoryProfile.update({
    where: { userId: participantUser.id },
    data: { isPublic: true },
  });
  verification = await page.request.get(`/api/verify/${activeBadge.verificationCode}`);
  expect(await verification.json()).toMatchObject({
    ok: true,
    status: "REVOKED",
    recipient: { field: null, specialization: null },
  });
  const moduleVerification = await page.request.get(`/api/verify/${moduleCredential.verificationCode}`);
  expect(await moduleVerification.json()).toMatchObject({
    ok: true,
    status: "ACTIVE",
    recipient: {
      publicTitle: null,
      directorySlug: null,
      field: null,
      specialization: null,
    },
  });
  await prisma.directoryProfile.update({
    where: { userId: participantUser.id },
    data: { isPublic: false },
  });
  await expectCertificateUnavailable(page, review.id, participantUser);

  await saveCertification(page, "CERTIFIED");
  const reissued = await prisma.participantBadge.findUniqueOrThrow({ where: { id: activeBadge.id } });
  expect(reissued).toMatchObject({ status: "ACTIVE", revokedAt: null, revocationReason: null });
  expect(reissued.verificationCode).not.toBe(activeBadge.verificationCode);
  expect((await page.request.get(`/api/verify/${activeBadge.verificationCode}`)).status()).toBe(404);
  await publicVerificationPage.goto(`/verify?code=${activeBadge.verificationCode}`);
  await expect(publicVerificationPage.getByTestId("credential-verification-invalid")).toBeVisible();
  await expect(publicVerificationPage.getByTestId("credential-verification-result")).toHaveCount(0);
  const retiredDirectResponse = await publicVerificationPage.request.get(
    `/verify/${activeBadge.verificationCode}`,
  );
  const retiredDirectBody = await retiredDirectResponse.text();
  expect(retiredDirectResponse.status()).toBe(404);
  expect(retiredDirectBody).toMatch(/404|not found/i);
  expect(retiredDirectBody).not.toContain(participantUser.email);
  if (participantUser.name) expect(retiredDirectBody).not.toContain(participantUser.name);
  await prisma.participantBadge.update({
    where: { id: activeBadge.id },
    data: { expiresAt: new Date(Date.now() - 1_000) },
  });
  verification = await page.request.get(`/api/verify/${reissued.verificationCode}`);
  expect(await verification.json()).toMatchObject({ ok: true, status: "EXPIRED" });
  expect((await page.request.get(`/verify/${reissued.verificationCode}`)).status()).toBe(200);
  await publicVerificationPage.goto(`/verify?code=${reissued.verificationCode}`);
  await expect(publicVerificationPage.getByLabel("Credential status: EXPIRED")).toBeVisible();
  expect(await publicVerificationPage.content()).not.toContain(participantUser.email);
  await expectCertificateUnavailable(page, review.id, participantUser);

  await prisma.participantBadge.update({
    where: { id: reissued.id },
    data: { expiresAt: null },
  });
  await prisma.badge.update({
    where: { id: reissued.badgeId },
    data: { isActive: false },
  });
  const inactiveDirectResponse = await page.request.get(`/verify/${reissued.verificationCode}`);
  expect(inactiveDirectResponse.status()).toBe(200);
  expect(await inactiveDirectResponse.text()).toContain("Credential status: INACTIVE");
  await publicVerificationPage.goto(`/verify?code=${reissued.verificationCode}`);
  await expect(publicVerificationPage.getByLabel("Credential status: INACTIVE")).toBeVisible();
  await publicVerificationPage.close();

  // Module/rank credentials are also current-state facts: withdrawing the
  // module pass revokes its public badge rather than leaving it ACTIVE forever.
  const participantAdminBoundary = waitForFreshBoundary(page, "admin");
  await page.goto(`/admin/participants/${participant.id}`);
  await participantAdminBoundary;
  const moduleReviewForm = page.locator(
    `form:has(input[name="participantModuleId"][value="${participantModule.id}"])`,
  );
  await moduleReviewForm.locator('select[name="status"]').selectOption("REVISE");
  await moduleReviewForm.getByRole("button", { name: /save review/i }).click();
  await expect.poll(async () =>
    (await prisma.participantBadge.findUniqueOrThrow({ where: { id: moduleCredential.id } })).status,
  ).toBe("REVOKED");
  const revokedModuleVerification = await page.request.get(
    `/api/verify/${moduleCredential.verificationCode}`,
  );
  expect(await revokedModuleVerification.json()).toMatchObject({
    ok: true,
    status: "REVOKED",
    recipient: { field: null, specialization: null },
  });
});

async function createLoginUser(role: UserRole, label: string, password: string) {
  const user = await prisma.user.create({
    data: {
      email: `security.${label}.${runId}@tenxpros.test`,
      name: `Security ${label}`,
      role,
      passwordHash: await hash(password, 12),
      emailVerified: new Date(),
    },
  });
  return user;
}

async function login(page: Page, email: string, password: string, destination: string) {
  await page.goto(`/login?callbackUrl=${encodeURIComponent(destination)}`);
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await Promise.all([
    page.waitForURL((url) => url.pathname === destination || url.pathname.startsWith(`${destination}/`)),
    page.getByRole("button", { name: /sign in/i }).click(),
  ]);
}

function waitForFreshBoundary(page: Page, surface: "admin" | "partner" | "portal") {
  return page.waitForResponse(
    (response) => response.url().includes(`/api/auth/fresh?surface=${surface}`) && response.status() === 204,
  );
}

async function expectCertificateUnavailable(
  page: Page,
  reviewId: string,
  participant: { name: string | null; email: string },
) {
  // Next.js streams dynamic notFound() pages with a soft HTTP 200. Assert the
  // rendered 404 state and, critically, that no recipient or credential data is
  // present in the response body.
  const response = await page.request.get(`/certificate/${reviewId}`);
  const body = await response.text();
  expect(body).toMatch(/404|not found/i);
  expect(body).not.toContain(participant.email);
  if (participant.name) expect(body).not.toContain(participant.name);
  expect(body).not.toContain("Security engineering");
  expect(body).not.toContain("Authorization integrity");
}

async function submitApplicationForm(page: Page, email: string, fullName: string) {
  await page.goto("/apply");
  await page.locator('input[name="fullName"]').fill(fullName);
  await page.locator('input[name="email"]').fill(email);
  await page.locator('select[name="country"]').selectOption("United States");
  await page.locator('input[name="phone"]').fill("+1 415 555 0123");
  await page.locator('input[name="professionalRole"]').fill("Security reviewer");
  await page.locator('input[name="domain"]').fill("Identity security");
  await page.locator('input[name="linkedinUrl"]').fill("https://www.linkedin.com/in/security-regression");
  await page.locator('select[name="aiExperience"]').selectOption("ADVANCED");
  await page.locator('select[name="dataSensitivity"]').selectOption("HIGH");
  await page.locator('select[name="timeAvailability"]').selectOption("HOURS_8");
  await page.locator('textarea[name="whyTenXPros"]').fill(
    "This deliberately adversarial submission verifies that a public form cannot mutate an existing protected account or any authorization-sensitive identity field.",
  );
  await page.locator('textarea[name="realProblemBrief"]').fill(
    "The security regression exercises identity collision handling with a protected email while preserving all account fields and linked authorization state.",
  );
  await page.locator('input[name="consentConfidentiality"]').check();
  await page.locator('input[name="consentTerms"]').check();
  await page.getByRole("button", { name: /submit application/i }).click();
}

async function saveCertification(page: Page, outcome: string) {
  await page.locator('select[name="outcome"]').selectOption(outcome);
  await page.locator('input[name="field"]').fill("Security engineering");
  await page.locator('input[name="specialization"]').fill("Authorization integrity");
  await page.locator('textarea[name="reviewerNotes"]').fill(`Security regression decision: ${outcome}`);
  await page.getByRole("button", { name: /save certification decision/i }).click();
  await expect.poll(async () => {
    const participantId = await page.locator('input[name="participantId"]').inputValue();
    return (await prisma.certificationReview.findUnique({ where: { participantId } }))?.outcome;
  }).toBe(outcome);
}
