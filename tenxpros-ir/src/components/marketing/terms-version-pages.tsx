import Link from "next/link";
import { Archive, CalendarDays, FileClock, ShieldCheck } from "lucide-react";
import {
  ArrowAction,
  CheckList,
  MarketingLink,
  PageHero,
  Section,
  SectionHeading,
  Surface,
} from "@/components/marketing/marketing-ui";
import { PolicyPage, type PolicySection } from "@/components/marketing/policy-page";
import { TechnicalTerm } from "@/components/shared/technical-term";

export const CURRENT_PUBLIC_TERMS_VERSION = "fa-2026-07-v1";
export const CURRENT_PUBLIC_TERMS_DATE = "۷ مرداد ۱۴۰۵";

const versionScope = [
  "ماهیت خصوصی برنامه و Professional Credential غیر دانشگاهی",
  "درخواست رایگان، قیمت ۹۰ میلیون تومان و Founding Charter برابر ۶۰ میلیون تومان",
  "قواعد حساب، Deadline، Extension، Resubmission و Review",
  "Office Hour هفتگی، 1:1 Coaching و DBC Weekly AI Roundtable",
  "مالکیت فکری، محرمانگی، رفتار قابل قبول و نبود تضمین نتیجه",
  "مدت خدمت، Continuity و معرفی طرف قرارداد پیش از پرداخت",
];

