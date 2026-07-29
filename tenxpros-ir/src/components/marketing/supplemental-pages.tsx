import {
  ArrowLeft,
  BadgeCheck,
  Banknote,
  BookOpenCheck,
  CheckCircle2,
  Compass,
  FileCheck2,
  FileSearch,
  Inbox,
  Lightbulb,
  Radio,
  UserCheck,
} from "lucide-react";
import {
  ArrowAction,
  CheckList,
  Eyebrow,
  FinalCta,
  IconCard,
  MarketingLink,
  PageHero,
  Section,
  SectionHeading,
  Surface,
} from "@/components/marketing/marketing-ui";
import { OFFER } from "@/lib/constants";

const admissionsEmail = "hello@tenxpros.ir";
const foundingPrice = `${(OFFER.foundingPriceToman / 1_000_000).toLocaleString("fa-IR")} میلیون تومان`;

const journey = [
  {
    icon: FileSearch,
    title: "Apply",
    timing: "پیش از ورود",
    copy: "تجربه، حوزه، انگیزه و یک مسئله واقعی را در فرم درخواست توضیح می‌دهید.",
  },
  {
    icon: UserCheck,
    title: "Review",
    timing: "بازبینی تناسب",
    copy: "جدیت، تناسب و آمادگی شما برای انجام کار واقعی سنجیده می‌شود.",
  },
  {
    icon: Banknote,
    title: "Payment",
    timing: "فقط پس از پذیرش",
    copy: "اطلاعات رسمی پرداخت در پنل باز می‌شود و فیش واریز را همان‌جا بارگذاری می‌کنید.",
  },
  {
    icon: Compass,
    title: "Onboarding & Diagnostic",
    timing: "پیش از شروع مسیر",
    copy: "حوزه، مسئله، سطح ریسک، Stakeholderها و هدف شما بررسی می‌شوند تا مسیر متناسب آماده شود.",
  },
  {
    icon: BookOpenCheck,
    title: "12 Week Method",
    timing: "Frame تا Foresee",
    copy: "۱۱ Core Module را پیش می‌برید و در هر مرحله بخشی از کار واقعی خود را می‌سازید.",
  },
  {
    icon: FileCheck2,
    title: "Dossier",
    timing: "هشت دارایی متصل",
    copy: "خروجی‌ها در Living AI Solution Dossier یکپارچه و برای Final Review آماده می‌شوند.",
  },
  {
    icon: BadgeCheck,
    title: "Certification",
    timing: "پس از رسیدن به استاندارد",
    copy: "اگر Dossier هشت معیار عمومی را برآورده کند، Credential صادر می‌شود و کد آن در Directory و صفحه اختصاصی Verification قابل بررسی است.",
  },
];

