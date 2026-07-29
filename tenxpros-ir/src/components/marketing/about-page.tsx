import {
  BadgeCheck,
  BrainCircuit,
  FileCheck2,
  Fingerprint,
  Lightbulb,
  Scale,
  ShieldCheck,
  UserRoundCheck
} from "lucide-react";
import { principles } from "@/components/marketing/content";
import {
  CheckList,
  FinalCta,
  MarketingShell,
  Metrics,
  PageHero,
  Section,
  SectionHeader
} from "@/components/marketing/marketing-ui";
import { TechnicalTerm } from "@/components/shared/technical-term";

function StandardVisual() {
  const rows = [
    { key: "expertise", label: "تخصص", value: "از شما" },
    {
      key: "method",
      label: <TechnicalTerm>AI Method</TechnicalTerm>,
      value: (
        <>
          از <TechnicalTerm>TenXPros</TechnicalTerm>
        </>
      )
    },
    {
      key: "dossier",
      label: "خروجی",
      value: <TechnicalTerm>Reviewed Dossier</TechnicalTerm>
    },
    {
      key: "credential",
      label: <TechnicalTerm>Credential</TechnicalTerm>,
      value: (
        <>
          بر پایه <TechnicalTerm>Evidence</TechnicalTerm>
        </>
      )
    }
  ];

  return (
    <div className="rounded-lg border border-white/15 bg-white/[0.035] p-6 shadow-panel sm:p-8">
      <p
        lang="en"
        className="font-latin text-xs font-bold tracking-[0.15em] text-credential"
      >
        THE STANDARD
      </p>
      <div className="mt-6 divide-y divide-white/10 rounded-lg border border-white/10 bg-ink-900 px-5">
        {rows.map(({ key, label, value }) => (
          <div
            key={key}
            className="flex items-center justify-between gap-5 py-4"
          >
            <span className="text-sm text-slate-500">{label}</span>
            <span className="text-left font-sans text-sm font-semibold text-white">
              {value}
            </span>
          </div>
        ))}
      </div>
      <div
        lang="en"
        dir="ltr"
        className="mt-5 flex items-center gap-3 rounded-lg border border-credential/20 bg-credential/10 p-4 font-latin text-sm text-credential"
      >
        <BadgeCheck aria-hidden="true" className="h-5 w-5" />
        Earned through reviewed evidence
      </div>
    </div>
  );
}

