import {
  Award,
  BadgeCheck,
  CheckCircle2,
  EyeOff,
  FileSearch,
  Fingerprint,
  Layers3,
  LockKeyhole,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Target,
  UserCheck
} from "lucide-react";
import {
  certificationRanks,
  certificationOutcomes,
  reviewCriteria
} from "@/components/marketing/content";
import {
  CheckList,
  FinalCta,
  MarketingShell,
  Metrics,
  PageHero,
  PrimaryLink,
  Section,
  SectionHeader
} from "@/components/marketing/marketing-ui";
import { SampleDossierPanel } from "@/components/marketing/sample-dossier-panel";
import { TechnicalTerm } from "@/components/shared/technical-term";

function CredentialVisual() {
  return (
    <div className="relative mx-auto max-w-[31rem]">
      <div
        aria-hidden="true"
        className="absolute inset-5 translate-y-5 rotate-2 rounded-lg border border-credential/15 bg-credential/[0.04]"
      />
      <div className="relative overflow-hidden rounded-lg border border-credential/25 bg-ink-850 p-6 shadow-panel sm:p-8">
        <div className="flex items-start justify-between gap-5 border-b border-white/10 pb-6">
          <div>
            <p
              lang="en"
              className="font-latin text-[0.64rem] font-bold tracking-[0.18em] text-credential"
            >
              TENXPROS VERIFICATION
            </p>
            <p lang="en" className="mt-2 font-latin text-lg font-semibold text-white">
              Professional Credential
            </p>
          </div>
          <span className="grid h-12 w-12 place-items-center rounded-full border border-credential/30 bg-credential/10 text-credential">
            <BadgeCheck aria-hidden="true" className="h-6 w-6" />
          </span>
        </div>
        <dl className="mt-6 grid grid-cols-2 gap-x-5 gap-y-6">
          {[
            ["دارنده", "نام عضو"],
            ["Credential", "Certified TenXPro"],
            ["وضعیت", "فعال"],
            ["تاریخ صدور", "پس از تأیید Review"]
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-[0.66rem] text-slate-500">{label}</dt>
              <dd className="mt-1.5 text-sm font-semibold text-white">
                {value}
              </dd>
            </div>
          ))}
        </dl>
        <div className="mt-7 rounded-lg border border-white/10 bg-white/[0.035] p-4">
          <p
            lang="en"
            className="font-latin text-[0.61rem] uppercase tracking-[0.14em] text-slate-500"
          >
            Verification code
          </p>
          <p
            dir="ltr"
            lang="en"
            className="mt-2 font-latin text-sm font-semibold tracking-[0.08em] text-iris-200"
          >
            DBC-IR-YYYY-XXXXXXXXXXXX
          </p>
        </div>
        <p className="mt-4 text-[0.66rem] leading-5 text-slate-500">
          طرح نمایشی است و Credential واقعی یا قابل استعلام محسوب نمی‌شود.
        </p>
      </div>
    </div>
  );
}

