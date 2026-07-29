import {
  BookOpenCheck,
  BriefcaseBusiness,
  Clock3,
  Code2,
  FileStack,
  Flag,
  Layers3,
  Target
} from "lucide-react";
import {
  dossierAssets,
  finalReview,
  methodPhases,
  programModules
} from "@/components/marketing/content";
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
import { SampleDossierPanel } from "@/components/marketing/sample-dossier-panel";
import { TechnicalTerm } from "@/components/shared/technical-term";

function MethodVisual() {
  return (
    <div className="rounded-lg border border-white/15 bg-white/[0.035] p-5 shadow-panel sm:p-7">
      <div className="flex items-center justify-between border-b border-white/10 pb-5">
        <div>
          <p
            lang="en"
            className="font-latin text-[0.65rem] font-bold tracking-[0.16em] text-iris-300"
          >
            THE TENX METHOD
          </p>
          <p className="mt-2 text-lg font-semibold text-white">
            مسیر یک تصمیم قابل دفاع
          </p>
        </div>
        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-slate-400">
          ۱۲ هفته
        </span>
      </div>
      <div className="relative mt-6 space-y-3 before:absolute before:bottom-5 before:right-4 before:top-5 before:w-px before:bg-white/10">
        {methodPhases.map((phase) => (
          <div
            key={phase.title}
            className="relative flex items-center gap-4 rounded-lg border border-white/10 bg-ink-900 p-4"
          >
            <span className="relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-iris-500 text-xs font-bold text-white">
              {phase.index}
            </span>
            <div className="flex-1">
              <div className="flex items-center justify-between gap-3">
                <TechnicalTerm className="text-sm font-semibold text-white">
                  {phase.title}
                </TechnicalTerm>
                <span className="text-[0.65rem] text-slate-500">
                  {phase.weeks}
                </span>
              </div>
              <p className="mt-1.5 text-xs leading-6 text-slate-400">
                {phase.question}
              </p>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-5 flex items-center gap-3 rounded-lg border border-credential/20 bg-credential/10 p-4 text-sm text-credential">
        <FileStack aria-hidden="true" className="h-5 w-5" />
        <TechnicalTerm>Living AI Solution Dossier</TechnicalTerm>
      </div>
    </div>
  );
}

export function ProgramPage() {
  return (
    <MarketingShell>
      <PageHero
        eyebrow="THE TENX METHOD"
        title={
          <TechnicalTerm className="text-white">
            Frame. Design. Prove. Foresee.
          </TechnicalTerm>
        }
        description={
          <>
            یک مسیر کاربردی ۱۲ هفته‌ای برای حرفه‌ای‌های باتجربه. جای درست{" "}
            <TechnicalTerm>AI</TechnicalTerm> را در حوزه خود پیدا می‌کنید،
            مسئولانه طراحی می‌کنید، ارزش را می‌سنجید و یک{" "}
            <TechnicalTerm className="text-white">
              Living AI Solution Dossier
            </TechnicalTerm>{" "}
            ارزیابی‌شده می‌سازید.
          </>
        }
        secondary={{ label: "نمونه Dossier", href: "/dossier" }}
      >
        <MethodVisual />
      </PageHero>

      <Section tone="dark" className="-mt-px pb-20 pt-0 sm:pb-24">
        <Metrics
          dark
          items={[
            { value: "۱۲", label: "هفته هدایت‌شده" },
            { value: "۴", label: "مرحله متصل" },
            { value: "۱۱ + ۱", label: "Core Module و Final Review مستقل" },
            { value: "۳ تا ۵", label: "ساعت تمرکز در هفته" }
          ]}
        />
      </Section>

      <Section>
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <div>
            <SectionHeader
              eyebrow="WHY THIS METHOD EXISTS"
              title={
                <>
                  استفاده از <TechnicalTerm>AI</TechnicalTerm> آسان است. رهبری{" "}
                  <TechnicalTerm>Adoption</TechnicalTerm> دشوارتر است.
                </>
              }
              description={
                <>
                  <TechnicalTerm>AI Adoption</TechnicalTerm> یک{" "}
                  <TechnicalTerm>Prompt</TechnicalTerm> نیست. باید تصمیم بگیرید
                  کجا AI در کار شما جای دارد، کجا ریسک می‌سازد، انسان چگونه
                  پاسخ‌گو می‌ماند و ارزش چطور با Evidence ثابت می‌شود.{" "}
                  <TechnicalTerm>TenX Method</TechnicalTerm> راهی تکرارپذیر برای
                  انجام همین کار است.
                </>
              }
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              {
                icon: Target,
                title: "مسئله واقعی",
                text: "کار از یک چالش حرفه‌ای در حوزه خودتان شروع می‌شود."
              },
              {
                icon: Layers3,
                title: "ساختار متصل",
                text: "هر Module خروجی مشخصی را به Dossier اضافه می‌کند."
              },
              {
                icon: BookOpenCheck,
                title: "Review روشن",
                text: "پیشرفت با Evidence سنجیده می‌شود، نه زمان تماشای ویدیو."
              },
              {
                icon: Flag,
                title: "قدم بعد",
                text: "با یک 90-Day Roadmap اجرایی از برنامه خارج می‌شوید."
              }
            ].map((item) => {
              const Icon = item.icon;
              return (
                <article
                  key={item.title}
                  className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <span className="grid h-10 w-10 place-items-center rounded-lg bg-iris-50 text-iris-600">
                    <Icon aria-hidden="true" className="h-5 w-5" />
                  </span>
                  <h3 className="mt-5 font-semibold text-ink-950">
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

      <Section tone="dark">
        <div className="grid gap-10">
          <SectionHeader
            inverse
            eyebrow="SAMPLE PROOF"
            title="استاندارد خروجی را پیش از شروع ببینید."
            description="این نمونه انگلیسی و کاملاً فرضی، شکل یک Dossier منسجم را نشان می‌دهد. کار هر Participant بر اساس تخصص، مسئله و Evidence خودش ساخته می‌شود."
          />
          <SampleDossierPanel dark />
        </div>
      </Section>

      <Section tone="soft">
        <SectionHeader
          eyebrow="THE GUIDED PATH"
          title="۱۲ هفته، چهار مرحله، یک جریان پیوسته."
          description="هفته‌های ابتدایی جهت و مسئله را روشن می‌کنند. هفته‌های بعدی به طراحی مسئولانه، اثبات ارزش و آمادگی برای آینده می‌رسند."
          align="center"
        />
        <div className="mt-12 grid gap-5 lg:grid-cols-2">
          {programModules.map((phase, phaseIndex) => (
            <article
              key={phase.phase}
              className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
            >
              <div className="flex items-center justify-between border-b border-slate-200 bg-ink-950 px-5 py-4 text-white sm:px-6">
                <div className="flex items-center gap-3">
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-iris-500 text-xs font-bold">
                    {`۰${phaseIndex + 1}`}
                  </span>
                  <TechnicalTerm className="text-lg font-semibold">
                    {phase.phase}
                  </TechnicalTerm>
                </div>
                <span className="text-xs text-slate-400">{phase.weeks}</span>
              </div>
              <ol className="divide-y divide-slate-100 px-5 sm:px-6">
                {phase.modules.map((module, moduleIndex) => (
                  <li
                    key={module.title}
                    className="flex items-start gap-4 py-5"
                  >
                    <span className="mt-0.5 font-sans text-xs font-bold text-iris-600">
                      {String(
                        programModules
                          .slice(0, phaseIndex)
                          .reduce((sum, item) => sum + item.modules.length, 0) +
                          moduleIndex +
                          1
                      ).padStart(2, "0")}
                    </span>
                    <span className="min-w-0">
                      <span
                        dir="ltr"
                        lang="en"
                        className="block text-left font-latin text-sm font-semibold leading-6 text-slate-900"
                      >
                        {module.title}
                      </span>
                      <span className="mt-2 block text-sm font-medium leading-7 text-iris-700">
                        {module.coreQuestion}
                      </span>
                      <span className="mt-1.5 block text-sm leading-7 text-slate-600">
                        {module.description}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
            </article>
          ))}
        </div>
        <article className="mt-5 grid gap-5 rounded-lg border border-amber-300 bg-amber-50 p-6 shadow-sm sm:grid-cols-[auto_1fr_auto] sm:items-center sm:p-8">
          <span className="grid h-12 w-12 place-items-center rounded-full border border-amber-300 bg-white text-amber-700">
            <FileStack aria-hidden="true" className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs font-bold text-amber-700">
              {finalReview.timing} · FINAL REVIEW
            </p>
            <h3
              dir="ltr"
              lang="en"
              className="mt-2 text-left font-latin text-lg font-semibold text-ink-950"
            >
              {finalReview.title}
            </h3>
            <p className="mt-3 text-sm leading-8 text-slate-700">
              {finalReview.description}
            </p>
          </div>
          <span className="rounded-full border border-amber-300 bg-white px-3 py-2 text-xs font-bold text-amber-800">
            جدا از ۱۱ Module
          </span>
        </article>
      </Section>

      <Section tone="dark">
        <SectionHeader
          inverse
          eyebrow="FORMAT & COMMITMENT"
          title="برای حرفه‌ای‌های شاغل ساخته شده است."
          description={
            <>
              ساختار برنامه <TechnicalTerm className="text-white">
                Async First
              </TechnicalTerm>{" "}
              است و هر هفته چند ساعت تمرکز واقعی می‌خواهد. پیشرفت با خروجی سنجیده
              می‌شود، نه با حضور نمایشی.
            </>
          }
        />
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: Clock3,
              label: "تعهد هفتگی",
              value: "حدود ۳ تا ۵ ساعت"
            },
            {
              icon: BriefcaseBusiness,
              label: "طراحی‌شده برای",
              value: "حرفه‌ای‌های شاغل"
            },
            {
              icon: Code2,
              label: "پیش‌نیاز فنی",
              value: "نیازی به Coding نیست"
            },
            {
              icon: FileStack,
              label: "معیار پیشرفت",
              value: "خروجی‌های Dossier"
            }
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className="rounded-lg border border-white/10 bg-white/[0.035] p-5"
              >
                <Icon aria-hidden="true" className="h-5 w-5 text-iris-300" />
                <p className="mt-5 text-xs text-slate-500">{item.label}</p>
                <p className="mt-2 font-semibold text-white">{item.value}</p>
              </div>
            );
          })}
        </div>
        <div className="mt-6">
          <OfficeHourNotice inverse />
        </div>
      </Section>

      <Section>
        <SectionHeader
          eyebrow="WHAT YOU BUILD"
          title={
            <>
              هر هفته، <TechnicalTerm>Dossier</TechnicalTerm> را جلو می‌برد.
            </>
          }
          description="تمرین‌های برنامه تکلیف‌های جدا از هم نیستند. هر خروجی به بخش بعدی متصل می‌شود و در پایان یک پرونده منسجم می‌سازد."
        />
        <div className="mt-12 grid gap-x-8 gap-y-4 md:grid-cols-2">
          {dossierAssets.map((asset) => (
            <article
              key={asset.title}
              className="flex items-start gap-4 rounded-lg border border-slate-200 p-5"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-ink-950 text-xs font-bold text-white">
                {asset.index}
              </span>
              <div>
                <h3
                  dir="ltr"
                  lang="en"
                  className="text-left font-latin text-sm font-semibold leading-6 text-ink-950"
                >
                  {asset.title}
                </h3>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  {asset.description}
                </p>
              </div>
            </article>
          ))}
        </div>
      </Section>

      <Section tone="soft">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <SectionHeader
            eyebrow="REVIEW CHECKPOINTS"
            title="Final Review یک غافل‌گیری آخر دوره نیست."
            description={
              <>
                <TechnicalTerm>Dossier</TechnicalTerm> در طول برنامه و از طریق
                خروجی‌های هر مرحله شکل می‌گیرد. Review نهایی، کاری را بررسی می‌کند
                که از قبل قدم به قدم ساخته‌اید.
              </>
            }
          />
          <CheckList
            items={[
              <>
                <TechnicalTerm>Frame Checkpoint</TechnicalTerm>: مسئله، مرزها و
                تناسب AI پیش از طراحی قابل Review می‌شوند.
              </>,
              <>
                <TechnicalTerm>Design Checkpoint</TechnicalTerm>: Workflow، دانش
                مبنا و Guardrailها شکل می‌گیرند.
              </>,
              <>
                <TechnicalTerm>Prove Checkpoint</TechnicalTerm>: کیفیت، ارزش،
                ریسک و Adoption Plan آزموده می‌شوند.
              </>,
              <>
                <TechnicalTerm>Final Dossier Checkpoint</TechnicalTerm>: Roadmap،
                Foresight و Dossier کامل برای Review می‌روند.
              </>
            ]}
          />
        </div>
        <div className="mt-10 text-center">
          <PrimaryLink href="/certification">
            Review Standard را ببینید
          </PrimaryLink>
        </div>
      </Section>

      <FinalCta
        title="با تخصص خود وارد شوید. با Evidence قابل دفاع خارج شوید."
        description="درخواست شما بر اساس تخصص، مسئله حرفه‌ای و آمادگی برای انجام کار واقعی بررسی می‌شود. پرداخت فقط پس از پذیرش است."
      />
    </MarketingShell>
  );
}
