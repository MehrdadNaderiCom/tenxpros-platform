"use server";

import { revalidatePath } from "next/cache";

import type { ActionState } from "@/actions/action-state";
import { actionError, actionSuccess } from "@/actions/action-state";
import { requireCurrentAdmin, requireCurrentMember } from "@/lib/auth";
import {
  CoachingScheduleError,
  resolveCoachingScheduledAt,
} from "@/lib/coaching-schedule";
import { OFFER } from "@/lib/constants";
import { db } from "@/lib/db";
import {
  coachingReceivedEmail,
  coachingScheduledEmail,
  sendEmail,
} from "@/lib/email";
import { formatTehranDateTime } from "@/lib/format";
import {
  coachingInquirySchema,
  coachingInquiryUpdateSchema,
  isWeeklyGatheringEligible,
} from "@/lib/validation";

export async function submitCoachingInquiryAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const member = await requireCurrentMember();
  if (!isWeeklyGatheringEligible(member.membershipStatus)) {
    return actionError("Coaching فقط برای اعضا و فارغ‌التحصیلان در دسترس است.");
  }

  const parsed = coachingInquirySchema.safeParse({
    subject: formData.get("subject"),
    message: formData.get("message"),
    preferredSchedule: formData.get("preferredSchedule"),
    requestedMinutes: 60,
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "اطلاعات درخواست Coaching را کامل‌تر وارد کنید.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  await db.coachingInquiry.create({
    data: {
      requestedById: member.id,
      subject: parsed.data.subject,
      message: parsed.data.message,
      preferredSchedule: parsed.data.preferredSchedule,
      requestedMinutes: parsed.data.requestedMinutes,
      hourlyRateToman: OFFER.coachingPriceToman,
      status: "NEW",
    },
  });

  await sendEmail({
    to: member.email,
    ...coachingReceivedEmail(member.fullName),
  }).catch((error) => {
    console.error("Coaching acknowledgement email failed", error);
    return false;
  });

  revalidatePath("/portal/coaching");
  revalidatePath("/admin");
  revalidatePath("/admin/coaching");
  return actionSuccess(
    "درخواست شما ثبت شد. مدیریت برای هماهنگی زمان و پرداخت با شما تماس می‌گیرد.",
  );
}

export async function updateCoachingInquiryAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireCurrentAdmin();
  const status = formData.get("status");
  const scheduledAtInput = String(formData.get("scheduledAt") ?? "");
  const parsed = coachingInquiryUpdateSchema.safeParse({
    inquiryId: formData.get("inquiryId"),
    status,
    adminNote: formData.get("adminNote"),
    scheduledAt: undefined,
  });
  if (!parsed.success) {
    return actionError("وضعیت یا یادداشت واردشده معتبر نیست.");
  }

  const inquiry = await db.coachingInquiry.findUnique({
    where: { id: parsed.data.inquiryId },
    select: {
      id: true,
      subject: true,
      scheduledAt: true,
      requestedBy: {
        select: { email: true, fullName: true },
      },
    },
  });
  if (!inquiry) return actionError("درخواست Coaching پیدا نشد.");

  let scheduledAt: Date | undefined;
  try {
    scheduledAt = resolveCoachingScheduledAt({
      status: parsed.data.status,
      scheduledAtInput,
      currentScheduledAt: inquiry.scheduledAt,
    });
  } catch (error) {
    if (error instanceof CoachingScheduleError) {
      return actionError(error.message);
    }
    return actionError("زمان جلسه Coaching قابل پردازش نیست.");
  }

  await db.coachingInquiry.update({
    where: { id: inquiry.id },
    data: {
      status: parsed.data.status,
      adminNote: parsed.data.adminNote,
      managedById: admin.id,
      contactedAt:
        parsed.data.status === "CONTACTED" ? new Date() : undefined,
      scheduledAt:
        parsed.data.status === "SCHEDULED"
          ? scheduledAt
          : undefined,
      completedAt:
        parsed.data.status === "COMPLETED" ? new Date() : undefined,
    },
  });

  let scheduleEmailDelivered = true;
  if (parsed.data.status === "SCHEDULED" && scheduledAt) {
    scheduleEmailDelivered = await sendEmail({
      to: inquiry.requestedBy.email,
      ...coachingScheduledEmail(
        inquiry.requestedBy.fullName,
        inquiry.subject,
        formatTehranDateTime(scheduledAt),
      ),
    }).catch((error) => {
      console.error("Coaching schedule email failed", error);
      return false;
    });
  }

  revalidatePath("/portal/coaching");
  revalidatePath("/admin/coaching");
  if (parsed.data.status === "SCHEDULED") {
    if (!scheduleEmailDelivered) {
      return actionError(
        "زمان جلسه ذخیره شد، اما ایمیل ارسال نشد. پس از بررسی SMTP دوباره ذخیره کنید.",
      );
    }
    return actionSuccess(
      "زمان جلسه ذخیره و به عضو ایمیل شد.",
      { emailDelivered: true },
    );
  }
  return actionSuccess("وضعیت درخواست Coaching ذخیره شد.");
}
