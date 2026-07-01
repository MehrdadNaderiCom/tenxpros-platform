"use server";

import { prisma } from "@/lib/prisma";
import { requirePartner } from "@/lib/partner/auth";
import { requireAdminUser } from "@/lib/authz";
import { supportTicketSchema } from "@/lib/validations/partner";
import { recordAudit } from "@/lib/partner/audit";
import { safeRevalidatePath } from "@/lib/partner/revalidate";
import { notifyOwner } from "@/lib/services/owner-notify";

/**
 * A partner files a support report. The ticket is stored and also emailed to the
 * program owner (mail@mehrdadnaderi.com via notifyOwner), so nothing is missed.
 */
export async function submitSupportTicket(formData: FormData) {
  const { partner } = await requirePartner();
  const parsed = supportTicketSchema.safeParse({
    subject: formData.get("subject"),
    body: formData.get("body"),
  });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Please check the form." };
  }
  const { subject, body } = parsed.data;

  const ticket = await prisma.partnerSupportTicket.create({
    data: { partnerId: partner.id, subject, body },
  });
  await prisma.partner.update({ where: { id: partner.id }, data: { lastActivityAt: new Date() } });
  await recordAudit({
    actorId: partner.userId,
    actorRole: "PARTNER",
    action: "SUPPORT_TICKET_SUBMITTED",
    entity: "PartnerSupportTicket",
    entityId: ticket.id,
    after: { subject },
  });
  await notifyOwner({
    subject: `Partner support: ${subject}`,
    template: "owner_support_ticket",
    body:
      `${partner.displayName} (${partner.contactEmail}) filed a support report.\n\n` +
      `Subject: ${subject}\n\n${body}`,
    href: "/admin/partners/support",
  });
  safeRevalidatePath("/partner/support");
  safeRevalidatePath("/admin/partners/support");
  return { ok: true };
}

/** Mark a support ticket resolved or reopen it (admin). */
export async function setSupportTicketStatus(formData: FormData) {
  const admin = await requireAdminUser();
  const id = String(formData.get("ticketId") ?? "");
  const resolve = String(formData.get("resolve") ?? "") === "true";
  if (!id) throw new Error("Missing ticket id.");
  await prisma.partnerSupportTicket.update({
    where: { id },
    data: { status: resolve ? "RESOLVED" : "OPEN", resolvedAt: resolve ? new Date() : null },
  });
  await recordAudit({
    actorId: admin.id,
    actorRole: admin.role,
    action: resolve ? "SUPPORT_TICKET_RESOLVED" : "SUPPORT_TICKET_REOPENED",
    entity: "PartnerSupportTicket",
    entityId: id,
  });
  safeRevalidatePath("/admin/partners/support");
  safeRevalidatePath("/partner/support");
}
