import {
  BookMarked,
  EyeOff,
  FileCheck2,
  Fingerprint,
  LockKeyhole,
  ScanSearch,
  ShieldCheck
} from "lucide-react";
import {
  dossierAssets,
  dossierSections,
  reviewCriteria
} from "@/components/marketing/content";
import {
  CheckList,
  DossierVisual,
  FinalCta,
  MarketingShell,
  Metrics,
  PageHero,
  Section,
  SectionHeader
} from "@/components/marketing/marketing-ui";
import { SampleDossierPanel } from "@/components/marketing/sample-dossier-panel";
import { TechnicalTerm } from "@/components/shared/technical-term";

export function DossierPage() {
  return (
    <MarketingShell>
      <PageHero
        eyebrow="LIVING AI SOLUTION DOSSIER"
        title="کاری که پشت Credential شما قرار می‌گیرد."
        description={
          <>
            <TechnicalTerm className="text-white">
              Living AI Solution Dossier
            </TechnicalTerm>{" "}
            یک پرونده حرفه‌ای و زنده است که نشان می‌دهد مسئله را چگونه انتخاب
            کرده‌اید، <TechnicalTerm>AI</TechnicalTerm> را کجا وارد کرده‌اید،
            ریسک را چطور مهار کرده‌اید و ارزش را با چه Evidence سنجیده‌اید.
          </>
        }
        secondary={{ label: "Review Standard", href: "/certification" }}
      >
        <DossierVisual compact />
      </PageHero>

      <Section tone="dark" className="-mt-px pb-20 pt-0 sm:pb-24">
        <Metrics
          dark
          items={[
            { value: "۸", label: "خروجی متصل" },
            { value: "۱۲", label: "بخش ساختاریافته" },
            { value: "۸", label: "معیار Review" },
            { value: "۱", label: "Artifact قابل دفاع" }
          ]}
        />
      </Section>

      <Section>
        <div className="grid items-center gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
          <SectionHeader
            eyebrow="NOT A COURSE ASSIGNMENT"
            title={
              <>
                یک <TechnicalTerm>Artifact</TechnicalTerm> حرفه‌ای، نه یک تکلیف
                پایان دوره.
              </>
            }
            description={
              <>
                Dossier خلاصه‌ای از Lessonها نیست. سند تصمیم شماست. خواننده باید
                بتواند بفهمد چرا این مسئله ارزش حل‌کردن دارد، چرا AI در این نقطه
                مناسب است، چه چیزی انسانی می‌ماند و نتیجه با چه معیاری سنجیده
                شده است.
              </>
            }
          />
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              {
                icon: ScanSearch,
                title: "منطق تصمیم",
                text: "از Problem Framing تا انتخاب Use Case، رد تصمیم‌ها مشخص است."
              },
              {
                icon: ShieldCheck,
                title: "مرز و Governance",
                text: "ریسک، محرمانگی و مسئولیت انسانی صریح باقی می‌مانند."
              },
              {
                icon: FileCheck2,
                title: "Evidence",
                text: "ادعای کیفیت با Evaluation Rubric و Test Set آزموده می‌شود."
              },
              {
                icon: BookMarked,
                title: "Roadmap",
                text: "قدم بعد، مالکیت و مسیر ۹۰ روز آینده روشن می‌شوند."
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

      <Section>
        <SectionHeader
          eyebrow="THE 12-SECTION ANATOMY"
          title="دوازده بخش، منطق کامل تصمیم را ثبت می‌کنند."
          description={
            <>
              هشت <TechnicalTerm>Asset</TechnicalTerm> خروجی‌های عملی برنامه
              هستند. این خروجی‌ها در ساختار دوازده‌بخشی Dossier قرار می‌گیرند تا
              زمینه، مسئله، Evidence، طراحی، ریسک و توصیه نهایی در یک روایت منسجم
              کنار هم دیده شوند.
            </>
          }
          align="center"
        />
        <ol className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {dossierSections.map((section) => (
            <li
              key={section.title}
              className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start gap-4">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-ink-950 text-xs font-bold text-white">
                  {section.index}
                </span>
                <div>
                  <h3
                    dir="ltr"
                    lang="en"
                    className="text-left font-latin text-sm font-semibold leading-6 text-ink-950"
                  >
                    {section.title}
                  </h3>
                  <p className="mt-2 text-sm leading-7 text-slate-600">
                    {section.description}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </Section>

      <Section tone="soft">
        <SectionHeader
          eyebrow="EIGHT CONNECTED ASSETS"
          title="هشت خروجی که کنار هم معنا پیدا می‌کنند."
          description="هر خروجی در طول برنامه ساخته می‌شود و یک بخش ضروری از تصمیم مسئولانه برای AI Adoption را ثبت می‌کند."
          align="center"
        />
        <div className="mt-12 space-y-4">
          {dossierAssets.map((asset, index) => (
            <article
              key={asset.title}
              className="grid items-center gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-[4rem_1fr_1fr] sm:gap-6 sm:p-6"
            >
              <span className="grid h-11 w-11 place-items-center rounded-lg bg-ink-950 text-xs font-bold text-white">
                {asset.index}
              </span>
              <h3
                dir="ltr"
                lang="en"
                className="text-left font-latin text-base font-semibold leading-7 text-ink-950"
              >
                {asset.title}
              </h3>
              <p className="text-sm leading-7 text-slate-600">
                {asset.description}
              </p>
              {index < dossierAssets.length - 1 ? (
                <span
                  aria-hidden="true"
                  className="absolute hidden h-4 w-px bg-slate-200"
                />
              ) : null}
            </article>
          ))}
        </div>
      </Section>

      <Section>
        <SectionHeader
          eyebrow="SEE THE STANDARD"
          title="قبل از درخواست، نمونه واقعی فایل را بررسی کنید."
          description="نمونه قابل دانلود نشان می‌دهد یک Dossier منسجم چگونه مسئله، طراحی، Evidence و Review را به هم وصل می‌کند."
        />
        <div className="mt-10">
          <SampleDossierPanel />
        </div>
      </Section>

      <Section tone="dark">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <SectionHeader
            inverse
            eyebrow="REVIEW MAPPING"
            title="هر ادعا باید جایی برای بررسی داشته باشد."
            description={
              <>
                Dossier با هشت معیار عمومی{" "}
                <TechnicalTerm className="text-white">Review</TechnicalTerm>{" "}
                سنجیده می‌شود. همین معیارها پیش از درخواست عضویت در دسترس شما
                هستند.
              </>
            }
          />
          <CheckList inverse columns={2} items={reviewCriteria} />
        </div>
      </Section>

      <Section tone="soft">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 sm:p-8">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-lg bg-iris-50 text-iris-600">
                <LockKeyhole aria-hidden="true" className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-semibold text-iris-600">
                  CONFIDENTIALITY BY DESIGN
                </p>
                <h3 className="mt-1 font-semibold text-ink-950">
                  اعتبارسنجی بدون افشای کار
                </h3>
              </div>
            </div>
            <div className="mt-7 grid gap-3">
              {[
                {
                  icon: EyeOff,
                  text: "محتوای Dossier در Directory یا صفحه Verification نمایش داده نمی‌شود."
                },
                {
                  icon: Fingerprint,
                  text: "Verification فقط Metadata یک Credential واقعی و صادرشده را از Registry می‌خواند."
                },
                {
                  icon: ShieldCheck,
                  text: "مثال‌های حساس باید حذف مشخصات شوند یا به‌صورت فرضی ساخته شوند."
                }
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.text}
                    className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-4"
                  >
                    <Icon
                      aria-hidden="true"
                      className="mt-1 h-4 w-4 shrink-0 text-iris-600"
                    />
                    <p className="text-sm leading-7 text-slate-600">
                      {item.text}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
          <SectionHeader
            eyebrow="A LIVING DOCUMENT"
            title="ارزش Dossier با پایان هفته دوازدهم تمام نمی‌شود."
            description={
              <>
                <TechnicalTerm>Living</TechnicalTerm> یعنی این سند می‌تواند با
                تغییر Workflow، ابزار، شواهد و ریسک به‌روزرسانی شود. هدف یک
                Snapshot نمایشی نیست. هدف ساختن مرجعی است که تصمیم‌های بعدی شما
                را منظم‌تر و قابل توضیح‌تر کند.
              </>
            }
          />
        </div>
      </Section>

      <FinalCta
        title="یک مسئله واقعی را به یک Dossier قابل دفاع تبدیل کنید."
        description="استاندارد پیش از ورود روشن است. با تخصص خود درخواست بدهید و فقط پس از پذیرش پرداخت کنید."
      />
    </MarketingShell>
  );
}
