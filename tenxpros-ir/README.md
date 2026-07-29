# TenXPros ایران

نسخهٔ مستقل فارسی و راست‌چین TenXPros برای دامنهٔ `tenxpros.ir`.

این پروژه از نظر فایل، پایگاه داده، فضای آپلود و تنظیمات استقرار از سایت انگلیسی جدا است. انتقال یا حذف این پوشه تغییری در پروژهٔ انگلیسی ایجاد نمی‌کند.

## قابلیت‌های نسخهٔ اولیه

- سایت عمومی کامل و راست‌چین با محتوای فارسی و اصطلاحات تخصصی انگلیسی
- معرفی برنامهٔ ۱۲ هفته‌ای، TenX Method، Dossier و Certification
- یک پیشنهاد قیمت روشن: قیمت اصلی ۹۰ میلیون تومان و Founding Charter به مبلغ ۶۰ میلیون تومان
- درخواست عضویت، بررسی ادمین و جریان پذیرش
- نمایش اطلاعات کارت، شبا و حساب بانک سامان پس از پذیرش
- آپلود امن فیش واریز و بررسی آن در پنل ادمین
- پنل عضو و پنل ادمین مستقل
- تعریف بازه‌های آزاد بر اساس منطقهٔ زمانی تهران
- رزرو فقط یک Office Hour سی دقیقه‌ای در هر هفتهٔ ایران، از شنبه تا جمعه
- عدم انتقال ظرفیت استفاده‌نشده به هفتهٔ بعد
- ساخت خودکار جلسهٔ Zoom و ارسال ایمیل پس از رزرو
- معرفی و ثبت درخواست Coaching با نرخ ساعتی ۵ میلیون تومان
- مدیریت نشست هفتگی ۹۰ دقیقه‌ای AI و Networking برای اعضا و فارغ‌التحصیلان DBC

## نیازمندی‌های سرور

- Node.js نسخهٔ ۲۴ LTS
- PostgreSQL نسخهٔ ۱۶ یا جدیدتر
- فضای دیسک ماندگار و خارج از دسترس عمومی برای فیش‌ها
- دامنه با HTTPS
- حساب SMTP برای ایمیل‌های تراکنشی
- یک Zoom Server-to-Server OAuth app فعال

راه ساده‌تر، استفاده از Docker و Docker Compose است که همراه پروژه ارائه شده‌اند.

## اجرای توسعه

```bash
cp .env.example .env
pnpm install
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm dev
```

سایت توسعه روی `http://localhost:3100` در دسترس خواهد بود.

برای توسعهٔ محلی می‌توان این دو مقدار را در `.env` قرار داد:

```dotenv
EMAIL_MODE=log
ZOOM_MODE=mock
```

حالت‌های `log` و `mock` فقط برای تست هستند و نباید روی دامنهٔ اصلی استفاده شوند.

## استقرار با Docker

۱. فایل تنظیمات تولید را بسازید:

```bash
cp .env.example .env.production
```

۲. همهٔ مقادیر نمونه، هویت دقیق طرف قرارداد، رمز پایگاه داده، رمز ادمین، SMTP و Zoom را تغییر دهید.

رمز داخل `DATABASE_URL` باید URL-encoded باشد. برای نمونه، کاراکتر `@` در رمز به شکل `%40` نوشته می‌شود.

۳. همان رمز PostgreSQL را با شکل خام در محیط Shell تعریف کنید:

```bash
export POSTGRES_PASSWORD='a-unique-long-database-password'
```

۴. سرویس‌ها را بسازید و اجرا کنید:

```bash
docker compose up -d --build
docker compose logs --tail=100 web
docker compose exec --user node web pnpm env:check:seed
docker compose exec --user node web pnpm db:seed
```

پس از ساخته‌شدن حساب مدیریت، مقدار `ADMIN_INITIAL_PASSWORD` را از فایل محیطی حذف کنید و سرویس web را با محیط تازه دوباره بسازید:

```bash
docker compose up -d --force-recreate web
```

۵. یک Reverse Proxy مانند Nginx یا Caddy را از دامنهٔ `tenxpros.ir` به `127.0.0.1:3100` متصل کنید و HTTPS را فعال کنید.

نمونهٔ بخش اصلی تنظیمات Nginx:

