import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isSuperAdmin } from "@/lib/authz";

/**
 * Read-only super-admin portal preview.
 *
 * The portal pages resolve "the current participant" by this userId. A super
 * admin with an active preview cookie (set by the admin "Open portal" button)
 * reads the targeted participant; everyone else reads themselves. Mutating
 * participant actions do NOT use this, they read the raw session, so the
 * preview is strictly read-only and a real participant never sees any change.
 */

export const PARTICIPANT_VIEW_COOKIE = "tenx_view_participant";

export async function resolvePortalUserId(): Promise<string | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  if (isSuperAdmin(session.user.email)) {
    const viewId = (await cookies()).get(PARTICIPANT_VIEW_COOKIE)?.value;
    if (viewId) {
      const target = await prisma.participantProfile.findUnique({ where: { id: viewId }, select: { userId: true } });
      if (target?.userId) return target.userId;
    }
  }
  return session.user.id;
}

/**
 * The active super-admin preview (or null). Used by the portal layout to allow a
 * super admin through and show the read-only banner with the participant's name.
 */
export async function getPortalPreview(): Promise<{ name: string } | null> {
  const session = await auth();
  if (!session?.user?.id || !isSuperAdmin(session.user.email)) return null;
  const viewId = (await cookies()).get(PARTICIPANT_VIEW_COOKIE)?.value;
  if (!viewId) return null;
  const target = await prisma.participantProfile.findUnique({
    where: { id: viewId },
    select: { user: { select: { name: true, email: true } } },
  });
  if (!target) return null;
  return { name: target.user?.name ?? target.user?.email ?? "participant" };
}
