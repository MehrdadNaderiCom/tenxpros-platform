import type {
  ApplicationStatus,
  MembershipStatus,
  PaymentReceiptStatus,
} from "@prisma/client";

export const applicationStatusLabel: Record<ApplicationStatus, string> = {
  SUBMITTED: "درخواست دریافت شد",
  PENDING_REVIEW: "در حال بررسی",
  ACCEPTED_AWAITING_PAYMENT: "پذیرفته‌شده، در انتظار پرداخت",
  PAYMENT_UNDER_REVIEW: "رسید در حال بررسی",
  ACTIVE: "عضویت فعال",
  REJECTED: "پذیرفته نشد",
  SUSPENDED: "تعلیق‌شده",
  GRADUATED: "فارغ‌التحصیل",
  WITHDRAWN: "انصراف داده‌شده",
};

export const membershipStatusLabel: Record<MembershipStatus, string> = {
  INVITED: "در انتظار بررسی درخواست",
  PENDING_PAYMENT: "در انتظار تکمیل پرداخت",
  ACTIVE: "عضو فعال",
  SUSPENDED: "دسترسی تعلیق‌شده",
  GRADUATED: "فارغ‌التحصیل",
  REVOKED: "دسترسی بسته‌شده",
};

export const receiptStatusLabel: Record<PaymentReceiptStatus, string> = {
  SUBMITTED: "دریافت شد",
  PENDING_REVIEW: "در حال بررسی",
  APPROVED: "تأیید شد",
  REJECTED: "نیازمند اصلاح",
  SUPERSEDED: "جایگزین شد",
};