export function HowItWorksPageContent() {
  return (
    <>
      <PageHero
        eyebrow="How It Works"
        title={
          <>
            از درخواست تا Credential،
            <span className="mt-2 block text-iris-300">هر مرحله دلیل و خروجی دارد.</span>
          </>
        }
        description="TenXPros با پذیرش انتخابی شروع می‌شود، پس از تأیید پرداخت وارد مسیر ۱۲ هفته‌ای می‌شوید و Certification فقط زمانی صادر می‌شود که Dossier به استاندارد برسد."
        actions={
          <>
            <ArrowAction href="/apply">ارسال درخواست</ArrowAction>
            <MarketingLink href="/pricing" variant="secondary">
              قیمت و پرداخت
            </MarketingLink>
          </>
        }
        trust={["درخواست رایگان", "پرداخت بعد از پذیرش", "Certification مبتنی بر شواهد"]}
      >
        <Surface className="p-7 shadow-panel sm:p-8">
          <Eyebrow>Journey Readout</Eyebrow>
          <div className="mt-6 grid gap-3">
            {journey.map((step, index) => (
              <div key={step.title} className="grid grid-cols-[auto_1fr_auto] items-center gap-4">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-iris-500/10 font-mono text-xs text-iris-300">
                  {index + 1}
                </span>
                <span dir="ltr" className="text-right text-sm font-black text-white">
                  {step.title}
                </span>
                {index < journey.length - 1 ? (
                  <ArrowLeft className="h-4 w-4 text-slate-600" aria-hidden="true" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-credential" aria-hidden="true" />
                )}
              </div>
            ))}
          </div>
        </Surface>
      </PageHero>

      <Section>
        <SectionHeading
          eyebrow="The Full Journey"
          title="هفت مرحله از تناسب اولیه تا کار ارزیابی‌شده"
          description="هدف این ساختار، روشن بودن تصمیم و تعهد در هر نقطه است. هیچ پرداختی پیش از پذیرش انجام نمی‌شود و هیچ Credentialی فقط با گذشت زمان صادر نخواهد شد."
          inverse={false}
        />
        <ol className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {journey.map((step, index) => (
            <Surface key={step.title} className="p-6">
              <div className="flex items-center justify-between gap-4">
                <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-iris-500/10 text-iris-300">
                  <step.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="font-mono text-xs text-slate-600">۰{index + 1}</span>
              </div>
              <h2 dir="ltr" className="mt-6 text-right text-xl font-black text-white">
                {step.title}
              </h2>
              <p className="mt-2 text-xs font-bold text-iris-300">{step.timing}</p>
              <p className="mt-3 text-sm leading-8 text-slate-300">{step.copy}</p>
            </Surface>
          ))}
        </ol>
      </Section>

      <Section tone="dark">
        <div className="grid gap-8 lg:grid-cols-2">
          <Surface className="p-7 sm:p-9">
            <Eyebrow>Before Acceptance</Eyebrow>
            <h2 className="mt-5 text-2xl font-black text-white">هنوز هیچ تعهد مالی ندارید.</h2>
            <CheckList
              className="mt-6"
              items={[
                "فرم درخواست را رایگان تکمیل می‌کنید",
                "حساب متقاضی برای پیگیری وضعیت ساخته می‌شود",
                "تناسب و آمادگی شما بازبینی می‌شود",
                "اطلاعات بانکی هنوز نمایش داده نمی‌شود",
              ]}
            />
          </Surface>
          <Surface className="p-7 sm:p-9" gold>
            <Eyebrow gold>After Acceptance</Eyebrow>
            <h2 className="mt-5 text-2xl font-black text-white">مسیر پرداخت و فعال‌سازی روشن است.</h2>
            <CheckList
              gold
              className="mt-6"
              items={[
                `Offer رسمی Founding Charter برابر ${foundingPrice}`,
                "نمایش اطلاعات حساب رسمی در پنل",
                "بارگذاری امن فیش و بازبینی ادمین",
                "فعال شدن عضویت پس از تأیید پرداخت",
                "تکمیل Onboarding Diagnostic و آماده‌شدن مسیر متناسب",
              ]}
            />
          </Surface>
        </div>
      </Section>

      <Section>
        <div className="grid gap-9 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <SectionHeading
            eyebrow="During The Program"
            title="پیشرفت بر اساس کار شما دیده می‌شود"
            description="هر ماژول بخشی از Dossier را جلو می‌برد. Office Hour هفتگی برای رفع گره است و Checkpointها پیش از Final Review فرصت اصلاح ایجاد می‌کنند."
            inverse={false}
          />
          <Surface className="p-7 sm:p-8">
            <CheckList
              items={[
                "۱۲ هفته در چهار فاز Frame، Design، Prove و Foresee",
                "۱۱ Core Module و یک Final Review مستقل",
                "حدود ۳ تا ۵ ساعت کار متمرکز در هفته",
                "فقط یک Office Hour سی دقیقه‌ای از شنبه تا جمعه و بدون انتقال سهمیه",
                "جلسه هفتگی ۹۰ دقیقه‌ای DBC برای همه اعضا و فارغ‌التحصیلان، بدون هزینه جداگانه",
                "ساخت هشت دارایی و یک Dossier منسجم",
                "Final Review انسانی در برابر هشت معیار عمومی",
              ]}
            />
          </Surface>
        </div>
      </Section>

      <FinalCta
        title="وقتی مسیر روشن است، می‌توانید روی کار واقعی تمرکز کنید."
        description="درخواست را با صداقت کامل کنید. اگر تناسب وجود داشته باشد، مرحله پرداخت در پنل باز می‌شود و سپس مسیر ساخت Dossier آغاز خواهد شد."
      />
    </>
  );
}

