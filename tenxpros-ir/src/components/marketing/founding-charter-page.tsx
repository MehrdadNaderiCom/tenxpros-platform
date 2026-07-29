import {
  BadgeCheck,
  Banknote,
  CalendarClock,
  Check,
  CircleDollarSign,
  FileCheck2,
  FileUp,
  LockKeyhole,
  ReceiptText,
  ScanSearch,
  ShieldCheck,
  UserCheck
} from "lucide-react";
import {
  CheckList,
  FinalCta,
  MarketingShell,
  Metrics,
  OfficeHourNotice,
  PageHero,
  PrimaryLink,
  Section,
  SectionHeader
} from "@/components/marketing/marketing-ui";
import { TechnicalTerm } from "@/components/shared/technical-term";

function PriceCard() {
  const included = [
    "برنامه هدایت‌شده ۱۲ هفته‌ای",
    "Diagnostic و مسیر متناسب با حوزه شما",
    "TenX Method با چهار مرحله متصل",
    "هشت خروجی و Living AI Solution Dossier",
    "Review در سطح بخش‌های Dossier",
    "Capstone Review و Credential قابل Verification",
    "90-Day Roadmap",
    "یک Office Hour سی‌دقیقه‌ای در هر هفته تقویمی ایران",
    "DBC Weekly AI Roundtable بدون هزینه جداگانه"
  ];

  return (
    <div className="overflow-hidden rounded-lg border border-credential/30 bg-white text-slate-900 shadow-panel">
      <div className="border-b border-slate-200 bg-slate-50 p-6 sm:p-7">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p
              lang="en"
              className="font-latin text-xs font-bold tracking-[0.14em] text-iris-600"
            >
              FOUNDING CHARTER
            </p>
            <p className="mt-2 text-sm font-medium text-slate-500">
              شهریه فعلی برنامه
            </p>
          </div>
          <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
            پذیرش باز است
          </span>
        </div>
        <div className="mt-7 flex items-end gap-4">
          <div>
            <p className="text-sm text-slate-500">قیمت Founding Charter</p>
            <p className="mt-2 text-4xl font-semibold text-ink-950">
              ۶۰ میلیون
            </p>
            <p className="mt-1 text-sm text-slate-500">تومان، پرداخت یک‌باره</p>
          </div>
          <p className="mb-6 text-sm text-slate-400 line-through decoration-slate-400">
            ۹۰ میلیون تومان
          </p>
        </div>
      </div>
      <div className="p-6 sm:p-7">
        <ul className="space-y-3">
          {included.map((item) => (
            <li
              key={item}
              className="flex items-start gap-3 text-sm leading-7 text-slate-700"
            >
              <span className="mt-1.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-iris-50 text-iris-600">
                <Check aria-hidden="true" className="h-3.5 w-3.5" />
              </span>
              {item}
            </li>
          ))}
        </ul>
        <div className="mt-7">
          <PrimaryLink href="/apply">
            درخواست بررسی برای Founding Charter
          </PrimaryLink>
        </div>
        <p className="mt-5 flex items-center gap-2 text-xs leading-6 text-slate-500">
          <LockKeyhole aria-hidden="true" className="h-4 w-4 text-iris-600" />
          پیش از پذیرش هیچ پرداختی انجام نمی‌دهید
        </p>
      </div>
    </div>
  );
}

