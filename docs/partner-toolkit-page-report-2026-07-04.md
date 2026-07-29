# گزارش کامل صفحه‌ی «Partner Toolkit» (پنل ادمین)

**آدرس:** `https://tenxpros.com/admin/partners/toolkit`
**تاریخ گزارش:** ۲۰۲۶-۰۷-۰۴
**هدف این سند:** ارائه‌ی تصویری کامل از این صفحه — چه‌کاری می‌کند، چطور کار می‌کند، و دقیقاً چه محتوایی داخلش هست — تا بتوان نظر متخصص‌های محتوا، حقوقی/انطباق، فروش B2B/B2C و امنیت را درباره‌اش گرفت.

> این سند از روی سورس‌کد و فایل seed تولید شده است، نه از روی رندر زنده‌ی صفحه. محتوای «کاشته‌شده» (seed) همان محتوای اولیه و مرجع است؛ چون ادمین اصلی می‌تواند بعداً هر پست را در همین صفحه ویرایش کند، ممکن است متن زنده‌ی امروز جزئی تفاوت داشته باشد. ساختار، قواعد و مکانیزم اما دقیقاً همین است.

---

## خلاصه‌ی اجرایی

- صفحه‌ی `/admin/partners/toolkit` یک **CMS سبک وبلاگی** است که فقط **ادمین اصلی (superadmin)** به آن دسترسی دارد. با آن، منابع «Partner Toolkit» (قالب‌های ارتباط‌گیری/آوتریچ، پاسخ به اعتراض‌ها و قالب‌های صنعت‌محور و نقش‌محور) ساخته، ویرایش، منتشر و حذف می‌شوند.
- هر منبع یک «پست» است: عنوان، دسته‌بندی، اسلاگ، ترتیب، وضعیت انتشار، بدنه‌ی HTML، و فایل‌های پیوست اختیاری.
- پارتنرهای **فعال** همین پست‌های منتشرشده را در `/partner/toolkit` می‌خوانند و فایل‌ها را دانلود می‌کنند (بدون امکان ویرایش).
- محتوای اولیه شامل **۵ پست** است: یک پست «دارایی‌های عمومی» (قالب‌های آوتریچ و اعتراض که عیناً از ماژول ۱۴ آکادمی استخراج شده) و ۴ پست «قالب‌های صنعت و نقش» (دانشگاه‌ها، بیمارستان‌ها، متخصص مستقل، مالک/مدیرعامل).
- کل فلسفه‌ی محتوا روی یک اصل بنا شده: **هیچ قیمتی و هیچ وعده‌ی نتیجه‌ای در قالب‌ها نیست** — جای متغیرها با براکت `[ ]` خالی گذاشته شده تا پارتنر شخصی‌سازی کند، اما «حقیقت» ثابت می‌ماند.

---

## ۱) این صفحه چیست و کجا قرار دارد

این صفحه بخشی از ناحیه‌ی ادمین (`(admin)` route group) و زیرشاخه‌ی «partners» است. کارکردش، مدیریت مخزن منابعی است که به آن **Partner Toolkit** می‌گویند.

توضیح رسمی خودِ صفحه (متنی که در بالای صفحه نمایش داده می‌شود):

> **Partner Toolkit**
> Blog-style resources for partners: generic assets like outreach and objection templates, plus industry and role-specific templates. Partners read and download these.

نمای اصلی صفحه:
- یک دکمه‌ی **«New post»** برای ساخت منبع جدید.
- یک فهرست از تمام پست‌ها که به ترتیب `order` سپس تاریخ ساخت نمایش داده می‌شوند. هر ردیف نشان می‌دهد: عنوان (لینک به ویرایش)، دسته‌بندی، تعداد فایل‌های پیوست، اسلاگ، و یک نشان (Badge) «Published/Draft».
- اگر هیچ پستی نباشد: «No posts yet. Create the first resource with New post.»

---

## ۲) کنترل دسترسی و امنیت

