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
- pnpm نسخهٔ ۹.۱۵.۹
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

## تست مرورگری کامل

این تست فقط اجازه اتصال به پایگاه داده اختصاصی `tenxpros_ir_test` روی پورت محلی ۵۵۴۳۲ را می‌دهد و در صورت هر آدرس دیگری متوقف می‌شود:

```bash
docker run -d \
  --name tenxpros-ir-e2e-db \
  -e POSTGRES_USER=tenxpros_ir_test \
  -e POSTGRES_PASSWORD=local-test-only-password \
  -e POSTGRES_DB=tenxpros_ir_test \
  -p 127.0.0.1:55432:5432 \
  postgres:16-alpine
e2e_database_url='postgresql://tenxpros_ir_test:local-test-only-password@127.0.0.1:55432/tenxpros_ir_test?schema=public'
DATABASE_URL="$e2e_database_url" pnpm db:deploy
pnpm exec playwright install chromium
E2E_DATABASE_URL="$e2e_database_url" pnpm test:e2e
```

سناریو از Apply تا پذیرش، آپلود فیش، تأیید پرداخت، ساخت Slot تهران، Zoom آزمایشی و محدودیت یک Office Hour در هفته را از طریق مرورگر اجرا می‌کند. ثبت Coaching یک‌ساعته با نرخ ۵ میلیون تومان و ساخت، انتشار و ثبت حضور در AI Roundtable نود دقیقه‌ای نیز در همین جریان بررسی می‌شوند. ایمیل و Zoom در این تست واقعی نیستند و بررسی اتصال واقعی آن‌ها باید روی محیط مقصد انجام شود.

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

نمونهٔ بخش اصلی تنظیمات Nginx با دامنهٔ اصلی یکتا:

```nginx
server {
    listen 443 ssl http2;
    server_name www.tenxpros.ir;

    return 308 https://tenxpros.ir$request_uri;
}

server {
    listen 443 ssl http2;
    server_name tenxpros.ir;

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
برای HTTP نیز Redirect دائمی به `https://tenxpros.ir` تنظیم کنید. نگه‌داشتن یک Origin اصلی باعث می‌شود Cookie ورود و لینک‌های ایمیل میان دامنهٔ اصلی و `www` از هم جدا نشوند.

## نگهداری دوره‌ای

برای جلوگیری از رشد نامحدود رکوردهای فنی، این دستور را روزانه با Cron یا Systemd Timer اجرا کنید:

```bash
docker compose exec -T --user node web pnpm maintenance:cleanup
```

این فرمان فقط Sessionهای منقضی یا قدیمی، Tokenهای تأیید ایمیل مصرف‌شده یا منقضی و Rate Limit Bucketهای قدیمی را پاک می‌کند. درخواست‌ها، پرداخت‌ها، Dossierها، Credentialها و فایل فیش حذف نمی‌شوند.

## استقرار بدون Docker

روی سرور دارای Node.js 24 LTS و PostgreSQL، فایل `.env` را از نمونه بسازید، دسترسی آن را محدود کنید و یک مسیر مطلق و ماندگار برای `UPLOAD_DIR` قرار دهید. این مسیر نباید داخل `public` یا `.next` باشد.

