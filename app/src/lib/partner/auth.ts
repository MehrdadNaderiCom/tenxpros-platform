import type { Partner } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Partner Panel access control. A Partner Panel user is a logged-in account whose
 * `User` is linked to a `Partner` that is approved (not a bare applicant and not
 * terminated). Every partner server action resolves the partner FROM THE SESSION
 * — never from a client-supplied id — so a partner can only ever act on their own
 * records (no IDOR).
 */

export type SessionUser = { id: string; email: string | null; name: string | null; role: string };

const ACTIVE_PARTNER_STATUSES = ["PILOT", "TIER1", "TIER2", "TIER3", "INACTIVE"] as const;

/** The current partner for the session, or null if the user is not a partner. */
export async function getCurrentPartner(): Promise<{ user: SessionUser; partner: Partner } | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  const partner = await prisma.partner.findUnique({ where: { userId: session.user.id } });
  if (!partner) return null;
  return {
    user: {
      id: session.user.id,
      email: session.user.email ?? null,
      name: session.user.name ?? null,
      role: session.user.role,
    },
    partner,
  };
}

/**
 * Require an approved partner. Throws if the caller is not a partner or is only
 * an applicant / terminated. Used by every partner-portal server action.
 */
export async function requirePartner(): Promise<{ user: SessionUser; partner: Partner }> {
  const current = await getCurrentPartner();
  if (!current) throw new Error("Partner access required.");
  if (!(ACTIVE_PARTNER_STATUSES as readonly string[]).includes(current.partner.status)) {
    throw new Error("Your partner account is not active.");
  }
  return current;
}

/** Whether the partner has passed the Activation Gate (required before outreach). */
export function isActivated(partner: Partner): boolean {
  return Boolean(partner.activationGatePassedAt);
}
