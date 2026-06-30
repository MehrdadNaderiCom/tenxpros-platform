"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/authz";
import { absoluteUrl } from "@/lib/utils";
import { NEWSLETTER_TEMPLATE_VERSION, NEWSLETTER_UNSUB_VERSION } from "@/lib/email/newsletter-template";
import { renderCampaign, docHasContent, type TipTapDoc } from "@/lib/email/newsletter-render";
import { sendNewsletterEmail, newsletterFrom, newsletterSenderIdentity } from "@/lib/services/newsletter-email";
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
  const bodyJson = String(formData.get("bodyJson") ?? "").trim();
  const groupIds = formData.getAll("groupIds").map(String).filter(Boolean);
  const subscriberIds = formData.getAll("subscriberIds").map(String).filter(Boolean);

  let doc: TipTapDoc | null = null;
  try {
    doc = JSON.parse(bodyJson) as TipTapDoc;
  } catch {
    doc = null;
  }
  if (!subject || !docHasContent(doc)) {
    redirect("/admin/newsletter?error=empty");
  }

  // Compile once for storage/display; the body content is identical for every
  // recipient (only the per-recipient unsubscribe link in the footer differs).
  const rendered = renderCampaign(
    { bodyJson },
    { subject, unsubscribeUrl: absoluteUrl("/newsletter/unsubscribe/PREVIEW"), senderIdentity: newsletterSenderIdentity() },
  );
  const created = await prisma.newsletterCampaign.create({
    data: {
      subject,
      bodyHtml: rendered.html,
      bodyJson,
      status: "draft",
      targetGroupIds: groupIds,
      targetSubscriberIds: subscriberIds,
      createdBy: admin.email ?? admin.id,
    },
  });
  // Land on the review screen, where the operator can preview, send a single
  // test, then confirm the bulk send.
  redirect(`/admin/newsletter/campaigns/${created.id}`);
}

export async function deleteCampaign(formData: FormData) {
  await requireAdminUser();
  const id = String(formData.get("id") ?? "");
  if (id) await prisma.newsletterCampaign.delete({ where: { id } });
  revalidatePath("/admin/newsletter");
}

/**
 * Send a TEST copy of a draft to one address (default: the admin's own email).
 * This never marks the campaign sent and never writes delivery history; it just
 * shows what the campaign will look like in a real inbox.
 */
export async function sendTestCampaign(formData: FormData) {
  const admin = await requireAdminUser();
  const id = String(formData.get("id") ?? "");
  const testEmail = normalizeEmail(String(formData.get("testEmail") ?? "")) || (admin.email ?? "");
  const campaign = await prisma.newsletterCampaign.findUnique({ where: { id } });
  if (!campaign || !isValidEmail(testEmail)) {
    redirect(`/admin/newsletter/campaigns/${id}?test=invalid`);
  }
  const unsubscribeUrl = absoluteUrl(`/newsletter/unsubscribe/TEST-PREVIEW`);
  const subject = `[TEST] ${campaign.subject}`;
  // Exact same render pipeline as the real send.
  const email = renderCampaign(campaign, { subject, unsubscribeUrl, senderIdentity: newsletterSenderIdentity() });
  const res = await sendNewsletterEmail({ to: testEmail, subject, html: email.html, text: email.text, unsubscribeUrl });
  redirect(`/admin/newsletter/campaigns/${id}?test=${res.ok ? "sent" : "error"}&to=${encodeURIComponent(testEmail)}`);
}

/**
 * Send a campaign to its deduplicated, subscribed-only recipient set. Sending is
 * deliberately guarded: the admin must type the exact recipient count to confirm
 * (an explicit confirmation field, not a single click). The rich HTML body is
 * wrapped in the branded shell and sent from the send-only newsletter mailbox
 * with one-click unsubscribe headers. A NewsletterDelivery row is written per
 * recipient, and an immutable snapshot of exactly what was sent is frozen on the
 * campaign so later draft edits never change the historical record.
 */
