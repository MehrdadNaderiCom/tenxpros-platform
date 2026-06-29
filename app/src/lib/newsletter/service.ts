import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { normalizeEmail, isValidEmail } from "./validation";

export type SubscribeResult = "subscribed" | "resubscribed" | "already" | "invalid";
export type UnsubscribeResult = "unsubscribed" | "already" | "unknown";

export { normalizeEmail, isValidEmail };

function newToken(): string {
  return randomBytes(24).toString("hex");
}

/**
 * Subscribe an email, safely on a duplicate. The email column is unique (DB
 * level), and this handles the three cases explicitly:
 *  - brand new       -> create, "subscribed"
 *  - already active  -> no change, "already"
 *  - previously left  -> flip back on, keep the same row, "resubscribed"
 */
export async function subscribe(rawEmail: string, source = "homepage"): Promise<SubscribeResult> {
  const email = normalizeEmail(rawEmail);
  if (!isValidEmail(email)) return "invalid";

  const existing = await prisma.newsletterSubscriber.findUnique({ where: { email } });
  if (!existing) {
    await prisma.newsletterSubscriber.create({
      data: { email, source, unsubToken: newToken(), status: "subscribed", consentAt: new Date() },
    });
    return "subscribed";
  }
  if (existing.status === "subscribed") return "already";

  await prisma.newsletterSubscriber.update({
    where: { id: existing.id },
    data: { status: "subscribed", unsubscribedAt: null, consentAt: new Date() },
  });
  return "resubscribed";
}

/** One-click unsubscribe by token. Retains the email, only flips the status. */
export async function unsubscribeByToken(token: string): Promise<{ result: UnsubscribeResult; email?: string }> {
  const sub = await prisma.newsletterSubscriber.findUnique({ where: { unsubToken: token } });
  if (!sub) return { result: "unknown" };
  if (sub.status === "unsubscribed") return { result: "already", email: sub.email };
  await prisma.newsletterSubscriber.update({
    where: { id: sub.id },
    data: { status: "unsubscribed", unsubscribedAt: new Date() },
  });
  return { result: "unsubscribed", email: sub.email };
}

/**
 * Resolve campaign recipients: the union of every subscriber in any target group
 * and every individually targeted subscriber, restricted to status "subscribed"
 * and deduplicated by id. Unsubscribed people are never included.
 */
export async function resolveRecipients(
  targetGroupIds: string[],
  targetSubscriberIds: string[],
): Promise<{ id: string; email: string; unsubToken: string }[]> {
  const subs = await prisma.newsletterSubscriber.findMany({
    where: {
      status: "subscribed",
      OR: [
        targetSubscriberIds.length ? { id: { in: targetSubscriberIds } } : undefined,
        targetGroupIds.length ? { groups: { some: { groupId: { in: targetGroupIds } } } } : undefined,
      ].filter(Boolean) as object[],
    },
    select: { id: true, email: true, unsubToken: true },
  });
  // findMany already returns distinct rows, so the union is deduped by id.
  return subs;
}
