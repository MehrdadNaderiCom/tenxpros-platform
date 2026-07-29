import { PolicyPage, type PolicySection } from "@/components/marketing/policy-page";
import { TechnicalTerm } from "@/components/shared/technical-term";
import {
  formatConfiguredOperator,
  getPublicLegalConfig,
} from "@/lib/public-legal-config";

const publicLegal = getPublicLegalConfig();
const configuredOperator = formatConfiguredOperator(publicLegal);

const privacySections: PolicySection[] = [
  {
    id: "scope",
    title: "دامنه، مسئول داده و ارائه‌دهنده",
    content: (
      <>
        <p>
          این سیاست توضیح می‌دهد TenXPros ایران چه داده‌ای از متقاضیان، اعضا و
          کاربران دریافت می‌کند و چگونه از آن استفاده و محافظت می‌کند.
        </p>
        {publicLegal.dataControllerName ? (
          <p>
            مسئول داده تنظیم‌شده برای این نسخه{" "}
            <strong className="font-semibold text-ink-950">
              {publicLegal.dataControllerName}
            </strong>{" "}
            است.
          </p>
        ) : (
          <p>
            هویت کامل مسئول داده در نامه پذیرش یا قرارداد، پیش از هر پرداخت،
            درج می‌شود. تا پیش از آن، نام تجاری TenXPros ایران را نباید نام یک
            شخصیت حقوقی مستقل تلقی کرد.
          </p>
        )}
        {configuredOperator ? (
          <p>
            ارائه‌دهنده و طرف قراردادی تنظیم‌شده{" "}
            <strong className="font-semibold text-ink-950">
              {configuredOperator}
            </strong>{" "}
            است.
          </p>
        ) : (
          <p>
            هویت کامل ارائه‌دهنده و طرف قرارداد نیز در مدارک پذیرش پیش از
            پرداخت اعلام می‌شود.
          </p>
        )}
        <p>
          درخواست مرتبط با داده را به{" "}
          <a
            dir="ltr"
            className="font-sans font-semibold text-iris-700 underline underline-offset-4"
            href={`mailto:${publicLegal.legalContactEmail}`}
          >
            {publicLegal.legalContactEmail}
          </a>{" "}
          ارسال کنید.
        </p>
      </>
    )
  },
  {
    id: "collection",
    title: "داده‌هایی که دریافت می‌کنیم",
    content: (
      <>
        <p>
          اطلاعات درخواست، حساب، Diagnostic، محتوای Dossier، Ticket پشتیبانی،
          وضعیت پرداخت، Metadata رسید، رزرو Office Hour و اطلاعات فنی لازم برای
          امنیت و عملکرد سایت ممکن است ثبت شوند.
        </p>
        <p>
          رمز کارت، CVV2، رمز پویا یا تصویر کامل کارت لازم نیست و نباید ارسال
          شود.
        </p>
      </>
    )
  },
  {
    id: "purposes",
    title: "هدف استفاده از داده",
    content: (
      <p>
        داده برای Review درخواست، ارائه برنامه، شخصی‌سازی مسیر، Feedback، پرداخت،
        رزرو، Zoom، پشتیبانی، Certification و حفاظت از امنیت سرویس استفاده
        می‌شود. اطلاعات شما برای تبلیغ نامرتبط فروخته نمی‌شود.
      </p>
    )
  },
  {
    id: "confidentiality",
    title: "محرمانگی و داده حساس",
    content: (
      <p>
        داده محرمانه مشتری، کارفرما، بیمار، پرونده حقوقی، داده تحت مقررات یا
        اطلاعات شخص ثالث را بدون اختیار و حفاظت لازم وارد درخواست یا Dossier
        نکنید. از مثال حذف مشخصات‌شده یا فرضی استفاده کنید.
      </p>
    )
  },
  {
    id: "payment",
    title: "پرداخت و رسید",
    content: (
      <p>
        برای تطبیق تراکنش، نام پرداخت‌کننده، تاریخ، مبلغ، شماره پیگیری، چهار رقم
        آخر مبدأ و فایل رسید دریافت می‌شود. این اطلاعات برای فعال‌سازی، حسابداری،
        رسیدگی به اختلاف و تعهد قانونی مرتبط استفاده می‌شود.
      </p>
    )
  },
  {
    id: "meetings",
    title: "Office Hour و Zoom",
    content: (
      <p>
        تاریخ، Slot، وضعیت جلسه و Meeting Link برای ارائه Office Hour ثبت
        می‌شوند. پس از رزرو، Zoom می‌تواند برای ساخت و ارسال لینک جلسه استفاده
        شود.
      </p>
    )
  },
  {
    id: "visibility",
    title: "نمایش عمومی و Verification",
    content: (
      <>
        <p>
          محتوای Dossier عمومی نیست. برای Credential صادرشده، Lookup با کد دقیق
          می‌تواند نام دارنده، عنوان Credential، وضعیت، تاریخ صدور و
          Verification Code را از Registry نمایش دهد.
        </p>
        <p>
          اگر Credential لغو شود، نتیجه عمومی وضعیت Revoked را بدون نام دارنده
          و بدون دلیل محرمانه لغو نشان می‌دهد.
        </p>
      </>
    )
  },
  {
    id: "retention",
    title: "امنیت، نگهداری و حقوق شما",
    content: (
      <>
        <p>
          داده تا زمانی نگهداری می‌شود که برای سرویس، Review، پرداخت، امنیت،
          پشتیبانی یا تعهد قانونی لازم باشد. پس از آن حذف یا بی‌نام می‌شود.
        </p>
        <p>
          می‌توانید درخواست دسترسی، اصلاح، دریافت نسخه یا حذف مطرح کنید. انجام
          درخواست به حقوق دیگران و الزام‌های نگهداری بستگی دارد.
        </p>
      </>
    )
  },
  {
    id: "changes",
    title: "تغییر سیاست و تماس",
    content: (
      <p>
        تغییر مهم و تاریخ اجرای نسخه تازه در همین صفحه اعلام می‌شود. برای پرسش
        حریم خصوصی با{" "}
        <a
          dir="ltr"
          className="font-sans font-semibold text-iris-700 underline underline-offset-4"
          href={`mailto:${publicLegal.legalContactEmail}`}
        >
          {publicLegal.legalContactEmail}
        </a>{" "}
        تماس بگیرید.
      </p>
    )
  }
];