export function FoundingCharterPage() {
  return (
    <MarketingShell>
      <PageHero
        eyebrow="FOUNDING CHARTER"
        title="یک برنامه. یک شهریه روشن."
        description={
          <>
            قیمت اصلی برنامه ۹۰ میلیون تومان است.{" "}
            <TechnicalTerm>Founding Charter</TechnicalTerm> برای ظرفیت فعلی با
            شهریه ۶۰ میلیون تومان ارائه می‌شود. ابتدا درخواست می‌دهید و فقط پس
            از پذیرش پرداخت می‌کنید.
          </>
        }
        primary={{ label: "درخواست بررسی", href: "/apply" }}
        secondary={{ label: "TenX Method", href: "/program" }}
      >
        <PriceCard />
      </PageHero>

      <Section tone="dark" className="-mt-px pb-20 pt-0 sm:pb-24">
        <Metrics
          dark
          items={[
            { value: "۹۰ میلیون", label: "قیمت اصلی برنامه" },
            { value: "۶۰ میلیون", label: "شهریه Founding Charter" },
            { value: "۰ تومان", label: "پیش از پذیرش" },
            { value: "یک‌باره", label: "روش پرداخت" }
          ]}
        />
      </Section>

      <Section>
        <div className="grid items-start gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <SectionHeader
            eyebrow="WHAT YOU PAY FOR"
            title="ارزش برنامه در خروجی ارزیابی‌شده است."
            description={
              <>
                شهریه برای تماشای چند Lesson یا دریافت یک گواهی حضور نیست. شما
                یک مسئله واقعی را با <TechnicalTerm>TenX Method</TechnicalTerm>{" "}
                پیش می‌برید، هشت خروجی می‌سازید و Dossier خود را زیر یک Review
                Standard روشن قرار می‌دهید.
              </>
            }
          />
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              {
                icon: ScanSearch,
                title: "مسئله از حوزه شما",
                text: "کار از یک چالش واقعی و دارای اهمیت حرفه‌ای شروع می‌شود."
              },
              {
                icon: FileCheck2,
                title: "Dossier ارزیابی‌شده",
                text: "هشت خروجی متصل با معیارهای عمومی Review بررسی می‌شوند."
              },
              {
                icon: BadgeCheck,
                title: "Credential قابل Verification",
                text: "Credential فقط پس از برآورده‌شدن استاندارد صادر می‌شود و وضعیت آن از Registry عمومی قابل بررسی است."
              },
              {
                icon: CalendarClock,
                title: "پشتیبانی دقیق",
                text: "یک Office Hour سی‌دقیقه‌ای در هر هفته تقویمی ایران دارید."
              }
            ].map((item) => {
              const Icon = item.icon;
              return (
                <article
                  key={item.title}
                  className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <Icon aria-hidden="true" className="h-5 w-5 text-iris-600" />
                  <h3 className="mt-4 font-semibold text-ink-950">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-7 text-slate-600">
                    {item.text}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </Section>

      <Section tone="soft">
        <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16">
          <div>
            <SectionHeader
              eyebrow="INCLUDED SUPPORT"
              title="Office Hour با حد دقیق و قابل پیش‌بینی."
              description="ظرفیت پشتیبانی بخشی از طراحی برنامه است. به همین دلیل، قاعده استفاده از ابتدا شفاف اعلام می‌شود."
            />
            <div className="mt-8">
              <OfficeHourNotice />
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
            <h3 className="font-semibold text-ink-950">
              آنچه این سهمیه نیست
            </h3>
            <CheckList
              items={[
                "دسترسی نامحدود به مربی نیست",
                "بیش از یک جلسه در هفته نیست",
                "در هفته‌های بعد ذخیره نمی‌شود",
                "قابل تبدیل به Coaching یا اعتبار مالی نیست"
              ]}
            />
          </div>
        </div>
      </Section>

      <Section tone="dark">
        <SectionHeader
          inverse
          eyebrow="HOW PAYMENT WORKS"
          title="پذیرش اول، پرداخت بعد."
          description={
            <>
              اطلاعات بانکی فقط پس از پذیرش در پنل شما نمایش داده می‌شود. مبلغ را
              واریز می‌کنید، رسید را بارگذاری می‌کنید و ثبت‌نام پس از بررسی
              پرداخت فعال می‌شود.
            </>
          }
          align="center"
        />
        <ol className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: UserCheck,
              title: "درخواست عضویت",
              text: "تخصص، حوزه و مسئله حرفه‌ای خود را معرفی می‌کنید."
            },
            {
              icon: ShieldCheck,
              title: "بررسی و پذیرش",
              text: "درخواست از نظر تناسب و آمادگی برای کار واقعی بررسی می‌شود."
            },
            {
              icon: Banknote,
              title: "واریز بانکی",
              text: "پس از پذیرش، اطلاعات حساب رسمی در پنل نمایش داده می‌شود."
            },
            {
              icon: FileUp,
              title: "بارگذاری رسید",
              text: "رسید واضح را ارسال می‌کنید و نتیجه بررسی در پنل اعلام می‌شود."
            }
          ].map((step, index) => {
            const Icon = step.icon;
            return (
              <li
                key={step.title}
                className="rounded-lg border border-white/10 bg-white/[0.035] p-5"
              >
                <div className="flex items-center justify-between">
                  <span className="grid h-10 w-10 place-items-center rounded-lg bg-iris-400/10 text-iris-300">
                    <Icon aria-hidden="true" className="h-5 w-5" />
                  </span>
                  <span className="text-xs font-bold text-slate-600">
                    {`۰${index + 1}`}
                  </span>
                </div>
                <h3 className="mt-6 font-semibold text-white">{step.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-400">
                  {step.text}
                </p>
              </li>
            );
          })}
        </ol>
        <div className="mx-auto mt-8 flex max-w-3xl items-start gap-3 rounded-lg border border-credential/20 bg-credential/[0.06] p-4 text-sm leading-7 text-slate-300">
          <ReceiptText
            aria-hidden="true"
            className="mt-1 h-5 w-5 shrink-0 text-credential"
          />
          برای امنیت پرداخت، فقط اطلاعاتی را معتبر بدانید که پس از پذیرش در پنل
          خودتان نمایش داده می‌شود. پیش از تأیید درخواست، وجهی واریز نکنید.
        </div>
      </Section>

      <Section>
        <div className="grid items-center gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
          <SectionHeader
            eyebrow="OPTIONAL COACHING"
            title="زمان عمیق‌تر، با هزینه جداگانه."
            description={
              <>
                <TechnicalTerm>1:1 Coaching</TechnicalTerm> برای مسئله‌هایی است
                که از ظرفیت Office Hour سی‌دقیقه‌ای فراتر می‌روند. این خدمت
                اختیاری است و در شهریه Founding Charter محاسبه نشده است.
              </>
            }
          />
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-7 sm:p-9">
            <p
              lang="en"
              className="font-latin text-xs font-bold tracking-[0.14em] text-iris-600"
            >
              1:1 COACHING
            </p>
            <p className="mt-5 text-4xl font-semibold text-ink-950">
              ۵ میلیون تومان
            </p>
            <p className="mt-2 text-sm text-slate-500">برای هر ۶۰ دقیقه</p>
            <p className="mt-6 border-t border-slate-200 pt-6 text-sm leading-7 text-slate-600">
              Coaching یک رزرو جداگانه است و سهمیه Office Hour را تغییر نمی‌دهد.
              زمان‌های موجود پس از ارسال درخواست هماهنگ می‌شوند.
            </p>
          </div>
        </div>
      </Section>

      <Section tone="soft">
        <SectionHeader
          eyebrow="CLEAR ANSWERS"
          title="پیش از درخواست، این موارد را بدانید."
          align="center"
        />
        <div className="mx-auto mt-10 grid max-w-5xl gap-4 md:grid-cols-2">
          {[
            {
              q: "آیا ۶۰ میلیون تومان قسطی است؟",
              a: "خیر. مبلغ Founding Charter یک پرداخت یک‌باره پس از پذیرش است."
            },
            {
              q: "آیا پیش از درخواست باید پرداخت کنم؟",
              a: "خیر. درخواست عضویت هیچ تعهد پرداختی ایجاد نمی‌کند."
            },
            {
              q: "آیا پایان دوره Credential را تضمین می‌کند؟",
              a: "خیر. Dossier باید معیارهای Review را برآورده کند."
            },
            {
              q: "آیا Coaching در مبلغ ۶۰ میلیون تومان است؟",
              a: "خیر. Coaching اختیاری و برای هر ۶۰ دقیقه ۵ میلیون تومان است."
            }
          ].map((item) => (
            <article
              key={item.q}
              className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
            >
              <h3 className="font-semibold leading-7 text-ink-950">{item.q}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">{item.a}</p>
            </article>
          ))}
        </div>
      </Section>

      <FinalCta
        title="اگر مسئله واقعی دارید، از همین‌جا شروع کنید."
        description="درخواست عضویت رایگان است و هیچ تعهد پرداختی ایجاد نمی‌کند. شهریه فقط پس از پذیرش و از مسیر رسمی پنل پرداخت می‌شود."
      />
    </MarketingShell>
  );
}
