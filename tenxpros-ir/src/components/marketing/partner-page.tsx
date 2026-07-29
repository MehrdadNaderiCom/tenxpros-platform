import {
  BadgeCheck,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  FileSignature,
  Handshake,
  Landmark,
  Network,
  Route,
  Scale,
  ShieldCheck,
  Target,
  Users,
  WalletCards,
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

const partnerStages = [
  {
    icon: FileSignature,
    title: "Application & Fit",
    copy: "پیشینه، شبکه حرفه‌ای، حوزه تمرکز و نقشی را که واقعاً می‌توانید انجام دهید توضیح می‌دهید. بررسی درخواست به‌تنهایی هیچ رابطه قراردادی ایجاد نمی‌کند.",
  },
  {
    icon: Route,
    title: "90-Day Partner Pilot",
    copy: "در صورت تناسب، چارچوب یک Pilot نود روزه در یک دعوت‌نامه یا توافق مکتوب مشخص می‌شود. دامنه فعالیت و جزئیات تجاری پیش از شروع کار روشن خواهند شد.",
  },
  {
    icon: ClipboardCheck,
    title: "Activation Gate",
    copy: "پیش از معرفی رسمی، درک درست Offer، مخاطب مناسب، شیوه استفاده از Brand، محرمانگی و قواعد ثبت Opportunity بررسی می‌شود.",
  },
  {
    icon: ShieldCheck,
    title: "Register & Protect",
    copy: "هر Opportunity باید پیش از پیگیری ثبت و به‌صورت مکتوب تأیید شود. محدوده، مدت حفاظت و نقش Partner در همان تأیید ثبت می‌شوند.",
  },
];

const partnerTiers = [
  {
    tier: "Tier 1",
    title: "Referral Partner",
    description:
      "نقطه شروع برای Partnerی که معرفی معتبر یا Origination واقعی انجام می‌دهد.",
    points: [
      "شروع در قالب 90-Day Partner Pilot",
      "ثبت Opportunity پیش از پیگیری",
      "Recognition متناسب با نتیجه تأییدشده",
    ],
  },
  {
    tier: "Tier 2",
    title: "Certified Partner",
    description:
      "سطحی دعوتی برای Partnerی که کیفیت، پیگیری و نتیجه قابل اتکا نشان داده است.",
    points: [
      "ظرفیت بیشتر بر اساس عملکرد ثبت‌شده",
      "اولویت بالاتر برای فرصت‌های متناسب",
      "امکان معرفی حرفه‌ای با تأیید TenXPros",
    ],
  },
  {
    tier: "Tier 3",
    title: "Territory Builder",
    description:
      "سطحی دعوتی برای Partner باتجربه با تمرکز روشن روی یک صنعت یا بازار.",
    points: [
      "تمرکز توافق‌شده روی صنعت یا محدوده مشخص",
      "اولویت مشروط برای Opportunityهای همان تمرکز",
      "Recognition متناسب با نقش و نتیجه واقعی",
    ],
  },
];

const partnerFunctions = [
  {
    icon: Handshake,
    title: "Basic Introduction",
    copy: "یک معرفی گرم و معتبر به فرد یا سازمانی که دسترسی واقعی و تناسب روشن دارد. صرف دانستن نام یک فرد یا ارسال فهرست Contact، معرفی واجد شرایط نیست.",
  },
  {
    icon: Target,
    title: "Origination",
    copy: "فراتر از معرفی، زمینه Opportunity را می‌سازید، جلسه و Follow-up را پیش می‌برید و یک گفت‌وگوی تجاری واقعی شکل می‌دهید.",
  },
  {
    icon: WalletCards,
    title: "Closing",
    copy: "مسیر تصمیم تا توافق و شروع همکاری را با نقش مستقیم پیش می‌برید. دامنه مسئولیت شما برای هر Opportunity از ابتدا مکتوب می‌شود.",
  },
  {
    icon: Users,
    title: "Delivery & Coaching",
    copy: "فقط زمانی مطرح است که TenXPros ارائه بخشی از خدمت را به‌صورت مکتوب به Partner واگذار کند. داشتن رابطه Partner به‌تنهایی مجوز Delivery نیست.",
  },
  {
    icon: Network,
    title: "Renewal Support",
    copy: "در همکاری‌های سازمانی، پشتیبانی واقعی از Account می‌تواند در Renewal نقش داشته باشد. شرایط شناسایی و جبران آن باید در توافق مربوط ثبت شود.",
  },
];

const commissionPrinciples = [
  {
    title: "Function Based",
    copy: "جبران همکاری بر اساس نقشی محاسبه می‌شود که واقعاً انجام و برای همان Opportunity تأیید شده است.",
  },
  {
    title: "Cleared Net Receipts",
    copy: "مبنای پرداخت می‌تواند وجه خالص دریافت‌شده و قطعی باشد، نه مبلغ پیشنهادی، Invoice پرداخت‌نشده یا وعده شفاهی مشتری.",
  },
  {
    title: "Written Schedule",
    copy: "نرخ، ارز، سقف، مالیات، زمان پرداخت و اثر لغو یا بازپرداخت باید پیش از ایجاد حق مالی در سند مربوط نوشته شوند.",
  },
  {
    title: "No Double Claim",
    copy: "اگر چند Partner یا چند Function در یک Deal دخیل باشند، تخصیص نقش و سقف کل فقط بر اساس ثبت و توافق مکتوب تعیین می‌شود.",
  },
];

export function PartnerPageContent() {
  return (
    <>
      <PageHero
        eyebrow="TenXPros Partner Program"
        title={
          <>
            برای کاری که واقعاً انجام می‌دهید،
            <span className="mt-2 block text-iris-300">
              یک مسیر روشن و حرفه‌ای بسازید.
            </span>
          </>
        }
        description="Partner Program برای افرادی و مجموعه‌هایی است که می‌توانند TenXPros را به مخاطب درست معرفی کنند، یک Opportunity واقعی بسازند یا در Closing و Delivery تأییدشده نقش داشته باشند. هر نقش، حفاظت و جبران مالی فقط با ثبت و توافق مکتوب معتبر است."
        actions={
          <>
            <ArrowAction href="/partners/apply">درخواست Partner Program</ArrowAction>
            <MarketingLink href="/partners/terms" variant="secondary">
              مطالعه Partner Terms
            </MarketingLink>
          </>
        }
        trust={[
          "90-Day Partner Pilot",
          "Activation Gate پیش از شروع",
          "Opportunity Protection فقط با تأیید مکتوب",
        ]}
      >
        <Surface className="p-7 shadow-panel sm:p-8">
          <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-5">
            <div>
              <Eyebrow>Partner Operating Model</Eyebrow>
              <p className="mt-2 text-xl font-semibold text-white">
                شفافیت پیش از هر فعالیت
              </p>
            </div>
            <Landmark className="h-7 w-7 text-iris-300" aria-hidden="true" />
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {[
              ["۹۰ روز", "Pilot اولیه"],
              ["یک Gate", "پیش از Activation"],
              ["مکتوب", "ثبت و حفاظت Opportunity"],
            ].map(([value, label]) => (
              <div
                key={label}
                className="rounded-lg border border-white/10 bg-white/[0.035] p-4"
              >
                <p className="text-xl font-semibold text-white">{value}</p>
                <p className="mt-1 text-xs leading-6 text-slate-400">{label}</p>
              </div>
            ))}
          </div>
          <p className="mt-5 text-sm leading-8 text-slate-300">
            در نسخه فعلی ایران، Partner Panel آنلاین فعال نیست. ثبت Opportunity
            و تأیید وضعیت آن از طریق ایمیل و سند مکتوب انجام می‌شود.
          </p>
        </Surface>
      </PageHero>

      <Section>
        <SectionHeading
          eyebrow="Stage By Stage"
          title="رابطه Partner مرحله‌به‌مرحله فعال می‌شود"
          description="درخواست، پذیرش Pilot، عبور از Activation Gate و تأیید Opportunity چهار رویداد جدا هستند. هیچ مرحله‌ای به‌صورت خودکار از مرحله قبل ایجاد نمی‌شود."
          inverse={false}
        />
        <ol className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {partnerStages.map((stage, index) => (
            <li
              key={stage.title}
              className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="flex items-center justify-between gap-4">
                <span className="grid h-11 w-11 place-items-center rounded-lg bg-iris-50 text-iris-600">
                  <stage.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="font-sans text-xs font-bold text-slate-400">
                  ۰{index + 1}
                </span>
              </div>
              <h2 className="mt-5 text-lg font-semibold text-ink-950">
                <English>{stage.title}</English>
              </h2>
              <p className="mt-3 text-sm leading-8 text-slate-600">
                {stage.copy}
              </p>
            </li>
          ))}
        </ol>
      </Section>

      <Section tone="dark">
        <div className="grid gap-9 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <SectionHeading
            eyebrow="Opportunity Registration"
            title="حفاظت از Opportunity با یک تأیید روشن شروع می‌شود"
            description="ارسال نام یک فرد یا سازمان، Forward کردن پیام یا اشاره شفاهی به یک Lead به‌تنهایی Protection ایجاد نمی‌کند. TenXPros باید ثبت را به‌صورت مکتوب تأیید کند."
          />
          <Surface className="p-7 sm:p-9">
            <Eyebrow>Protection Record</Eyebrow>
            <CheckList
              inverse
              className="mt-6"
              items={[
                "تعریف دقیق فرد، سازمان یا Account مورد نظر",
                "نقش مورد انتظار Partner در Introduction، Origination یا Closing",
                "تاریخ شروع و مدت Protection",
                "وضعیت تعارض با Opportunity ثبت‌شده دیگر",
                "Commercial Schedule مربوط به همان همکاری",
              ]}
            />
            <p className="mt-6 rounded-lg border border-amber-300/20 bg-amber-300/10 p-4 text-sm leading-8 text-amber-100">
              تا زمانی که تأیید مکتوب صادر نشده است، هیچ انحصار، Commission یا
              حق پیگیری از طرف TenXPros ایجاد نمی‌شود.
            </p>
          </Surface>
        </div>
      </Section>

      <Section>
        <SectionHeading
          eyebrow="Three Tier Path"
          title="سه Tier برای رشد مبتنی بر نتیجه"
          description="شروع از Tier 1 است. ارتقا به Tierهای بعدی خودکار نیست و بر اساس کیفیت رابطه، نتیجه تأییدشده، رعایت Brand و ظرفیت برنامه انجام می‌شود."
          inverse={false}
        />
        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {partnerTiers.map((tier, index) => (
            <article
              key={tier.tier}
              className="flex h-full flex-col rounded-lg border border-slate-200 bg-white p-7 shadow-sm"
            >
              <div className="flex items-center justify-between gap-4">
                <span
                  lang="en"
                  className="rounded-full bg-iris-50 px-3 py-1.5 font-latin text-xs font-bold text-iris-700"
                >
                  {tier.tier}
                </span>
                {index === 0 ? (
                  <Handshake className="h-5 w-5 text-slate-400" aria-hidden="true" />
                ) : index === 1 ? (
                  <BadgeCheck className="h-5 w-5 text-iris-500" aria-hidden="true" />
                ) : (
                  <Building2 className="h-5 w-5 text-credential" aria-hidden="true" />
                )}
              </div>
              <h2 className="mt-5 text-xl font-semibold text-ink-950">
                <English>{tier.title}</English>
              </h2>
              <p className="mt-3 text-sm leading-8 text-slate-600">
                {tier.description}
              </p>
              <ul className="mt-5 space-y-3 border-t border-slate-200 pt-5">
                {tier.points.map((point) => (
                  <li
                    key={point}
                    className="flex items-start gap-3 text-sm leading-7 text-slate-700"
                  >
                    <CheckCircle2
                      className="mt-1 h-4 w-4 shrink-0 text-iris-500"
                      aria-hidden="true"
                    />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
        <p className="mt-6 text-sm leading-8 text-slate-500">
          ظرفیت Account، مدت Protection، اولویت Lead و شرایط Recognition در هر
          Tier باید در Pilot Letter یا Partner Agreement نسخه ایران ثبت شوند.
          این صفحه عدد یا امتیاز تجاری ثابتی برای آن‌ها ایجاد نمی‌کند.
        </p>
      </Section>

      <Section tone="dark">
        <SectionHeading
          eyebrow="Functions"
          title="Commission به Function واقعی متصل است"
          description="عنوان Partner به‌تنهایی حق مالی ایجاد نمی‌کند. نقش انجام‌شده باید برای Opportunity ثبت‌شده قابل مشاهده و مطابق توافق باشد."
          align="center"
        />
        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {partnerFunctions.map((item) => (
            <Surface key={item.title} className="h-full p-6">
              <span className="grid h-11 w-11 place-items-center rounded-lg bg-iris-500/10 text-iris-300">
                <item.icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <h2 className="mt-5 text-lg font-semibold text-white">
                <English>{item.title}</English>
              </h2>
              <p className="mt-3 text-sm leading-8 text-slate-300">
                {item.copy}
              </p>
            </Surface>
          ))}
        </div>
      </Section>

      <Section>
        <div className="grid gap-9 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <SectionHeading
            eyebrow="Commission Principles"
            title="اصل‌ها روشن‌اند، عددها باید مکتوب شوند"
            description="نسخه ایران در این صفحه نرخ عمومی یا سقف ثابت Commission اعلام نمی‌کند. جزئیات هر مدل همکاری باید پیش از شروع فعالیت در سند معتبر همان Partner یا Opportunity درج شود."
            inverse={false}
          />
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            {commissionPrinciples.map((principle, index) => (
              <div
                key={principle.title}
                className="grid gap-3 p-6 sm:grid-cols-[10rem_1fr] sm:gap-6"
                style={
                  index > 0
                    ? { borderTop: "1px solid rgb(226 232 240)" }
                    : undefined
                }
              >
                <p className="font-semibold text-ink-950">
                  <English>{principle.title}</English>
                </p>
                <p className="text-sm leading-8 text-slate-600">
                  {principle.copy}
                </p>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-8 rounded-lg border border-amber-200 bg-amber-50 p-6">
          <div className="flex items-start gap-4">
            <Scale
              className="mt-1 h-5 w-5 shrink-0 text-amber-700"
              aria-hidden="true"
            />
            <p className="text-sm leading-8 text-amber-950">
              نرخ، ارز پرداخت، مبنای محاسبه، سقف هر Deal، مالیات، زمان تسویه،
              Chargeback، Renewal و هر Bonus فقط در صورت درج در توافق مکتوب
              معتبر هستند. محتوای این صفحه جایگزین Pilot Letter، Partner
              Agreement یا Opportunity Confirmation نیست.
            </p>
          </div>
        </div>
      </Section>

      <Section tone="dark">
        <div className="grid gap-9 lg:grid-cols-2 lg:items-start">
          <div>
            <SectionHeading
              eyebrow="Professional Recognition"
              title="Recognition باید قابل دفاع باشد"
              description="پس از نتیجه ثبت‌شده، TenXPros می‌تواند مطابق Tier و توافق مکتوب، عنوان Partner، نامه Recognition یا معرفی عمومی ارائه کند. هیچ Badge یا Listing پیش از تأیید صادر نمی‌شود."
            />
            <CheckList
              inverse
              className="mt-7"
              items={[
                "عنوان متناسب با Tier تأییدشده",
                "Recognition فقط برای نقش و نتیجه قابل راستی‌آزمایی",
                "معرفی عمومی فقط با رضایت طرفین",
                "حق توقف استفاده از Brand پس از پایان مجوز",
              ]}
            />
          </div>
          <Surface className="p-7 sm:p-9">
            <Eyebrow>Good Partner Fit</Eyebrow>
            <h2 className="mt-5 text-2xl font-semibold leading-10 text-white">
              رابطه معتبر را به تعداد Lead ترجیح می‌دهید
            </h2>
            <CheckList
              inverse
              className="mt-6"
              items={[
                "به یک شبکه حرفه‌ای واقعی و مرتبط دسترسی دارید",
                "Offer را دقیق و بدون اغراق توضیح می‌دهید",
                "به Consent، محرمانگی و ثبت Opportunity پایبند هستید",
                "می‌توانید Follow-up منظم و قابل اتکا انجام دهید",
                "تعارض منافع را پیش از شروع اعلام می‌کنید",
              ]}
            />
          </Surface>
        </div>
      </Section>

      <Section className="border-t border-slate-200">
        <div className="mx-auto max-w-3xl text-center">
          <p
            lang="en"
            className="font-latin text-xs font-bold tracking-[0.14em] text-iris-600"
          >
            START WITH FIT
          </p>
          <h2 className="text-balance mt-5 text-3xl font-semibold leading-[1.4] text-ink-950 sm:text-4xl">
            اگر می‌توانید یک نقش واقعی بسازید، از یک درخواست دقیق شروع کنید.
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-slate-600">
            درخواست از طریق ایمیل بررسی می‌شود. در صورت تناسب، پیش از هر فعالیت
            یا تعهد مالی، Pilot و جزئیات همکاری در یک سند مکتوب ارائه خواهد شد.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <ArrowAction href="/partners/apply">ارسال درخواست Partner</ArrowAction>
            <MarketingLink
              href="/partners/terms"
              variant="secondary"
              className="border-slate-300 bg-white text-slate-800 hover:bg-slate-50"
            >
              مطالعه شرایط کامل
            </MarketingLink>
          </div>
        </div>
      </Section>
    </>
  );
}
