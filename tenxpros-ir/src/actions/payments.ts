"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ActionState } from "@/actions/action-state";
import { actionError, actionSuccess } from "@/actions/action-state";
import { requireCurrentAdmin, requireCurrentMember } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  escapeHtml,
  receiptReviewedEmail,
  sendEmail,
} from "@/lib/email";
import { tehranLocalDateTimeToUtc } from "@/lib/iran-week";
import {
  deletePaymentReceipt,
  ReceiptUploadError,
  storePaymentReceipt,
} from "@/lib/uploads";
import { receiptMetadataSchema } from "@/lib/validation";

function uploadErrorMessage(error: ReceiptUploadError) {
  if (error.code === "TOO_LARGE") return "حجم فایل رسید بیش از حد مجاز است.";
  if (error.code === "EMPTY_FILE") return "فایل رسید خالی است.";
  if (error.code === "UNSUPPORTED_FILE_TYPE") {
    return "فرمت فایل باید PDF، JPG یا PNG باشد.";
  }
  return "محتوای فایل رسید معتبر نیست.";
}

export async function submitPaymentReceiptAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const member = await requireCurrentMember();
  if (member.membershipStatus !== "PENDING_PAYMENT") {
    return actionError("این حساب در مرحله دریافت رسید پرداخت نیست.");
  }

  const parsed = receiptMetadataSchema.safeParse({
    payerName: formData.get("payerName"),
    paidAt: formData.get("paidAt"),
    amountToman: formData.get("amountToman"),
    referenceNumber: formData.get("referenceNumber"),
    sourceLastFour: formData.get("sourceLastFour"),
    note: formData.get("note"),
    confirmPayment: formData.get("confirmPayment"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "اطلاعات پرداخت را کامل و دقیق وارد کنید.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const receiptFile = formData.get("receipt");
  if (!(receiptFile instanceof File)) {
    return {
      status: "error",
      message: "فایل رسید را انتخاب کنید.",
      fieldErrors: { receipt: ["فایل رسید الزامی است."] },
    };
  }

  const application = await db.application.findFirst({
    where: {
      userId: member.id,
      status: "ACCEPTED_AWAITING_PAYMENT",
    },
    orderBy: { acceptedAt: "desc" },
    include: {
      paymentReceipts: {
        where: { status: { in: ["SUBMITTED", "PENDING_REVIEW", "APPROVED"] } },
        select: { id: true, status: true },
      },
    },
  });

  if (!application) {
    return actionError("درخواست پذیرفته‌شده‌ای برای این حساب پیدا نشد.");
  }
  if (application.paymentReceipts.length > 0) {
    return actionError("برای این درخواست یک رسید فعال ثبت شده است.");
  }
  if (parsed.data.amountToman !== application.offeredPriceToman) {
    return actionError("مبلغ رسید با مبلغ پذیرفته‌شده این درخواست مطابقت ندارد.");
  }

  let stored: Awaited<ReturnType<typeof storePaymentReceipt>>;
  try {
    stored = await storePaymentReceipt(receiptFile, application.id);
  } catch (error) {
    if (error instanceof ReceiptUploadError) {
      const message = uploadErrorMessage(error);
      return {
        status: "error",
        message,
        fieldErrors: { receipt: [message] },
      };
    }
    console.error("Receipt upload failed", error);
    return actionError("بارگذاری رسید انجام نشد. لطفاً دوباره تلاش کنید.");
  }

  try {
    await db.$transaction(async (transaction) => {
      const claimed = await transaction.application.updateMany({
        where: {
          id: application.id,
          userId: member.id,
          status: "ACCEPTED_AWAITING_PAYMENT",
        },
        data: { status: "PAYMENT_UNDER_REVIEW" },
      });
      if (claimed.count !== 1) throw new Error("PAYMENT_ALREADY_SUBMITTED");

      await transaction.paymentReceipt.create({
        data: {
          applicationId: application.id,
          submittedById: member.id,
          amountToman: application.offeredPriceToman,
          payerName: parsed.data.payerName,
          paidAt: tehranLocalDateTimeToUtc(parsed.data.paidAt, "12:00"),
          bankReference: parsed.data.referenceNumber,
          sourceLastFour: parsed.data.sourceLastFour,
          applicantNote: parsed.data.note || null,
          storageKey: stored.storageKey,
          originalName: stored.originalName,
          mimeType: stored.mimeType,
          byteSize: stored.byteSize,
          sha256: stored.sha256,
          status: "SUBMITTED",
        },
      });
    });
  } catch (error) {
    await deletePaymentReceipt(stored.storageKey);
    if (error instanceof Error && error.message === "PAYMENT_ALREADY_SUBMITTED") {
      return actionError("برای این درخواست یک رسید فعال ثبت شده است.");
    }
    console.error("Receipt persistence failed", error);
    return actionError("ثبت رسید کامل نشد. فایل ذخیره نشده است و می‌توانید دوباره تلاش کنید.");
  }

  await sendEmail({
    to: member.email,
    subject: "رسید پرداخت شما در TenXPros ثبت شد",
    text: `${member.fullName} عزیز، رسید پرداخت شما دریافت شد و اکنون در صف بررسی است.`,
    html: `<div dir="rtl" style="font-family:Tahoma,sans-serif;line-height:2"><p>${escapeHtml(member.fullName)} عزیز،</p><p>رسید پرداخت شما دریافت شد و اکنون در صف بررسی است. نتیجه بررسی در پنل شما نمایش داده می‌شود.</p></div>`,
  }).catch((error) => console.error("Receipt acknowledgement email failed", error));

  const adminEmail = process.env.ADMIN_EMAIL;
  if (adminEmail) {
    await sendEmail({
      to: adminEmail,
      subject: "رسید تازه برای بررسی در TenXPros",
      text: `یک رسید تازه از ${member.fullName} برای بررسی ثبت شد.`,
      html: `<div dir="rtl" style="font-family:Tahoma,sans-serif;line-height:2"><p>یک رسید تازه از <strong>${escapeHtml(member.fullName)}</strong> برای بررسی ثبت شد.</p></div>`,
    }).catch((error) => console.error("Receipt admin notification failed", error));
  }

  revalidatePath("/portal");
  revalidatePath("/portal/payment");
  revalidatePath("/admin/payments");
  return actionSuccess(
    "رسید با موفقیت دریافت شد. نتیجه بررسی از طریق پنل شما قابل پیگیری است.",
  );
}

const reviewReceiptSchema = z.object({
  receiptId: z.string().cuid(),
  decision: z.enum(["approve", "reject"]),
  reviewerNote: z.string().trim().max(1000).optional().or(z.literal("")),
});

export async function reviewPaymentReceiptAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireCurrentAdmin();
  const parsed = reviewReceiptSchema.safeParse({
    receiptId: formData.get("receiptId"),
    decision: formData.get("decision"),
    reviewerNote: formData.get("reviewerNote"),
  });
  if (!parsed.success) return actionError("اطلاعات بررسی رسید کامل نیست.");

  const receipt = await db.paymentReceipt.findUnique({
    where: { id: parsed.data.receiptId },
    include: {
      application: {
        include: { user: true },
      },
    },
  });
  if (!receipt) return actionError("رسید پیدا نشد.");
  if (!["SUBMITTED", "PENDING_REVIEW"].includes(receipt.status)) {
    return actionError("این رسید قبلاً بررسی شده است.");
  }
  const approved = parsed.data.decision === "approve";
  try {
    await db.$transaction(async (transaction) => {
      const claimed = await transaction.paymentReceipt.updateMany({
        where: {
          id: receipt.id,
          status: { in: ["SUBMITTED", "PENDING_REVIEW"] },
        },
        data: {
          status: approved ? "APPROVED" : "REJECTED",
          reviewerNote: parsed.data.reviewerNote || null,
          reviewedAt: new Date(),
          reviewedById: admin.id,
        },
      });
      if (claimed.count !== 1) throw new Error("RECEIPT_ALREADY_REVIEWED");

      const applicationUpdated = await transaction.application.updateMany({
        where: {
          id: receipt.applicationId,
          status: "PAYMENT_UNDER_REVIEW",
        },
        data: {
          status: approved ? "ACTIVE" : "ACCEPTED_AWAITING_PAYMENT",
          activatedAt: approved ? new Date() : null,
        },
      });
      if (applicationUpdated.count !== 1) {
        throw new Error("PAYMENT_STATE_CONFLICT");
      }

      const memberUpdated = await transaction.user.updateMany({
        where: {
          id: receipt.application.user.id,
          membershipStatus: "PENDING_PAYMENT",
        },
        data: {
          membershipStatus: approved ? "ACTIVE" : "PENDING_PAYMENT",
        },
      });
      if (memberUpdated.count !== 1) {
        throw new Error("PAYMENT_STATE_CONFLICT");
      }
    });
  } catch (error) {
    if (error instanceof Error && error.message === "RECEIPT_ALREADY_REVIEWED") {
      return actionError("این رسید هم‌زمان توسط مدیر دیگری بررسی شده است.");
    }
    if (error instanceof Error && error.message === "PAYMENT_STATE_CONFLICT") {
      return actionError(
        "وضعیت درخواست یا عضویت هم‌زمان تغییر کرده است. صفحه را تازه کنید.",
      );
    }
    console.error("Payment review failed", error);
    return actionError("ثبت نتیجه بررسی کامل نشد. لطفاً دوباره تلاش کنید.");
  }

  const dashboardUrl = `${process.env.APP_URL ?? "https://tenxpros.ir"}/portal`;
  await sendEmail({
    to: receipt.application.user.email,
    ...receiptReviewedEmail(
      receipt.application.user.fullName,
      approved,
      dashboardUrl,
      parsed.data.reviewerNote,
    ),
  }).catch((error) => console.error("Payment review email failed", error));

  revalidatePath("/portal");
  revalidatePath("/portal/payment");
  revalidatePath("/admin");
  revalidatePath("/admin/payments");
  return actionSuccess(
    approved
      ? "پرداخت تأیید و عضویت فعال شد."
      : "رسید رد شد و امکان ثبت رسید تازه برای عضو باز شد.",
  );
}
