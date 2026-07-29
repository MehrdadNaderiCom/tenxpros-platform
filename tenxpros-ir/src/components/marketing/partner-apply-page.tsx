import {
  CheckCircle2,
  FileCheck2,
  Mail,
  MessageSquareText,
  ShieldCheck,
} from "lucide-react";
import {
  ArrowAction,
  CheckList,
  English,
  Eyebrow,
  MarketingLink,
  PageHero,
  Section,
  SectionHeading,
  Surface,
} from "@/components/marketing/marketing-ui";
import { getPublicLegalConfig } from "@/lib/public-legal-config";

function buildPartnerApplicationMailto(email: string) {
  const subject = encodeURIComponent("درخواست TenXPros Partner Program");
  const body = encodeURIComponent(`نام و نام خانوادگی:
نام سازمان یا فعالیت حرفه‌ای:
شهر و کشور:
شماره تماس:
LinkedIn یا وب‌سایت:

حوزه تخصصی و سابقه مرتبط:

شبکه حرفه‌ای یا بازار مورد تمرکز:

نقشی که می‌توانم انجام دهم:

نمونه تجربه مرتبط:

تعارض منافع احتمالی:

بهترین زمان و روش تماس:

Partner Program Terms را مطالعه کرده‌ام: بله یا خیر`);

  return `mailto:${email}?subject=${subject}&body=${body}`;
}

const applicationDetails = [
  "نام کامل، نقش فعلی، شهر و کشور محل فعالیت",
  "LinkedIn، وب‌سایت یا مرجع حرفه‌ای قابل بررسی",
  "حوزه تخصصی و نوع شبکه یا بازار در دسترس",
  "نقش مورد نظر در Introduction، Origination، Closing یا Delivery",
  "یک نمونه کوتاه از تجربه مرتبط و نتیجه آن",
  "هر تعارض منافع یا همکاری مشابه که باید از ابتدا روشن باشد",
];

const reviewSteps = [
  {
    title: "Personal Review",
    copy: "پیام و زمینه حرفه‌ای شما به‌صورت دستی بررسی می‌شود. ارسال ایمیل به معنی پذیرش نیست.",
  },
  {
    title: "Fit Conversation",
    copy: "اگر تناسب اولیه وجود داشته باشد، برای یک گفت‌وگوی کوتاه درباره نقش، بازار و انتظارهای دو طرف تماس می‌گیریم.",
  },
  {
    title: "Written Pilot",
    copy: "در صورت توافق، دعوت‌نامه 90-Day Partner Pilot و Commercial Schedule مربوط پیش از شروع فعالیت ارائه می‌شوند.",
  },
  {
    title: "Activation Gate",
    copy: "پس از تأیید اصول Offer، Brand، محرمانگی و Opportunity Registration، امکان فعالیت رسمی ایجاد می‌شود.",
  },
];