export function RadarPageContent() {
  return (
    <>
      <PageHero
        eyebrow="TenXPro Radar"
        title={
          <>
            سیگنال‌های مهم AI،
            <span className="mt-2 block text-iris-300">بدون ازدحام خبر و هیجان.</span>
          </>
        }
        description="Radar لایه به‌روزرسانی پس از Certification و ویژه Certified Alumni است. تغییرهای مهم، سناریوهای تازه و سؤال‌هایی که می‌توانند روی تصمیم حرفه‌ای اثر بگذارند، با نگاه تحلیلی و کاربردی جمع‌بندی می‌شوند."
        actions={
          <>
            <ArrowAction href={`mailto:${admissionsEmail}?subject=TenXPro%20Radar`}>
              درخواست دسترسی اولیه
            </ArrowAction>
            <MarketingLink href="/program" variant="secondary">
              مشاهده برنامه
            </MarketingLink>
          </>
        }
        trust={["سیگنال منتخب", "تحلیل اثر حرفه‌ای", "ویژه Certified Alumni"]}
      >
        <RadarPanel />
      </PageHero>

      <Section>
        <SectionHeading
          eyebrow="Signal, Not Noise"
          title="Radar قرار نیست یک Newsletter شلوغ دیگر باشد."
          description="هر شماره باید به یک تصمیم بهتر کمک کند. چه چیزی تغییر کرده، چرا برای یک حرفه‌ای مهم است و چه چیزی را باید در Workflow یا Roadmap دوباره بررسی کرد."
          inverse={false}
        />
        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          <IconCard
            icon={Radio}
            title="Emerging Signals"
            description="تغییرهایی که هنوز به جریان اصلی نرسیده‌اند، اما می‌توانند روی حوزه شما اثر بگذارند."
          />
          <IconCard
            icon={Compass}
            title="Scenario Notes"
            description="چند سناریوی محتمل و سؤال‌های تصمیم‌ساز، بدون پیش‌بینی قطعی و هیجان‌زده."
          />
          <IconCard
            icon={Lightbulb}
            title="Practice Refreshers"
            description="یادآوری‌های کوتاه برای Evaluation، Governance و حفظ کیفیت Dossier در طول زمان."
          />
        </div>
      </Section>

      <Section tone="dark">
        <Surface className="mx-auto max-w-4xl p-7 text-center sm:p-10" gold>
          <Inbox className="mx-auto h-9 w-9 text-credential" aria-hidden="true" />
          <Eyebrow gold className="mt-5">
            Early Access
          </Eyebrow>
          <h2 className="mt-4 text-3xl font-black leading-[1.4] text-white">
            Radar پس از شکل‌گیری نخستین گروه Certified Alumni باز می‌شود.
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-sm leading-8 text-slate-300">
            این سرویس هنوز راه‌اندازی نشده است و عضویت در برنامه به‌تنهایی دسترسی
            ایجاد نمی‌کند. دسترسی فقط برای فارغ‌التحصیلانی فعال می‌شود که
            Certification را به دست آورده باشند.
          </p>
          <ArrowAction
            href={`mailto:${admissionsEmail}?subject=TenXPro%20Radar`}
            variant="gold"
            className="mt-7"
          >
            ثبت علاقه‌مندی
          </ArrowAction>
        </Surface>
      </Section>
    </>
  );
}

function RadarPanel() {
  return (
    <Surface className="p-7 shadow-panel sm:p-8">
      <div className="flex items-center justify-between border-b border-white/10 pb-5">
        <div>
          <Eyebrow>Weekly Signal Brief</Eyebrow>
          <p className="mt-2 font-black text-white">AI Radar / 001</p>
        </div>
        <Radio className="h-7 w-7 text-iris-300" aria-hidden="true" />
      </div>
      <div className="mt-6 space-y-3">
        {[
          ["SIGNAL", "یک تغییر مهم در رفتار Agentها"],
          ["IMPACT", "اثر احتمالی بر Workflow حرفه‌ای"],
          ["QUESTION", "چه چیزی باید دوباره ارزیابی شود؟"],
          ["ACTION", "یک قدم کوچک برای این هفته"],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border border-white/[0.08] bg-white/[0.025] p-4">
            <p dir="ltr" className="text-[0.62rem] font-bold text-iris-300">
              {label}
            </p>
            <p className="mt-2 text-sm font-semibold text-white">{value}</p>
          </div>
        ))}
      </div>
    </Surface>
  );
}
