import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function readSource(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("ClosedDeal post-close lifecycle security", () => {
  const lifecycle = readSource("src/lib/partner/deal-lifecycle.ts");
  const action = readSource("src/lib/actions/partner-admin.ts");
  const page = readSource("src/app/(admin)/admin/partners/[id]/page.tsx");
  const migration = readSource("prisma/migrations/20260807030000_security_integrity_hardening/migration.sql");

  it("serializes set-once milestone writes and records their audit in the same transaction", () => {
    expect(lifecycle).toContain("await lockClosedDealForFinancialWrite(tx, input.closedDealId)");
    expect(lifecycle).toContain("resolveSetOnceMilestone");
    expect(lifecycle).toContain("if (!changed)");
    expect(lifecycle).toContain("const refundCount = await tx.refundEvent.count");
    expect(lifecycle).toContain("Deal milestones are locked after a refund event");
    expect(lifecycle).toContain('action: "CLOSED_DEAL_MILESTONES_RECORDED"');
    expect(lifecycle).toContain("await tx.auditLog.create");
  });

  it("exposes only a DB-backed admin action for milestones that are still missing", () => {
    expect(action).toContain("const admin = await requireAdminUser()");
    expect(action).toContain("recordClosedDealMilestonesAtomically(prisma");
    expect(page).toContain("action={recordClosedDealMilestones}");
    expect(page).toContain("deal.deliveredAt === null");
    expect(page).toContain("deal.paymentClearedAt === null");
    expect(page).toContain("deal.refundEvents.length === 0");
    expect(page).toContain("Set once; later corrections require a new audited process.");
  });

  it("keeps the database ledger immutable except for tightly scoped set-once facts", () => {
    expect(migration).toContain('CREATE OR REPLACE FUNCTION "enforce_closed_deal_immutability"()');
    expect(migration).toContain("to_jsonb(NEW) - 'deliveredAt' - 'paymentClearedAt' - 'conversionDate' - 'updatedAt'");
    expect(migration).toContain('OLD."deliveredAt" IS NOT NULL');
    expect(migration).toContain('OLD."paymentClearedAt" IS NOT NULL');
    expect(migration).toContain('NEW."conversionDate" IS DISTINCT FROM NEW."paymentClearedAt"');
    expect(migration).toContain('WHERE refund."closedDealId" = OLD."id"');
    expect(migration).toContain("ClosedDeal milestones are frozen after refund activity");
    expect(migration).toContain("DELETE is not allowed");
  });
});