```nginx
server {
    listen 443 ssl http2;
    server_name tenxpros.ir www.tenxpros.ir;

    client_max_body_size 12m;

    location / {
        proxy_pass http://127.0.0.1:3100;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

مقدار `client_max_body_size` باید از سقف ۸ مگابایتی فیش بزرگ‌تر باشد. تغییر Host یا Origin در Proxy می‌تواند Server Actionها را متوقف کند، بنابراین headerهای بالا را حذف نکنید.

## استقرار بدون Docker

روی سرور دارای Node.js 24 LTS و PostgreSQL، فایل `.env` را از نمونه بسازید، دسترسی آن را محدود کنید و یک مسیر مطلق و ماندگار برای `UPLOAD_DIR` قرار دهید. این مسیر نباید داخل `public` یا `.next` باشد.

```bash
cp .env.example .env
chmod 600 .env
pnpm install --frozen-lockfile
pnpm db:generate
pnpm env:check
pnpm db:deploy
pnpm env:check:seed
pnpm db:seed
pnpm build
pnpm prune --prod
pnpm start
```

فرایند production را با systemd یا مدیر فرایند مشابه اجرا کنید و دایرکتوری آپلود را در اختیار همان کاربر محدود سیستم قرار دهید. پورت ۳۱۰۰ باید در Firewall فقط برای Reverse Proxy محلی در دسترس باشد تا headerهای IP قابل جعل نباشند. پس از seed اولیه، رمز اولیهٔ ادمین را از محیط حذف کنید. برای استقرارهای بعدی فقط `env:check` و `db:deploy` لازم است.

## تنظیم Zoom

در Zoom Marketplace یک برنامهٔ Server-to-Server OAuth بسازید. برنامه باید scope لازم برای ساخت جلسه برای کاربر میزبان را داشته باشد. سپس این مقادیر را در محیط تولید قرار دهید:

```dotenv
ZOOM_MODE=zoom
ZOOM_ACCOUNT_ID=
ZOOM_CLIENT_ID=
ZOOM_CLIENT_SECRET=
ZOOM_USER_ID=host@your-domain.com
```

مقدار `ZOOM_USER_ID` باید ایمیل یا شناسه کاربر میزبان در حساب Zoom باشد. پس از رزرو Office Hour، سیستم جلسه را برای همان زمان و با منطقهٔ زمانی `Asia/Tehran` ایجاد می‌کند. لینک شرکت در جلسه در پنل عضو ذخیره و با ایمیل ارسال می‌شود.

## تنظیم ایمیل

```dotenv
EMAIL_MODE=smtp
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASSWORD=
EMAIL_FROM=TenXPros Iran <hello@tenxpros.ir>
```

برای تحویل مناسب ایمیل، رکوردهای SPF، DKIM و DMARC دامنه را نیز تنظیم کنید.

## نگهداری فایل فیش

فیش‌ها داخل پوشهٔ عمومی سایت ذخیره نمی‌شوند. در Docker، volume با نام `tenxpros_ir_uploads` به `/app/uploads` متصل است. فقط ادمین احراز هویت‌شده می‌تواند فایل را از مسیر محافظت‌شده دریافت کند.

فرمت‌های مجاز JPEG، PNG و PDF هستند. سقف پیش‌فرض هر فایل ۸ مگابایت است.

## کنترل محدودیت Office Hour

مبنای هفته، ساعت رسمی تهران است. هر هفته از ساعت صفر شنبه آغاز و در پایان جمعه تمام می‌شود. پایگاه داده برای هر عضو و هر کلید هفته یک محدودیت یکتا دارد، بنابراین ارسال هم‌زمان چند درخواست نیز امکان رزرو بیشتر از یک جلسه را ایجاد نمی‌کند.

ظرفیت استفاده‌نشده ذخیره نمی‌شود. عضو فقط زمان‌های باقی‌ماندهٔ همان هفته را می‌بیند.

## بررسی پیش از انتشار

```bash
pnpm install --frozen-lockfile
pnpm env:check
pnpm db:validate
pnpm lint:content
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm audit --audit-level=high
```

پس از اجرای نسخهٔ تولید، سلامت برنامه را بررسی کنید:

```bash
curl -fsS https://tenxpros.ir/api/health
```

## پشتیبان‌گیری

از پایگاه داده و volume فیش‌ها به صورت روزانه نسخهٔ پشتیبان رمزگذاری‌شده بگیرید. هر دو بخش برای بازیابی کامل سامانه لازم هستند.

نمونهٔ پشتیبان پایگاه داده:

```bash
docker compose exec -T db pg_dump -U tenxpros_ir tenxpros_ir > tenxpros-ir.sql
```

نمونهٔ پشتیبان فایل‌های فیش:

```bash
docker run --rm \
  -v YOUR_UPLOAD_VOLUME:/source:ro \
  -v "$PWD":/backup \
  alpine tar -czf /backup/tenxpros-ir-uploads.tar.gz -C /source .
sha256sum tenxpros-ir.sql tenxpros-ir-uploads.tar.gz > tenxpros-ir-backup.sha256
```

نام واقعی volume را با `docker volume ls` پیدا و به‌جای `YOUR_UPLOAD_VOLUME` وارد کنید. برای بازیابی، ابتدا checksumها را بررسی کنید، یک پایگاه دادهٔ خالی بسازید، migrationها را اجرا کنید و سپس dump و archive فیش‌ها را برگردانید. بازیابی را دوره‌ای روی محیط آزمایشی تمرین کنید. فایل‌های پشتیبان شامل اطلاعات شخصی و مالی هستند و باید دسترسی محدود داشته باشند.

فایل `.env.production`، رمزها و نسخه‌های پشتیبان نباید وارد Git شوند.