const termsSections: PolicySection[] = [
  {
    id: "nature",
    title: "ماهیت برنامه",
    content: (
      <p>
        TenXPros یک برنامه گزینشی خصوصی برای آموزش حرفه‌ای و صدور{" "}
        <TechnicalTerm>Professional Credential</TechnicalTerm> است. مدرک
        دانشگاهی، Academic Accreditation یا مدرک دولتی نیست.
      </p>
    )
  },
  {
    id: "operator",
    title: "ارائه‌دهنده و طرف قرارداد",
    content: (
      <>
        {configuredOperator ? (
          <p>
            ارائه‌دهنده و طرف قراردادی تنظیم‌شده برای این نسخه{" "}
            <strong className="font-semibold text-ink-950">
              {configuredOperator}
            </strong>{" "}
            است
            {publicLegal.jurisdiction
              ? ` و حوزه حقوقی اعلام‌شده ${publicLegal.jurisdiction} است.`
              : "."}
          </p>
        ) : (
          <p>
            هویت کامل ارائه‌دهنده خدمت و طرف قرارداد، همراه با اطلاعات ثبتی و
            نشانی لازم، در نامه پذیرش یا قرارداد پیش از هر پرداخت درج می‌شود.
            تا پیش از دریافت آن سند، نام تجاری TenXPros ایران را نباید به‌عنوان
            نام یک شخصیت حقوقی مستقل تفسیر کرد.
          </p>
        )}
        <p>
          اطلاعات صاحب حساب بانکی فقط برای تطبیق پرداخت است و به‌تنهایی هویت
          ارائه‌دهنده، طرف قرارداد یا مسئول داده را تعیین نمی‌کند.
        </p>
      </>
    )
  },
  {
    id: "application",
    title: "درخواست و پذیرش",
    content: (
      <p>
        ارسال درخواست رایگان است و تعهد پرداخت ایجاد نمی‌کند. اطلاعات باید درست
        و متعلق به خود شما باشند. پذیرش بر اساس تناسب برنامه و ظرفیت Review انجام
        می‌شود.
      </p>
    )
  },
  {
    id: "payment",
    title: "شهریه و پرداخت",
    content: (
      <p>
        قیمت اصلی برنامه ۹۰ میلیون تومان و شهریه Founding Charter برابر ۶۰
        میلیون تومان است. پرداخت یک‌باره، فقط پس از پذیرش و از مسیر رسمی پنل
        انجام می‌شود.
      </p>
    )
  },
  {
    id: "access",
    title: "دسترسی و مسئولیت عضو",
    content: (
      <p>
        حساب شخصی است. عضو مسئول امنیت رمز، انجام کار اصیل، رعایت Deadlineها،
        حقوق اشخاص دیگر و استفاده مسئولانه از AI است.
      </p>
    )
  },
  {
    id: "timing",
    title: "Deadline، Extension و Resubmission",
    content: (
      <>
        <p>
          Calendar برنامه، Deadlineهای اصلی، تعداد Reviewهای مشمول شهریه و
          امکان Resubmission باید در Offer یا مدارک پذیرش پیش از پرداخت مشخص
          شوند.
        </p>
        <p>
          Extension یا Resubmission اضافه خودکار نیست. درخواست باید پیش از
          Deadline مطرح شود و فقط با تأیید مکتوب و با توجه به ظرفیت Review
          معتبر خواهد بود. هر هزینه اضافه باید پیش از ارائه خدمت اعلام و پذیرفته
          شود.
        </p>
      </>
    )
  },
  {
    id: "office-hour",
    title: "Office Hour هفتگی",
    content: (
      <>
        <p>
          هر عضو فعال نسخه فارسی از شنبه ساعت ۰۰:۰۰ تا جمعه ساعت ۲۳:۵۹ به وقت
          تهران فقط یک Office Hour اختصاصی ۳۰ دقیقه‌ای می‌تواند رزرو کند.
        </p>
        <p>
          سهمیه استفاده‌نشده در پایان جمعه منقضی می‌شود و قابل انتقال، انباشت یا
          تبدیل به اعتبار مالی نیست. لینک Zoom پس از رزرو در پنل و ایمیل قرار
          می‌گیرد.
        </p>
      </>
    )
  },
  {
    id: "services",
    title: "Coaching و نشست DBC",
    content: (
      <>
        <p>
          1:1 Coaching خدمت اختیاری و جداگانه با هزینه ۵ میلیون تومان برای هر
          ۶۰ دقیقه است.
        </p>
        <p>
          DBC Weekly AI Roundtable نشست گروهی ۹۰ دقیقه‌ای برای همه اعضا و
          فارغ‌التحصیلان DBC است، در عضویت آن‌ها قرار دارد و هزینه جداگانه
          ندارد. Coaching و Roundtable هر دو از سهمیه Office Hour مستقل هستند.
        </p>
      </>
    )
  },
  {
    id: "review",
    title: "Review و Certification",
    content: (
      <>
        <p>
          پایان برنامه Credential را تضمین نمی‌کند. Dossier باید هشت معیار
          Review را برآورده کند. نتیجه می‌تواند Certified، Strong Draft یا
          Completed باشد.
        </p>
        <p>
          پس از صدور Credential، Metadata محدود آن با کد دقیق در Registry عمومی
          قابل بررسی است. محتوای Dossier و دلیل لغو عمومی نمی‌شوند.
        </p>
      </>
    )
  },
  {
    id: "data-ip",
    title: "داده و مالکیت فکری",
    content: (
      <p>
        داده محرمانه را بدون اختیار ارسال نکنید. شما مالک محتوای اصیل خود
        می‌مانید. Brand، Method، Rubric، Template و Lessonهای TenXPros متعلق به
        صاحب آن‌ها هستند و مجوز بازنشر تجاری ایجاد نمی‌شود.
      </p>
    )
  },
  {
    id: "conduct",
    title: "رفتار قابل قبول",
    content: (
      <p>
        اشتراک حساب، جعل پرداخت، آزار، نقض حقوق دیگران، دورزدن امنیت یا استفاده
        زیان‌بار ممنوع است و می‌تواند به محدودشدن دسترسی منجر شود.
      </p>
    )
  },
  {
    id: "guarantees",
    title: "نبود تضمین نتیجه",
    content: (
      <p>
        Certification، استخدام، ارتقا، درآمد، مهاجرت، جذب مشتری یا نتیجه تجاری
        تضمین نمی‌شود. مسئولیت تصمیم حرفه‌ای و نتیجه استفاده از AI با فرد و
        سازمان مربوط باقی می‌ماند.
      </p>
    )
  },
  {
    id: "continuity",
    title: "مدت خدمت و Continuity",
    content: (
      <>
        <p>
          مدت برنامه، دوره دسترسی، خدمات مشمول شهریه و دسترسی‌های صریح Alumni
          باید در Offer یا مدارک پذیرش ثبت شوند. این شرایط به‌تنهایی میزبانی
          دائمی محتوا، Office Hour نامحدود، Review نامحدود یا ادامه همیشگی همه
          سرویس‌ها را تضمین نمی‌کند.
        </p>
        <p>
          تغییر یا پایان یک سرویس، حقوق قطعی‌شده در سند معتبر و حقوق الزامی
          قانونی را از بین نمی‌برد. شیوه ادامه، جایگزینی یا پایان خدمت باید مطابق
          همان سند و اطلاع‌رسانی مربوط تعیین شود.
        </p>
      </>
    )
  },
  {
    id: "changes",
    title: "نسخه شرایط و ارتباط",
    content: (
      <p>
        نسخه‌ای که هنگام پذیرش قبول می‌کنید بر عضویت حاکم است. تغییر مهم از طریق
        سایت یا پنل اعلام می‌شود. پرسش‌ها را به{" "}
        <a
          dir="ltr"
          className="font-sans font-semibold text-iris-700 underline underline-offset-4"
          href={`mailto:${publicLegal.legalContactEmail}`}
        >
          {publicLegal.legalContactEmail}
        </a>{" "}
        بفرستید.
      </p>
    )
  }
];