| لایه | قاعده |
|---|---|
| ورود به صفحه | `requireAdminUser()` — کاربر باید ادمین باشد. |
| اجازه‌ی نویسندگی | فقط `isSuperAdmin(admin.email)` — یعنی **فقط ادمین اصلی**. یک ادمین معمولی این پیام را می‌بیند: «Authoring the Partner Toolkit is restricted to the primary admin.» |
| اکشن‌های ذخیره/حذف | همگی با `requireSuperAdmin()` در سمت سرور دوباره بررسی می‌شوند (نه فقط UI). |
| رندر پویا | صفحه `force-dynamic` است؛ همیشه تازه از دیتابیس خوانده می‌شود. |
| ثبت رویداد (Audit) | هر ساخت/ویرایش/حذف پست و حذف فایل با `recordAudit(...)` ثبت می‌شود (actor، نقش، اکشن، موجودیت). |
| دانلود فایل‌ها | مسیر `/api/toolkit/files/[id]`: ادمین هر فایلی (حتی پیش‌نویس/یتیم) را می‌گیرد؛ غیرادمین باید **پارتنر فعال** باشد **و** پست والد **منتشر** باشد، وگرنه ۴۰۳/۴۰۴. |

نکته‌ی امنیتی محتوا: بدنه‌ی HTML هر پست هنگام ذخیره با **همان allowlist درس‌های آکادمی** پاک‌سازی (`sanitizeLessonHtml`) می‌شود. برخلاف درس‌ها که «copy guard» دارند، در Toolkit **محافظ کپی وجود ندارد** — چون کل هدف این است که پارتنر بتواند متن را بخواند **و کپی کند**.

---

## ۳) معماری و نحوه‌ی کارکرد (CMS)

این یک CMS دیتابیس‌محور است، نه فایل استاتیک.

**مدل داده (بازسازی‌شده از کد):**

- `ToolkitPost`: `id`, `title`, `slug` (یکتا)، `category`, `bodyHtml`, `order`, `isPublished`, `authorEmail`, `createdAt`، و رابطه‌ی یک‌به‌چند با `files`.
- `ToolkitFile`: `id`, `filename`, `mimeType`, `size`, `data` (خودِ بایت‌ها در دیتابیس ذخیره می‌شود)، و `postId`.

**فرم ویرایش/ساخت پست شامل:**
- **Title** (اجباری) — مثال راهنما: «Outreach and objection templates».
- **Category** (اجباری) — با پیشنهادهای آماده: `Generic assets` و `Industry and role templates` (ولی متن آزاد هم می‌پذیرد).
- **Slug** (اختیاری) — اگر خالی بماند از عنوان ساخته می‌شود؛ یکتا بودنش تضمین می‌شود (در تصادم، `-2`, `-3` … اضافه می‌شود).
- **Order** (عدد) — ترتیب نمایش.
- **Published** (چک‌باکس) — پیش‌فرض روشن؛ فقط پست‌های منتشرشده به پارتنر نمایش داده می‌شوند.
- **Body** — ویرایشگر غنی (همان `LessonEditor` آکادمی).
- **Attach files** — تا **۱۰ فایل در هر ذخیره**، هرکدام حداکثر **۱۵ مگابایت**.

**رفتار ذخیره:** پس از ذخیره، مسیرهای `/admin/partners/toolkit` و `/partner/toolkit` باطل‌سازی کش (revalidate) می‌شوند تا هر دو طرف به‌روز شوند.

**حذف:** حذف پست، خود پست و همه‌ی پیوست‌هایش را برای همیشه پاک می‌کند (با دیالوگ تأیید). حذف تک‌فایل هم جداگانه ممکن است.

---

## ۴) تجربه‌ی سمت پارتنر (چیزی که مخاطب نهایی می‌بیند)

پارتنرها همین محتوا را در `/partner/toolkit` می‌بینند اما فقط‌خواندنی:

توضیح صفحه‌ی پارتنر:
> **Partner Toolkit**
> Resources you can read and use: outreach and objection templates, and industry and role-specific templates. We add to it regularly, so it is worth a look at least once a month.

- پست‌ها **بر اساس دسته‌بندی گروه‌بندی** می‌شوند و در کارت‌ها نمایش داده می‌شوند.
- هر کارت: عنوان + یا «N file(s) attached» یا برچسب «Reference» + لینک «Open».
- در صفحه‌ی هر پست، بدنه رندر می‌شود و اگر فایلی باشد بخش «Downloads» ظاهر می‌شود.
- یک «Tip»: «New resources are added over time. Revisit monthly.»

---

## ۵) محتوای کامل فعلی (۵ پست، عیناً)

> متن‌ها دقیقاً همان چیزی است که در محصول رندر می‌شود. جای‌گاه متغیرها داخل `[ ]` عمداً خالی مانده تا پارتنر شخصی‌سازی کند.

### دسته‌بندی A — «Generic assets»

#### پست ۱ — «Outreach and objection templates»
*(اسلاگ: `outreach-and-objection-templates` — این پست عیناً از بلوکِ «ready to use templates» ماژول ۱۴ آکادمی استخراج شده تا واژگان یکسان بماند.)*