```bash
corepack enable
corepack prepare pnpm@9.15.9 --activate
sudo install -d -m 0700 \
  -o YOUR_APP_USER -g YOUR_APP_GROUP \
  /var/lib/tenxpros-ir/uploads
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

مقدار `UPLOAD_DIR` را روی `/var/lib/tenxpros-ir/uploads` قرار دهید و `YOUR_APP_USER` و `YOUR_APP_GROUP` را با کاربر محدود سرویس جایگزین کنید. فرایند production را با systemd یا مدیر فرایند مشابه و همان کاربر اجرا کنید. پورت ۳۱۰۰ باید در Firewall فقط برای Reverse Proxy محلی در دسترس باشد تا headerهای IP قابل جعل نباشند. پس از seed اولیه، رمز اولیهٔ ادمین را از محیط حذف کنید. برای استقرارهای بعدی فقط `env:check` و `db:deploy` لازم است.

در استقرار بدون Docker، Timer نگهداری باید از پوشه پروژه و با همان کاربر محدود این فرمان را اجرا کند:

```bash
pnpm maintenance:cleanup
```

در واحد Systemd، بررسی تنظیمات و Migration را پیش از Start قرار دهید. مسیر واقعی `pnpm` را با `command -v pnpm` پیدا و جایگزین کنید:

```ini
[Service]
User=YOUR_APP_USER
Group=YOUR_APP_GROUP
WorkingDirectory=/srv/tenxpros-ir
EnvironmentFile=/srv/tenxpros-ir/.env
ExecStartPre=/usr/local/bin/pnpm env:check
ExecStartPre=/usr/local/bin/pnpm db:deploy
ExecStart=/usr/local/bin/pnpm start
Restart=on-failure
```

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

از پایگاه داده و volume فیش‌ها به‌صورت روزانه نسخهٔ پشتیبان رمزگذاری‌شده بگیرید. هر دو بخش برای بازیابی کامل سامانه لازم هستند. نمونه‌های زیر از ابزار `age` استفاده می‌کنند و فایل خام حاوی اطلاعات شخصی روی دیسک نمی‌سازند. ابزار `age` را روی میزبان نصب کنید، یک Identity مخصوص Backup بسازید و کلید خصوصی آن را خارج از سرور نگه دارید.

برای اجرای خودکار، Recipient عمومی و نام زمان‌دار بسازید:

```bash
set -o pipefail
umask 077
backup_age_recipient='age1REPLACE_WITH_YOUR_BACKUP_RECIPIENT'
backup_stamp=$(date -u +%Y%m%dT%H%M%SZ)
```

پشتیبان رمزگذاری‌شده پایگاه داده:

```bash
docker compose exec -T db \
  pg_dump -U tenxpros_ir -Fc tenxpros_ir \
  | age -r "$backup_age_recipient" \
      -o "tenxpros-ir-db-$backup_stamp.dump.age"
```

پشتیبان رمزگذاری‌شده فایل‌های فیش:

```bash
docker run --rm \
  -v YOUR_UPLOAD_VOLUME:/source:ro \
  alpine tar -czf - -C /source . \
  | age -r "$backup_age_recipient" \
      -o "tenxpros-ir-uploads-$backup_stamp.tar.gz.age"
sha256sum \
  "tenxpros-ir-db-$backup_stamp.dump.age" \
  "tenxpros-ir-uploads-$backup_stamp.tar.gz.age" \
  > "tenxpros-ir-$backup_stamp.sha256"
```

نام واقعی volume را با `docker volume ls` پیدا و به‌جای `YOUR_UPLOAD_VOLUME` وارد کنید. سیاست Retention و انتقال خارج از سرور را جداگانه تنظیم کنید. هیچ Backup معتبر و تأییدشده‌ای نباید پیش از پایان Retention حذف شود.

برای بازیابی، ابتدا checksumها را بررسی کنید و یک پایگاه دادهٔ کاملاً خالی بسازید. سپس Dump را بازیابی کنید:

```bash
restore_stamp=20260729T020000Z
sha256sum -c "tenxpros-ir-$restore_stamp.sha256"
age -d "tenxpros-ir-db-$restore_stamp.dump.age" \
  | docker compose exec -T db \
      pg_restore -U tenxpros_ir -d tenxpros_ir --clean --if-exists
docker compose exec --user node web pnpm db:deploy
```

`db:deploy` پس از Restore فقط Migrationهای جدیدتر از زمان Backup را اعمال می‌کند. Archive فیش‌ها را داخل volume خالی بازیابی کنید و سپس مالکیت آن‌ها را به کاربر محدود برنامه برگردانید:

```bash
age -d "tenxpros-ir-uploads-$restore_stamp.tar.gz.age" \
  | docker run --rm -i \
      -v YOUR_UPLOAD_VOLUME:/target \
      alpine tar -xzf - -C /target
docker compose run --rm --entrypoint sh web \
  -c 'chown -R node:node /app/uploads && find /app/uploads -type d -exec chmod 700 {} + && find /app/uploads -type f -exec chmod 600 {} +'
```

بازیابی را دوره‌ای روی محیط آزمایشی تمرین کنید. فایل‌های پشتیبان شامل اطلاعات شخصی و مالی هستند و باید دسترسی محدود داشته باشند.

فایل `.env.production`، رمزها و نسخه‌های پشتیبان نباید وارد Git شوند.