const archivedTermsSections: PolicySection[] = [
  {
    id: "nature",
    title: "ماهیت برنامه",
    content: (
      <p>
        TenXPros یک برنامه گزینشی خصوصی برای آموزش حرفه‌ای و صدور{" "}
        <TechnicalTerm>Professional Credential</TechnicalTerm> است. مدرک
        دانشگاهی، Academic Accreditation یا مدرک دولتی نیست.
      </p>
    ),
  },
  {
    id: "operator",
    title: "ارائه‌دهنده و طرف قرارداد",
    content: (
      <>
        <p>
          هویت کامل ارائه‌دهنده خدمت و طرف قرارداد، همراه با اطلاعات ثبتی و
          نشانی لازم، در نامه پذیرش یا قرارداد پیش از هر پرداخت درج می‌شود. تا
          پیش از دریافت آن سند، نام تجاری TenXPros ایران را نباید به‌عنوان نام
          یک شخصیت حقوقی مستقل تفسیر کرد.
        </p>
        <p>
          اطلاعات صاحب حساب بانکی فقط برای تطبیق پرداخت است و به‌تنهایی هویت
          ارائه‌دهنده، طرف قرارداد یا مسئول داده را تعیین نمی‌کند.
        </p>
      </>
    ),
  },
  {
    id: "application",
    title: "درخواست و پذیرش",
    content: (
      <p>
        ارسال درخواست رایگان است و تعهد پرداخت ایجاد نمی‌کند. اطلاعات باید درست
        و متعلق به خود شما باشند. پذیرش بر اساس تناسب برنامه و ظرفیت Review انجام
        می‌شود.
      </p>
    ),
  },
  {
    id: "payment",
    title: "شهریه و پرداخت",
    content: (
      <p>
        قیمت اصلی برنامه ۹۰ میلیون تومان و شهریه Founding Charter برابر ۶۰
        میلیون تومان است. پرداخت یک‌باره، فقط پس از پذیرش و از مسیر رسمی پنل
        انجام می‌شود.
      </p>
    ),
  },
  {
    id: "access",
    title: "دسترسی و مسئولیت عضو",
    content: (
      <p>
        حساب شخصی است. عضو مسئول امنیت رمز، انجام کار اصیل، رعایت Deadlineها،
        حقوق اشخاص دیگر و استفاده مسئولانه از AI است.
      </p>
    ),
  },
  {
    id: "timing",
    title: "Deadline، Extension و Resubmission",
    content: (
      <>
        <p>
          Calendar برنامه، Deadlineهای اصلی، تعداد Reviewهای مشمول شهریه و
          امکان Resubmission باید در Offer یا مدارک پذیرش پیش از پرداخت مشخص
          شوند.
        </p>
        <p>
          Extension یا Resubmission اضافه خودکار نیست. درخواست باید پیش از
          Deadline مطرح شود و فقط با تأیید مکتوب و با توجه به ظرفیت Review
          معتبر خواهد بود. هر هزینه اضافه باید پیش از ارائه خدمت اعلام و پذیرفته
          شود.
        </p>
      </>
    ),
  },
  {
    id: "office-hour",
    title: "Office Hour هفتگی",
    content: (
      <>
        <p>
          هر عضو فعال نسخه فارسی از شنبه ساعت ۰۰:۰۰ تا جمعه ساعت ۲۳:۵۹ به وقت
          تهران فقط یک Office Hour اختصاصی ۳۰ دقیقه‌ای می‌تواند رزرو کند.
        </p>
        <p>
          سهمیه استفاده‌نشده در پایان جمعه منقضی می‌شود و قابل انتقال، انباشت یا
          تبدیل به اعتبار مالی نیست. لینک Zoom پس از رزرو در پنل و ایمیل قرار
          می‌گیرد.
        </p>
      </>
    ),
  },
  {
    id: "services",
    title: "Coaching و نشست DBC",
    content: (
      <>
        <p>
          1:1 Coaching خدمت اختیاری و جداگانه با هزینه ۵ میلیون تومان برای هر
          ۶۰ دقیقه است.
        </p>
        <p>
          DBC Weekly AI Roundtable نشست گروهی ۹۰ دقیقه‌ای برای همه اعضا و
          فارغ‌التحصیلان DBC است، در عضویت آن‌ها قرار دارد و هزینه جداگانه
          ندارد. Coaching و Roundtable هر دو از سهمیه Office Hour مستقل هستند.
        </p>
      </>
    ),
  },
  {
    id: "review",
    title: "Review و Certification",
    content: (
      <>
        <p>
          پایان برنامه Credential را تضمین نمی‌کند. Dossier باید هشت معیار
          Review را برآورده کند. نتیجه می‌تواند Certified، Strong Draft یا
          Completed باشد.
        </p>
        <p>
          پس از صدور Credential، Metadata محدود آن با کد دقیق در Registry عمومی
          قابل بررسی است. محتوای Dossier و دلیل لغو عمومی نمی‌شوند.
        </p>
      </>
    ),
  },
  {
    id: "data-ip",
    title: "داده و مالکیت فکری",
    content: (
      <p>
        داده محرمانه را بدون اختیار ارسال نکنید. شما مالک محتوای اصیل خود
        می‌مانید. Brand، Method، Rubric، Template و Lessonهای TenXPros متعلق به
        صاحب آن‌ها هستند و مجوز بازنشر تجاری ایجاد نمی‌شود.
      </p>
    ),
  },
  {
    id: "conduct",
    title: "رفتار قابل قبول",
    content: (
      <p>
        اشتراک حساب، جعل پرداخت، آزار، نقض حقوق دیگران، دورزدن امنیت یا استفاده
        زیان‌بار ممنوع است و می‌تواند به محدودشدن دسترسی منجر شود.
      </p>
    ),
  },
  {
    id: "guarantees",
    title: "نبود تضمین نتیجه",
    content: (
      <p>
        Certification، استخدام، ارتقا، درآمد، مهاجرت، جذب مشتری یا نتیجه تجاری
        تضمین نمی‌شود. مسئولیت تصمیم حرفه‌ای و نتیجه استفاده از AI با فرد و
        سازمان مربوط باقی می‌ماند.
      </p>
    ),
  },
  {
    id: "continuity",
    title: "مدت خدمت و Continuity",
    content: (
      <>
        <p>
          مدت برنامه، دوره دسترسی، خدمات مشمول شهریه و دسترسی‌های صریح Alumni
          باید در Offer یا مدارک پذیرش ثبت شوند. این شرایط به‌تنهایی میزبانی
          دائمی محتوا، Office Hour نامحدود، Review نامحدود یا ادامه همیشگی همه
          سرویس‌ها را تضمین نمی‌کند.
        </p>
        <p>
          تغییر یا پایان یک سرویس، حقوق قطعی‌شده در سند معتبر و حقوق الزامی
          قانونی را از بین نمی‌برد. شیوه ادامه، جایگزینی یا پایان خدمت باید مطابق
          همان سند و اطلاع‌رسانی مربوط تعیین شود.
        </p>
      </>
    ),
  },
  {
    id: "changes",
    title: "نسخه شرایط و ارتباط",
    content: (
      <p>
        نسخه‌ای که هنگام پذیرش قبول می‌کنید بر عضویت حاکم است. تغییر مهم از طریق
        سایت یا پنل اعلام می‌شود. پرسش‌ها را به support@tenxpros.ir بفرستید.
      </p>
    ),
  },
];

