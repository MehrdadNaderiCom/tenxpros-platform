"use server";

import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { absoluteUrl } from "@/lib/utils";
import { safeSendEmail } from "@/lib/services/email";
import { passwordResetEmail } from "@/lib/email/templates";
import { requestPasswordResetSchema } from "@/lib/validations/auth";

// A password reset link is short-lived and single-use. One hour is long enough
// for a real person to act on the email and short enough to limit exposure.
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

/**
 * Start a password reset. This must NOT reveal whether an account exists for the
 * given email, neither through the response content NOR through response timing.
 * So the action does no account-dependent work on the request path: it validates
 * the input and returns immediately, and the caller always shows the same neutral
 * confirmation. The actual lookup, token mint, and email send happen off the
 * response path in {@link deliverResetEmail}, so a registered and an unregistered
 * address take the same time to return. (This runs as a long-lived Node server,
 * where the detached promise reliably runs to completion.)
 */
export async function requestPasswordReset(formData: FormData): Promise<void> {
  const parsed = requestPasswordResetSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return;

  const email = parsed.data.email.toLowerCase();
  // Detached on purpose: do not await, so the response time does not depend on
  // whether the account exists or on email-delivery latency. safeSendEmail never
  // throws; the catch only guards the lookup/token-mint.
  void deliverResetEmail(email).catch(() => {});
}

/**
 * When (and only when) a matching user exists, invalidate any prior tokens for
 * that email, mint a fresh single-use token, and email a reset link. The token is
 * stored in VerificationToken and consumed by setParticipantPassword (which sets
 * passwordHash and deletes the token), the same mechanism the enrollment
 * set-password flow already uses.
 */
async function deliverResetEmail(email: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (!user) return;

  const token = randomUUID();
  const expires = new Date(Date.now() + RESET_TOKEN_TTL_MS);

  await prisma.$transaction([
    prisma.verificationToken.deleteMany({ where: { identifier: email } }),
    prisma.verificationToken.create({ data: { identifier: email, token, expires } }),
  ]);

  const resetUrl = absoluteUrl(
    `/reset-password?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`,
  );
  const mail = passwordResetEmail({ resetUrl });
  await safeSendEmail({
    to: email,
    subject: mail.subject,
    template: "password_reset",
    text: mail.text,
    html: mail.html,
  });
}
