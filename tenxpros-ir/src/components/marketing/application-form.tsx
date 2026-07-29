"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { AlertCircle, ArrowLeft, LockKeyhole } from "lucide-react";
import { submitApplicationAction } from "@/actions/application";
import { INITIAL_ACTION_STATE } from "@/actions/action-state";

const inputClass =
  "mt-2 min-h-12 w-full rounded-lg border border-white/10 bg-ink-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-iris-400/60 focus:ring-2 focus:ring-iris-500/15";

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return <p className="mt-2 text-xs leading-6 text-rose-300">{errors[0]}</p>;
}

export function ApplicationForm() {
  const [state, formAction] = useFormState(submitApplicationAction, INITIAL_ACTION_STATE);
  const error = state.status === "error";

  return (
    <form action={formAction} className="space-y-8">
      {error ? (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-lg border border-rose-400/25 bg-rose-500/[0.08] p-4 text-sm leading-7 text-rose-100"
        >
          <AlertCircle className="mt-1 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{state.message}</span>
        </div>
      ) : null}

      <fieldset>
        <legend className="text-lg font-black text-white">اطلاعات تماس و حرفه‌ای</legend>
        <p className="mt-2 text-sm leading-7 text-slate-400">
          برای بازبینی اولیه و ساخت حساب متقاضی استفاده می‌شود.
        </p>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <label className="text-sm font-bold text-slate-200">
            نام و نام خانوادگی
            <input
              name="fullName"
              type="text"
              autoComplete="name"
              required
              minLength={2}
              maxLength={200}
              className={inputClass}
            />
            <FieldError errors={state.fieldErrors?.fullName} />
          </label>
          <label className="text-sm font-bold text-slate-200">
            ایمیل
            <input
              name="email"
              type="email"
              dir="ltr"
              autoComplete="email"
              required
              maxLength={320}
              className={`${inputClass} text-left`}
            />
            <FieldError errors={state.fieldErrors?.email} />
          </label>
          <label className="text-sm font-bold text-slate-200">
            شماره موبایل
            <input
              name="phone"
              type="tel"
              dir="ltr"
              inputMode="tel"
              autoComplete="tel"
              required
              placeholder="09121234567"
              className={`${inputClass} text-left`}
            />
            <FieldError errors={state.fieldErrors?.phone} />
          </label>
          <label className="text-sm font-bold text-slate-200">
            نقش حرفه‌ای
            <input
              name="professionalRole"
              type="text"
              required
              minLength={2}
              maxLength={200}
              placeholder="برای نمونه، مدیر محصول یا مشاور استراتژی"
              className={inputClass}
            />
            <FieldError errors={state.fieldErrors?.professionalRole} />
          </label>
          <label className="text-sm font-bold text-slate-200">
            حوزه تخصصی
            <input
              name="domain"
              type="text"
              required
              minLength={2}
              maxLength={200}
              placeholder="برای نمونه، سلامت، مالی یا آموزش"
              className={inputClass}
            />
            <FieldError errors={state.fieldErrors?.domain} />
          </label>
          <label className="text-sm font-bold text-slate-200">
            سازمان یا شرکت
            <span className="mr-2 text-xs font-normal text-slate-500">اختیاری</span>
            <input
              name="organization"
              type="text"
              autoComplete="organization"
              maxLength={200}
              className={inputClass}
            />
            <FieldError errors={state.fieldErrors?.organization} />
          </label>
          <label className="text-sm font-bold text-slate-200">
            سال‌های تجربه حرفه‌ای
            <span className="mr-2 text-xs font-normal text-slate-500">اختیاری</span>
            <input
              name="experienceYears"
              type="number"
              inputMode="numeric"
              min={0}
              max={70}
              className={inputClass}
            />
            <FieldError errors={state.fieldErrors?.experienceYears} />
          </label>
          <label className="text-sm font-bold text-slate-200">
            لینک LinkedIn
            <span className="mr-2 text-xs font-normal text-slate-500">اختیاری</span>
            <input
              name="linkedinUrl"
              type="url"
              dir="ltr"
              inputMode="url"
              placeholder="https://linkedin.com/in/your-profile"
              className={`${inputClass} text-left`}
            />
            <FieldError errors={state.fieldErrors?.linkedinUrl} />
          </label>
        </div>
      </fieldset>

      <fieldset className="border-t border-white/[0.08] pt-8">
        <legend className="text-lg font-black text-white">تجربه و آمادگی</legend>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <label className="text-sm font-bold text-slate-200">
            تجربه فعلی شما با AI
            <select name="aiExperience" required defaultValue="" className={inputClass}>
              <option value="" disabled>
                یک گزینه را انتخاب کنید
              </option>
              <option value="BEGINNER">تازه شروع کرده‌ام</option>
              <option value="PRACTICAL">تجربه کاربردی دارم</option>
              <option value="ADVANCED">در سطح پیشرفته کار می‌کنم</option>
            </select>
            <FieldError errors={state.fieldErrors?.aiExperience} />
          </label>
          <label className="text-sm font-bold text-slate-200">
            زمان قابل اختصاص در هر هفته
            <select name="weeklyAvailability" required defaultValue="" className={inputClass}>
              <option value="" disabled>
                یک گزینه را انتخاب کنید
              </option>
              <option value="THREE_TO_FIVE">۳ تا ۵ ساعت</option>
              <option value="FIVE_TO_SEVEN">۵ تا ۷ ساعت</option>
              <option value="SEVEN_PLUS">بیش از ۷ ساعت</option>
            </select>
            <FieldError errors={state.fieldErrors?.weeklyAvailability} />
          </label>
        </div>
        <div className="mt-5 grid gap-5">
          <label className="text-sm font-bold text-slate-200">
            چرا می‌خواهید وارد TenXPros شوید؟
            <textarea
              name="motivation"
              required
              minLength={30}
              maxLength={5000}
              rows={5}
              placeholder="انگیزه، هدف حرفه‌ای و تغییری را که می‌خواهید ایجاد کنید توضیح دهید."
              className={`${inputClass} resize-y`}
            />
            <span className="mt-2 block text-xs leading-6 text-slate-500">حداقل ۳۰ نویسه</span>
            <FieldError errors={state.fieldErrors?.motivation} />
          </label>
          <label className="text-sm font-bold text-slate-200">
            مسئله واقعی که می‌خواهید روی آن کار کنید چیست؟
            <textarea
              name="realProblem"
              required
              minLength={30}
              maxLength={5000}
              rows={6}
              placeholder="زمینه، افراد درگیر، هزینه مسئله و آنچه اکنون مانع پیشرفت است را بنویسید. اطلاعات محرمانه وارد نکنید."
              className={`${inputClass} resize-y`}
            />
            <span className="mt-2 block text-xs leading-6 text-slate-500">
              از نام مشتری، بیمار، داده تنظیم‌گری‌شده یا اطلاعات قابل شناسایی استفاده نکنید.
            </span>
            <FieldError errors={state.fieldErrors?.realProblem} />
          </label>
        </div>
      </fieldset>

      <fieldset className="border-t border-white/[0.08] pt-8">
        <legend className="text-lg font-black text-white">ساخت حساب متقاضی</legend>
        <p className="mt-2 text-sm leading-7 text-slate-400">
          پس از ثبت، برای مشاهده وضعیت درخواست با همین ایمیل و رمز وارد می‌شوید.
        </p>
        <div className="mt-5">
          <label className="block text-sm font-bold text-slate-200">
            رمز عبور
            <input
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={10}
              maxLength={72}
              className={inputClass}
            />
            <span className="mt-2 block text-xs leading-6 text-slate-500">
              حداقل ۱۰ نویسه و شامل دست‌کم یک حرف و یک عدد
            </span>
            <FieldError errors={state.fieldErrors?.password} />
          </label>
        </div>
      </fieldset>

      <div className="border-t border-white/[0.08] pt-8">
        <label className="flex items-start gap-3 text-sm leading-7 text-slate-300">
          <input
            name="acceptTerms"
            type="checkbox"
            required
            className="mt-1.5 h-4 w-4 shrink-0 accent-[#6964F5]"
          />
          <span>
            <Link href="/terms" target="_blank" className="font-bold text-iris-300 hover:text-white">
              شرایط استفاده
            </Link>{" "}
            و{" "}
            <Link href="/privacy" target="_blank" className="font-bold text-iris-300 hover:text-white">
              سیاست حریم خصوصی
            </Link>{" "}
            را خوانده‌ام و می‌پذیرم. تأیید می‌کنم اطلاعات فرم درست است و داده محرمانه اشخاص ثالث را
            ارسال نکرده‌ام.
          </span>
        </label>
        <FieldError errors={state.fieldErrors?.acceptTerms} />
      </div>

      <div className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
        <label>
          وب‌سایت
          <input name="website" type="text" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div className="rounded-lg border border-iris-400/20 bg-iris-500/[0.06] p-5">
        <div className="flex items-start gap-3">
          <LockKeyhole className="mt-1 h-5 w-5 shrink-0 text-iris-300" aria-hidden="true" />
          <p className="text-sm leading-7 text-slate-300">
            ابتدا درخواست بررسی می‌شود. فقط پس از پذیرش، اطلاعات رسمی پرداخت در پنل شما نمایش
            داده خواهد شد. ارسال این فرم هیچ تعهد پرداختی ایجاد نمی‌کند.
          </p>
        </div>
      </div>

      <SubmitApplicationButton />
    </form>
  );
}

function SubmitApplicationButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-lg bg-iris-500 px-6 py-4 text-sm font-black text-white shadow-lg shadow-iris-600/20 transition hover:bg-iris-400 disabled:cursor-wait disabled:opacity-60"
    >
      {pending ? "در حال ثبت درخواست" : "ثبت و ارسال درخواست"}
      {!pending ? <ArrowLeft className="h-4 w-4" aria-hidden="true" /> : null}
    </button>
  );
}
