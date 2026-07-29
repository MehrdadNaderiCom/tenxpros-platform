import { HelpCircle, Mail, ShieldQuestion } from "lucide-react";
import { coreFaqs } from "@/components/marketing/content";
import {
  FaqAccordion,
  FinalCta,
  MarketingShell,
  PageHero,
  Section,
  SectionHeader
} from "@/components/marketing/marketing-ui";
import { TechnicalTerm } from "@/components/shared/technical-term";

const admissionFaqs = coreFaqs.slice(0, 2);
const experienceFaqs = coreFaqs.slice(2, 7);
const programFaqs = coreFaqs.slice(7);

const paymentAndPolicyFaqs = [
  {
    question: "اطلاعات پرداخت را کجا می‌بینم؟",
    answer:
      "اطلاعات بانکی فقط پس از پذیرش در پنل امن شما نمایش داده می‌شود. هر درخواست پرداخت خارج از پنل را پیش از واریز با پشتیبانی بررسی کنید."
  },
  {
    question: "بعد از واریز چه کاری باید انجام دهم؟",
    answer:
      "رسید واضح را در پنل بارگذاری می‌کنید. مبلغ، تاریخ، شماره پیگیری و حساب مقصد باید خوانا باشد. عضویت پس از بررسی و تأیید پرداخت فعال می‌شود."
  },
  {
    question: "قیمت Founding Charter چند است؟",
    answer:
      "قیمت اصلی برنامه ۹۰ میلیون تومان است. شهریه فعلی Founding Charter برابر ۶۰ میلیون تومان و به‌صورت یک پرداخت یک‌باره پس از پذیرش است."
  },
  {
    question: "درخواست عضویت هزینه دارد؟",
    answer:
      "خیر. ارسال درخواست رایگان است و هیچ تعهد پرداختی ایجاد نمی‌کند. فقط فرد پذیرفته‌شده به اطلاعات پرداخت دسترسی پیدا می‌کند."
  },
  {
    question: "اگر درباره پرداخت یا بازپرداخت پرسش داشته باشم چه کنم؟",
    answer:
      "پیش از واریز یا آغاز برنامه با support@tenxpros.ir تماس بگیرید. وضعیت هر درخواست بازپرداخت بر اساس مرحله فعال‌سازی، خدمات آغازشده و شرایط پذیرفته‌شده بررسی می‌شود."
  }
];

export function FaqPage() {
  return (
    <MarketingShell>
      <PageHero
        eyebrow="HONEST ANSWERS"
        title="پاسخ‌های روشن، پیش از هر تعهد."
        description={
          <>
            درباره ساختار برنامه، <TechnicalTerm>Certification</TechnicalTerm>،
            شهریه، <TechnicalTerm>Office Hour</TechnicalTerm> و خدمات اعضا باید
            پیش از درخواست عضویت تصویر دقیقی داشته باشید.
          </>
        }
        secondary={{ label: "تجربه اعضا", href: "/services" }}
      />

      <Section tone="soft">
        <div className="grid gap-10 lg:grid-cols-[0.55fr_1.45fr] lg:gap-14">
          <div>
            <SectionHeader
              eyebrow="ADMISSION & PAYMENT"
              title="درخواست و پرداخت"
              description="Apply ابتدا انجام می‌شود، سپس پذیرش و در نهایت پرداخت."
            />
          </div>
          <FaqAccordion items={[...admissionFaqs, ...paymentAndPolicyFaqs]} />
        </div>
      </Section>

      <Section>
        <div className="grid gap-10 lg:grid-cols-[0.55fr_1.45fr] lg:gap-14">
          <div>
            <SectionHeader
              eyebrow="MEMBER EXPERIENCE"
              title="Office Hour، DBC و Coaching"
              description="هر خدمت قاعده و هدف مشخص خود را دارد."
            />
          </div>
          <FaqAccordion items={experienceFaqs} />
        </div>
      </Section>

      <Section tone="soft">
        <div className="grid gap-10 lg:grid-cols-[0.55fr_1.45fr] lg:gap-14">
          <div>
            <SectionHeader
              eyebrow="PROGRAM & CREDENTIAL"
              title="ساختار و نتیجه برنامه"
              description="Credential به Evidence ارزیابی‌شده وابسته است."
            />
          </div>
          <FaqAccordion items={programFaqs} />
        </div>
      </Section>

      <Section tone="dark">
        <div className="grid items-center gap-10 lg:grid-cols-[1fr_auto]">
          <div className="flex items-start gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-iris-400/10 text-iris-300">
              <ShieldQuestion aria-hidden="true" className="h-6 w-6" />
            </span>
            <div>
              <p
                lang="en"
                className="font-latin text-xs font-bold tracking-[0.14em] text-iris-300"
              >
                STILL HAVE A QUESTION
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-white">
                پاسخ موردنظر را پیدا نکردید؟
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-400">
                سؤال خود را با زمینه کافی برای تیم پشتیبانی بفرستید. برای پرسش
                پرداخت، هیچ اطلاعات محرمانه کارت یا رمز بانکی ارسال نکنید.
              </p>
            </div>
          </div>
          <a
            href="mailto:support@tenxpros.ir"
            className="dark-focus-ring inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-white px-5 text-sm font-semibold text-ink-950 transition hover:bg-slate-100"
          >
            <Mail aria-hidden="true" className="h-4 w-4" />
            تماس با پشتیبانی
          </a>
        </div>
      </Section>

      <FinalCta
        eyebrow="READY WHEN YOU ARE"
        title="اگر مسئله واقعی دارید، درخواست را شروع کنید."
        description="ارسال درخواست رایگان است. هیچ پرداختی پیش از پذیرش انجام نمی‌شود و اطلاعات واریز فقط در پنل پذیرفته‌شدگان نمایش داده خواهد شد."
      />
    </MarketingShell>
  );
}