export function AboutPage() {
  return (
    <MarketingShell>
      <PageHero
        eyebrow="WHY TENXPROS EXISTS"
        title={
          <>
            <TechnicalTerm>AI Adoption</TechnicalTerm> به کار قضاوت حرفه‌ای تبدیل
            شده است.
          </>
        }
        description={
          <>
            <TechnicalTerm>TenXPros</TechnicalTerm> برای حرفه‌ای‌های باتجربه‌ای
            ساخته شده که به چیزی بیشتر از نکته‌های AI نیاز دارند. تخصص شما را به
            کاری ارزیابی‌شده تبدیل می‌کند که می‌توانید توضیحش دهید، از آن دفاع
            کنید و در عمل به کار بگیرید.
          </>
        }
        secondary={{ label: "TenX Method", href: "/program" }}
      >
        <StandardVisual />
      </PageHero>

      <Section tone="dark" className="-mt-px pb-20 pt-0 sm:pb-24">
        <Metrics
          dark
          items={[
            { value: "Expertise", label: "سرمایه‌ای که شما می‌آورید" },
            { value: "AI Method", label: "ساختاری که ما اضافه می‌کنیم" },
            { value: "Dossier", label: "کاری که قابل Review می‌شود" },
            { value: "Credential", label: "نتیجه‌ای که از Evidence می‌آید" }
          ]}
        />
      </Section>

      <Section>
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <SectionHeader
            eyebrow="THE PROBLEM BEHIND TENXPROS"
            title={
              <>
                بیشتر آموزش‌های <TechnicalTerm>AI</TechnicalTerm> در همان مراحل
                مقدماتی متوقف می‌شوند.
              </>
            }
            description={
              <>
                بیشتر دوره‌ها ابزار، Prompt یا مفهوم آموزش می‌دهند. کار سخت بعد
                از آن شروع می‌شود: AI کجا باید وارد شود، چه چیزی باید Human Led
                بماند، ریسک چگونه محدود شود و ارزش واقعاً با چه Evidence اثبات
                شود. مسئولیت یک حرفه‌ای جدی همین‌جاست و TenXPros از همین نقطه
                شروع می‌کند.
              </>
            }
          />
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-7 sm:p-9">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-lg bg-iris-50 text-iris-600">
                <BrainCircuit aria-hidden="true" className="h-5 w-5" />
              </span>
              <h3 className="font-semibold text-ink-950">
                پرسش واقعی یک حرفه‌ای
              </h3>
            </div>
            <blockquote className="mt-7 text-2xl font-semibold leading-[1.7] text-ink-950">
              وقتی کسی می‌پرسد چرا این تصمیم را گرفته‌اید، آیا فقط یک خروجی
              دارید یا Evidence و منطق قابل دفاع هم دارید؟
            </blockquote>
          </div>
        </div>
      </Section>

      <Section tone="soft">
        <SectionHeader
          eyebrow="THE TENXPROS ANSWER"
          title={
            <>
              روشی برای تبدیل تخصص به{" "}
              <TechnicalTerm>Reviewed AI Adoption Work</TechnicalTerm>.
            </>
          }
          align="center"
        />
        <ol className="mx-auto mt-12 grid max-w-6xl gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[
            "تخصص و یک مسئله متمرکز را وارد می‌کنید",
            "تصمیم و زمینه را Frame می‌کنید",
            "استفاده مسئولانه از AI را Design می‌کنید",
            "ارزش و مرز ریسک را با Evidence نشان می‌دهید",
            "خروجی‌ها را در Living AI Solution Dossier یکپارچه می‌کنید",
            "فقط پس از رسیدن Dossier به استاندارد، Credential می‌گیرید"
          ].map((step, index) => (
            <li
              key={step}
              className="flex items-start gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-ink-950 text-xs font-bold text-white">
                {`۰${index + 1}`}
              </span>
              <p className="text-sm leading-7 text-slate-700">{step}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section tone="dark">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <SectionHeader
            inverse
            eyebrow="THE STANDARD IS THE PRODUCT"
            title="اعتبار از استانداردی می‌آید که بتوانید آن را ببینید."
            description="TenXPros بر حضور بنا نشده است. معیارها، نمونه Dossier و Review Outcomes پیش از درخواست عضویت در دسترس هستند. Credential صادرشده نیز از Registry واقعی قابل Verification است."
          />
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              {
                icon: Scale,
                title: "هشت معیار عمومی",
                text: "یک Review Standard روشن برای همه Dossierها."
              },
              {
                icon: FileCheck2,
                title: "ساختار قابل مشاهده",
                text: "می‌دانید چه چیزی می‌سازید و چطور بررسی می‌شود."
              },
              {
                icon: BadgeCheck,
                title: "سه نتیجه صریح",
                text: "Certified، Strong Draft یا Completed."
              },
              {
                icon: Fingerprint,
                title: "Public Verification",
                text: "استعلام Credential واقعی از Registry، بدون افشای محتوای Dossier."
              }
            ].map((item) => {
              const Icon = item.icon;
              return (
                <article
                  key={item.title}
                  className="rounded-lg border border-white/10 bg-white/[0.035] p-5"
                >
                  <Icon aria-hidden="true" className="h-5 w-5 text-iris-300" />
                  <h3 className="mt-4 font-semibold text-white">{item.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-slate-400">
                    {item.text}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </Section>

      <Section>
        <div className="grid items-center gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
          <div className="relative overflow-hidden rounded-lg border border-slate-200 bg-ink-950 p-7 text-white shadow-panel sm:p-9">
            <div className="relative">
              <span className="grid h-12 w-12 place-items-center rounded-lg bg-credential/10 text-credential">
                <UserRoundCheck aria-hidden="true" className="h-6 w-6" />
              </span>
              <p
                lang="en"
                className="mt-7 font-latin text-xs font-bold tracking-[0.14em] text-credential"
              >
                CREATOR & ARCHITECT
              </p>
              <h2 className="mt-4 text-3xl font-semibold text-white">
                مهرداد نادری
              </h2>
              <p className="mt-5 text-base leading-8 text-slate-300">
                سازنده و معمار TenX Method و Review Standard پشت Credential.
                TenXPros پاسخی است به فاصله میان توانایی استفاده از AI و توانایی
                رهبری مسئولانه Adoption در یک حوزه واقعی.
              </p>
            </div>
          </div>
          <SectionHeader
            eyebrow="WHO SET THE STANDARD"
            title="نام یک فرد جای Evidence را نمی‌گیرد."
            description={
              <>
                اعتبار Credential بر نام سازنده تکیه ندارد. ساختار Dossier، هشت
                معیار عمومی، Review Outcomes و Evidence ارزیابی‌شده به آن معنا
                می‌دهند. استاندارد باید حتی پیش از اعتماد به نام‌ها قابل بررسی
                باشد و Verification عمومی، وضعیت Credential صادرشده را از Registry
                تأیید می‌کند.
              </>
            }
          />
        </div>
      </Section>

      <Section tone="soft">
        <SectionHeader
          eyebrow="PRINCIPLES"
          title="اصولی که از آن‌ها کوتاه نمی‌آییم."
          align="center"
        />
        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {principles.map((principle, index) => (
            <article
              key={principle.title}
              className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="flex items-center justify-between">
                {index % 2 === 0 ? (
                  <ShieldCheck
                    aria-hidden="true"
                    className="h-5 w-5 text-iris-600"
                  />
                ) : (
                  <Lightbulb
                    aria-hidden="true"
                    className="h-5 w-5 text-amber-600"
                  />
                )}
                <span className="text-xs font-bold text-slate-300">
                  {`۰${index + 1}`}
                </span>
              </div>
              <h3 className="mt-5 font-semibold leading-7 text-ink-950">
                {principle.title}
              </h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                {principle.description}
              </p>
            </article>
          ))}
        </div>
      </Section>

      <Section>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-7 sm:p-9">
          <SectionHeader
            eyebrow="TO BE PRECISE"
            title="این برنامه دقیقاً چه چیزی نیست."
            description="شفافیت درباره مرزها بخشی از همان استانداردی است که TenXPros بر آن بنا شده است."
          />
          <div className="mt-8">
            <CheckList
              columns={2}
              items={[
                "مدرک دانشگاهی یا Academic Accreditation نیست",
                "تضمین استخدام، درآمد یا نتیجه تجاری نیست",
                "گواهی حضور صرف نیست",
                "جایگزین مسئولیت حرفه‌ای یا Legal Advice نیست"
              ]}
            />
          </div>
        </div>
      </Section>

      <FinalCta
        title="تخصص را شما می‌آورید. ما AI Method را می‌آوریم."
        description="اگر مسئله‌ای واقعی دارید و می‌خواهید تصمیم خود را با Evidence بسازید، درخواست حضور در Founding Charter را ارسال کنید."
      />
    </MarketingShell>
  );
}