export async function sendCampaign(formData: FormData) {
  await requireAdminUser();
  const id = String(formData.get("id") ?? "");
  const confirm = String(formData.get("confirm") ?? "").trim();
  const campaign = await prisma.newsletterCampaign.findUnique({ where: { id } });
  if (!campaign || campaign.status === "sent") {
    redirect(`/admin/newsletter/campaigns/${id}`);
  }

  const groupIds = (campaign.targetGroupIds as unknown as string[]) ?? [];
  const subscriberIds = (campaign.targetSubscriberIds as unknown as string[]) ?? [];
  const recipients = await resolveRecipients(groupIds, subscriberIds);

  // Explicit confirmation: the typed number must equal the live recipient count.
  if (confirm === "" || Number(confirm) !== recipients.length) {
    redirect(`/admin/newsletter/campaigns/${id}?error=confirm&expected=${recipients.length}`);
  }

  // Atomically claim the draft so two concurrent sends cannot both proceed and
  // overwrite each other's immutable snapshot. Exactly one updateMany flips the
  // row from "draft" to "sending"; any loser sees count 0 and stops here.
  const claim = await prisma.newsletterCampaign.updateMany({
    where: { id, status: "draft" },
    data: { status: "sending" },
  });
  if (claim.count !== 1) {
    redirect(`/admin/newsletter/campaigns/${id}`);
  }

  const sentAt = new Date();
  const senderIdentity = newsletterSenderIdentity();
  // Freeze the exact final generated output up front (same pipeline as the
  // per-recipient send; only the per-recipient unsubscribe link differs). Doing
  // this before the loop means a mid-loop error cannot lose the snapshot.
  const snapshot = renderCampaign(campaign, {
    subject: campaign.subject,
    unsubscribeUrl: absoluteUrl("/newsletter/unsubscribe/UNSUBSCRIBE"),
    senderIdentity,
  });

  let sent = 0;
  try {
    for (const r of recipients) {
      const unsubscribeUrl = absoluteUrl(`/newsletter/unsubscribe/${r.unsubToken}`);
      const email = renderCampaign(campaign, { subject: campaign.subject, unsubscribeUrl, senderIdentity });
      const res = await sendNewsletterEmail({ to: r.email, subject: campaign.subject, html: email.html, text: email.text, unsubscribeUrl });
      if (res.ok) sent += 1;
      await prisma.newsletterDelivery.create({
        data: {
          campaignId: id,
          subscriberId: r.id,
          email: r.email,
          status: res.ok ? "sent" : "error",
          error: res.ok ? null : res.error,
          sentAt: res.ok ? sentAt : null,
        },
      });
    }
  } finally {
    // Always finalize, so the campaign can never remain stuck in "sending" even
    // if a delivery write throws partway. The status flips out of "sending" and
    // the immutable snapshot is frozen.
    await prisma.newsletterCampaign.update({
      where: { id },
      data: {
        status: "sent",
        sentAt,
        sentCount: sent,
        recipientCount: recipients.length,
        sentSubject: campaign.subject,
        sentBodyHtml: snapshot.html,
        sentText: snapshot.text,
        sentFromAddress: newsletterFrom(),
        sentUnsubVersion: NEWSLETTER_UNSUB_VERSION,
        sentTemplateVersion: NEWSLETTER_TEMPLATE_VERSION,
        sentGroupIds: groupIds,
      },
    });
  }
  redirect(`/admin/newsletter/campaigns/${id}`);
}

/** Hard-delete a subscriber and all their memberships (deliveries are retained, detached). */
export async function forceDeleteSubscriber(formData: FormData) {
  await requireAdminUser();
  const id = String(formData.get("id") ?? "");
  if (id) await prisma.newsletterSubscriber.delete({ where: { id } });
  revalidatePath("/admin/newsletter");
}
