import { PolicyPage, type PolicySection } from "@/components/marketing/policy-page";
import {
  formatConfiguredOperator,
  getPublicLegalConfig,
} from "@/lib/public-legal-config";

export function PartnerTermsPageContent() {
  const legal = getPublicLegalConfig();
  const configuredOperator = formatConfiguredOperator(legal);

  const sections: PolicySection[] = [
    {
      id: "status",
      title: "دامنه و وضعیت این شرایط",
      content: (
        <>
          <p>
            این صفحه چارچوب عمومی TenXPros Partner Program نسخه ایران را توضیح
            می‌دهد. ارسال Application یا گفت‌وگوی اولیه به‌تنهایی رابطه Partner،
            نمایندگی، استخدام، انحصار، مجوز Brand یا حق Commission ایجاد نمی‌کند.
          </p>
          <p>
            رابطه فقط پس از صدور و پذیرش سند مکتوب مربوط شکل می‌گیرد. جزئیات
            تجاری هر Pilot، Partner یا Opportunity در همان سند تعیین می‌شوند و
            در موضوع اختصاصی خود بر این خلاصه عمومی مقدم‌اند، مگر جایی که قانون
            الزامی ترتیب دیگری مقرر کند.
          </p>
        </>
      ),
    },
    {
      id: "operator",
      title: "طرف قرارداد و راه ارتباط حقوقی",
      content: (
        <>
          {configuredOperator ? (
            <p>
              ارائه‌دهنده و طرف قراردادی تنظیم‌شده برای این نسخه{" "}
              <strong className="font-semibold text-ink-950">
                {configuredOperator}
              </strong>{" "}
              است
              {legal.jurisdiction
                ? ` و حوزه حقوقی اعلام‌شده ${legal.jurisdiction} است.`
                : "."}
            </p>
          ) : (
            <p>
              هویت کامل ارائه‌دهنده خدمت و طرف قرارداد، همراه با اطلاعات ثبتی و
              نشانی لازم، در دعوت‌نامه یا قرارداد پیش از هر پرداخت یا شروع
              فعالیت درج می‌شود. تا پیش از دریافت آن سند، نام تجاری TenXPros
              ایران را نباید به‌عنوان نام یک شخصیت حقوقی مستقل تفسیر کرد.
            </p>
          )}
          <p>
            پرسش حقوقی را به{" "}
            <a
              dir="ltr"
              className="font-sans font-semibold text-iris-700 underline underline-offset-4"
              href={`mailto:${legal.legalContactEmail}`}
            >
              {legal.legalContactEmail}
            </a>{" "}
            ارسال کنید.
          </p>
        </>
      ),
    },
    {
      id: "pilot",
      title: "90-Day Partner Pilot",
      content: (
        <p>
          Partner پذیرفته‌شده معمولاً با یک Pilot نود روزه آغاز می‌کند. تاریخ
          شروع و پایان، دامنه بازار، نقش‌های مجاز، هدف‌های Pilot، روش ارزیابی و
          شرایط پایان یا ادامه باید در Pilot Letter مشخص شوند. پایان موفق Pilot
          به‌صورت خودکار Tier بالاتر یا تمدید همکاری ایجاد نمی‌کند.
        </p>
      ),
    },
    {
      id: "activation",
      title: "Activation Gate",
      content: (
        <p>
          پیش از فعالیت رسمی، Partner باید درک درست Offer، مخاطب مناسب، قواعد
          Brand، محرمانگی، تعارض منافع و Opportunity Registration را نشان دهد.
          فقط تأیید مکتوب TenXPros عبور از Activation Gate را ثابت می‌کند. پیش از
          آن، معرفی خود به‌عنوان Partner فعال یا استفاده از عنوان و نشان برنامه
          مجاز نیست.
        </p>
      ),
    },
    {
      id: "registration",
      title: "Opportunity Registration و Protection",
      content: (
        <>
          <p>
            هر Opportunity باید پیش از پیگیری، با اطلاعات کافی و بدون نقض
            محرمانگی ثبت شود. در نسخه فعلی ایران، ثبت می‌تواند از طریق ایمیل و
            سند مشترک انجام شود و وجود Partner Panel آنلاین فرض نمی‌شود.
          </p>
          <p>
            Protection فقط پس از تأیید مکتوب TenXPros ایجاد می‌شود. تأیید باید
            Account یا مخاطب، نقش Partner، تاریخ شروع، مدت Protection و هر محدودیت
            لازم را روشن کند. ارسال Lead، پیام شفاهی یا آشنایی قبلی بدون این
            تأیید، انحصار یا حق مالی ایجاد نمی‌کند.
          </p>
        </>
      ),
    },
    {
      id: "tiers",
      title: "Tierها و ارتقا",
      content: (
        <p>
          مسیر برنامه شامل Referral Partner در Tier 1، Certified Partner در Tier
          2 و Territory Builder در Tier 3 است. همه Partnerها از Tier 1 شروع
          می‌کنند. ارتقا دعوتی است و می‌تواند بر اساس نتیجه دریافت‌شده، کیفیت
          Follow-up، رعایت شرایط، رضایت مشتری و ظرفیت برنامه انجام شود. معیارهای
          عددی، ظرفیت Account و اولویت Lead فقط در سند مکتوب معتبر هستند.
        </p>
      ),
    },
    {
      id: "functions",
      title: "Functionهای قابل شناسایی",
      content: (
        <p>
          نقش ممکن است Basic Introduction، Origination، Closing، Delivery،
          Coaching یا Renewal Support باشد. تنها Functionی قابل محاسبه است که
          برای Opportunity مربوط ثبت شده، واقعاً انجام شده و مطابق توافق تأیید
          شود. عنوان Partner یا حضور در یک جلسه به‌تنهایی انجام Function را ثابت
          نمی‌کند.
        </p>
      ),
    },
    {
      id: "commission",
      title: "Commission و مبنای تسویه",
      content: (
        <>
          <p>
            این صفحه هیچ نرخ، ارز، سقف یا Bonus ثابت برای نسخه ایران تعیین
            نمی‌کند. Commercial Schedule باید مبنای محاسبه، درصد یا مبلغ، ارز،
            مالیات، سقف Deal، زمان تسویه و شرایط Renewal را پیش از ایجاد حق مالی
            مشخص کند.
          </p>
          <p>
            مگر اینکه سند مکتوب صریحاً ترتیب دیگری مقرر کند، Commission فقط پس
            از دریافت قطعی وجه خالص مشتری و برای Function تأییدشده قابل محاسبه
            است. Refund، Chargeback، مالیات، تخفیف، کارمزد انتقال و پرداخت ناقص
            می‌توانند بر Net Receipts اثر بگذارند. تخصیص میان چند Partner یا چند
            Function نیز باید مکتوب باشد.
          </p>
        </>
      ),
    },
    {
      id: "conduct",
      title: "Brand، رفتار و ادعاهای مجاز",
      content: (
        <p>
          Partner باید Offer، قیمت، نتیجه آموزشی و Certification را دقیق و بدون
          تضمین استخدام، درآمد، مهاجرت یا نتیجه تجاری توضیح دهد. جعل رابطه، Spam،
          پرداخت برای معرفی بدون افشا، تبعیض، آزار، وعده خارج از اختیار، تغییر
          Asset رسمی یا استفاده گمراه‌کننده از Brand ممنوع است.
        </p>
      ),
    },
    {
      id: "confidentiality",
      title: "محرمانگی، Consent و داده",
      content: (
        <p>
          Partner فقط اطلاعاتی را ثبت می‌کند که حق و ضرورت انتقال آن را دارد.
          فهرست Contact، داده شخصی، قیمت محرمانه، قرارداد، اطلاعات مشتری یا
          Secret تجاری نباید بدون Consent و حفاظت لازم ارسال شوند. اطلاعات
          دریافت‌شده فقط برای هدف همکاری و مطابق Privacy Policy استفاده می‌شوند.
        </p>
      ),
    },
    {
      id: "independence",
      title: "استقلال طرفین و هزینه‌ها",
      content: (
        <p>
          Partner پیمانکار یا همکار مستقل است، مگر اینکه قرارداد جداگانه صریحاً
          وضعیت دیگری تعیین کند. Partner اختیار ایجاد تعهد، امضای قرارداد، دریافت
          وجه یا ارائه تضمین به نام TenXPros را ندارد. هزینه شخصی، مالیات،
          بیمه، مجوز حرفه‌ای و ابزار کار بر عهده Partner است مگر آنچه پیشاپیش
          مکتوب و تأیید شده باشد.
        </p>
      ),
    },
    {
      id: "recognition",
      title: "Credential و Recognition",
      content: (
        <p>
          عنوان Tier، Badge، Listing عمومی یا Letter of Recognition فقط پس از
          تأیید و مطابق سند مربوط قابل استفاده است. Recognition باید نقش و نتیجه
          واقعی را بازتاب دهد و مجوز استفاده از Brand می‌تواند محدود، قابل لغو
          و غیرقابل انتقال باشد. معرفی عمومی به رضایت آگاهانه طرفین نیاز دارد.
        </p>
      ),
    },
    {
      id: "ending",
      title: "پایان Pilot و Continuity",
      content: (
        <>
          <p>
            هر طرف می‌تواند مطابق مهلت و شرایط سند مکتوب به Pilot یا همکاری پایان
            دهد. پایان همکاری، مجوز معرفی خود به‌عنوان Partner فعال و استفاده
            تازه از Brand را متوقف می‌کند.
          </p>
          <p>
            وضعیت Opportunityهای پیش‌تر تأییدشده، Protection باقی‌مانده،
            Commission ایجادشده، محرمانگی و Recognition فقط مطابق سند حاکم و
            قانون الزامی تعیین می‌شود. این شرایط عمومی، میزبانی دائمی، تمدید
            خودکار یا ادامه همیشگی Partner Program را تضمین نمی‌کند.
          </p>
        </>
      ),
    },
    {
      id: "changes",
      title: "تغییر شرایط و حل اختلاف",
      content: (
        <p>
          نسخه تازه این شرایط با تاریخ به‌روزرسانی در همین صفحه منتشر می‌شود.
          تغییر عمومی به‌تنهایی حقوق مالی قطعی‌شده در یک سند معتبر را بازنویسی
          نمی‌کند. قانون حاکم، مرجع رسیدگی و شیوه حل اختلاف باید در Partner
          Agreement یا Pilot Letter مشخص شوند.
        </p>
      ),
    },
  ];

  return (
    <PolicyPage
      eyebrow="PARTNER PROGRAM TERMS"
      title="شرایط Partner Program"
      description="چارچوب Pilot نود روزه، Activation، ثبت و حفاظت Opportunity، Tierها، Functionها و اصول تسویه در نسخه ایران."
      sections={sections}
      notice="این صفحه نرخ Commission یا رابطه Partner ایجاد نمی‌کند. جزئیات تجاری و هویت طرف قرارداد باید پیش از شروع فعالیت در سند مکتوب مربوط درج شوند."
      contactEmail={legal.legalContactEmail}
    />
  );
}
