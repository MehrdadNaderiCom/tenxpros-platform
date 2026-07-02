"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePartner } from "@/lib/partner/auth";

/** Mark a single partner notification as read. */
export async function markPartnerNotificationRead(formData: FormData) {
  const { partner } = await requirePartner();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await prisma.partnerNotification.updateMany({
    where: { id, partnerId: partner.id, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });
  revalidatePath("/partner/notifications");
  revalidatePath("/partner");
}

/** Mark every unread partner notification as read. */
export async function markAllPartnerNotificationsRead() {
  const { partner } = await requirePartner();
  await prisma.partnerNotification.updateMany({
    where: { partnerId: partner.id, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });
  revalidatePath("/partner/notifications");
  revalidatePath("/partner");
}

/** Unread notification count for the partner nav badge. Scoped to the session
 *  partner, so it can never return another partner's count. */
export async function partnerUnreadCount(): Promise<number> {
  const { partner } = await requirePartner();
  return prisma.partnerNotification.count({ where: { partnerId: partner.id, isRead: false } });
}
