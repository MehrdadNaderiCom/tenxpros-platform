import { prisma } from "@/lib/prisma";
import type { EffectiveConfig } from "./config";
import { normalizeDomain } from "./commission";
import { addMonths } from "./rules";

/**
 * Growth Bonus counter, by canonical domain (spec 4.7). Counts DISTINCT genuinely
 * new B2B organizations the partner originated, evidenced by a non-reversed
 * new-company (STRONG_ORIGINATION) origination line from the Phase B classifier,
 * closed AND collected (paymentClearedAt) within the rolling tierQualifyingWindow,
 * deduplicated by normalized domain. A deal with no recorded domain never counts.
 *
 * Plain server module (not a server action), so it can be reused by the admin page's
 * rate preview without exposing an unauthenticated endpoint.
 */
export async function countNewCompanyDomainsRolling(partnerId: string, now: Date, cfg: EffectiveConfig): Promise<number> {
  const windowStart = addMonths(now, -cfg.tierQualifyingWindowMonths);
  const deals = await prisma.closedDeal.findMany({
    where: {
      partnerId,
      dealType: "B2B",
      domain: { not: null },
      paymentClearedAt: { gte: windowStart },
      commissions: { some: { function: "STRONG_ORIGINATION", status: { notIn: ["REVERSED"] } } },
    },
    select: { domain: true },
  });
  const domains = new Set<string>();
  for (const d of deals) {
    const norm = normalizeDomain(d.domain);
    if (norm) domains.add(norm);
  }
  return domains.size;
}