export function TermsUpdatesPageContent() {
  return (
    <>
      <PageHero
        eyebrow="TERMS VERSION HISTORY"
        title={
          <>
            هر نسخه شرایط،
            <span className="mt-2 block text-iris-300">
              تاریخ و Snapshot قابل بازیابی دارد.
            </span>
          </>
        }
        description="این صفحه نسخه جاری، دامنه محتوای آن و مسیر آرشیو را ثبت می‌کند. اگر شرایط به‌طور مهم تغییر کند، نسخه تازه با شناسه و Snapshot جداگانه منتشر خواهد شد."
        actions={
          <>
            <ArrowAction href="/terms">مشاهده شرایط جاری</ArrowAction>
            <MarketingLink
              href={`/terms/archive/${CURRENT_PUBLIC_TERMS_VERSION}`}
              variant="secondary"
            >
              مشاهده Snapshot این نسخه
            </MarketingLink>
          </>
        }
        trust={[
          `نسخه جاری ${CURRENT_PUBLIC_TERMS_VERSION}`,
          `تاریخ انتشار ${CURRENT_PUBLIC_TERMS_DATE}`,
          "آرشیو مستقل برای بازیابی",
        ]}
      >
        <Surface className="p-7 shadow-panel sm:p-8">
          <div className="flex items-start justify-between gap-5">
            <div>
              <p className="font-sans text-xs font-bold tracking-[0.14em] text-iris-300">
                CURRENT VERSION
              </p>
              <p
                dir="ltr"
                className="mt-3 text-right font-mono text-2xl font-semibold text-white"
              >
                {CURRENT_PUBLIC_TERMS_VERSION}
              </p>
              <p className="mt-2 text-sm text-slate-400">
                منتشرشده در {CURRENT_PUBLIC_TERMS_DATE}
              </p>
            </div>
            <FileClock className="h-7 w-7 text-iris-300" aria-hidden="true" />
          </div>
          <div className="mt-6 rounded-lg border border-emerald-300/20 bg-emerald-300/10 p-4 text-sm leading-7 text-emerald-100">
            این نسخه، نسخه‌ای است که در Application با شناسه{" "}
            <span dir="ltr" className="font-mono font-semibold">
              {CURRENT_PUBLIC_TERMS_VERSION}
            </span>{" "}
            ثبت می‌شود.
          </div>
        </Surface>
      </PageHero>

      <Section>
        <div className="grid gap-9 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <SectionHeading
            eyebrow="Version Scope"
            title="این نسخه چه موضوع‌هایی را ثبت می‌کند"
            description="این نخستین Snapshot منتشرشده نسخه فارسی است. فهرست زیر دامنه آن را خلاصه می‌کند و جایگزین متن کامل آرشیو نیست."
            inverse={false}
          />
          <CheckList items={versionScope} />
        </div>
      </Section>

      <Section tone="dark">
        <SectionHeading
          eyebrow="Change Log"
          title="سابقه نسخه‌های منتشرشده"
          description="هر ردیف به Snapshot ثابت همان نسخه متصل می‌شود. متن جاری می‌تواند برای خوانایی بهتر نمایش داده شود، اما نسخه پذیرفته‌شده از مسیر آرشیو بازیابی خواهد شد."
        />
        <div className="mt-10 overflow-hidden rounded-lg border border-white/10 bg-ink-850">
          <div className="grid gap-4 p-6 sm:grid-cols-[11rem_9rem_1fr_auto] sm:items-center sm:p-7">
            <div>
              <p className="text-xs font-semibold text-slate-500">Version</p>
              <p
                dir="ltr"
                className="mt-2 text-right font-mono font-semibold text-white"
              >
                {CURRENT_PUBLIC_TERMS_VERSION}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">Published</p>
              <p className="mt-2 text-sm text-white">
                {CURRENT_PUBLIC_TERMS_DATE}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">Change</p>
              <p className="mt-2 text-sm leading-7 text-slate-300">
                انتشار نخستین نسخه فارسی با قواعد Offer، عضویت، Review، خدمات
                هفتگی، مسئولیت‌ها و Continuity.
              </p>
            </div>
            <Link
              href={`/terms/archive/${CURRENT_PUBLIC_TERMS_VERSION}`}
              className="dark-focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-white/15 px-4 text-sm font-semibold text-white transition hover:bg-white/[0.06]"
            >
              <Archive className="h-4 w-4" aria-hidden="true" />
              آرشیو
            </Link>
          </div>
        </div>
      </Section>

      <Section>
        <div className="mx-auto max-w-3xl rounded-lg border border-slate-200 bg-slate-50 p-7 sm:p-9">
          <div className="flex items-start gap-4">
            <ShieldCheck
              className="mt-1 h-5 w-5 shrink-0 text-iris-600"
              aria-hidden="true"
            />
            <div>
              <h2 className="text-xl font-semibold text-ink-950">
                سیاست نگهداری نسخه
              </h2>
              <p className="mt-3 text-sm leading-8 text-slate-600">
                تغییر مهم در قیمت، دامنه خدمت، حقوق عضو، Review، بازپرداخت یا
                مسئولیت‌ها باید با شناسه نسخه تازه منتشر شود. Snapshot این نسخه
                در مسیر فعلی ثابت می‌ماند تا مقدار termsVersion ثبت‌شده در
                Application قابل بازیابی باشد.
              </p>
              <p className="mt-3 inline-flex items-center gap-2 text-xs font-medium text-slate-500">
                <CalendarDays className="h-4 w-4" aria-hidden="true" />
                زمان پذیرش هر Application به‌صورت جداگانه ثبت می‌شود.
              </p>
            </div>
          </div>
        </div>
      </Section>
    </>
  );
}

export function ArchivedTermsFa202607V1PageContent() {
  return (
    <PolicyPage
      eyebrow="ARCHIVED TERMS SNAPSHOT"
      title="آرشیو شرایط استفاده"
      updated={CURRENT_PUBLIC_TERMS_DATE}
      description={
        <>
          Snapshot ثابت نسخه{" "}
          <span dir="ltr" className="font-mono font-semibold text-white">
            {CURRENT_PUBLIC_TERMS_VERSION}
          </span>
          ، منتشرشده برای بازیابی شرایط پذیرفته‌شده در Application.
        </>
      }
      sections={archivedTermsSections}
      notice={
        <p>
          این صفحه آرشیوی است و متن جاری را تغییر نمی‌دهد. برای آخرین نسخه به{" "}
          <Link
            href="/terms"
            className="font-semibold underline underline-offset-4"
          >
            شرایط استفاده
          </Link>{" "}
          و برای سابقه نسخه‌ها به{" "}
          <Link
            href="/terms/updates"
            className="font-semibold underline underline-offset-4"
          >
            Version History
          </Link>{" "}
          مراجعه کنید.
        </p>
      }
    />
  );
}