export function PartnerApplyPageContent() {
  const legal = getPublicLegalConfig();
  const mailto = buildPartnerApplicationMailto(legal.partnerApplicationEmail);

  return (
    <>
      <PageHero
        eyebrow="Partner Application"
        title={
          <>
            زمینه حرفه‌ای خود را دقیق بگویید،
            <span className="mt-2 block text-iris-300">
              بدون فرم نمایشی و وعده خودکار.
            </span>
          </>
        }
        description="درخواست Partner Program در نسخه فعلی ایران با ایمیل بررسی می‌شود. دکمه زیر یک پیش‌نویس ساختاریافته در نرم‌افزار ایمیل شما باز می‌کند. این صفحه فرم Backend ندارد و با کلیک روی دکمه، داده‌ای در سایت ذخیره یا ارسال نمی‌شود."
        actions={
          <>
            <ArrowAction href={mailto}>بازکردن پیش‌نویس ایمیل</ArrowAction>
            <MarketingLink href="/partners/terms" variant="secondary">
              مطالعه Partner Terms
            </MarketingLink>
          </>
        }
        trust={[
          "Application بدون هزینه",
          "Review دستی",
          "شروع فقط با توافق مکتوب",
        ]}
      >
        <Surface className="p-7 shadow-panel sm:p-8">
          <div className="flex items-center gap-4 border-b border-white/10 pb-5">
            <span className="grid h-11 w-11 place-items-center rounded-lg bg-iris-500/10 text-iris-300">
              <Mail className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <Eyebrow>Application Channel</Eyebrow>
              <p
                dir="ltr"
                lang="en"
                className="mt-2 text-right font-latin text-base font-semibold text-white"
              >
                {legal.partnerApplicationEmail}
              </p>
            </div>
          </div>
          <p className="mt-5 text-sm leading-8 text-slate-300">
            درخواست فقط زمانی ارسال شده است که ایمیل را در نرم‌افزار خودتان
            Send کنید و نسخه آن در پوشه Sent دیده شود.
          </p>
        </Surface>
      </PageHero>

      <Section>
        <div className="grid gap-9 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
          <SectionHeading
            eyebrow="What To Include"
            title="برای Review اولیه همین اطلاعات کافی است"
            description="پیام روشن و مشخص از معرفی طولانی بهتر است. نام مشتری یا اطلاعات محرمانه را در درخواست اولیه ارسال نکنید."
            inverse={false}
          />
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <CheckList items={applicationDetails} />
            <a
              href={mailto}
              className="focus-ring mt-7 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-iris-500 px-5 text-sm font-semibold text-white shadow-lg shadow-iris-600/20 transition hover:bg-iris-400"
            >
              <MessageSquareText className="h-4 w-4" aria-hidden="true" />
              ساخت ایمیل با این سرفصل‌ها
            </a>
          </div>
        </div>
      </Section>

      <Section tone="dark">
        <SectionHeading
          eyebrow="Review Journey"
          title="بعد از ارسال ایمیل چه می‌شود"
          description="زمان پاسخ ثابت وعده داده نمی‌شود. درخواست با توجه به تناسب، ظرفیت Review و نیاز فعلی Partner Program بررسی خواهد شد."
          align="center"
        />
        <ol className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {reviewSteps.map((step, index) => (
            <li key={step.title}>
              <Surface className="h-full p-6">
                <div className="flex items-center justify-between gap-4">
                  <span className="grid h-10 w-10 place-items-center rounded-lg bg-iris-500/10 text-iris-300">
                    <FileCheck2 className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="font-sans text-xs text-slate-500">
                    ۰{index + 1}
                  </span>
                </div>
                <h2 className="mt-5 text-lg font-semibold text-white">
                  <English>{step.title}</English>
                </h2>
                <p className="mt-3 text-sm leading-8 text-slate-300">
                  {step.copy}
                </p>
              </Surface>
            </li>
          ))}
        </ol>
      </Section>

      <Section>
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-7">
            <div className="flex items-start gap-4">
              <ShieldCheck
                className="mt-1 h-5 w-5 shrink-0 text-amber-700"
                aria-hidden="true"
              />
              <div>
                <h2 className="text-lg font-semibold text-amber-950">
                  اطلاعات محرمانه نفرستید
                </h2>
                <p className="mt-3 text-sm leading-8 text-amber-900">
                  نام مشتری، فهرست Contact، قرارداد، داده مالی، اطلاعات شخصی
                  دیگران یا هر محتوایی را که اجازه افشای آن ندارید در درخواست
                  اولیه قرار ندهید. توصیف کلی و حذف مشخصات‌شده برای Review کافی
                  است.
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-7 shadow-sm">
            <div className="flex items-start gap-4">
              <CheckCircle2
                className="mt-1 h-5 w-5 shrink-0 text-iris-600"
                aria-hidden="true"
              />
              <div>
                <h2 className="text-lg font-semibold text-ink-950">
                  ارسال درخواست چه چیزی ایجاد نمی‌کند
                </h2>
                <p className="mt-3 text-sm leading-8 text-slate-600">
                  ارسال ایمیل، Partner Status، Opportunity Protection، مجوز
                  استفاده از Brand، حق Commission یا تعهد TenXPros برای پذیرش
                  ایجاد نمی‌کند. هر یک از این موارد به تأیید جداگانه و مکتوب
                  نیاز دارد.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-5 rounded-lg border border-slate-200 bg-slate-50 p-7 sm:flex-row">
          <div>
            <h2 className="text-lg font-semibold text-ink-950">
              ایمیل را ارسال کرده‌اید؟
            </h2>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              راهنمای کنترل ارسال و مرحله بعد را ببینید.
            </p>
          </div>
          <MarketingLink
            href="/partners/apply/thank-you"
            variant="secondary"
            className="border-slate-300 bg-white text-slate-800 hover:bg-slate-100"
          >
            بررسی مرحله بعد
          </MarketingLink>
        </div>
      </Section>
    </>
  );
}

