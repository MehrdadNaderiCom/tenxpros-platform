import {
  BadgeHelp,
  CircleDollarSign,
  KeyRound,
  Mail,
  MessageSquareText,
  ReceiptText,
  ShieldCheck,
  Video
} from "lucide-react";
import {
  MarketingShell,
  PageHero,
  Section,
  SectionHeader
} from "@/components/marketing/marketing-ui";
import { TechnicalTerm } from "@/components/shared/technical-term";

const contacts = [
  {
    icon: BadgeHelp,
    title: "پشتیبانی فنی و حساب",
    email: "support@tenxpros.ir",
    description:
      "برای مشکل ورود، پنل، رزرو، Zoom، بارگذاری رسید یا دسترسی به برنامه."
  },
  {
    icon: MessageSquareText,
    title: "درخواست عضویت و پذیرش",
    email: "hello@tenxpros.ir",
    description:
      "برای پرسش درباره Apply، وضعیت درخواست، پذیرش و دستور پرداخت رسمی."
  },
  {
    icon: Mail,
    title: "ارتباط با مدیر برنامه",
    email: "mail@mehrdadnaderi.com",
    description:
      "برای موضوع مدیریتی یا موردی که از مسیر معمول پشتیبانی حل نشده است."
  }
];

export function SupportPage() {
  return (
    <MarketingShell>
      <PageHero
        eyebrow="SUPPORT & CONTACT"
        title="مسیر درست برای هر سؤال."
        description={
          <>
            برای مسئله فنی، درخواست عضویت، پرداخت،{" "}
            <TechnicalTerm>Office Hour</TechnicalTerm> یا{" "}
            <TechnicalTerm>Zoom</TechnicalTerm> از کانال رسمی مرتبط استفاده کنید.
            هرچه زمینه دقیق‌تر باشد، بررسی درخواست سریع‌تر و روشن‌تر خواهد بود.
          </>
        }
        primary={null}
        secondary={{ label: "پرسش‌های متداول", href: "/faq" }}
      />

      <Section tone="soft">
        <SectionHeader
          eyebrow="OFFICIAL CHANNELS"
          title="از کانال رسمی با ما در ارتباط باشید."
          description="برای امنیت حساب و پرداخت، فقط نشانی‌های زیر و پیام‌های داخل پنل را معتبر بدانید."
          align="center"
        />
        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {contacts.map((contact) => {
            const Icon = contact.icon;
            return (
              <article
                key={contact.email}
                className="flex flex-col rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
              >
                <span className="grid h-11 w-11 place-items-center rounded-lg bg-iris-50 text-iris-600">
                  <Icon aria-hidden="true" className="h-5 w-5" />
                </span>
                <h2 className="mt-6 font-semibold text-ink-950">
                  {contact.title}
                </h2>
                <p className="mt-3 flex-1 text-sm leading-7 text-slate-600">
                  {contact.description}
                </p>
                <a
                  href={`mailto:${contact.email}`}
                  dir="ltr"
                  lang="en"
                  className="focus-ring mt-6 rounded-lg font-latin text-sm font-semibold text-iris-700 transition hover:text-iris-500"
                >
                  {contact.email}
                </a>
              </article>
            );
          })}
        </div>
      </Section>

      <Section>
        <div className="grid items-start gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <SectionHeader
            eyebrow="WHAT TO INCLUDE"
            title="یک پیام خوب، مسیر حل را کوتاه می‌کند."
            description="لطفاً بدون ارسال اطلاعات حساس، زمینه کافی برای تشخیص مسئله در اختیار تیم قرار دهید."
          />
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              {
                icon: KeyRound,
                title: "حساب و ورود",
                text: "ایمیل حساب، صفحه‌ای که باز نمی‌شود و متن دقیق پیام خطا."
              },
              {
                icon: ReceiptText,
                title: "پرداخت",
                text: "تاریخ، مبلغ و شماره پیگیری. رمز، CVV2 یا تصویر کامل کارت نفرستید."
              },
              {
                icon: Video,
                title: "Office Hour و Zoom",
                text: "تاریخ و ساعت رزرو به وقت تهران و شرح مسئله دسترسی."
              },
              {
                icon: MessageSquareText,
                title: "درخواست عضویت",
                text: "ایمیل درخواست و کد پیگیری که پس از Apply دریافت کرده‌اید."
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

      <Section tone="dark">
        <div className="grid items-center gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
          <div className="rounded-lg border border-credential/20 bg-credential/[0.06] p-7 sm:p-9">
            <span className="grid h-12 w-12 place-items-center rounded-lg bg-credential/10 text-credential">
              <ShieldCheck aria-hidden="true" className="h-6 w-6" />
            </span>
            <p
              lang="en"
              className="mt-7 font-latin text-xs font-bold tracking-[0.14em] text-credential"
            >
              PAYMENT SAFETY
            </p>
            <h2 className="mt-4 text-3xl font-semibold leading-[1.4] text-white">
              پیش از پذیرش هیچ پرداختی انجام ندهید.
            </h2>
            <p className="mt-5 text-base leading-8 text-slate-300">
              اطلاعات حساب و مشخصات صاحب آن فقط پس از پذیرش در پنل امن شما نمایش
              داده می‌شود. اگر هر بخشی از درخواست پرداخت با اطلاعات پنل یکسان
              نیست، پیش از واریز با پشتیبانی تماس بگیرید.
            </p>
          </div>
          <div>
            <SectionHeader
              inverse
              eyebrow="VERIFY BEFORE YOU PAY"
              title="یک بررسی کوتاه از یک خطای مالی جلوگیری می‌کند."
              description="پیام رسمی پذیرش باید شما را به پنل خودتان هدایت کند. شماره کارت، شبا و حساب را فقط از همان صفحه کپی کنید."
            />
            <ul className="mt-8 space-y-3">
              {[
                "مبلغ Founding Charter برابر ۶۰ میلیون تومان است",
                "پرداخت فقط پس از ثبت پذیرش انجام می‌شود",
                "رسید فقط در پنل امن بارگذاری می‌شود",
                "تأیید پرداخت در پنل و ایمیل رسمی اعلام می‌شود"
              ].map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-4 text-sm leading-7 text-slate-300"
                >
                  <CircleDollarSign
                    aria-hidden="true"
                    className="mt-1 h-4 w-4 shrink-0 text-iris-300"
                  />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      <Section>
        <div className="mx-auto max-w-3xl text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-lg bg-iris-50 text-iris-600">
            <Mail aria-hidden="true" className="h-5 w-5" />
          </span>
          <h2 className="mt-6 text-3xl font-semibold text-ink-950">
            آماده‌ایم مسئله را بررسی کنیم.
          </h2>
          <p className="mt-4 text-base leading-8 text-slate-600">
            برای شروع، یک ایمیل کوتاه با عنوان روشن، ایمیل حساب و شرح دقیق موضوع
            بفرستید.
          </p>
          <a
            href="mailto:support@tenxpros.ir"
            className="focus-ring mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-iris-500 px-5 text-sm font-semibold text-white shadow-lg shadow-iris-600/20 transition hover:bg-iris-400"
          >
            <Mail aria-hidden="true" className="h-4 w-4" />
            ارسال ایمیل به پشتیبانی
          </a>
        </div>
      </Section>
    </MarketingShell>
  );
}