const refundSections: PolicySection[] = [
  {
    id: "before-acceptance",
    title: "پیش از پذیرش",
    content: (
      <p>
        درخواست رایگان است و تعهد پرداخت ایجاد نمی‌کند. اگر پذیرش در پنل ثبت نشده
        است، هیچ وجهی واریز نکنید.
      </p>
    )
  },
  {
    id: "payment",
    title: "پرداخت پس از پذیرش",
    content: (
      <p>
        فرد پذیرفته‌شده مبلغ ۶۰ میلیون تومان را به اطلاعات رسمی پنل واریز و رسید
        را بارگذاری می‌کند. ثبت رسید به‌تنهایی تأیید پرداخت نیست.
      </p>
    )
  },
  {
    id: "before-activation",
    title: "پیش از فعال‌شدن عضویت",
    content: (
      <p>
        اگر پرداخت انجام شده اما دسترسی هنوز فعال نشده است، درخواست بازپرداخت
        دستی بررسی می‌شود. واریز تکراری یا مبلغ اشتباه را با شماره پیگیری به
        پشتیبانی اعلام کنید.
      </p>
    )
  },
  {
    id: "after-access",
    title: "پس از آغاز خدمات",
    content: (
      <p>
        پس از فعال‌سازی، ظرفیت Review و دسترسی Diagnostic، Lesson، Feedback و
        خدمات برای شما کنار گذاشته می‌شود. امکان بازپرداخت می‌تواند متناسب با
        خدمات آغازشده و ظرفیت مصرف‌شده محدود شود.
      </p>
    )
  },
  {
    id: "certification",
    title: "نتیجه Certification",
    content: (
      <p>
        نرسیدن به Certified به‌تنهایی مبنای بازپرداخت نیست. وضعیت بازپرداخت بر
        اساس مرحله ارائه سرویس بررسی می‌شود، نه فقط نتیجه Review.
      </p>
    )
  },
  {
    id: "reserved-services",
    title: "Coaching و Office Hour",
    content: (
      <p>
        شرایط لغو Coaching پیش از پرداخت همان جلسه اعلام می‌شود. سهمیه Office
        Hour ارزش نقدی ندارد و سهمیه استفاده‌نشده قابل انتقال یا بازپرداخت نیست.
      </p>
    )
  },
  {
    id: "rights",
    title: "حقوق الزامی",
    content: (
      <p>
        این سیاست حقوقی را که طبق قانون قابل اسقاط نیست محدود نمی‌کند. ممکن است
        برای بررسی، احراز هویت و مدرک پرداخت لازم باشد.
      </p>
    )
  },
  {
    id: "request",
    title: "ارسال درخواست",
    content: (
      <p>
        از ایمیل حساب به support@tenxpros.ir پیام بدهید و نام، ایمیل، تاریخ،
        مبلغ، شماره پیگیری و دلیل درخواست را بنویسید. رمز کارت، CVV2 یا رمز پویا
        ارسال نکنید.
      </p>
    )
  }
];

