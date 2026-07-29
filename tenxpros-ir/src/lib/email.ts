import "server-only";
import nodemailer from "nodemailer";

export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[character] ?? character,
  );
}

let transport: ReturnType<typeof nodemailer.createTransport> | null = null;

function smtpTransport() {
  if (transport) return transport;
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;
  if (!host) return null;

  transport = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: user && pass ? { user, pass } : undefined,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });
  return transport;
}

export async function sendEmail(message: EmailMessage) {
  const mode = process.env.EMAIL_MODE ?? "smtp";
  if (mode === "log" && process.env.NODE_ENV !== "production") {
    console.info(`[email preview] ${message.subject} -> ${message.to}`);
    return true;
  }

  const sender = process.env.EMAIL_FROM;
  const senderTransport = smtpTransport();
  if (!sender || !senderTransport) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SMTP delivery is not configured.");
    }
    return false;
  }

  await senderTransport.sendMail({
    from: sender,
    ...message,
    subject: message.subject.replace(/[\r\n]+/g, " ").trim().slice(0, 180),
    disableFileAccess: true,
    disableUrlAccess: true,
  });
  return true;
}

function emailFrame(content: string) {
  return `<div dir="rtl" style="margin:0;background:#f7f8fb;padding:32px 16px;font-family:Tahoma,Arial,sans-serif;color:#172033"><div style="max-width:620px;margin:auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;padding:32px;line-height:2"><p dir="ltr" style="margin:0 0 24px;font:700 18px Arial;color:#554ee8">TenXPros</p>${content}<p style="margin:28px 0 0;color:#64748b;font-size:13px">این پیام به صورت خودکار از سامانه TenXPros ایران ارسال شده است.</p></div></div>`;
}

function safeHttpUrl(value: string) {
  const url = new URL(value);
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new TypeError("Email links must use HTTP or HTTPS.");
  }
  return url.toString();
}

function emailButton(url: string, label: string) {
  return `<p><a href="${escapeHtml(
    safeHttpUrl(url),
  )}" style="display:inline-block;background:#554ee8;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:700">${escapeHtml(
    label,
  )}</a></p>`;
}

export function applicationReceivedEmail(name: string, referenceCode: string) {
  const safeName = escapeHtml(name);
  const safeCode = escapeHtml(referenceCode);
  return {
    subject: "درخواست شما در TenXPros دریافت شد",
    text: `${name} عزیز، درخواست شما با کد ${referenceCode} دریافت شد. پیش از پذیرش نیازی به پرداخت نیست.`,
    html: emailFrame(
      `<p>${safeName} عزیز،</p><p>درخواست شما دریافت شد و برای بررسی در صف قرار گرفت. پیش از پذیرش هیچ پرداختی انجام ندهید.</p><p>کد پیگیری:</p><p dir="ltr" style="font:700 20px Arial;letter-spacing:1px">${safeCode}</p>`,
    ),
  };
}

export function applicationVerificationEmail(
  name: string,
  referenceCode: string,
  verificationUrl: string,
) {
  const safeName = escapeHtml(name);
  const safeCode = escapeHtml(referenceCode);
  return {
    subject: "تأیید ایمیل درخواست TenXPros",
    text: `${name} عزیز، درخواست شما با کد ${referenceCode} دریافت شد. برای تأیید مالکیت ایمیل و ادامه بررسی این لینک را باز کنید: ${safeHttpUrl(verificationUrl)}`,
    html: emailFrame(
      `<p>${safeName} عزیز،</p><p>درخواست شما با کد <span dir="ltr" style="font:700 16px Arial">${safeCode}</span> دریافت شد.</p><p>برای تأیید مالکیت ایمیل و ورود امن به پنل، لینک زیر را حداکثر تا ۲۴ ساعت آینده باز کنید.</p>${emailButton(verificationUrl, "تأیید ایمیل")}<p>پیش از اعلام پذیرش نیازی به پرداخت نیست.</p>`,
    ),
  };
}

export function verificationLinkEmail(name: string, verificationUrl: string) {
  const safeName = escapeHtml(name);
  return {
    subject: "لینک تازه تأیید ایمیل TenXPros",
    text: `${name} عزیز، لینک تازه تأیید ایمیل شما تا ۲۴ ساعت معتبر است: ${safeHttpUrl(verificationUrl)}`,
    html: emailFrame(
      `<p>${safeName} عزیز،</p><p>لینک تازه تأیید ایمیل شما آماده است و تا ۲۴ ساعت اعتبار دارد.</p>${emailButton(verificationUrl, "تأیید ایمیل")}`,
    ),
  };
}

export function applicationAcceptedEmail(name: string, dashboardUrl: string) {
  const safeName = escapeHtml(name);
  return {
    subject: "درخواست Founding Charter شما پذیرفته شد",
    text: `${name} عزیز، درخواست شما پذیرفته شد. برای مشاهده اطلاعات واریز و بارگذاری رسید وارد پنل شوید: ${dashboardUrl}`,
    html: emailFrame(
      `<p>${safeName} عزیز،</p><p>درخواست شما برای حضور در Founding Charter پذیرفته شد. اطلاعات واریز فقط در پنل امن شما نمایش داده می‌شود.</p>${emailButton(dashboardUrl, "ورود به پنل و ادامه ثبت‌نام")}`,
    ),
  };
}