export function PartnerApplyThankYouPageContent() {
  const legal = getPublicLegalConfig();
  const mailto = buildPartnerApplicationMailto(legal.partnerApplicationEmail);

  return (
    <>
      <section className="bg-ink-950 py-20 text-white sm:py-28">
        <div className="container-shell">
          <div className="mx-auto max-w-3xl text-center">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-iris-400/10 text-iris-300">
              <Mail className="h-6 w-6" aria-hidden="true" />
            </span>
            <p
              lang="en"
              className="mt-6 font-latin text-xs font-bold tracking-[0.14em] text-iris-300"
            >
              EMAIL CHECK
            </p>
            <h1 className="text-balance mt-5 text-4xl font-semibold leading-[1.35] sm:text-5xl">
              ارسال درخواست را در پوشه Sent کنترل کنید
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-9 text-slate-300">
              این سایت تأیید دریافت خودکار ندارد. اگر ایمیل در پوشه Sent شما
              نیست، درخواست هنوز ارسال نشده است. پس از دریافت و Review دستی، در
              صورت تناسب از طریق همان ایمیل با شما تماس گرفته می‌شود.
            </p>
          </div>
        </div>
      </section>

      <Section>
        <div className="mx-auto max-w-3xl">
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              ["۱", "پوشه Sent", "وجود نسخه ارسال‌شده را کنترل کنید"],
              [
                "۲",
                "نشانی مقصد",
                legal.partnerApplicationEmail,
              ],
              ["۳", "پاسخ", "هیچ زمان پاسخ ثابتی وعده داده نمی‌شود"],
            ].map(([number, title, copy]) => (
              <div
                key={title}
                className="rounded-lg border border-slate-200 bg-white p-6 text-center shadow-sm"
              >
                <span className="mx-auto grid h-9 w-9 place-items-center rounded-full bg-iris-50 font-sans text-sm font-bold text-iris-700">
                  {number}
                </span>
                <h2 className="mt-4 font-semibold text-ink-950">{title}</h2>
                <p
                  dir={title === "نشانی مقصد" ? "ltr" : undefined}
                  className="mt-2 break-words text-sm leading-7 text-slate-600"
                >
                  {copy}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-8 rounded-lg border border-amber-200 bg-amber-50 p-6 text-sm leading-8 text-amber-950">
            این صفحه رسید دریافت نیست و شماره پیگیری ایجاد نمی‌کند. نسخه ایمیل
            ارسال‌شده را نگه دارید. هیچ Opportunity را پیش از تأیید مکتوب ثبت و
            محافظت‌شده فرض نکنید.
          </div>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <ArrowAction href={mailto}>بازکردن دوباره پیش‌نویس</ArrowAction>
            <MarketingLink
              href="/partners"
              variant="secondary"
              className="border-slate-300 bg-white text-slate-800 hover:bg-slate-50"
            >
              بازگشت به Partner Program
            </MarketingLink>
          </div>
        </div>
      </Section>
    </>
  );
}