> 📘 **Make this a habit.** The Partner Toolkit in your Panel is kept current with approved messaging and new industry and role specific templates as they are added. Get into the habit of checking it regularly, about once a month, so you are always working from the latest approved materials rather than an old copy. The templates below are a starting subset to get you moving.

> 📘 These are starting points, not scripts to send blindly. Every message you send must still use approved messaging and pass the truth test. Keep the placeholders in square brackets so you personalize each one. None of these contain a price or a promise of results, by design.

**Warm reconnect: a former colleague or past client**
> **Subject:** A quick thought for you, [first name]
> Hi [first name], it has been a while since [shared context, for example our time at [company] or the [project] work]. I have been close to how experienced professionals in [their field] are moving from just using AI to actually leading its adoption, and you came to mind. If it is useful, I would value a short conversation to share what I am seeing. No pressure either way. How is the next couple of weeks looking for you?

**Introduction through a mutual contact**
> **Subject:** [mutual contact] suggested we connect
> Hi [first name], [mutual contact] thought it would be worth us talking. I work with experienced professionals in [their field] who want to lead AI adoption in their work, not just use the tools, and [mutual contact] felt that might be relevant to what you are focused on right now. Would a short call in the next week or two be welcome? Happy to work around your schedule.

**Reaching someone in a shared professional circle**
> Hi [first name], we are both part of [shared group or community], and I noticed your work on [specific, real detail]. I spend a lot of time on how professionals in [field] build defensible, reviewed AI work in their own domain. If that is something you are thinking about, I would be glad to compare notes over a short call. If not, no problem at all.

**Follow up one, adds value**
> Hi [first name], following up on my note. I mentioned I would share an example of how someone in [their field] works through this, so here it is in brief: [one or two sentences from the matching field story, framed as an example, not a promise]. If it is worth a short conversation, I am happy to set one up. If the timing is not right, just let me know and I will leave it there.

**Follow up two, gracious close**
> Hi [first name], I do not want to crowd your inbox, so this is my last note for now. If leading AI adoption in [their field] becomes a priority, I am easy to reach and glad to help. Wishing you well either way.

**Guiding a qualified prospect to apply**
> It sounds like this could genuinely fit what you are working on. The next step is simple and there is no payment involved yet: you apply and describe your expertise and the real problem you want to work on, and the team reviews it. Acceptance comes first, and only then is there any payment decision. I can point you to the current details and the application whenever you are ready. Would you like me to do that now?

**Objection one liners, honest and short**
> Is this just another AI course? No. Most courses teach tools and prompts. This is built around one real problem and a reviewed dossier, so you leave with evidence you can defend, not a completion certificate.

> Is it accredited? No. It is a private professional certification. Its credibility comes from the reviewed dossier, the public criteria, and the verifiable credential, not from a university stamp.

> Do I need to code? No. The core requirement is professional judgment in your field, not coding.

> Will I definitely get certified? No. Certification depends on whether your dossier meets the review standard. The three outcomes are Certified, Strong Draft, and Completed.

> Can I join as a regulated professional? Yes, as long as you protect confidential and regulated data and use redacted or fictionalized examples unless you have the rights and safeguards to use real data.

**Prospect qualification checklist, run it in your head before you register**
- Does this person have real depth in their field?
- Do they already use AI and feel the gap between using and leading it?
- Do they have one real problem worth solving?
- Can they commit focused hours over twelve weeks?
- Do they want reviewed, defensible work rather than a quick certificate?
- Do they accept that outcomes are earned, not guaranteed?

> If the answer to most of these is yes, they are worth registering. If they are an absolute beginner with no domain, or they want a guarantee, they are not a fit, and the honest move is to say so.

**Deal registration field checklist, before you submit on the Panel**
- The legal entity or individual
- The country
- The business unit
- The contact
- The offering
- The estimated seats and value
- Your role on this opportunity
- Your concrete route in: a warm contact, a shared circle, or a real reason you can reach them

> Submit only when you can fill each field honestly, and remember it is protected only once the company confirms it.

---

### دسته‌بندی B — «Industry and role templates»

#### پست ۲ — «Templates for universities and schools»
*(اسلاگ: `templates-universities-and-schools`)*

> 📘 Use these with universities, schools, and other education bodies. Keep the placeholders in square brackets and personalize each one. Nothing here contains a price or a promise of results, by design.

