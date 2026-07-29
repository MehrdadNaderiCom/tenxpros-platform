import {
  ArrowLeft,
  BadgeCheck,
  BrainCircuit,
  BriefcaseBusiness,
  CalendarClock,
  CircleDollarSign,
  FileCheck2,
  Network,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  UserRound
} from "lucide-react";
import {
  audiences,
  certificationOutcomes,
  dossierAssets,
  fitSignals,
  methodPhases,
  reviewCriteria
} from "@/components/marketing/content";
import {
  CheckList,
  DossierVisual,
  FinalCta,
  MarketingShell,
  Metrics,
  OfficeHourNotice,
  PageHero,
  PrimaryLink,
  Section,
  SectionHeader,
  SecondaryLink
} from "@/components/marketing/marketing-ui";
import { TechnicalTerm } from "@/components/shared/technical-term";

const experienceCards = [
  {
    icon: CalendarClock,
    kicker: "در شهریه برنامه",
    title: "Weekly Office Hour",
    value: "۳۰ دقیقه در هر هفته تقویمی ایران",
    description:
      "هر عضو فعال از شنبه تا جمعه فقط یک جلسه اختصاصی دارد. این سهمیه به هفته بعد منتقل نمی‌شود.",
    accent: "iris"
  },
  {
    icon: Network,
    kicker: "در عضویت، بدون هزینه جداگانه",
    title: "DBC Weekly AI Roundtable",
    value: "۹۰ دقیقه در هر هفته",
    description:
      "برای همه اعضا و فارغ‌التحصیلان DBC، با یک موضوع مشخص در AI، یادگیری جمعی و Networking.",
    accent: "credential"
  },
  {
    icon: UserRound,
    kicker: "خدمت اختیاری",
    title: "1:1 Coaching",
    value: "۵ میلیون تومان برای ۶۰ دقیقه",
    description:
      "زمان متمرکز برای مسئله‌های عمیق‌تر، تصمیم‌های حساس و طراحی دقیق‌تر.",
    accent: "slate"
  }
];

