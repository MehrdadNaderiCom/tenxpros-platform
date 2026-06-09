/**
 * Shared admin analytics/report metrics. Read-only aggregate queries over
 * existing data (no schema changes), used by the Analytics and Reports pages so
 * the numbers are computed once and stay consistent.
 */
import { prisma } from "@/lib/prisma";

export type CountByKey = { total: number; byKey: Record<string, number> };

function countMap<T extends { _count: { _all: number } }>(rows: T[], keyOf: (row: T) => string): CountByKey {
  const byKey: Record<string, number> = {};
  let total = 0;
  for (const row of rows) {
    const key = keyOf(row);
    byKey[key] = (byKey[key] ?? 0) + row._count._all;
    total += row._count._all;
  }
  return { total, byKey };
}

export async function applicationCounts(): Promise<CountByKey> {
  const rows = await prisma.application.groupBy({ by: ["status"], _count: { _all: true } });
  return countMap(rows, (r) => r.status);
}

export async function participantCounts(): Promise<CountByKey> {
  const rows = await prisma.participantProfile.groupBy({ by: ["status"], _count: { _all: true } });
  return countMap(rows, (r) => r.status);
}

export async function certificationCounts(): Promise<CountByKey> {
  const rows = await prisma.certificationReview.groupBy({ by: ["outcome"], _count: { _all: true } });
  return countMap(rows, (r) => r.outcome);
}

export async function emailCounts(): Promise<CountByKey> {
  const rows = await prisma.emailEvent.groupBy({ by: ["status"], _count: { _all: true } });
  return countMap(rows, (r) => r.status);
}

export type PaymentSummary = {
  byStatus: Record<string, { count: number; amount: number }>;
  collected: number;
  outstanding: number;
};

export async function paymentSummary(): Promise<PaymentSummary> {
  const rows = await prisma.paymentRecord.groupBy({
    by: ["status"],
    _count: { _all: true },
    _sum: { amount: true },
  });
  const byStatus: Record<string, { count: number; amount: number }> = {};
  let collected = 0;
  let outstanding = 0;
  for (const row of rows) {
    const amount = row._sum.amount ?? 0;
    byStatus[row.status] = { count: row._count._all, amount };
    if (row.status === "PAID") collected += amount;
    if (row.status === "PENDING" || row.status === "INSTRUCTIONS_SENT") outstanding += amount;
  }
  return { byStatus, collected, outstanding };
}