export function PrivacyPageContent() {
  return (
    <PolicyPage
      eyebrow="PRIVACY POLICY"
      title="حریم خصوصی"
      description="چگونه داده متقاضی، عضو و فعالیت‌های عملیاتی را دریافت، استفاده و محافظت می‌کنیم."
      sections={privacySections}
      notice="اطلاعاتی را که برای ارائه برنامه لازم نیست دریافت نمی‌کنیم. داده محرمانه یا تحت مقررات را بدون اختیار و حفاظت لازم ارسال نکنید."
      contactEmail={publicLegal.legalContactEmail}
    />
  );
}

export function TermsPageContent() {
  return (
    <PolicyPage
      eyebrow="TERMS OF SERVICE"
      title="شرایط استفاده"
      description="قواعد درخواست، عضویت، پرداخت، استفاده از برنامه و فرایند Certification."
      sections={termsSections}
      notice="ارسال درخواست به معنی پذیرش در برنامه یا ایجاد تعهد پرداخت نیست."
      contactEmail={publicLegal.legalContactEmail}
    />
  );
}

export function RefundPageContent() {
  return (
    <PolicyPage
      eyebrow="REFUND POLICY"
      title="سیاست بازپرداخت"
      description="چارچوب بررسی بازپرداخت برای Founding Charter و خدماتی که ظرفیت حرفه‌ای مشخصی رزرو می‌کنند."
      sections={refundSections}
      notice="پیش از پذیرش هیچ پرداختی انجام نمی‌شود. فقط اطلاعات رسمی داخل پنل را مبنای واریز قرار دهید."
    />
  );
}