export function CertificationPage() {
  return (
    <MarketingShell>
      <PageHero
        eyebrow="REVIEW STANDARD · CERTIFICATION"
        title="Credential با Evidence به دست می‌آید، نه با حضور."
        description={
          <>
            <TechnicalTerm>TenXPros Certification</TechnicalTerm> زمانی صادر
            می‌شود که <TechnicalTerm>Living AI Solution Dossier</TechnicalTerm>{" "}
            معیارهای عمومی و روشن <TechnicalTerm>Review</TechnicalTerm> را
            برآورده کند. پایان دوره به‌تنهایی به معنی Certified شدن نیست.
          </>
        }
        secondary={{ label: "ساختار Dossier", href: "/dossier" }}
      >
        <CredentialVisual />
      </PageHero>

      <Section tone="dark" className="-mt-px pb-20 pt-0 sm:pb-24">
        <Metrics
          dark
          items={[
            { value: "۸", label: "معیار عمومی Review" },
            { value: "۱۱", label: "Module Milestone" },
            { value: "۳", label: "Rank پیشرفت" },
            { value: "۱", label: "Capstone Seal نهایی" }
          ]}
        />
      </Section>

      <Section>
        <SectionHeader
          eyebrow="THREE HONEST OUTCOMES"
          title="نتیجه Review صریح است."
          description="Review به یک برچسب ساده Pass یا Fail محدود نمی‌شود. نتیجه دقیقاً نشان می‌دهد کار کجا ایستاده و برای رسیدن به استاندارد چه اصلاحی لازم است."
          align="center"
        />
        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {certificationOutcomes.map((outcome) => (
            <article
              key={outcome.title}
              className={
                outcome.tone === "credential"
                  ? "rounded-lg border border-credential/40 bg-amber-50/60 p-6 shadow-sm"
                  : outcome.tone === "iris"
                    ? "rounded-lg border border-iris-200 bg-iris-50/50 p-6 shadow-sm"
                    : "rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
              }
            >
              <span
                className={
                  outcome.tone === "credential"
                    ? "grid h-11 w-11 place-items-center rounded-lg bg-white text-amber-700 shadow-sm"
                    : outcome.tone === "iris"
                      ? "grid h-11 w-11 place-items-center rounded-lg bg-white text-iris-600 shadow-sm"
                      : "grid h-11 w-11 place-items-center rounded-lg bg-slate-100 text-slate-600"
                }
              >
                {outcome.tone === "credential" ? (
                  <BadgeCheck aria-hidden="true" className="h-5 w-5" />
                ) : outcome.tone === "iris" ? (
                  <RotateCcw aria-hidden="true" className="h-5 w-5" />
                ) : (
                  <CheckCircle2 aria-hidden="true" className="h-5 w-5" />
                )}
              </span>
              <TechnicalTerm className="mt-6 block text-xl font-semibold text-ink-950">
                {outcome.title}
              </TechnicalTerm>
              <p className="mt-4 text-sm leading-7 text-slate-600">
                {outcome.description}
              </p>
            </article>
          ))}
        </div>
        <p className="mx-auto mt-8 max-w-3xl text-center text-sm leading-7 text-slate-500">
          هیچ نتیجه Certification تضمین نمی‌شود. کیفیت Evidence و میزان انطباق
          Dossier با معیارهای Review تعیین‌کننده است.
        </p>
      </Section>

      <Section tone="soft">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <SectionHeader
            eyebrow="THE EIGHT REVIEW CRITERIA"
            title="استاندارد پیش از درخواست عضویت روشن است."
            description={
              <>
                همه Dossierها با یک مجموعه معیار مشترک Review می‌شوند. حوزه و
                مسئله هر فرد متفاوت است، اما استاندارد Credential برای همه یکسان
                باقی می‌ماند.
              </>
            }
          />
          <CheckList columns={2} items={reviewCriteria} />
        </div>
      </Section>

      <Section>
        <SectionHeader
          eyebrow="MILESTONES, RANKS & THE SEAL"
          title="پیشرفت با کار Review شده ثبت می‌شود."
          description="یازده Module Milestone مسیر را قابل مشاهده می‌کنند. سه Rank توانایی ساخته‌شده در هر مرحله را نشان می‌دهند و Capstone Seal فقط به Dossier تأییدشده تعلق می‌گیرد."
          align="center"
        />
        <div className="mt-12 rounded-lg border border-slate-200 bg-slate-50 p-6 sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <span className="grid h-12 w-12 place-items-center rounded-lg bg-ink-950 text-white">
                <Layers3 aria-hidden="true" className="h-5 w-5" />
              </span>
              <div>
                <p lang="en" className="font-latin text-xs font-bold text-iris-600">
                  MODULE MILESTONES
                </p>
                <h3 className="mt-1 text-lg font-semibold text-ink-950">
                  یازده Milestone برای یازده Core Module
                </h3>
              </div>
            </div>
            <p className="max-w-xl text-sm leading-7 text-slate-600">
              هر Milestone با خروجی همان Module و پس از Review ثبت می‌شود، نه با
              تماشای محتوا یا حضور در جلسه.
            </p>
          </div>
          <div className="mt-7 grid grid-cols-6 gap-2 sm:grid-cols-11">
            {Array.from({ length: 11 }, (_, index) => (
              <span
                key={index}
                className="grid aspect-square place-items-center rounded-lg border border-iris-200 bg-white font-sans text-xs font-bold text-iris-700"
              >
                {String(index + 1).padStart(2, "0")}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          {certificationRanks.map((rank, index) => (
            <article
              key={rank.title}
              className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="flex items-center justify-between gap-4">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-iris-50 font-sans text-xs font-bold text-iris-700">
                  {index + 1}
                </span>
                <TechnicalTerm className="text-xs font-bold text-iris-600">
                  {rank.phase}
                </TechnicalTerm>
              </div>
              <h3
                dir="ltr"
                lang="en"
                className="mt-6 text-left font-latin text-lg font-semibold leading-7 text-ink-950"
              >
                {rank.title}
              </h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                {rank.description}
              </p>
            </article>
          ))}
        </div>

        <article className="mt-5 grid gap-5 rounded-lg border border-credential/40 bg-amber-50 p-6 shadow-sm sm:grid-cols-[auto_1fr] sm:items-center sm:p-8">
          <span className="grid h-14 w-14 place-items-center rounded-full border border-credential/40 bg-white text-amber-700">
            <Award aria-hidden="true" className="h-7 w-7" />
          </span>
          <div>
            <p lang="en" className="font-latin text-xs font-bold text-amber-700">
              THE FINAL CREDENTIAL
            </p>
            <h3
              dir="ltr"
              lang="en"
              className="mt-2 text-left font-latin text-xl font-semibold text-ink-950"
            >
              Certified TenXPro Capstone Seal
            </h3>
            <p className="mt-3 text-sm leading-8 text-slate-700">
              Seal نهایی زمانی به دست می‌آید که Dossier در Final Review هشت
              معیار عمومی را برآورده کند. پایان برنامه یا دریافت Rank به‌تنهایی
              معادل این Credential نیست.
            </p>
          </div>
        </article>
      </Section>

      <Section tone="soft">
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-start lg:gap-16">
          <SectionHeader
            eyebrow="PERSONALIZED, NOT ARBITRARY"
            title="مسیر متناسب است، استاندارد ثابت می‌ماند."
            description={
              <>
                <TechnicalTerm>Onboarding Diagnostic</TechnicalTerm> حوزه،
                مسئله، ریسک، Stakeholderها و هدف حرفه‌ای شما را روشن می‌کند.
                تأکید و مثال‌های مسیر بر همین اساس تنظیم می‌شوند، اما معیارهای
                Review و سطح لازم برای Credential برای همه یکسان است.
              </>
            }
          />
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              {
                icon: Sparkles,
                title: "Personalized Path",
                text: "یادداشت‌های مسیر و میزان تأکید هر Module با زمینه حرفه‌ای شما تنظیم می‌شود."
              },
              {
                icon: Target,
                title: "Real Problem",
                text: "Dossier از مسئله‌ای واقعی در حوزه شما ساخته می‌شود، نه از Case عمومی دوره."
              },
              {
                icon: FileSearch,
                title: "Evidence Trail",
                text: "ادعاها به منبع، Test Set، Rubric و نتیجه قابل بازبینی متصل می‌مانند."
              },
              {
                icon: ShieldCheck,
                title: "Defensible Decisions",
                text: "مرزها، Trade-offها، مسئولیت انسانی و دلیل توصیه نهایی باید قابل توضیح باشند."
              }
            ].map((item) => {
              const Icon = item.icon;
              return (
                <article
                  key={item.title}
                  className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <Icon aria-hidden="true" className="h-5 w-5 text-iris-600" />
                  <h3
                    dir="ltr"
                    lang="en"
                    className="mt-4 text-left font-latin text-sm font-semibold text-ink-950"
                  >
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

      <Section>
        <SectionHeader
          eyebrow="WORK BEHIND THE CREDENTIAL"
          title="نمونه Dossier را پیش از درخواست بررسی کنید."
          description="نمونه انگلیسی زیر، ساختار، Reviewer Note، فاصله Evidence و ارتباط خروجی‌ها با Rubric را در یک پرونده فرضی نشان می‌دهد."
        />
        <div className="mt-10">
          <SampleDossierPanel />
        </div>
      </Section>

      <Section tone="dark">
        <SectionHeader
          inverse
          eyebrow="HOW REVIEW WORKS"
          title="Review انسانی، بخش‌محور و مبتنی بر Evidence است."
          description={
            <>
              برای <TechnicalTerm className="text-white">
                Founding Charter
              </TechnicalTerm>
              ، Review توسط تیم TenXPros و معمار برنامه انجام می‌شود. هر نتیجه به
              شواهد موجود در Dossier و معیارهای منتشرشده متکی است.
            </>
          }
          align="center"
        />
        <ol className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[
            {
              icon: FileSearch,
              title: "بررسی Dossier",
              text: "هر بخش در برابر هشت معیار عمومی و Evidence همان بخش بررسی می‌شود."
            },
            {
              icon: UserCheck,
              title: "قضاوت انسانی",
              text: "تصمیم نهایی به Automation یا امتیاز یک Quiz واگذار نمی‌شود."
            },
            {
              icon: ShieldCheck,
              title: "استاندارد مشترک",
              text: "همه Participantها با یک Review Standard منتشرشده سنجیده می‌شوند."
            },
            {
              title: "نتیجه روشن",
              icon: CheckCircle2,
              text: "Certified، Strong Draft یا Completed ثبت می‌شود."
            },
            {
              icon: RotateCcw,
              title: "Revision مشخص",
              text: "Strong Draft راهنمای اصلاح بخش‌محور دریافت می‌کند."
            },
            {
              icon: LockKeyhole,
              title: "محرمانگی",
              text: "Review به محتوای لازم محدود می‌شود و Dossier عمومی نمی‌شود."
            }
          ].map((step, index) => {
            const Icon = step.icon;
            return (
              <li
                key={step.title}
                className="rounded-lg border border-white/10 bg-white/[0.035] p-5"
              >
                <div className="flex items-center justify-between">
                  <Icon aria-hidden="true" className="h-5 w-5 text-iris-300" />
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
      </Section>

      <Section>
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <div>
            <span className="inline-flex rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800">
              Registry و Lookup عملیاتی
            </span>
            <div className="mt-5">
              <SectionHeader
                eyebrow="PUBLIC VERIFICATION"
                title="Credential قابل بررسی است، Dossier محرمانه می‌ماند."
                description={
                  <>
                    هر Credential صادرشده یک کد با قالب{" "}
                    <TechnicalTerm>DBC-IR-YYYY-XXXXXXXXXXXX</TechnicalTerm>{" "}
                    دارد. Directory و صفحه اختصاصی Verification وضعیت رکورد را
                    مستقیماً از Registry می‌خوانند، بدون اینکه محتوای Dossier را
                    نمایش دهند.
                  </>
                }
              />
            </div>
            <div className="mt-7">
              <PrimaryLink href="/directory">
                بررسی Credential در Directory
              </PrimaryLink>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              {
                icon: Fingerprint,
                title: "شناسه یکتا",
                text: "هر Credential صادرشده یک Verification Code مستقل و قابل جست‌وجو دارد."
              },
              {
                icon: BadgeCheck,
                title: "وضعیت جاری",
                text: "Lookup وضعیت Active یا Revoked را از رکورد جاری Registry می‌خواند."
              },
              {
                icon: LockKeyhole,
                title: "محرمانگی",
                text: "جزئیات مسئله، Evidence و طراحی Dossier در Verification عمومی نمایش داده نمی‌شوند."
              },
              {
                icon: EyeOff,
                title: "حداقل نمایش",
                text: "فقط نام دارنده، عنوان، وضعیت، تاریخ صدور و Verification Code نمایش داده می‌شود."
              }
            ].map((item) => {
              const Icon = item.icon;
              return (
                <article
                  key={item.title}
                  className="rounded-lg border border-slate-200 bg-slate-50 p-5"
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
        <SectionHeader
          eyebrow="THE PATH"
          title="از درخواست عضویت تا Credential."
          align="center"
        />
        <ol className="mx-auto mt-12 grid max-w-5xl gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            "درخواست با تخصص واقعی",
            "Diagnostic و مسیر متناسب",
            "ساخت هشت خروجی",
            "یکپارچه‌سازی Dossier",
            "ارسال برای Review",
            "Revision در صورت نیاز",
            "صدور Credential پس از تأیید",
            "اشتراک Verification و Certificate"
          ].map((step, index) => (
            <li
              key={step}
              className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-4 text-sm leading-7 text-slate-700"
            >
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-ink-950 text-[0.65rem] font-bold text-white">
                {String(index + 1).padStart(2, "0")}
              </span>
              {step}
            </li>
          ))}
        </ol>
      </Section>

      <FinalCta
        title="کاری بسازید که بتوان آن را بررسی کرد."
        description="Credential نتیجه Evidence ارزیابی‌شده است. اگر آماده‌اید یک مسئله حرفه‌ای واقعی را زیر این استاندارد ببرید، درخواست بدهید."
      />
    </MarketingShell>
  );
}