**Reaching a department head or dean**
> Hi [first name], I work with experienced educators and academic leaders who want to lead AI adoption in teaching and administration, not just react to it. Given your work on [specific programme or initiative], I thought a short conversation might be worth your time. The approach is built around one real problem in your own context and a reviewed piece of work, so people leave with something defensible. Would a brief call in the next couple of weeks be welcome?

**Reaching a program director about staff development**
> Hi [first name], many faculties are being asked to show credible, responsible use of AI. I help professionals build reviewed, verifiable work in their own field rather than sit through generic tool training. If developing that capability across [department] is on your list, I would be glad to share how it works. No obligation either way.

---

#### پست ۳ — «Templates for hospitals and clinics»
*(اسلاگ: `templates-hospitals-and-clinics`)*

> 📘 Use these with hospitals, clinics, and health bodies. Always respect confidential and regulated data: ask people to use redacted or fictionalized examples unless they have the rights and safeguards for real data.

**Reaching a clinical or operations lead**
> Hi [first name], clinical and operational teams are under real pressure to use AI safely and to show that they are doing it well. I work with experienced professionals to build reviewed, defensible work on one real problem in their own setting, with data handled responsibly. If that is relevant to [department or unit], I would value a short conversation.

**Reaching a medical education or nursing lead**
> Hi [first name], I help experienced clinicians and educators move from using AI tools to leading their adoption in a way that stands up to scrutiny. The work centers on one real, appropriately redacted problem and is independently reviewed. If building that capability with your team is worth exploring, I am happy to explain the details.

---

#### پست ۴ — «Templates for an individual expert (doctor, lawyer, consultant)»
*(اسلاگ: `templates-individual-expert`)*

> 📘 Use these with an individual senior professional, for example a doctor, lawyer, architect, or independent consultant. The tone is peer to peer, focused on their own practice.

**Warm approach to an individual expert**
> Hi [first name], I have been close to how experienced professionals in [their field] are moving from using AI to actually leading it in their own practice. Given your depth in [specialty], you came to mind. The work is built around one real problem you choose, and the result is a reviewed piece you can defend, not a completion certificate. If a short conversation is useful, I am glad to set one up.

**Follow up that adds value**
> Hi [first name], following up briefly. As an example of how someone in [their field] approaches this: [one or two sentences framed as an example, not a promise]. If it is worth a short call, I am happy to arrange it. If the timing is not right, just let me know and I will leave it there.

---

#### پست ۵ — «Templates for an owner or CEO»
*(اسلاگ: `templates-owner-or-ceo`)*

> 📘 Use these with an owner, founder, or CEO, for example the head of a restaurant group or a growing business. The focus is the outcome for their organization, still without promising results.

**Reaching an owner or CEO**
> Hi [first name], leaders of businesses like [company] are being told to adopt AI, but most training stops at tools. I work with senior people to build reviewed, defensible work on one real problem in their own operation, so the capability is genuine and verifiable. If leading that in [company] is on your mind, a short conversation might be worth it.

**Reaching a CEO through a mutual contact**
> Hi [first name], [mutual contact] suggested we connect. I help experienced leaders move from using AI to leading its adoption in their organization, with independently reviewed work rather than a certificate of attendance. If that is relevant to what you are focused on at [company], would a brief call in the next week or two be welcome?

---

## ۶) قواعد، محدودیت‌ها و اعتبارسنجی

- **عنوان:** ۳ تا ۲۰۰ کاراکتر.
- **اسلاگ:** فقط حروف کوچک، اعداد و خط تیره (`^[a-z0-9]+(?:-[a-z0-9]+)*$`)، حداکثر ۱۲۰ کاراکتر؛ اختیاری.
- **دسته‌بندی:** ۲ تا ۸۰ کاراکتر.
- **بدنه:** حداقل ۱ کاراکتر؛ روی سرور با allowlist پاک‌سازی می‌شود.
- **ترتیب (Order):** فقط عدد صحیح.
- **فایل‌ها:** حداکثر ۱۰ فایل در هر ذخیره، هرکدام ≤ ۱۵ مگابایت؛ بایت‌ها در دیتابیس ذخیره می‌شوند.
- **پاک‌سازی HTML:** پشتیبانی از عناصر غنی — سرفصل‌ها، لیست‌ها، جدول‌ها، `blockquote`، تصاویر، و «callout»های رنگی (info/tip/warning/success).

---

## ۷) پرسش‌هایی برای بازبینی متخصص‌ها

این‌ها را می‌توانید عیناً برای متخصص‌ها بفرستید:

**الف) محتوا و پیام‌رسانی (فروش/برند)**
1. آیا لحن «peer-to-peer» و ضدفشار (no-pressure) برای مخاطبان ارشد (دین دانشگاه، مدیر بالینی، مدیرعامل) به‌اندازه‌ی کافی متقاعدکننده هست یا زیادی محتاط است؟
2. قالب‌ها عمداً هیچ «قلاب» عددی/نتیجه‌ای ندارند. آیا این به نرخ پاسخ آسیب می‌زند؟ نقطه‌ی تعادل بین «صداقت» و «جذابیت» کجاست؟
3. آیا پوشش صنایع کافی است؟ (اکنون فقط: دانشگاه، بیمارستان، متخصص مستقل، مالک/مدیرعامل). چه صنایع/نقش‌های پرتقاضایی جا مانده؟

**ب) حقوقی و انطباق (Compliance)**
4. تأکید مکرر بر «no price, no promise of results, not accredited, private certification» — آیا از منظر حقوقی/تبلیغاتی کافی و درست است؟
5. برای حوزه‌ی سلامت و داده‌های تنظیم‌شده، جمله‌ی «redacted or fictionalized examples» آیا پوشش کافی می‌دهد؟

**ج) امنیت و حاکمیت داده**
6. ذخیره‌ی بایت فایل‌ها **داخل دیتابیس** (نه object storage) — با سقف ۱۵MB×۱۰ در هر ذخیره — از نظر مقیاس‌پذیری/پشتیبان‌گیری قابل‌قبول است؟
7. اینکه فقط superadmin می‌تواند بنویسد ولی هر ادمینی می‌تواند فایل پیش‌نویس را دانلود کند، ریسکی دارد؟

**د) تجربه‌ی کاربری و عملیات**
8. مدل «تک‌نویسنده (superadmin)» گلوگاه محتوا نمی‌شود؟ آیا نیاز به نقش «ویراستار» جداست؟
9. پیام «ماهی یک‌بار سر بزن» چطور تقویت می‌شود که پارتنرها واقعاً به‌روز بمانند؟

---

## ۸) ریسک‌ها و شکاف‌های شناسایی‌شده (از منظر فنی/محتوایی)

- **وابستگی شکننده به ماژول ۱۴:** پستِ «Generic assets» با برش متن بین دو نشانگر (`<h2>Partner Toolkit...` و `<h2>How this maps...`) از ماژول ۱۴ ساخته می‌شود. اگر ساختار آن ماژول تغییر کند، seed خطا می‌دهد. (این یک وابستگی محتوایی است که باید هنگام ویرایش آکادمی حواسمان باشد.)
- **دوگانگی منبع حقیقت:** بعد از اولین seed، محتوا در دیتابیس زندگی می‌کند و ادمین می‌تواند ویرایش کند؛ اما seed دوباره اجرا شود چیزی را بازنویسی نمی‌کند (idempotent بر اساس slug). یعنی ویرایش‌های زنده و متن seed می‌توانند واگرا شوند — این سند از seed ساخته شده.
- **بدون نسخه‌بندی محتوا در Toolkit:** برخلاف درس‌های آکادمی که تاریخچه/نسخه دارند، پست‌های Toolkit ظاهراً history/versioning ندارند؛ ویرایش، متن قبلی را جایگزین می‌کند.

---

## پیوست: مسیر فایل‌های مرجع در کدبیس

| نقش | مسیر |
|---|---|
| صفحه‌ی فهرست ادمین | `app/src/app/(admin)/admin/partners/toolkit/page.tsx` |
| ویرایشگر ادمین (ساخت/ویرایش/حذف) | `app/src/app/(admin)/admin/partners/toolkit/[id]/page.tsx` |
| اکشن‌های سرور | `app/src/lib/actions/toolkit.ts` |
| اعتبارسنجی و محدودیت‌ها | `app/src/lib/validations/partner.ts` |
| محتوای اولیه (seed) | `app/prisma/seed/toolkit/seed-toolkit.ts` |
| منبعِ پستِ «Generic assets» | `app/prisma/seed/academy/m14-customize.ts` |
| صفحه‌ی فهرست پارتنر | `app/src/app/(partner)/partner/toolkit/page.tsx` |
| صفحه‌ی پست پارتنر | `app/src/app/(partner)/partner/toolkit/[slug]/page.tsx` |
| رندر بدنه | `app/src/components/portal/toolkit-body.tsx` |
| دانلود فایل (API) | `app/src/app/api/toolkit/files/[id]/route.ts` |
