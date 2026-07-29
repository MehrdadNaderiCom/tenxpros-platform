"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ActionState } from "@/actions/action-state";
import { actionError, actionSuccess } from "@/actions/action-state";
import { requireCurrentAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  applicationAcceptedEmail,
  escapeHtml,
  sendEmail,
} from "@/lib/email";

const reviewSchema = z.object({
  applicantId: z.string().cuid("شناسه درخواست معتبر نیست."),
  decision: z.enum(["accept", "reject"]),
  reviewerNote: z.string().trim().max(1000).optional().or(z.literal("")),
});

export async function reviewApplicationAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireCurrentAdmin();
  const parsed = reviewSchema.safeParse({
    applicantId: formData.get("applicantId"),
    decision: formData.get("decision"),
    reviewerNote: formData.get("reviewerNote"),
  });

  if (!parsed.success) {
    return actionError("اطلاعات بررسی درخواست کامل نیست.");
  }

  const application = await db.application.findUnique({
    where: { id: parsed.data.applicantId },
    include: {
      user: { select: { emailVerifiedAt: true } },
    },
  });
  if (!application) return actionError("این درخواست پیدا نشد.");

  if (!["SUBMITTED", "PENDING_REVIEW"].includes(application.status)) {
    return actionError("این درخواست قبلاً بررسی شده است.");
  }

  if (parsed.data.decision === "reject") {
    const rejected = await db.application.updateMany({
      where: {
        id: application.id,
        status: { in: ["SUBMITTED", "PENDING_REVIEW"] },
      },
      data: {
        status: "REJECTED",
        reviewerNote: parsed.data.reviewerNote || null,
        reviewedAt: new Date(),
        reviewedById: admin.id,
      },
    });
    if (rejected.count !== 1) {
      return actionError("این درخواست هم‌زمان توسط مدیر دیگری بررسی شده است.");
    }
    await sendEmail({
      to: application.email,
      subject: "نتیجه بررسی درخواست TenXPros",
      text: `${application.fullName} عزیز، درخواست شما در بررسی فعلی پذیرفته نشد. برای پرسش بیشتر با پشتیبانی تماس بگیرید.`,
      html: `<div dir="rtl" style="font-family:Tahoma,sans-serif;line-height:2"><p>${escapeHtml(application.fullName)} عزیز،</p><p>درخواست شما در بررسی فعلی پذیرفته نشد. برای پرسش بیشتر با پشتیبانی تماس بگیرید.</p></div>`,
    }).catch((error) => console.error("Application rejection email failed", error));
    revalidatePath("/admin");
    revalidatePath("/admin/applications");
    revalidatePath("/portal");
    return actionSuccess("درخواست رد شد و وضعیت آن ثبت شد.");
  }

  if (!application.user.emailVerifiedAt) {
    return actionError(
      "ایمیل متقاضی هنوز تأیید نشده است و درخواست فعلاً قابل پذیرش نیست.",
    );
  }

  try {
    await db.$transaction(async (transaction) => {
      const accepted = await transaction.application.updateMany({
        where: {
          id: application.id,
          status: { in: ["SUBMITTED", "PENDING_REVIEW"] },
        },
        data: {
          status: "ACCEPTED_AWAITING_PAYMENT",
          reviewerNote: parsed.data.reviewerNote || null,
          reviewedAt: new Date(),
          acceptedAt: new Date(),
          reviewedById: admin.id,
        },
      });
      if (accepted.count !== 1) throw new Error("APPLICATION_ALREADY_REVIEWED");

      await transaction.user.update({
        where: { id: application.userId },
        data: { membershipStatus: "PENDING_PAYMENT" },
      });
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "APPLICATION_ALREADY_REVIEWED"
    ) {
      return actionError("این درخواست هم‌زمان توسط مدیر دیگری بررسی شده است.");
    }
    console.error("Application acceptance failed", error);
    return actionError("ثبت پذیرش کامل نشد. لطفاً دوباره تلاش کنید.");
  }

  const dashboardUrl = `${process.env.APP_URL ?? "https://tenxpros.ir"}/portal`;
  const emailDelivered = await sendEmail({
    to: application.email,
    ...applicationAcceptedEmail(application.fullName, dashboardUrl),
  }).catch((error) => {
    console.error("Application acceptance email failed", error);
    return false;
  });

  revalidatePath("/admin");
  revalidatePath("/admin/applications");
  revalidatePath("/portal");
  return actionSuccess(
    emailDelivered
      ? "درخواست پذیرفته شد و دعوت به پرداخت برای متقاضی ایمیل شد."
      : "درخواست پذیرفته شد، اما سرویس ایمیل فعال نبود. متقاضی می‌تواند با رمز قبلی وارد پنل شود.",
    { emailDelivered },
  );
}
