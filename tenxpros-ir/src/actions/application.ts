"use server";

import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import type { ActionState } from "@/actions/action-state";
import { actionError, validationError } from "@/actions/action-state";
import {
  applicationVerificationEmail,
  sendEmail
} from "@/lib/email";
import { hashPassword, normalizeEmail } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  createEmailVerificationCapability,
  emailVerificationUrl,
} from "@/lib/email-verification";
import {
  enforceRateLimit,
  RateLimitError
} from "@/lib/rate-limit";
import {
  getRequestClientIp,
  rateLimitSubjectHash,
} from "@/lib/request-context";
import { getProgramConfig } from "@/lib/config";
import { applicationSchema } from "@/lib/validation";

function formValues(formData: FormData) {
  return {
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    professionalRole: formData.get("professionalRole"),
    domain: formData.get("domain"),
    organization: formData.get("organization"),
    experienceYears: formData.get("experienceYears"),
    linkedinUrl: formData.get("linkedinUrl"),
    aiExperience: formData.get("aiExperience"),
    motivation: formData.get("motivation"),
    realProblem: formData.get("realProblem"),
    weeklyAvailability: formData.get("weeklyAvailability"),
    password: formData.get("password"),
    acceptTerms: formData.get("acceptTerms"),
    website: formData.get("website")
  };
}

function referenceCode() {
  const year = new Date().getUTCFullYear();
  const token = randomBytes(5).toString("hex").toUpperCase();
  return `TXP-IR-${year}-${token}`;
}

export async function submitApplicationAction(
  _previousState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const values = formValues(formData);
  if (
    typeof values.website === "string" &&
    values.website.trim().length > 0
  ) {
    return {
      status: "success",
      message: "درخواست شما دریافت شد."
    };
  }

  const parsed = applicationSchema.safeParse(values);
  if (!parsed.success) {
    return validationError(
      "چند بخش از فرم نیاز به اصلاح دارد.",
      parsed.error.flatten().fieldErrors
    );
  }

  const email = normalizeEmail(parsed.data.email);
  const clientIp = await getRequestClientIp();
  const ipSubjectHash = rateLimitSubjectHash("ip", clientIp);
  const emailSubjectHash = rateLimitSubjectHash("email", email);

  try {
    await Promise.all([
      enforceRateLimit({
        scope: "public-application-ip",
        subjectHash: ipSubjectHash,
        limit: 10,
        windowMs: 24 * 60 * 60 * 1000
      }),
      enforceRateLimit({
        scope: "public-application-email",
        subjectHash: emailSubjectHash,
        limit: 4,
        windowMs: 24 * 60 * 60 * 1000
      })
    ]);
  } catch (error) {
    if (error instanceof RateLimitError) {
      return actionError(
        "تعداد درخواست‌های این نشانی بیش از حد مجاز است. لطفاً بعداً دوباره تلاش کنید."
      );
    }
    throw error;
  }

  const existingUser = await db.user.findUnique({
    where: { email },
    include: {
      applications: {
        orderBy: { createdAt: "desc" },
        take: 1
      }
    }
  });

  if (existingUser) {
    return actionError(
      "برای این ایمیل قبلاً حساب یا درخواستی ثبت شده است. وارد پنل شوید یا برای ارسال درخواست تازه با پشتیبانی تماس بگیرید."
    );
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const code = referenceCode();
  const now = new Date();
  const emailVerification = createEmailVerificationCapability(now);
  const weeklyCommitment = {
    THREE_TO_FIVE: 4,
    FIVE_TO_SEVEN: 6,
    SEVEN_PLUS: 8
  }[parsed.data.weeklyAvailability];
  const program = getProgramConfig();

  try {
    await db.$transaction(async (transaction) => {
      const user = await transaction.user.create({
        data: {
          email,
          fullName: parsed.data.fullName,
          phone: parsed.data.phone,
          role: "MEMBER",
          membershipStatus: "INVITED",
          passwordHash
        }
      });

      await transaction.application.create({
        data: {
          referenceCode: code,
          fullName: parsed.data.fullName,
          email,
          phone: parsed.data.phone,
          professionalRole: parsed.data.professionalRole,
          domain: parsed.data.domain,
          organization: parsed.data.organization || null,
          experienceYears: parsed.data.experienceYears ?? null,
          linkedinUrl: parsed.data.linkedinUrl || null,
          aiExperience: parsed.data.aiExperience,
          motivation: parsed.data.motivation,
          realProblem: parsed.data.realProblem,
          weeklyAvailability: parsed.data.weeklyAvailability,
          goals: parsed.data.motivation,
          challenge: parsed.data.realProblem,
          weeklyCommitment,
          standardPriceToman: program.listPriceToman,
          offeredPriceToman: program.foundingCharterPriceToman,
          status: "SUBMITTED",
          termsVersion: "fa-2026-07-v1",
          termsAcceptedAt: now,
          privacyAcceptedAt: now,
          ipHash: ipSubjectHash,
          userId: user.id
        }
      });

      await transaction.emailVerificationToken.create({
        data: {
          userId: user.id,
          tokenHash: emailVerification.tokenHash,
          expiresAt: emailVerification.expiresAt,
        },
      });
    });
  } catch (error) {
    console.error("Application submission failed", error);
    return actionError(
      "ثبت درخواست کامل نشد. لطفاً چند لحظه بعد دوباره تلاش کنید."
    );
  }

  await sendEmail({
    to: email,
    ...applicationVerificationEmail(
      parsed.data.fullName,
      code,
      emailVerificationUrl(emailVerification.rawToken),
    )
  }).catch((error) => {
    console.error("Application verification email failed", error);
    return false;
  });

  redirect(`/apply/thank-you?reference=${encodeURIComponent(code)}`);
}