export function HomePage() {
  return (
    <MarketingShell>
      <PageHero
        eyebrow={
          <>
            <TechnicalTerm>FOUNDING CHARTER</TechnicalTerm>
            <span className="text-slate-500">·</span>
            پذیرش محدود
          </>
        }
        title={
          <>
            <TechnicalTerm className="font-inherit text-white">
              TenXPros
            </TechnicalTerm>{" "}
            ایران
          </>
        }
        description={
          <>
            <span className="mb-3 block text-xl font-semibold leading-9 text-white">
              <TechnicalTerm className="text-iris-200">
                AI Adoption
              </TechnicalTerm>{" "}
              را در حوزه خودتان رهبری کنید. فقط مصرف‌کننده{" "}
              <TechnicalTerm className="text-white">AI</TechnicalTerm> نباشید.
            </span>
            یک برنامه گزینشی ۱۲ هفته‌ای برای حرفه‌ای‌های باتجربه. با یک مسئله
            واقعی وارد می‌شوید، جای درست <TechnicalTerm>AI</TechnicalTerm> را
            در کارتان پیدا می‌کنید و در پایان یک{" "}
            <TechnicalTerm className="text-white">
              Living AI Solution Dossier
            </TechnicalTerm>{" "}
            ارزیابی‌شده و قابل دفاع می‌سازید.
          </>
        }
        secondary={{ label: "نمونه Dossier را ببینید", href: "/dossier" }}
      >
        <DossierVisual />
      </PageHero>

      <Section tone="dark" className="-mt-px pb-20 pt-0 sm:pb-24">
        <Metrics
          dark
          items={[
            { value: "۱۲", label: "هفته هدایت‌شده" },
            { value: "۴", label: "مرحله در TenX Method" },
            { value: "۱", label: "Dossier ارزیابی‌شده" },
            { value: "قابل استعلام", label: "Professional Credential" }
          ]}
        />
      </Section>

      <Section>
        <div className="grid items-center gap-12 lg:grid-cols-[0.92fr_1.08fr] lg:gap-20">
          <div>
            <SectionHeader
              eyebrow="THE SHIFT"
              title={
                <>
                  استفاده از <TechnicalTerm>AI</TechnicalTerm> آسان شده است.
                  رهبری <TechnicalTerm>AI Adoption</TechnicalTerm> هنوز کار هر
                  کسی نیست.
                </>
              }
              description={
                <>
                  استفاده از <TechnicalTerm>AI</TechnicalTerm> می‌تواند به چند{" "}
                  <TechnicalTerm>Prompt</TechnicalTerm> محدود شود. رهبری{" "}
                  <TechnicalTerm>AI Adoption</TechnicalTerm> یعنی بدانید کجا
                  ارزش می‌سازد، کجا ریسک ایجاد می‌کند، کدام تصمیم باید انسانی
                  بماند و چطور نتیجه را با{" "}
                  <TechnicalTerm>Evidence</TechnicalTerm> نشان دهید.
                </>
              }
            />
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <PrimaryLink href="/program">TenX Method را ببینید</PrimaryLink>
              <SecondaryLink href="/about">
                چرا TenXPros ساخته شد
              </SecondaryLink>
            </div>
          </div>

          <div className="relative">
            <div className="relative overflow-hidden rounded-lg border border-slate-200 bg-ink-950 p-6 text-white shadow-panel sm:p-8">
              <p
                lang="en"
                className="font-latin text-xs font-semibold tracking-[0.14em] text-iris-300"
              >
                USE AI
              </p>
              <p className="mt-3 text-xl font-semibold">
                یک خروجی سریع بگیرید
              </p>
              <div className="my-6 h-px bg-white/15" />
              <p
                lang="en"
                className="font-latin text-xs font-semibold tracking-[0.14em] text-credential"
              >
                LEAD AI ADOPTION
              </p>
              <p className="mt-3 text-2xl font-semibold leading-10">
                مسئله را انتخاب کنید، مرزها را بسازید، کیفیت را بسنجید و از
                تصمیم دفاع کنید.
              </p>
              <div className="mt-7 grid grid-cols-2 gap-3 text-xs text-slate-300">
                {[
                  ["مسئله", ScanSearch],
                  ["قضاوت", BrainCircuit],
                  ["ریسک", ShieldCheck],
                  ["Evidence", FileCheck2]
                ].map(([label, Icon]) => {
                  const ItemIcon = Icon as typeof ScanSearch;
                  return (
                    <div
                      key={label as string}
                      className="flex items-center gap-2.5 rounded-lg border border-white/10 bg-white/[0.04] p-3"
                    >
                      <ItemIcon
                        aria-hidden="true"
                        className="h-4 w-4 text-iris-300"
                      />
                      <span>{label as string}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </Section>

      <Section tone="soft">
        <SectionHeader
          eyebrow="WHAT YOU BUILD"
          title={
            <>
              هشت خروجی. یک <TechnicalTerm>Dossier</TechnicalTerm> قابل دفاع.
            </>
          }
          description={
            <>
              هر خروجی بخشی از <TechnicalTerm>Responsible AI Adoption</TechnicalTerm>{" "}
              را پوشش می‌دهد. کنار هم، آن‌ها یک سند حرفه‌ای می‌سازند که منطق
              مسئله، طراحی، ریسک، ارزش و قدم بعد را روشن می‌کند.
            </>
          }
          align="center"
        />
        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {dossierAssets.map((asset) => (
            <article
              key={asset.title}
              className="group rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-iris-200 hover:shadow-soft"
            >
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-slate-100 text-xs font-bold text-iris-600 transition group-hover:bg-iris-50">
                {asset.index}
              </span>
              <h3
                dir="ltr"
                lang="en"
                className="mt-5 min-h-12 text-left font-latin text-sm font-semibold leading-6 text-ink-950"
              >
                {asset.title}
              </h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                {asset.description}
              </p>
            </article>
          ))}
        </div>
        <div className="mt-9 text-center">
          <SecondaryLink href="/dossier">
            ساختار کامل Dossier را ببینید
          </SecondaryLink>
        </div>
      </Section>

      <Section tone="dark">
        <SectionHeader
          inverse
          eyebrow="THE TENX METHOD"
          title={
            <>
              <TechnicalTerm>Frame. Design. Prove. Foresee.</TechnicalTerm>
            </>
          }
          description={
            <>
              چهار مرحله متصل که یک مسئله واقعی را به یک{" "}
              <TechnicalTerm className="text-white">
                AI Adoption System
              </TechnicalTerm>{" "}
              مسئولانه، ارزیابی‌شده و قابل دفاع تبدیل می‌کنند.
            </>
          }
        />
        <div className="mt-12 grid gap-4 lg:grid-cols-4">
          {methodPhases.map((phase) => (
            <article
              key={phase.title}
              className="rounded-lg border border-white/10 bg-white/[0.035] p-5 transition hover:border-iris-300/30 hover:bg-white/[0.055]"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-iris-300">
                  {phase.index}
                </span>
                <span className="text-xs text-slate-500">{phase.weeks}</span>
              </div>
              <h3
                dir="ltr"
                lang="en"
                className="mt-8 text-left font-latin text-2xl font-semibold text-white"
              >
                {phase.title}
              </h3>
              <p className="mt-4 min-h-14 text-sm font-medium leading-7 text-slate-200">
                {phase.question}
              </p>
              <p className="mt-4 border-t border-white/10 pt-4 text-sm leading-7 text-slate-400">
                {phase.description}
              </p>
            </article>
          ))}
        </div>
        <div className="mt-9">
          <PrimaryLink href="/program" inverse>
            مسیر ۱۲ هفته‌ای را ببینید
          </PrimaryLink>
        </div>
      </Section>

      <Section>
        <SectionHeader
          eyebrow="MEMBER EXPERIENCE"
          title="پشتیبانی روشن، بدون وعده‌های مبهم."
          description={
            <>
              هر خدمت، زمان، مخاطب و قیمت مشخص خود را دارد.{" "}
              <TechnicalTerm>Office Hour</TechnicalTerm> هفتگی با{" "}
              <TechnicalTerm>Coaching</TechnicalTerm> خصوصی و نشست گروهی{" "}
              <TechnicalTerm>DBC</TechnicalTerm> یکی نیست.
            </>
          }
          align="center"
        />
        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {experienceCards.map((card) => {
            const Icon = card.icon;
            return (
              <article
                key={card.title}
                className="flex flex-col rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <span
                    className={
                      card.accent === "credential"
                        ? "grid h-11 w-11 place-items-center rounded-lg bg-amber-50 text-amber-700"
                        : card.accent === "iris"
                          ? "grid h-11 w-11 place-items-center rounded-lg bg-iris-50 text-iris-600"
                          : "grid h-11 w-11 place-items-center rounded-lg bg-slate-100 text-slate-700"
                    }
                  >
                    <Icon aria-hidden="true" className="h-5 w-5" />
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1.5 text-[0.68rem] font-semibold text-slate-600">
                    {card.kicker}
                  </span>
                </div>
                <h3
                  dir="ltr"
                  lang="en"
                  className="mt-6 text-left font-latin text-xl font-semibold text-ink-950"
                >
                  {card.title}
                </h3>
                <p className="mt-3 font-semibold text-iris-600">{card.value}</p>
                <p className="mt-4 flex-1 text-sm leading-7 text-slate-600">
                  {card.description}
                </p>
              </article>
            );
          })}
        </div>
        <div className="mt-6">
          <OfficeHourNotice />
        </div>
        <div className="mt-8 text-center">
          <PrimaryLink href="/services">
            جزئیات تجربه اعضا
          </PrimaryLink>
        </div>
      </Section>

      <Section tone="soft">
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <div>
            <SectionHeader
              eyebrow="REVIEW STANDARD"
              title="کار شما ارزیابی می‌شود، نه میزان حضورتان."
              description={
                <>
                  <TechnicalTerm>Credential</TechnicalTerm> زمانی صادر می‌شود که{" "}
                  <TechnicalTerm>
                    Living AI Solution Dossier
                  </TechnicalTerm>{" "}
                  معیارهای روشن <TechnicalTerm>Review</TechnicalTerm> را
                  برآورده کند. تمام‌کردن <TechnicalTerm>Lesson</TechnicalTerm>ها
                  یا صرف حضور کافی نیست.
                </>
              }
            />
            <CheckList
              columns={2}
              items={reviewCriteria.map((criterion) => criterion)}
            />
          </div>
          <div className="grid gap-4 self-start">
            {certificationOutcomes.map((outcome) => (
              <article
                key={outcome.title}
                className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={
                      outcome.tone === "credential"
                        ? "grid h-9 w-9 place-items-center rounded-lg bg-amber-50 text-amber-700"
                        : outcome.tone === "iris"
                          ? "grid h-9 w-9 place-items-center rounded-lg bg-iris-50 text-iris-600"
                          : "grid h-9 w-9 place-items-center rounded-lg bg-slate-100 text-slate-600"
                    }
                  >
                    {outcome.tone === "credential" ? (
                      <BadgeCheck aria-hidden="true" className="h-5 w-5" />
                    ) : outcome.tone === "iris" ? (
                      <Sparkles aria-hidden="true" className="h-5 w-5" />
                    ) : (
                      <FileCheck2 aria-hidden="true" className="h-5 w-5" />
                    )}
                  </span>
                  <TechnicalTerm className="text-lg font-semibold text-ink-950">
                    {outcome.title}
                  </TechnicalTerm>
                </div>
                <p className="mt-4 text-sm leading-7 text-slate-600">
                  {outcome.description}
                </p>
              </article>
            ))}
            <SecondaryLink href="/certification">
              استاندارد Certification را ببینید
            </SecondaryLink>
          </div>
        </div>
      </Section>

      <Section tone="dark">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <SectionHeader
              inverse
              eyebrow="WHO IT IS FOR"
              title="برای حرفه‌ای‌هایی که می‌خواهند اثر تخصص خود را چند برابر کنند."
              description={
                <>
                  <TechnicalTerm>TenX</TechnicalTerm> یعنی ضریب. این برنامه تخصصی
                  را که از قبل دارید با یک{" "}
                  <TechnicalTerm className="text-white">
                    AI Method
                  </TechnicalTerm>{" "}
                  منظم ترکیب می‌کند.
                </>
              }
            />
            <div className="mt-8">
              <CheckList inverse items={audiences} />
            </div>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.035] p-6 sm:p-8">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-lg bg-credential/10 text-credential">
                <BriefcaseBusiness aria-hidden="true" className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-semibold text-credential">
                  بهترین تناسب زمانی است که
                </p>
                <p className="mt-1 font-semibold text-white">
                  مسئله واقعی و قضاوت حرفه‌ای دارید
                </p>
              </div>
            </div>
            <div className="mt-7">
              <CheckList inverse items={fitSignals} />
            </div>
          </div>
        </div>
      </Section>

      <Section>
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50 shadow-soft">
          <div className="grid lg:grid-cols-[1fr_0.8fr]">
            <div className="p-7 sm:p-10 lg:p-12">
              <p
                lang="en"
                className="font-latin text-xs font-bold tracking-[0.15em] text-iris-600"
              >
                FOUNDING CHARTER
              </p>
              <h2 className="mt-5 text-3xl font-semibold leading-[1.4] text-ink-950 sm:text-4xl">
                یک برنامه. یک شهریه روشن.
              </h2>
              <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600">
                قیمت اصلی برنامه ۹۰ میلیون تومان است. ظرفیت فعلی{" "}
                <TechnicalTerm>Founding Charter</TechnicalTerm> با شهریه ۶۰
                میلیون تومان ارائه می‌شود. پرداخت یک‌باره و فقط پس از پذیرش
                انجام می‌شود.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <PrimaryLink href="/apply">درخواست بررسی</PrimaryLink>
                <SecondaryLink href="/pricing">
                  جزئیات کامل
                </SecondaryLink>
              </div>
            </div>
            <div className="flex flex-col justify-center border-t border-slate-200 bg-white p-7 sm:p-10 lg:border-r lg:border-t-0">
              <p className="text-sm text-slate-500">قیمت اصلی</p>
              <p className="mt-2 text-xl font-medium text-slate-400 line-through decoration-slate-400">
                ۹۰ میلیون تومان
              </p>
              <p className="mt-6 text-sm font-semibold text-iris-600">
                Founding Charter
              </p>
              <p className="mt-2 text-4xl font-semibold text-ink-950">
                ۶۰ میلیون
              </p>
              <p className="mt-2 text-sm text-slate-500">تومان، پرداخت یک‌باره</p>
              <div className="mt-6 flex items-center gap-2 border-t border-slate-200 pt-5 text-xs text-slate-500">
                <CircleDollarSign
                  aria-hidden="true"
                  className="h-4 w-4 text-iris-600"
                />
                پیش از پذیرش هیچ پرداختی انجام نمی‌دهید
              </div>
            </div>
          </div>
        </div>
      </Section>

      <FinalCta
        title="تخصص را شما می‌آورید. ما AI Method را می‌آوریم."
        description={
          <>
            با یک مسئله حرفه‌ای جدی درخواست بدهید. اگر این برنامه برای شما مناسب
            باشد، مسیر پذیرش و پرداخت با جزئیات روشن در اختیارتان قرار می‌گیرد.
          </>
        }
      />
    </MarketingShell>
  );
}
