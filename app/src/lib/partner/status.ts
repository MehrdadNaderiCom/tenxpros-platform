/**
 * Partner status predicates, kept in a dependency free module (no next/headers,
 * auth, or prisma imports) so the same active status rule can be reused by the
 * session helpers, the toolkit download route, and any other server code, and
 * unit tested in isolation.
 */

/**
 * The partner statuses that may access the Partner Panel at all: approved and not
 * terminated. A bare applicant and a terminated partner are excluded. This single
 * source of truth gates BOTH mutations (requirePartner) and panel reads
 * (getCurrentPartner) so the two can never drift: if you cannot act, you cannot
 * read either.
 */
export const ACTIVE_PARTNER_STATUSES = ["PILOT", "TIER1", "TIER2", "TIER3", "INACTIVE"] as const;

export function isActivePartnerStatus(status: string): boolean {
  return (ACTIVE_PARTNER_STATUSES as readonly string[]).includes(status);
}
