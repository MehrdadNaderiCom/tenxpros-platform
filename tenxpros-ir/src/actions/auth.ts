"use server";

import { redirect } from "next/navigation";

import type { ActionState } from "@/actions/action-state";
import {
  authenticateAdmin,
  authenticateMember,
  clearCurrentSession,
  createAdminSession,
  createMemberSession,
} from "@/lib/auth";
import { db } from "@/lib/db";
import {
  enforceRateLimit,
  RateLimitError,
} from "@/lib/rate-limit";
import {
  getRequestClientIp,
  rateLimitSubjectHash,
} from "@/lib/request-context";
import { loginSchema } from "@/lib/validation";

function loginValues(formData: FormData) {
  return {
    email: formData.get("email"),
    password: formData.get("password"),
  };
}

async function checkLoginRateLimit(scope: string, email: string) {
  const clientIp = await getRequestClientIp();
  await Promise.all([
    enforceRateLimit({
      scope: `${scope}-ip`,
      subjectHash: rateLimitSubjectHash("ip", clientIp),
      limit: 10,
      windowMs: 15 * 60 * 1000,
    }),
    enforceRateLimit({
      scope: `${scope}-email`,
      subjectHash: rateLimitSubjectHash("email", email),
      limit: 5,
      windowMs: 15 * 60 * 1000,
    }),
  ]);
}

export async function applicantLoginAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = loginSchema.safeParse(loginValues(formData));
  if (!parsed.success) {
    return {
      status: "error",
      message: "لطفاً اطلاعات ورود را کامل و درست وارد کنید.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await checkLoginRateLimit("member-login", parsed.data.email);
  } catch (error) {
    if (error instanceof RateLimitError) {
      return {
        status: "error",
        message: "تعداد تلاش‌های ورود زیاد است. لطفاً کمی بعد دوباره تلاش کنید.",
      };
    }
    return {
      status: "error",
      message: "ورود در حال حاضر ممکن نیست. لطفاً دوباره تلاش کنید.",
    };
  }

  const member = await authenticateMember(parsed.data.email, parsed.data.password);
  if (!member) {
    return {
      status: "error",
      message: "ایمیل یا رمز عبور درست نیست.",
    };
  }

  if (!member.emailVerifiedAt) {
    return {
      status: "error",
      message:
        "پیش از ورود، ایمیل خود را تأیید کنید. اگر لینک منقضی شده است از صفحه تأیید ایمیل، لینک تازه بگیرید.",
    };
  }

  if (
    member.membershipStatus === "SUSPENDED" ||
    member.membershipStatus === "REVOKED"
  ) {
    return {
      status: "error",
      message: "دسترسی این حساب فعال نیست. لطفاً با پشتیبانی تماس بگیرید.",
    };
  }

  await Promise.all([
    createMemberSession(member.id),
    db.user.update({
      where: { id: member.id },
      data: { lastSignedInAt: new Date() },
    }),
  ]);

  redirect("/portal");
}

export async function adminLoginAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = loginSchema.safeParse(loginValues(formData));
  if (!parsed.success) {
    return {
      status: "error",
      message: "لطفاً اطلاعات ورود را کامل و درست وارد کنید.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await checkLoginRateLimit("admin-login", parsed.data.email);
  } catch (error) {
    if (error instanceof RateLimitError) {
      return {
        status: "error",
        message: "تعداد تلاش‌های ورود زیاد است. لطفاً کمی بعد دوباره تلاش کنید.",
      };
    }
    return {
      status: "error",
      message: "ورود در حال حاضر ممکن نیست. لطفاً دوباره تلاش کنید.",
    };
  }

  const admin = await authenticateAdmin(parsed.data.email, parsed.data.password);
  if (!admin) {
    return {
      status: "error",
      message: "ایمیل یا رمز عبور درست نیست.",
    };
  }

  await Promise.all([
    createAdminSession(admin.id),
    db.user.update({
      where: { id: admin.id },
      data: { lastSignedInAt: new Date() },
    }),
  ]);

  redirect("/admin");
}

export async function logoutAction() {
  await clearCurrentSession();
  redirect("/");
}
