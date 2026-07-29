"use client";

import { FileCheck2, ShieldCheck } from "lucide-react";
import { useFormState } from "react-dom";

import { INITIAL_ACTION_STATE } from "@/actions/action-state";
import { submitPaymentReceiptAction } from "@/actions/payments";

import { FormMessage } from "./form-message";
import { SubmitButton } from "./submit-button";

function FieldError({
  errors,
}: {
  errors?: string[];
}) {
  if (!errors?.[0]) return null;
  return <p className="mt-2 text-xs leading-6 text-rose-200">{errors[0]}</p>;
}

const inputClass =
  "min-h-12 w-full rounded-lg border border-white/10 bg-white/[0.055] px-4 text-white outline-none transition placeholder:text-slate-600 focus:border-iris-400 focus:ring-2 focus:ring-iris-400/20";

export function PaymentReceiptForm({
  amountToman,
}: {
  amountToman: number;
}) {
  const [state, formAction] = useFormState(
    submitPaymentReceiptAction,
    INITIAL_ACTION_STATE,
  );

  if (state.status === "success") {
    return (
      <div className="rounded-lg border border-emerald-400/25 bg-emerald-400/10 p-6 sm:p-8">
        <FileCheck2 className="size-10 text-emerald-300" />
        <h2 className="mt-5 text-2xl font-black text-white">رسید شما ثبت شد</h2>
        <p className="mt-3 leading-8 text-emerald-50">{state.message}</p>
        <a
          href="/portal"
          className="mt-6 inline-flex min-h-12 items-center justify-center rounded-lg bg-white px-5 py-3 text-sm font-black text-emerald-900"
        >
          ورود به پنل و مشاهده وضعیت
        </a>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="payerName" className="mb-2 block text-sm font-bold text-slate-200">
            نام پرداخت‌کننده
          </label>
          <input
            id="payerName"
            name="payerName"
            required
            autoComplete="name"
            className={inputClass}
          />
          <FieldError errors={state.fieldErrors?.payerName} />
        </div>
        <div>
          <label htmlFor="paidAt" className="mb-2 block text-sm font-bold text-slate-200">
            تاریخ واریز
          </label>
          <input
            id="paidAt"
            name="paidAt"
            type="date"
            required
            dir="ltr"
            className={`${inputClass} text-left`}
          />
          <FieldError errors={state.fieldErrors?.paidAt} />
        </div>
      </div>

      <input type="hidden" name="amountToman" value={amountToman} />

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label
            htmlFor="referenceNumber"
            className="mb-2 block text-sm font-bold text-slate-200"
          >
            شماره پیگیری تراکنش
          </label>
          <input
            id="referenceNumber"
            name="referenceNumber"
            required
            maxLength={100}
            dir="ltr"
            className={`${inputClass} text-left`}
          />
          <FieldError errors={state.fieldErrors?.referenceNumber} />
        </div>
        <div>
          <label
            htmlFor="sourceLastFour"
            className="mb-2 block text-sm font-bold text-slate-200"
          >
            چهار رقم آخر کارت مبدأ
          </label>
          <input
            id="sourceLastFour"
            name="sourceLastFour"
            required
            minLength={4}
            maxLength={4}
            inputMode="numeric"
            pattern="[0-9]{4}"
            dir="ltr"
            placeholder="1234"
            className={`${inputClass} text-left`}
          />
          <FieldError errors={state.fieldErrors?.sourceLastFour} />
        </div>
      </div>

      <div>
        <label htmlFor="receipt" className="mb-2 block text-sm font-bold text-slate-200">
          فایل رسید واریز
        </label>
        <div className="rounded-lg border border-dashed border-iris-300/30 bg-iris-500/[0.06] p-4">
          <input
            id="receipt"
            name="receipt"
            type="file"
            required
            accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
            className="block w-full text-sm text-slate-300 file:ml-4 file:rounded-lg file:border-0 file:bg-white file:px-4 file:py-2 file:text-sm file:font-black file:text-slate-900"
          />
          <p className="mt-3 text-xs leading-6 text-slate-400">
            فرمت PDF، JPG یا PNG با حجم حداکثر ۸ مگابایت پذیرفته می‌شود.
          </p>
        </div>
        <FieldError errors={state.fieldErrors?.receipt} />
      </div>

      <div>
        <label htmlFor="note" className="mb-2 block text-sm font-bold text-slate-200">
          توضیح اختیاری
        </label>
        <textarea
          id="note"
          name="note"
          rows={3}
          maxLength={1000}
          placeholder="اگر واریز از حساب شخص دیگری انجام شده است، اینجا توضیح دهید."
          className={`${inputClass} py-3 leading-7`}
        />
      </div>

      <label className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/[0.035] p-4 text-sm leading-7 text-slate-300">
        <input
          type="checkbox"
          name="confirmPayment"
          value="on"
          required
          className="mt-1.5 size-4 accent-indigo-500"
        />
        <ShieldCheck className="mt-1.5 size-4 shrink-0 text-emerald-300" />
        <span>
          تأیید می‌کنم مبلغ{" "}
          {new Intl.NumberFormat("fa-IR").format(amountToman)} تومان را به حساب
          اعلام‌شده واریز کرده‌ام و اطلاعات این فرم صحیح است.
        </span>
      </label>
      <FieldError errors={state.fieldErrors?.confirmPayment} />

      <FormMessage message={state.message} tone="error" />

      <SubmitButton className="w-full" pendingLabel="در حال بارگذاری امن رسید">
        ثبت امن رسید
      </SubmitButton>
    </form>
  );
}
