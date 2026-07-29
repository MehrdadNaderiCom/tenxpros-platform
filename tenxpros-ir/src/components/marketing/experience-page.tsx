import {
  CalendarCheck2,
  CalendarClock,
  CalendarPlus,
  CheckCircle2,
  Clock3,
  MailCheck,
  MessageCircleMore,
  Network,
  Sparkles,
  UserRound,
  Video
} from "lucide-react";
import {
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

function ExperienceVisual() {
  return (
    <div className="rounded-lg border border-white/15 bg-white/[0.035] p-5 shadow-panel sm:p-7">
      <div className="flex items-center justify-between">
        <div>
          <p
            lang="en"
            className="font-latin text-[0.65rem] font-bold tracking-[0.15em] text-iris-300"
          >
            MEMBER EXPERIENCE
          </p>
          <p className="mt-2 text-lg font-semibold text-white">
            زمان و هدف هر تعامل روشن است
          </p>
        </div>
        <Sparkles aria-hidden="true" className="h-5 w-5 text-credential" />
      </div>
      <div className="mt-6 space-y-3">
        {[
          {
            icon: CalendarClock,
            name: "Weekly Office Hour",
            meta: "۳۰ دقیقه · هفته‌ای یک بار"
          },
          {
            icon: Network,
            name: "DBC Weekly AI Roundtable",
            meta: "۹۰ دقیقه · نشست گروهی"
          },
          {
            icon: UserRound,
            name: "1:1 Coaching",
            meta: "۶۰ دقیقه · خدمت اختیاری"
          }
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.name}
              className="flex items-center gap-4 rounded-lg border border-white/10 bg-ink-900 p-4"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-iris-400/10 text-iris-300">
                <Icon aria-hidden="true" className="h-5 w-5" />
              </span>
              <div>
                <TechnicalTerm className="text-sm font-semibold text-white">
                  {item.name}
                </TechnicalTerm>
                <p className="mt-1 text-xs text-slate-500">{item.meta}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ExperiencePage() {
  return (
    <MarketingShell>
      <PageHero
        eyebrow="MEMBER EXPERIENCE"
        title="پشتیبانی باید دقیق باشد، نه پر از وعده‌های مبهم."
        description={
          <>
            <TechnicalTerm>Office Hour</TechnicalTerm>،{" "}
            <TechnicalTerm>1:1 Coaching</TechnicalTerm> و نشست هفتگی{" "}
            <TechnicalTerm>DBC</TechnicalTerm> سه تجربه جدا هستند. زمان، هزینه،
            مخاطب و هدف هرکدام از ابتدا روشن است.
          </>
        }
        secondary={{ label: "پرسش‌های متداول", href: "/faq" }}
      >
        <ExperienceVisual />
      </PageHero>

      <Section tone="dark" className="-mt-px pb-20 pt-0 sm:pb-24">
        <Metrics
          dark
          items={[
            { value: "۳۰ دقیقه", label: "Office Hour هر عضو" },
            { value: "۱ بار", label: "از شنبه تا جمعه" },
            { value: "۹۰ دقیقه", label: "DBC Weekly Roundtable" },
            { value: "۵ میلیون", label: "1:1 Coaching ساعتی" }
          ]}
        />
      </Section>

      <Section>
        <div className="grid items-start gap-12 lg:grid-cols-[0.75fr_1.25fr] lg:gap-16">
          <SectionHeader
            eyebrow="WEEKLY OFFICE HOUR"
            title="هر هفته، یک زمان مشخص برای مسئله واقعی شما."
            description={
              <>
                <TechnicalTerm>Office Hour</TechnicalTerm> یک جلسه اختصاصی و کوتاه
                برای رفع گره، بررسی یک تصمیم یا مشخص‌کردن قدم بعد است. این زمان
                جایگزین کار مستقل شما نیست و ظرفیت آن برای هر نفر دقیقاً محدود
                است.
              </>
            }
          />
          <div>
            <OfficeHourNotice />
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {[
                {
                  icon: Clock3,
                  title: "مدت ثابت",
                  text: "هر جلسه دقیقاً ۳۰ دقیقه است."
                },
                {
                  icon: CalendarCheck2,
                  title: "هفته ایران",
                  text: "بازه سهمیه از شنبه تا جمعه محاسبه می‌شود."
                },
                {
                  icon: Video,
                  title: "Zoom خودکار",
                  text: "پس از رزرو، لینک Zoom در پنل و ایمیل قرار می‌گیرد."
                },
                {
                  icon: CalendarPlus,
                  title: "وقت تهران",
                  text: "همه Slotها با Time Zone تهران نمایش داده می‌شوند."
                }
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <article
                    key={item.title}
                    className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
                  >
                    <Icon
                      aria-hidden="true"
                      className="h-5 w-5 text-iris-600"
                    />
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
        </div>
      </Section>

      <Section tone="soft">
        <SectionHeader
          eyebrow="HOW BOOKING WORKS"
          title="رزرو کوتاه، وضعیت روشن، لینک در دسترس."
          description="در پنل عضو فقط زمان‌های آزاد همان هفته را می‌بینید. هر رزرو با Time Zone تهران ثبت می‌شود و وضعیت سهمیه همان‌جا قابل مشاهده است."
          align="center"
        />
        <ol className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: CalendarClock,
              title: "مشاهده سهمیه",
              text: "بازه شنبه تا جمعه و وضعیت این هفته را می‌بینید."
            },
            {
              icon: CalendarCheck2,
              title: "انتخاب زمان",
              text: "یکی از Slotهای آزاد ۳۰ دقیقه‌ای را انتخاب می‌کنید."
            },
            {
              icon: MailCheck,
              title: "دریافت تأیید",
              text: "رزرو در پنل ثبت می‌شود و ایمیل تأیید می‌رسد."
            },
            {
              icon: Video,
              title: "ورود به Zoom",
              text: "لینک ساخته‌شده در پنل و ایمیل در دسترس است."
            }
          ].map((step, index) => {
            const Icon = step.icon;
            return (
              <li
                key={step.title}
                className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <Icon aria-hidden="true" className="h-5 w-5 text-iris-600" />
                  <span className="text-xs font-bold text-slate-300">
                    {`۰${index + 1}`}
                  </span>
                </div>
                <h3 className="mt-6 font-semibold text-ink-950">
                  {step.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  {step.text}
                </p>
              </li>
            );
          })}
        </ol>
        <p className="mx-auto mt-8 max-w-3xl text-center text-sm font-medium leading-7 text-iris-700">
          هر عضو در هر هفته تقویمی ایران فقط یک Office Hour دارد. سهمیه
          استفاده‌نشده در پایان جمعه منقضی می‌شود و قابل انتقال نیست.
        </p>
      </Section>

      <Section tone="dark">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <div className="rounded-lg border border-credential/20 bg-credential/[0.06] p-6 sm:p-8">
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-lg bg-credential/10 text-credential">
                <Network aria-hidden="true" className="h-6 w-6" />
              </span>
              <div>
                <p
                  lang="en"
                  className="font-latin text-xs font-bold tracking-[0.13em] text-credential"
                >
                  DBC WEEKLY AI ROUNDTABLE
                </p>
                <p className="mt-1 text-sm text-slate-400">
                  ۹۰ دقیقه، هر هفته
                </p>
              </div>
            </div>
            <h2 className="mt-8 text-3xl font-semibold leading-[1.4] text-white">
              گفت‌وگویی جدی درباره AI، با آدم‌هایی که تجربه واقعی دارند.
            </h2>
            <p className="mt-5 text-base leading-8 text-slate-300">
              هر هفته، اعضا و فارغ‌التحصیلان DBC دور هم جمع می‌شوند تا یک موضوع
              مشخص در AI را از چند زاویه بررسی کنند، تجربه‌های واقعی را به
              اشتراک بگذارند و ارتباط‌های حرفه‌ای تازه بسازند. این جلسه کلاس
              یک‌طرفه نیست. فضایی برای یادگیری جمعی، گفت‌وگوی حرفه‌ای و
              Networking باکیفیت است.
            </p>
            <div className="mt-7 flex flex-wrap gap-2 text-xs">
              {[
                "ویژه همه اعضا و فارغ‌التحصیلان DBC",
                "در عضویت و بدون هزینه جداگانه",
                "موضوع تازه در هر هفته",
                "به وقت تهران",
                "بدون مصرف سهمیه Office Hour"
              ].map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-slate-300"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
          <div>
            <SectionHeader
              inverse
              eyebrow="WHY IT EXISTS"
              title="Networking وقتی ارزش دارد که حول یک مسئله واقعی شکل بگیرد."
              description={
                <>
                  محور هر نشست یک موضوع مشخص در{" "}
                  <TechnicalTerm className="text-white">AI</TechnicalTerm> است.
                  محتوا آغاز گفت‌وگو است، نه پایان آن. ارزش اصلی از زاویه‌های
                  متفاوت، تجربه‌های میدانی و ارتباط‌هایی می‌آید که در ادامه هم
                  قابل استفاده‌اند.
                </>
              }
            />
          </div>
        </div>
      </Section>

      <Section>
        <div className="grid items-center gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
          <SectionHeader
            eyebrow="1:1 COACHING"
            title="برای مسئله‌ای که به زمان و تمرکز بیشتری نیاز دارد."
            description={
              <>
                اگر موضوع شما به بررسی عمیق‌تر، تصمیم‌گیری یا طراحی دقیق نیاز
                دارد، می‌توانید یک جلسه خصوصی{" "}
                <TechnicalTerm>1:1 Coaching</TechnicalTerm> درخواست کنید.
                Coaching یک خدمت اختیاری و جدا از Office Hour هفتگی است.
              </>
            }
          />
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-soft">
            <div className="border-b border-slate-200 bg-slate-50 p-6 sm:p-8">
              <p
                lang="en"
                className="font-latin text-xs font-bold tracking-[0.14em] text-iris-600"
              >
                PRIVATE COACHING
              </p>
              <p className="mt-4 text-4xl font-semibold text-ink-950">
                ۵ میلیون تومان
              </p>
              <p className="mt-2 text-sm text-slate-500">
                برای هر جلسه ۶۰ دقیقه‌ای
              </p>
            </div>
            <div className="p-6 sm:p-8">
              <ul className="space-y-3">
                {[
                  "تمرکز کامل بر یک مسئله مشخص",
                  "مناسب تصمیم‌های پیچیده‌تر",
                  "جدا از سهمیه Office Hour",
                  "رزرو بر اساس زمان‌های موجود"
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-3 text-sm text-slate-700"
                  >
                    <CheckCircle2
                      aria-hidden="true"
                      className="h-4 w-4 shrink-0 text-iris-600"
                    />
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-7">
                <PrimaryLink href="/portal/coaching">
                  درخواست جلسه Coaching
                </PrimaryLink>
              </div>
            </div>
          </div>
        </div>
      </Section>

      <Section tone="soft">
        <SectionHeader
          eyebrow="AT A GLANCE"
          title="سه تجربه، سه هدف متفاوت."
          align="center"
        />
        <div className="mt-10 overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[48rem] border-collapse text-right text-sm">
            <thead className="bg-ink-950 text-white">
              <tr>
                <th className="px-5 py-4 font-medium">خدمت</th>
                <th className="px-5 py-4 font-medium">فرمت</th>
                <th className="px-5 py-4 font-medium">مدت</th>
                <th className="px-5 py-4 font-medium">هزینه</th>
                <th className="px-5 py-4 font-medium">قاعده دسترسی</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700">
              <tr>
                <td lang="en" className="px-5 py-4 font-latin font-semibold text-ink-950">
                  Weekly Office Hour
                </td>
                <td className="px-5 py-4">اختصاصی</td>
                <td className="px-5 py-4">۳۰ دقیقه</td>
                <td className="px-5 py-4">در شهریه برنامه</td>
                <td className="px-5 py-4">
                  فقط یک بار از شنبه تا جمعه، بدون انتقال
                </td>
              </tr>
              <tr>
                <td lang="en" className="px-5 py-4 font-latin font-semibold text-ink-950">
                  DBC Weekly AI Roundtable
                </td>
                <td className="px-5 py-4">گروهی</td>
                <td className="px-5 py-4">۹۰ دقیقه</td>
                <td className="px-5 py-4">در عضویت، بدون هزینه جداگانه</td>
                <td className="px-5 py-4">اعضا و فارغ‌التحصیلان DBC</td>
              </tr>
              <tr>
                <td lang="en" className="px-5 py-4 font-latin font-semibold text-ink-950">
                  1:1 Coaching
                </td>
                <td className="px-5 py-4">اختصاصی</td>
                <td className="px-5 py-4">۶۰ دقیقه</td>
                <td className="px-5 py-4">۵ میلیون تومان</td>
                <td className="px-5 py-4">اختیاری و با رزرو جداگانه</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>

      <FinalCta
        title="پشتیبانی روشن، برای کاری که واقعاً جلو می‌رود."
        description="Office Hour هفتگی، نشست DBC و Coaching خصوصی هرکدام نقش مشخص خود را دارند. جزئیات پیش از عضویت روشن است."
      />
    </MarketingShell>
  );
}
