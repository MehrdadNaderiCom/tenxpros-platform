"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/authz";
import { absoluteUrl } from "@/lib/utils";
import { safeSendEmail } from "@/lib/services/email";
import { newsletterCampaignEmail } from "@/lib/email/templates";
import { subscribe, resolveRecipients, normalizeEmail, isValidEmail } from "@/lib/newsletter/service";

const SUBSCRIBE_MESSAGE: Record<string, string> = {
  subscribed: "You are subscribed. Thank you for joining the TenXPros newsletter.",
  resubscribed: "Welcome back. Your subscription has been reactivated.",
  already: "You are already subscribed. Thank you.",
  invalid: "Please enter a valid email address.",
};

/** Public homepage subscribe. Dup-safe and idempotent. */
export async function subscribeNewsletter(email: string): Promise<{ ok: boolean; result: string; message: string }> {
  const result = await subscribe(email, "homepage");
  return { ok: result !== "invalid", result, message: SUBSCRIBE_MESSAGE[result] };
}

// --- Admin: subscribers ---------------------------------------------------

export async function adminAddSubscriber(formData: FormData) {
  await requireAdminUser();
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  if (isValidEmail(email)) await subscribe(email, "admin");
  revalidatePath("/admin/newsletter");
}

export async function adminSetSubscriberStatus(formData: FormData) {
  await requireAdminUser();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (id && (status === "subscribed" || status === "unsubscribed")) {
    await prisma.newsletterSubscriber.update({
      where: { id },
      data: { status, unsubscribedAt: status === "unsubscribed" ? new Date() : null },
    });
  }
  revalidatePath("/admin/newsletter");
}

// --- Admin: groups --------------------------------------------------------

export async function createNewsletterGroup(formData: FormData) {
  await requireAdminUser();
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  if (name) {
    await prisma.newsletterGroup.upsert({
      where: { name },
      update: { description },
      create: { name, description },
    });
  }
  revalidatePath("/admin/newsletter");
}

export async function deleteNewsletterGroup(formData: FormData) {
  await requireAdminUser();
  const id = String(formData.get("id") ?? "");
  if (id) await prisma.newsletterGroup.delete({ where: { id } });
  revalidatePath("/admin/newsletter");
}

export async function toggleGroupMembership(formData: FormData) {
  await requireAdminUser();
  const subscriberId = String(formData.get("subscriberId") ?? "");
  const groupId = String(formData.get("groupId") ?? "");
  const add = String(formData.get("add") ?? "") === "1";
  if (subscriberId && groupId) {
    if (add) {
      await prisma.newsletterGroupOnSubscriber.upsert({
        where: { subscriberId_groupId: { subscriberId, groupId } },
        update: {},
        create: { subscriberId, groupId },
      });
    } else {
      await prisma.newsletterGroupOnSubscriber.deleteMany({ where: { subscriberId, groupId } });
    }
  }
  revalidatePath("/admin/newsletter");
}

// --- Admin: campaigns -----------------------------------------------------

export async function createCampaign(formData: FormData) {
  const admin = await requireAdminUser();
  const subject = String(formData.get("subject") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const groupIds = formData.getAll("groupIds").map(String).filter(Boolean);
  const subscriberIds = formData.getAll("subscriberIds").map(String).filter(Boolean);
  if (subject && body) {
    await prisma.newsletterCampaign.create({
      data: {
        subject,
        bodyHtml: body,
        status: "draft",
        targetGroupIds: groupIds,
        targetSubscriberIds: subscriberIds,
        createdBy: admin.email ?? admin.id,
      },
    });
  }
  revalidatePath("/admin/newsletter");
}

export async function deleteCampaign(formData: FormData) {
  await requireAdminUser();
  const id = String(formData.get("id") ?? "");
  if (id) await prisma.newsletterCampaign.delete({ where: { id } });
  revalidatePath("/admin/newsletter");
}

/**
 * Send a campaign to its deduplicated, subscribed-only recipient set. Each email
 * carries that recipient's own one-click unsubscribe link. Reuses the existing
 * email service (no second provider), which records an EmailEvent per send.
 */
export async function sendCampaign(formData: FormData) {
  await requireAdminUser();
  const id = String(formData.get("id") ?? "");
  const campaign = await prisma.newsletterCampaign.findUnique({ where: { id } });
  if (!campaign || campaign.status === "sent") {
    revalidatePath("/admin/newsletter");
    return;
  }

  const groupIds = (campaign.targetGroupIds as unknown as string[]) ?? [];
  const subscriberIds = (campaign.targetSubscriberIds as unknown as string[]) ?? [];
  const recipients = await resolveRecipients(groupIds, subscriberIds);

  let sent = 0;
  for (const r of recipients) {
    const email = newsletterCampaignEmail({
      subject: campaign.subject,
      body: campaign.bodyHtml,
      unsubscribeUrl: absoluteUrl(`/newsletter/unsubscribe/${r.unsubToken}`),
    });
    const res = await safeSendEmail({ to: r.email, subject: email.subject, template: "newsletter_campaign", text: email.text, html: email.html });
    if (res.ok) sent += 1;
  }

  await prisma.newsletterCampaign.update({
    where: { id },
    data: { status: "sent", sentAt: new Date(), sentCount: sent },
  });
  revalidatePath("/admin/newsletter");
}
