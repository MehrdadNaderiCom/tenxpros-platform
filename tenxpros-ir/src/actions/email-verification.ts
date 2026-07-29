"use server";

import { z } from "zod";

import type { ActionState } from "@/actions/action-state";
import { actionError, actionSuccess } from "@/actions/action-state";
import { normalizeEmail } from "@/lib/auth";
import {
  consumeEmailVerificationToken,
  emailVerificationUrl,
  issueEmailVerificationToken,
} from "@/lib/email-verification";
import { sendEmail, verificationLinkEmail } from "@/lib/email";
import { db } from "@/lib/db";
import { enforceRateLimit, RateLimitError } from "@/lib/rate-limit";
import {
  getRequestClientIp,
  rateLimitSubjectHash,
} from "@/lib/request-context";
import { emailSchema } from "@/lib/validation";

const verificationTokenSchema = z.string().trim().regex(/^[A-Za-z0-9_-]{40,100}$/);

export async function verifyEmailAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = verificationTokenSchema.safeParse(formData.get("token"));
  if (!parsed.success) {
    return actionError("لینک تأیید معتبر نیست. یک لینک تازه درخواست کنید.");
  }

  const result = await consumeEmailVerificationToken(parsed.data);
  if (!result.ok) {
    return actionError(
      result.reason === "EXPIRED"
        ? "اعتبار این لینک پایان یافته است. یک لینک تازه درخواست کنید."
        : "این لینک معتبر نیست یا قبلاً استفاده شده است.",
    );
  }

  return actionSuccess(
    result.alreadyVerified
      ? "ایمیل شما قبلاً تأیید شده است و می‌توانید وارد پنل شوید."
      : "ایمیل شما با موفقیت تأیید شد. اکنون می‌توانید وارد پنل شوید.",
  );
}

export async function resendEmailVerificationAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) {
    return actionError("یک ایمیل معتبر وارد کنید.");
  }

  const email = normalizeEmail(parsed.data);
  const clientIp = await getRequestClientIp();
  try {
    await Promise.all([
      enforceRateLimit({
        scope: "email-verification-resend-ip",
        subjectHash: rateLimitSubjectHash("ip", clientIp),
        limit: 8,
        windowMs: 60 * 60 * 1_000,
      }),
      enforceRateLimit({
        scope: "email-verification-resend-email",
        subjectHash: rateLimitSubjectHash("email", email),
        limit: 3,
        windowMs: 60 * 60 * 1_000,
      }),
    ]);
  } catch (error) {
    if (error instanceof RateLimitError) {
      return actionError(
        "تعداد درخواست‌ها بیش از حد مجاز است. لطفاً کمی بعد دوباره تلاش کنید.",
      );
    }
    throw error;
  }

  const user = await db.user.findUnique({
    where: { email },
    select: {
      id: true,
      fullName: true,
      email: true,
      emailVerifiedAt: true,
      role: true,
    },
  });

  if (user && user.role === "MEMBER" && !user.emailVerifiedAt) {
    const capability = await issueEmailVerificationToken(user.id);
    await sendEmail({
      to: user.email,
      ...verificationLinkEmail(
        user.fullName,
        emailVerificationUrl(capability.rawToken),
      ),
    }).catch((error) => {
      console.error("Email verification resend failed", error);
      return false;
    });
  }

  return actionSuccess(
    "اگر این ایمیل به یک درخواست تأییدنشده متصل باشد، لینک تازه برای آن ارسال شد.",
  );
}
