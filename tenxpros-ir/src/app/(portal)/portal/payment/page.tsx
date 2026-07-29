import { CheckCircle2, Clock3, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { PaymentReceiptForm } from "@/components/forms/payment-receipt-form";
import { BankDetails } from "@/components/portal/bank-details";
import { Panel, SectionHeading } from "@/components/portal/portal-ui";
import { getCurrentMember } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function PortalPaymentPage() {
  const member = await getCurrentMember();
  if (!member) redirect("/login");

  const application = await db.application.findFirst({
    where: { userId: member.id },
    orderBy: { submittedAt: "desc" },
    include: {
      paymentReceipts: {
        orderBy: { submittedAt: "desc" },
        take: 1,
      },
    },
  });
  const receipt = application?.paymentReceipts[0];
  const canPay =
    member.membershipStatus === "PENDING_PAYMENT" &&
    application?.status === "ACCEPTED_AWAITING_PAYMENT";

  return (
    <>
      <SectionHeading
        eyebrow="Secure Payment"
        title="پرداخت Founding Charter"
        description="اطلاعات حساب را کنترل کنید، مبلغ را واریز کنید و فایل رسید را در همین صفحه امن بارگذاری کنید."
      />

      {member.membershipStatus === "ACTIVE" ? (
        <Panel className="mx-auto max-w-3xl text-center">
          <CheckCircle2 className="mx-auto size-11 text-emerald-300" />
          <h2 className="mt-5 text-2xl font-black text-white">پرداخت تأیید شده است</h2>
          <p className="mt-3 text-sm leading-7 text-slate-300">
            عضویت شما فعال است و نیازی به ثبت رسید دیگری ندارید.
          </p>
        </Panel>
      ) : application?.status === "PAYMENT_UNDER_REVIEW" ? (
        <Panel className="mx-auto max-w-3xl text-center">
          <Clock3 className="mx-auto size-11 text-iris-300" />
          <h2 className="mt-5 text-2xl font-black text-white">رسید در صف بررسی است</h2>
          <p className="mt-3 text-sm leading-7 text-slate-300">
            نتیجه بررسی در داشبورد نمایش داده می‌شود و نیازی به بارگذاری دوباره نیست.
          </p>
        </Panel>
      ) : canPay ? (
        <div className="grid gap-7 xl:grid-cols-[1.05fr_0.95fr]">
          <BankDetails
            standardPriceToman={application.standardPriceToman}
            foundingPriceToman={application.offeredPriceToman}
          />
          <Panel>
            <h2 className="text-xl font-black text-white">ثبت رسید واریز</h2>
            <p className="mt-2 text-sm leading-7 text-slate-400">
              اطلاعات تراکنش باید با فایل رسید و مبلغ واریزی مطابقت داشته باشد.
            </p>
            {receipt?.status === "REJECTED" ? (
              <div className="my-5 rounded-lg border border-rose-400/25 bg-rose-400/10 p-4">
                <p className="font-black text-rose-100">رسید قبلی تأیید نشد</p>
                <p className="mt-2 text-sm leading-7 text-rose-50/80">
                  {receipt.reviewerNote ||
                    "اطلاعات و فایل رسید را کنترل و نسخه صحیح را ثبت کنید."}
                </p>
              </div>
            ) : null}
            <div className="mt-6">
              <PaymentReceiptForm amountToman={application.offeredPriceToman} />
            </div>
          </Panel>
        </div>
      ) : (
        <Panel className="mx-auto max-w-3xl text-center">
          <ShieldAlert className="mx-auto size-11 text-amber-200" />
          <h2 className="mt-5 text-2xl font-black text-white">
            پرداخت هنوز برای این حساب باز نشده است
          </h2>
          <p className="mt-3 text-sm leading-7 text-slate-300">
            اطلاعات واریز فقط پس از پذیرش رسمی درخواست نمایش داده می‌شود. پیش از
            پذیرش هیچ مبلغی واریز نکنید.
          </p>
          <Link
            href="/portal"
            className="mt-6 inline-flex rounded-lg border border-white/15 px-5 py-3 text-sm font-black text-white"
          >
            مشاهده وضعیت درخواست
          </Link>
        </Panel>
      )}
    </>
  );
}