export function receiptReviewedEmail(
  name: string,
  approved: boolean,
  dashboardUrl: string,
  note?: string | null,
) {
  const safeName = escapeHtml(name);
  const safeNote = note ? escapeHtml(note) : "";
  return {
    subject: approved ? "پرداخت شما تأیید شد" : "رسید پرداخت نیازمند اصلاح است",
    text: approved
      ? `${name} عزیز، پرداخت شما تأیید و عضویت شما فعال شد. ${dashboardUrl}`
      : `${name} عزیز، رسید پرداخت شما تأیید نشد. ${note ?? ""} ${dashboardUrl}`,
    html: emailFrame(
      approved
        ? `<p>${safeName} عزیز،</p><p>پرداخت شما تأیید شد و عضویت TenXPros شما فعال است.</p>${emailButton(dashboardUrl, "ورود به پنل اعضا")}`
        : `<p>${safeName} عزیز،</p><p>رسید پرداخت شما در بررسی فعلی تأیید نشد. می‌توانید توضیح ادمین را در پنل ببینید و رسید صحیح را دوباره ارسال کنید.</p>${safeNote ? `<p style="background:#f8fafc;padding:12px;border-radius:8px">${safeNote}</p>` : ""}${emailButton(dashboardUrl, "بازگشت به پنل")}`,
    ),
  };
}

export function bookingEmail(name: string, formattedDate: string, joinUrl: string) {
  const safeName = escapeHtml(name);
  const safeDate = escapeHtml(formattedDate);
  return {
    subject: "Office Hour این هفته شما تأیید شد",
    text: `${name} عزیز، Office Hour سی‌دقیقه‌ای شما برای ${formattedDate} ثبت شد. لینک Zoom: ${joinUrl}`,
    html: emailFrame(
      `<p>${safeName} عزیز،</p><p>Office Hour سی‌دقیقه‌ای شما برای <strong>${safeDate}</strong> ثبت شد.</p>${emailButton(joinUrl, "ورود به جلسه Zoom")}<p>تمام زمان‌ها بر اساس Time Zone تهران هستند.</p>`,
    ),
  };
}

export function bookingCancelledEmail(name: string, formattedDate: string) {
  return {
    subject: "Office Hour شما لغو شد",
    text: `${name} عزیز، Office Hour سی‌دقیقه‌ای شما برای ${formattedDate} توسط مدیریت لغو شد. لینک قبلی Zoom را استفاده نکنید و برای پیگیری با پشتیبانی تماس بگیرید.`,
    html: emailFrame(
      `<p>${escapeHtml(name)} عزیز،</p><p>Office Hour سی‌دقیقه‌ای شما برای <strong>${escapeHtml(formattedDate)}</strong> توسط مدیریت لغو شد.</p><p>لینک قبلی Zoom دیگر معتبر نیست. برای پیگیری با پشتیبانی تماس بگیرید.</p>`,
    ),
  };
}

export function coachingReceivedEmail(name: string) {
  return {
    subject: "درخواست Coaching شما دریافت شد",
    text: `${name} عزیز، درخواست Coaching شما دریافت شد. برای هماهنگی زمان با شما تماس می‌گیریم.`,
    html: emailFrame(
      `<p>${escapeHtml(name)} عزیز،</p><p>درخواست Coaching شما دریافت شد. پس از بررسی جزئیات، برای هماهنگی زمان با شما تماس می‌گیریم. هزینه هر جلسه ۶۰ دقیقه‌ای ۵ میلیون تومان است.</p>`,
    ),
  };
}

export function coachingScheduledEmail(
  name: string,
  topic: string,
  formattedDate: string,
) {
  return {
    subject: "زمان جلسه Coaching شما مشخص شد",
    text: `${name} عزیز، جلسه Coaching با موضوع ${topic} برای ${formattedDate} به وقت تهران زمان‌بندی شد.`,
    html: emailFrame(
      `<p>${escapeHtml(name)} عزیز،</p><p>جلسه Coaching شما با موضوع <strong>${escapeHtml(topic)}</strong> برای <strong>${escapeHtml(formattedDate)}</strong> به وقت تهران زمان‌بندی شد.</p><p>اگر این زمان با هماهنگی انجام‌شده مطابقت ندارد، لطفاً با پشتیبانی تماس بگیرید.</p>`,
    ),
  };
}

export function gatheringRegistrationEmail(
  name: string,
  topic: string,
  formattedDate: string,
  joinUrl?: string | null,
) {
  return {
    subject: `ثبت حضور در AI Roundtable: ${topic}`.slice(0, 180),
    text: `${name} عزیز، حضور شما در AI Roundtable با موضوع ${topic} برای ${formattedDate} ثبت شد.${joinUrl ? ` لینک Zoom: ${safeHttpUrl(joinUrl)}` : ""}`,
    html: emailFrame(
      `<p>${escapeHtml(name)} عزیز،</p><p>حضور شما در نشست ۹۰ دقیقه‌ای AI Roundtable با موضوع <strong>${escapeHtml(topic)}</strong> برای <strong>${escapeHtml(formattedDate)}</strong> ثبت شد.</p>${joinUrl ? emailButton(joinUrl, "ورود به AI Roundtable") : "<p>لینک جلسه پس از نهایی‌شدن در پنل شما نمایش داده می‌شود.</p>"}`,
    ),
  };
}

export function gatheringCancelledEmail(
  name: string,
  topic: string,
  formattedDate: string,
) {
  return {
    subject: `لغو AI Roundtable: ${topic}`.slice(0, 180),
    text: `${name} عزیز، AI Roundtable با موضوع ${topic} که برای ${formattedDate} برنامه‌ریزی شده بود لغو شد. لینک قبلی جلسه را استفاده نکنید.`,
    html: emailFrame(
      `<p>${escapeHtml(name)} عزیز،</p><p>AI Roundtable با موضوع <strong>${escapeHtml(topic)}</strong> که برای <strong>${escapeHtml(formattedDate)}</strong> برنامه‌ریزی شده بود لغو شد.</p><p>لینک قبلی جلسه دیگر معتبر نیست. برنامه بعدی پس از انتشار در پنل شما نمایش داده می‌شود.</p>`,
    ),
  };
}
