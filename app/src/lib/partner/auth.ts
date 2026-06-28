import type { Partner } from "@prisma/client";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isSuperAdmin } from "@/lib/authz";

/**
 * Partner Panel access control. A Partner Panel user is a logged-in account whose
 * `User` is linked to a `Partner` that is approved (not a bare applicant and not
 * terminated). Every partner server action resolves the partner FROM THE SESSION
 * — never from a client-supplied id — so a partner can only ever act on their own
 * records (no IDOR).
 *
 * A super admin may additionally PREVIEW a partner's panel read-only via the
 * PARTNER_VIEW_COOKIE (set by the admin "Open panel" button). The preview is
 * honored only by getCurrentPartner (panel reads), never by getSessionPartner /
 * requirePartner (mutations), so it can never be used to act as the partner.
 */

export type SessionUser = { id: string; email: string | null; name: string | null; role: string };

export const PARTNER_VIEW_COOKIE = "tenx_view_partner";

const ACTIVE_PARTNER_STATUSES = ["PILOT", "TIER1", "TIER2", "TIER3", "INACTIVE"] as const;

/** Strict, session-only resolution. The basis for every mutating action. */
export async function getSessionPartner(): Promise<{ user: SessionUser; partner: Partner } | null> {
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
 * The partner whose panel to DISPLAY. Same as getSessionPartner for a real
 * partner; for a super admin with an active preview cookie it returns the
 * targeted partner (read-only) with preview=true. Never use this for mutations.
 */
export async function getCurrentPartner(): Promise<
  ({ user: SessionUser; partner: Partner; preview?: boolean }) | null
> {
  const session = await auth();
  if (!session?.user?.id) return null;
  if (isSuperAdmin(session.user.email)) {
    const viewId = (await cookies()).get(PARTNER_VIEW_COOKIE)?.value;
    if (viewId) {
      const partner = await prisma.partner.findUnique({ where: { id: viewId } });
      if (partner) {
        return {
          user: {
            id: session.user.id,
            email: session.user.email ?? null,
            name: session.user.name ?? null,
            role: session.user.role,
          },
          partner,
          preview: true,
        };
      }
    }
  }
  return getSessionPartner();
}

/**
 * Require an approved partner FROM THE SESSION. Throws if the caller is not a
 * partner or is only an applicant / terminated. Used by every partner-portal
 * server action — it ignores the preview cookie, so a previewing super admin can
 * never mutate the viewed partner's records.
 */
export async function requirePartner(): Promise<{ user: SessionUser; partner: Partner }> {
  const current = await getSessionPartner();
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
