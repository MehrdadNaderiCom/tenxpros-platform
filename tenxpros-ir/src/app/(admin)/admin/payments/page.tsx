import { FileText } from "lucide-react";

import { PaymentReviewForm } from "@/components/admin/payment-review-form";
import {
  AdminBadge,
  AdminHeading,
  AdminPanel,
  EmptyState,
} from "@/components/admin/admin-ui";
import { db } from "@/lib/db";
import {
  formatTehranDateTime,
  formatToman,
} from "@/lib/format";

const statusLabels = {
  SUBMITTED: "ثبت شده",
  PENDING_REVIEW: "منتظر بررسی",
  APPROVED: "تأیید شده",
  REJECTED: "رد شده",
  SUPERSEDED: "جایگزین شده",
} as const;

export default async function AdminPaymentsPage() {
  const receipts = await db.paymentReceipt.findMany({
    include: {
      application: {
        include: {
          user: { select: { fullName: true, email: true, membershipStatus: true } },
        },
      },
      reviewedBy: { select: { fullName: true } },
    },
    orderBy: { submittedAt: "desc" },
    take: 100,
  });

  return (
    <>
      <AdminHeading
        title="بررسی رسیدهای پرداخت"
        description="فایل رسید خصوصی است و فقط از مسیر احراز هویت‌شده مدیریت باز می‌شود. تأیید رسید، عضویت را بلافاصله فعال می‌کند."
      />

      {receipts.length === 0 ? (
        <AdminPanel>
          <EmptyState
            title="رسیدی ثبت نشده است"
            description="رسیدهای تازه پس از بارگذاری عضو در این بخش قرار می‌گیرند."
          />
        </AdminPanel>
      ) : (
        <div className="space-y-5">
          {receipts.map((receipt) => {
            const reviewable = ["SUBMITTED", "PENDING_REVIEW"].includes(
              receipt.status,
            );
            return (
              <AdminPanel key={receipt.id}>
                <div className="grid gap-6 lg:grid-cols-[1fr_auto]">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <AdminBadge tone={reviewable ? "warning" : "neutral"}>
                        {statusLabels[receipt.status]}
                      </AdminBadge>
                      <span className="text-xs text-slate-400">
                        {formatTehranDateTime(receipt.submittedAt)}
                      </span>
                    </div>
                    <h2 className="mt-4 text-xl font-black text-slate-950">
                      {receipt.application.user.fullName}
                    </h2>
                    <p className="mt-1 text-sm text-slate-500" dir="ltr">
                      {receipt.application.user.email}
                    </p>
                    <div className="mt-5 grid gap-3 rounded-lg bg-slate-50 p-4 text-sm sm:grid-cols-2 xl:grid-cols-4">
                      <p>
                        مبلغ
                        <strong className="mt-1 block text-slate-950">
                          {formatToman(receipt.amountToman)}
                        </strong>
                      </p>
                      <p>
                        پرداخت‌کننده
                        <strong className="mt-1 block text-slate-950">
                          {receipt.payerName}
                        </strong>
                      </p>
                      <p>
                        شماره پیگیری
                        <strong className="mt-1 block font-mono text-slate-950" dir="ltr">
                          {receipt.bankReference}
                        </strong>
                      </p>
                      <p>
                        چهار رقم مبدأ
                        <strong className="mt-1 block font-mono text-slate-950" dir="ltr">
                          {receipt.sourceLastFour}
                        </strong>
                      </p>
                    </div>
                    {receipt.applicantNote ? (
                      <p className="mt-4 rounded-lg border border-slate-200 p-4 text-sm leading-7 text-slate-600">
                        {receipt.applicantNote}
                      </p>
                    ) : null}
                  </div>
                  <div className="w-full lg:w-80">
                    <a
                      href={`/admin/payments/${receipt.id}/receipt`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex min-h-12 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-slate-800 hover:border-iris-300"
                    >
                      <FileText className="size-4" />
                      مشاهده فایل رسید
                    </a>
                    {reviewable ? (
                      <div className="mt-4">
                        <PaymentReviewForm receiptId={receipt.id} />
                      </div>
                    ) : receipt.reviewerNote ? (
                      <p className="mt-4 rounded-lg bg-slate-50 p-4 text-sm leading-7 text-slate-600">
                        {receipt.reviewerNote}
                      </p>
                    ) : null}
                  </div>
                </div>
              </AdminPanel>
            );
          })}
        </div>
      )}
    </>
  );
}
