/**
 * Branded, email-client-safe HTML templates for every email TenXPros sends.
 *
 * Pure and dependency-free (no prisma / no network), so it can be reused by the
 * server actions, unit-tested, and rendered by a preview script. HTML is
 * table-based with inline styles for broad email-client compatibility; every
 * template also returns a clean plain-text fallback (real newlines).
 */

import {
  SAFETY_WARNING,
  POST_APPLICATION_NOTICE,
  SUPPORT_FALLBACK,
  payeeNoticeForMethod,
} from "../payment-disclosure";
import { formatDeadlineUtc } from "../payment-terms";

export type EmailContent = { subject: string; html: string; text: string };

/** One consistent deadline sentence used across the payment emails. */
function deadlineSentence(dueAt: Date, windowHours?: number | null): string {
  return windowHours
    ? `Please complete your payment within ${windowHours} hours, by ${formatDeadlineUtc(dueAt)}.`
    : `Please complete your payment by ${formatDeadlineUtc(dueAt)}.`;
}

const NAVY = "#0B1F3A";
const GOLD = "#B58A3C";
const TEXT = "#334155";
const MUTED = "#94A3B8";
const FONT =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function money(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount}`;
  }
}

function paragraph(html: string): string {
  return `<p style="margin:0 0 14px;font-size:15px;line-height:1.7;color:${TEXT};">${html}</p>`;
}

function button(href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px 0 8px;"><tr><td style="border-radius:8px;background:${NAVY};"><a href="${esc(
    href,
  )}" style="display:inline-block;padding:13px 28px;font-family:${FONT};font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">${esc(
    label,
  )}</a></td></tr></table>`;
}

/** A light info box of label/value rows (used for IDs, payment details, notes). */
function infoBox(rows: Array<{ label: string; value: string }>): string {
  const inner = rows
    .map(
      (row) =>
        `<tr><td style="padding:4px 0;font-size:13px;color:${MUTED};width:140px;vertical-align:top;">${esc(
          row.label,
        )}</td><td style="padding:4px 0;font-size:14px;color:${TEXT};font-weight:600;">${esc(
          row.value,
        )}</td></tr>`,
    )
    .join("");
  return `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:6px 0 16px;background:#F8FAFC;border:1px solid #E3E8EF;border-radius:10px;"><tr><td style="padding:14px 18px;"><table role="presentation" cellpadding="0" cellspacing="0" width="100%">${inner}</table></td></tr></table>`;
}

function noteBox(title: string, body: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:6px 0 16px;background:#F8FAFC;border-left:3px solid ${GOLD};border-radius:6px;"><tr><td style="padding:12px 16px;"><p style="margin:0 0 4px;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${GOLD};">${esc(
    title,
  )}</p><p style="margin:0;font-size:14px;line-height:1.6;color:${TEXT};white-space:pre-wrap;">${esc(
    body,
  )}</p></td></tr></table>`;
}

/** Like noteBox, but red-accented for an explicit safety/fraud warning. */
function warningBox(title: string, body: string): string {
  const RED = "#B91C1C";
  return `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:6px 0 16px;background:#FEF2F2;border:1px solid #FCA5A5;border-left:3px solid ${RED};border-radius:6px;"><tr><td style="padding:12px 16px;"><p style="margin:0 0 4px;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${RED};">${esc(
    title,
  )}</p><p style="margin:0;font-size:14px;line-height:1.6;color:${TEXT};white-space:pre-wrap;">${esc(
    body,
  )}</p></td></tr></table>`;
}

function layout(opts: {
  preheader: string;
  eyebrow?: string;
  heading: string;
  bodyHtml: string;
}): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"></head>
<body style="margin:0;padding:0;background:#EEF2F7;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#EEF2F7;">${esc(opts.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#EEF2F7;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:100%;background:#ffffff;border:1px solid #E3E8EF;border-radius:14px;overflow:hidden;font-family:${FONT};">
  <tr><td style="background:${NAVY};padding:22px 32px;">
    <span style="font-size:19px;font-weight:700;letter-spacing:0.03em;color:#ffffff;">TenXPros</span>
    <span style="font-size:12px;color:#9FB0C8;padding-left:10px;">AI adoption certification</span>
  </td></tr>
  <tr><td style="height:3px;background:${GOLD};font-size:0;line-height:0;">&nbsp;</td></tr>
  <tr><td style="padding:34px 32px 6px;">
    ${
      opts.eyebrow
        ? `<p style="margin:0 0 12px;font-size:12px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:${GOLD};">${esc(
            opts.eyebrow,
          )}</p>`
        : ""
    }
    <h1 style="margin:0 0 18px;font-size:22px;line-height:1.3;color:${NAVY};font-weight:700;">${esc(
      opts.heading,
    )}</h1>
    ${opts.bodyHtml}
  </td></tr>
  <tr><td style="padding:6px 32px 30px;">
    <div style="border-top:1px solid #E3E8EF;margin-top:18px;padding-top:18px;font-size:12px;line-height:1.7;color:${MUTED};">
      You are receiving this because you applied to or are enrolled in TenXPros.<br>
      Sent by TenXPros · <a href="mailto:hello@tenxpros.com" style="color:#64748B;text-decoration:none;">hello@tenxpros.com</a> · Support: <a href="mailto:support@tenxpros.com" style="color:#64748B;text-decoration:none;">support@tenxpros.com</a>
    </div>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}

// ---------------------------------------------------------------------------
// 1. Application received
// ---------------------------------------------------------------------------
export function applicationReceivedEmail(params: {
  fullName: string;
  applicationId: string;
}): EmailContent {
  const { fullName, applicationId } = params;
  const bodyHtml =
    paragraph(`Hi ${esc(fullName)},`) +
    paragraph("Thank you for applying to TenXPros. We have received your application.") +
    paragraph(
      "Our review team reads every application personally and replies by email within 48 hours. No payment is requested before acceptance.",
    ) +
    infoBox([{ label: "Application ID", value: applicationId }]) +
    noteBox("Payment safety", POST_APPLICATION_NOTICE) +
    paragraph(SUPPORT_FALLBACK);

  const text = [
    `Hi ${fullName},`,
    "",
    "Thank you for applying to TenXPros. We have received your application.",
    "",
    "Our review team reads every application personally and replies by email within 48 hours. No payment is requested before acceptance.",
    "",
    `Application ID: ${applicationId}`,
    "",
    POST_APPLICATION_NOTICE,
    "",
    SUPPORT_FALLBACK,
    "",
    "TenXPros · hello@tenxpros.com · Support: support@tenxpros.com",
  ].join("\n");

  return {
    subject: "We have received your TenXPros application",
    html: layout({
      preheader: "We have received your application. A decision follows by email within 48 hours.",
      eyebrow: "Application received",
      heading: "Thank you for applying to TenXPros.",
      bodyHtml,
    }),
    text,
  };
}

// ---------------------------------------------------------------------------
// 2. Application status update (revise & reapply / not accepted)
// ---------------------------------------------------------------------------
export function applicationStatusEmail(params: {
  fullName: string;
  status: "REVISE_AND_REAPPLY" | "NOT_ACCEPTED" | string;
  notes?: string | null;
}): EmailContent {
  const { fullName, status, notes } = params;
  const revise = status === "REVISE_AND_REAPPLY";

  const lead = revise
    ? "Thank you for applying to TenXPros. After review, we would like you to refine a few points and resubmit. We see real potential and want to give your application its best chance."
    : "Thank you for your interest in TenXPros. After careful review, we are not able to offer you a place in this cohort.";
  const closing = revise
    ? "When you are ready, you can update and resubmit your application from our site."
    : "We appreciate the time you invested, and you are welcome to apply again in a future cohort.";

  const bodyHtml =
    paragraph(`Hi ${esc(fullName)},`) +
    paragraph(lead) +
    (notes ? noteBox("Reviewer notes", notes) : "") +
    paragraph(closing);

  const text = [
    `Hi ${fullName},`,
    "",
    lead,
    ...(notes ? ["", `Reviewer notes:`, notes] : []),
    "",
    closing,
    "",
    "TenXPros · hello@tenxpros.com · Support: support@tenxpros.com",
  ].join("\n");

  return {
    subject: revise
      ? "Your TenXPros application: a request to revise and resubmit"
      : "An update on your TenXPros application",
    html: layout({
      preheader: revise
        ? "We would like you to refine and resubmit your application."
        : "An update on your TenXPros application.",
      eyebrow: "Application update",
      heading: "An update on your application",
      bodyHtml,
    }),
    text,
  };
}

// ---------------------------------------------------------------------------
// 3. Accepted, payment instructions
// ---------------------------------------------------------------------------
export function paymentInstructionsEmail(params: {
  fullName: string;
  amount: number;
  currency: string;
  dueAt?: Date | null;
  windowHours?: number | null;
  paymentLink?: string | null;
  paymentInstructions?: string | null;
  publicDiscountNote?: string | null;
  method?: string | null;
  supportEmail: string;
}): EmailContent {
  const { fullName, amount, currency, dueAt, windowHours, paymentLink, paymentInstructions, publicDiscountNote, method, supportEmail } =
    params;

  const hasLinkUrl = typeof paymentLink === "string" && /^https?:\/\//i.test(paymentLink);
  const payeeNotice = payeeNoticeForMethod(method);
  const rows: Array<{ label: string; value: string }> = [
    { label: "Amount due", value: money(amount, currency) },
  ];
  if (dueAt) rows.push({ label: "Payment deadline", value: formatDeadlineUtc(dueAt) });
  const deadlineLine = dueAt ? deadlineSentence(dueAt, windowHours) : null;

  const bodyHtml =
    paragraph(`Hi ${esc(fullName)},`) +
    paragraph("Congratulations. Your application has been accepted, and one step remains to confirm your place: completing payment.") +
    (deadlineLine ? paragraph(`<strong>${esc(deadlineLine)}</strong>`) : "") +
    infoBox(rows) +
    (hasLinkUrl ? button(paymentLink as string, "Complete payment") : "") +
    (paymentInstructions ? noteBox("Payment instructions", paymentInstructions) : "") +
    (publicDiscountNote ? noteBox("Note", publicDiscountNote) : "") +
    noteBox("Payment & payee", payeeNotice) +
    warningBox("Before you pay", SAFETY_WARNING) +
    paragraph(
      `Once your payment is confirmed, we will activate your participant account and share onboarding next steps. Questions about payment? Contact <a href="mailto:${esc(
        supportEmail,
      )}" style="color:${NAVY};">${esc(supportEmail)}</a>.`,
    );

  const text = [
    `Hi ${fullName},`,
    "",
    "Congratulations. Your application has been accepted, and one step remains to confirm your place: completing payment.",
    ...(deadlineLine ? ["", deadlineLine] : []),
    "",
    `Amount due: ${money(amount, currency)}`,
    ...(dueAt ? [`Payment deadline: ${formatDeadlineUtc(dueAt)}`] : []),
    ...(hasLinkUrl ? ["", `Complete payment: ${paymentLink}`] : []),
    ...(paymentInstructions ? ["", "Payment instructions:", paymentInstructions] : []),
    ...(publicDiscountNote ? ["", `Note: ${publicDiscountNote}`] : []),
    "",
    `Payment & payee: ${payeeNotice}`,
    "",
    `Before you pay: ${SAFETY_WARNING}`,
    "",
    `Once your payment is confirmed, we will activate your participant account and share onboarding next steps. Questions about payment? Contact ${supportEmail}.`,
    "",
    "TenXPros · hello@tenxpros.com · Support: support@tenxpros.com",
  ].join("\n");

  return {
    subject: "Your TenXPros application is accepted: next steps to enroll",
    html: layout({
      preheader: "Your application is accepted. Here is how to complete payment and enroll.",
      eyebrow: "Application accepted",
      heading: "You're in. Let's complete your enrollment.",
      bodyHtml,
    }),
    text,
  };
}

// ---------------------------------------------------------------------------
// 4. Enrollment welcome (set password)
// ---------------------------------------------------------------------------
export function enrollmentWelcomeEmail(params: {
  fullName: string;
  setPasswordUrl: string;
  portalUrl: string;
}): EmailContent {
  const { fullName, setPasswordUrl, portalUrl } = params;

  const bodyHtml =
    paragraph(`Hi ${esc(fullName)},`) +
    paragraph("Welcome to TenXPros. Your enrollment is now active, so set your password to access your participant portal and begin onboarding.") +
    button(setPasswordUrl, "Set your password") +
    paragraph(
      `Your portal will open at <a href="${esc(portalUrl)}" style="color:${NAVY};">${esc(portalUrl)}</a>.`,
    ) +
    paragraph(
      'For your security, the password link above expires in 7 days. If it expires, contact <a href="mailto:support@tenxpros.com" style="color:' +
        NAVY +
        ';">support@tenxpros.com</a> and we will send a new one.',
    );

  const text = [
    `Hi ${fullName},`,
    "",
    "Welcome to TenXPros. Your enrollment is now active, so set your password to access your participant portal and begin onboarding.",
    "",
    `Set your password: ${setPasswordUrl}`,
    "",
    `Your portal: ${portalUrl}`,
    "",
    "For your security, the password link above expires in 7 days. If it expires, contact support@tenxpros.com and we will send a new one.",
    "",
    "TenXPros · hello@tenxpros.com · Support: support@tenxpros.com",
  ].join("\n");

  return {
    subject: "Welcome to TenXPros: set your password",
    html: layout({
      preheader: "Your enrollment is active. Set your password to access your portal.",
      eyebrow: "Welcome to TenXPros",
      heading: "Welcome aboard.",
      bodyHtml,
    }),
    text,
  };
}

// ---------------------------------------------------------------------------
// Partner Program emails
// ---------------------------------------------------------------------------

/** Acknowledge a received partner application. */
export function partnerApplicationReceivedEmail(params: {
  fullName: string;
  applicationId: string;
}): EmailContent {
  const { fullName, applicationId } = params;
  const bodyHtml =
    paragraph(`Hi ${esc(fullName)},`) +
    paragraph("Thank you for applying to the TenXPros Partner Program. We have received your application.") +
    paragraph(
      "Every application is reviewed personally. If it is a fit, we will invite you onto the TenXPros Partner Panel to begin a 90-day, fully performance-based pilot.",
    ) +
    infoBox([{ label: "Application ID", value: applicationId }]) +
    noteBox(
      "What the program is",
      "There is no equity, no country, no industry and no exclusivity. You earn defined commission only on confirmed deal registrations, real work performed, and cleared payment.",
    );

  const text = [
    `Hi ${fullName},`,
    "",
    "Thank you for applying to the TenXPros Partner Program. We have received your application.",
    "",
    "Every application is reviewed personally. If it is a fit, we will invite you onto the TenXPros Partner Panel to begin a 90-day, fully performance-based pilot.",
    "",
    `Application ID: ${applicationId}`,
    "",
    "There is no equity, no country, no industry and no exclusivity. You earn defined commission only on confirmed deal registrations, real work performed, and cleared payment.",
    "",
    "TenXPros · hello@tenxpros.com · Support: support@tenxpros.com",
  ].join("\n");

  return {
    subject: "We have received your TenXPros Partner Program application",
    html: layout({
      preheader: "We have received your partner application. A decision follows by email.",
      eyebrow: "Partner application received",
      heading: "Thank you for applying to the Partner Program.",
      bodyHtml,
    }),
    text,
  };
}

/** Notify the program owner that a new partner application arrived. */
export function partnerApplicationNotifyAdminEmail(params: {
  fullName: string;
  email: string;
  country: string;
  audience: string;
  applicationId: string;
  adminUrl: string;
  attachments?: string[];
}): EmailContent {
  const { fullName, email, country, audience, applicationId, adminUrl, attachments } = params;
  const attached = attachments && attachments.length > 0 ? attachments.join(", ") : "None";
  const bodyHtml =
    paragraph("A new Partner Program application has been submitted.") +
    infoBox([
      { label: "Name", value: fullName },
      { label: "Email", value: email },
      { label: "Country", value: country },
      { label: "Sells to", value: audience },
      { label: "Attachments", value: attached },
      { label: "Application ID", value: applicationId },
    ]) +
    button(adminUrl, "Review in admin");

  const text = [
    "A new Partner Program application has been submitted.",
    "",
    `Name: ${fullName}`,
    `Email: ${email}`,
    `Country: ${country}`,
    `Sells to: ${audience}`,
    `Attachments: ${attached}`,
    `Application ID: ${applicationId}`,
    "",
    `Review: ${adminUrl}`,
  ].join("\n");

  return {
    subject: `New partner application: ${fullName}`,
    html: layout({
      preheader: "A new Partner Program application is waiting for review.",
      eyebrow: "Partner application",
      heading: "New partner application",
      bodyHtml,
    }),
    text,
  };
}

/** Notify the program owner that a new certification application arrived. */
export function applicationNotifyAdminEmail(params: {
  fullName: string;
  email: string;
  country: string;
  professionalRole: string;
  domain: string;
  applicationId: string;
  adminUrl: string;
}): EmailContent {
  const { fullName, email, country, professionalRole, domain, applicationId, adminUrl } = params;
  const bodyHtml =
    paragraph("A new certification application has been submitted.") +
    infoBox([
      { label: "Name", value: fullName },
      { label: "Email", value: email },
      { label: "Country", value: country },
      { label: "Role", value: professionalRole },
      { label: "Field", value: domain },
      { label: "Application ID", value: applicationId },
    ]) +
    button(adminUrl, "Review in admin");

  const text = [
    "A new certification application has been submitted.",
    "",
    `Name: ${fullName}`,
    `Email: ${email}`,
    `Country: ${country}`,
    `Role: ${professionalRole}`,
    `Field: ${domain}`,
    `Application ID: ${applicationId}`,
    "",
    `Review: ${adminUrl}`,
  ].join("\n");

  return {
    subject: `New application: ${fullName}`,
    html: layout({
      preheader: "A new certification application is waiting for review.",
      eyebrow: "Application",
      heading: "New certification application",
      bodyHtml,
    }),
    text,
  };
}

/** Approve or reject a partner application. */
export function partnerApplicationDecisionEmail(params: {
  fullName: string;
  approved: boolean;
  notes?: string | null;
  setPasswordUrl?: string | null;
  panelUrl?: string | null;
}): EmailContent {
  const { fullName, approved, notes, setPasswordUrl, panelUrl } = params;

  if (approved) {
    const bodyHtml =
      paragraph(`Hi ${esc(fullName)},`) +
      paragraph(
        "Congratulations. Your application to the TenXPros Partner Program has been approved. You are now invited onto the TenXPros Partner Panel to begin your 90-day pilot.",
      ) +
      (setPasswordUrl ? button(setPasswordUrl, "Set your password") : "") +
      paragraph(
        "On the panel you will complete onboarding (the Activation Gate), register opportunities, and track every confirmation, scorecard step and commission. Nothing is approved except on the panel.",
      ) +
      (notes ? noteBox("A note from the team", notes) : "") +
      noteBox(
        "Remember",
        "No equity, no country, no industry, no exclusivity. Commission is earned only on confirmed registrations, real work and cleared payment.",
      );

    const text = [
      `Hi ${fullName},`,
      "",
      "Congratulations. Your application to the TenXPros Partner Program has been approved. You are now invited onto the TenXPros Partner Panel to begin your 90-day pilot.",
      ...(setPasswordUrl ? ["", `Set your password: ${setPasswordUrl}`] : []),
      ...(panelUrl ? ["", `Your Partner Panel: ${panelUrl}`] : []),
      "",
      "On the panel you will complete onboarding (the Activation Gate), register opportunities, and track every confirmation, scorecard step and commission. Nothing is approved except on the panel.",
      ...(notes ? ["", `Note: ${notes}`] : []),
      "",
      "TenXPros · hello@tenxpros.com · Support: support@tenxpros.com",
    ].join("\n");

    return {
      subject: "Your TenXPros Partner Program application is approved",
      html: layout({
        preheader: "Approved. Set your password to access the Partner Panel.",
        eyebrow: "Partner application approved",
        heading: "Welcome to the Partner Program.",
        bodyHtml,
      }),
      text,
    };
  }

  const bodyHtml =
    paragraph(`Hi ${esc(fullName)},`) +
    paragraph(
      "Thank you for your interest in the TenXPros Partner Program. After review, we are not able to move forward with your application at this time.",
    ) +
    (notes ? noteBox("Reviewer notes", notes) : "") +
    paragraph("We appreciate the time you invested and you are welcome to apply again in future.");

  const text = [
    `Hi ${fullName},`,
    "",
    "Thank you for your interest in the TenXPros Partner Program. After review, we are not able to move forward with your application at this time.",
    ...(notes ? ["", `Reviewer notes: ${notes}`] : []),
    "",
    "We appreciate the time you invested and you are welcome to apply again in future.",
    "",
    "TenXPros · hello@tenxpros.com · Support: support@tenxpros.com",
  ].join("\n");

  return {
    subject: "An update on your TenXPros Partner Program application",
    html: layout({
      preheader: "An update on your partner application.",
      eyebrow: "Partner application update",
      heading: "An update on your application",
      bodyHtml,
    }),
    text,
  };
}

/** Confirm a deal registration on the panel. */
export function partnerDealConfirmedEmail(params: {
  fullName: string;
  entity: string;
  confirmedScope: string;
  pipelineProtectionExpiresAt?: Date | null;
  panelUrl: string;
}): EmailContent {
  const { fullName, entity, confirmedScope, pipelineProtectionExpiresAt, panelUrl } = params;
  const rows = [
    { label: "Account", value: entity },
    { label: "Confirmed scope", value: confirmedScope },
  ];
  if (pipelineProtectionExpiresAt) {
    rows.push({ label: "Protected until", value: pipelineProtectionExpiresAt.toDateString() });
  }

  const bodyHtml =
    paragraph(`Hi ${esc(fullName)},`) +
    paragraph("Your deal registration has been confirmed on the TenXPros Partner Panel.") +
    infoBox(rows) +
    button(panelUrl, "Open the Partner Panel") +
    paragraph("Keep the account moving with a meaningful update on the panel to maintain protection.");

  const text = [
    `Hi ${fullName},`,
    "",
    "Your deal registration has been confirmed on the TenXPros Partner Panel.",
    "",
    `Account: ${entity}`,
    `Confirmed scope: ${confirmedScope}`,
    ...(pipelineProtectionExpiresAt ? [`Protected until: ${pipelineProtectionExpiresAt.toDateString()}`] : []),
    "",
    `Open the Partner Panel: ${panelUrl}`,
    "",
    "TenXPros · hello@tenxpros.com · Support: support@tenxpros.com",
  ].join("\n");

  return {
    subject: `Deal registration confirmed: ${entity}`,
    html: layout({
      preheader: "Your deal registration is confirmed on the Partner Panel.",
      eyebrow: "Panel confirmation",
      heading: "Your registration is confirmed",
      bodyHtml,
    }),
    text,
  };
}

// ---------------------------------------------------------------------------
// Newsletter campaign (per recipient, with a one-click unsubscribe link)
// ---------------------------------------------------------------------------
export function newsletterCampaignEmail(params: {
  subject: string;
  /** Plain source text from the admin composer; blank lines separate paragraphs. */
  body: string;
  unsubscribeUrl: string;
}): EmailContent {
  const blocks = params.body
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean);
  const bodyHtml =
    blocks.map((b) => paragraph(esc(b).replace(/\n/g, "<br>"))).join("") +
    `<div style="border-top:1px solid #E3E8EF;margin-top:18px;padding-top:14px;font-size:12px;line-height:1.7;color:${MUTED};">You are receiving this because you subscribed to the TenXPros newsletter. <a href="${esc(
      params.unsubscribeUrl,
    )}" style="color:#64748B;text-decoration:underline;">Unsubscribe</a> with one click at any time.</div>`;

  const text = [
    ...blocks,
    "",
    "You are receiving this because you subscribed to the TenXPros newsletter.",
    `Unsubscribe: ${params.unsubscribeUrl}`,
    "",
    "TenXPros · hello@tenxpros.com · Support: support@tenxpros.com",
  ].join("\n");

  return {
    subject: params.subject,
    html: layout({ preheader: params.subject, eyebrow: "Newsletter", heading: params.subject, bodyHtml }),
    text,
  };
}

// ---------------------------------------------------------------------------
// Payment reminder (24h after instructions, still unpaid, before the deadline)
// ---------------------------------------------------------------------------
export function paymentReminderEmail(params: {
  fullName: string;
  amount: number;
  currency: string;
  dueAt?: Date | null;
  windowHours?: number | null;
  paymentLink?: string | null;
  paymentInstructions?: string | null;
  method?: string | null;
  supportEmail: string;
}): EmailContent {
  const { fullName, amount, currency, dueAt, windowHours, paymentLink, paymentInstructions, method, supportEmail } = params;
  const hasLinkUrl = typeof paymentLink === "string" && /^https?:\/\//i.test(paymentLink);
  const payeeNotice = payeeNoticeForMethod(method);
  const rows: Array<{ label: string; value: string }> = [{ label: "Amount due", value: money(amount, currency) }];
  if (dueAt) rows.push({ label: "Payment deadline", value: formatDeadlineUtc(dueAt) });
  const deadlineLine = dueAt ? deadlineSentence(dueAt, windowHours) : null;

  const bodyHtml =
    paragraph(`Hi ${esc(fullName)},`) +
    paragraph("This is a friendly reminder that your place at TenXPros is accepted but not yet confirmed. One step remains: completing payment.") +
    (deadlineLine ? paragraph(`<strong>${esc(deadlineLine)}</strong>`) : "") +
    infoBox(rows) +
    (hasLinkUrl ? button(paymentLink as string, "Complete payment") : "") +
    (paymentInstructions ? noteBox("Payment instructions", paymentInstructions) : "") +
    noteBox("Payment & payee", payeeNotice) +
    warningBox("Before you pay", SAFETY_WARNING) +
    paragraph(
      `If you have already paid, please ignore this message. Any questions? Contact <a href="mailto:${esc(
        supportEmail,
      )}" style="color:${NAVY};">${esc(supportEmail)}</a>.`,
    );

  const text = [
    `Hi ${fullName},`,
    "",
    "This is a friendly reminder that your place at TenXPros is accepted but not yet confirmed. One step remains: completing payment.",
    ...(deadlineLine ? ["", deadlineLine] : []),
    "",
    `Amount due: ${money(amount, currency)}`,
    ...(dueAt ? [`Payment deadline: ${formatDeadlineUtc(dueAt)}`] : []),
    ...(hasLinkUrl ? ["", `Complete payment: ${paymentLink}`] : []),
    ...(paymentInstructions ? ["", "Payment instructions:", paymentInstructions] : []),
    "",
    `Payment & payee: ${payeeNotice}`,
    "",
    `Before you pay: ${SAFETY_WARNING}`,
    "",
    `If you have already paid, please ignore this message. Any questions? Contact ${supportEmail}.`,
    "",
    "TenXPros · hello@tenxpros.com · Support: support@tenxpros.com",
  ].join("\n");

  return {
    subject: "A reminder to complete your TenXPros enrollment",
    html: layout({
      preheader: "Your place is accepted but not yet confirmed. One step remains: payment.",
      eyebrow: "Payment reminder",
      heading: "A reminder to complete your enrollment",
      bodyHtml,
    }),
    text,
  };
}

// ---------------------------------------------------------------------------
// Payment deadline passed (coordinate with support before paying)
// ---------------------------------------------------------------------------
export function paymentDeadlinePassedEmail(params: { fullName: string; supportEmail: string }): EmailContent {
  const { fullName, supportEmail } = params;

  const bodyHtml =
    paragraph(`Hi ${esc(fullName)},`) +
    paragraph("The payment window for your accepted TenXPros application has now closed, so the earlier payment link and terms may no longer be current.") +
    paragraph("If you would still like to pay and join the program, please contact support first so we can confirm the current terms and give you a valid, up to date payment link. Pricing or program details may have changed since your acceptance.") +
    warningBox("Please do not pay an old link", "For your security, do not use any earlier payment link before checking with support. We will confirm the correct amount, payee, and link with you directly.") +
    button(`mailto:${supportEmail}`, "Contact support") +
    paragraph(`You can reach us any time at <a href="mailto:${esc(supportEmail)}" style="color:${NAVY};">${esc(supportEmail)}</a>.`);

  const text = [
    `Hi ${fullName},`,
    "",
    "The payment window for your accepted TenXPros application has now closed, so the earlier payment link and terms may no longer be current.",
    "",
    "If you would still like to pay and join the program, please contact support first so we can confirm the current terms and give you a valid, up to date payment link. Pricing or program details may have changed since your acceptance.",
    "",
    "Please do not pay an old link. For your security, do not use any earlier payment link before checking with support. We will confirm the correct amount, payee, and link with you directly.",
    "",
    `Contact support: ${supportEmail}`,
    "",
    "TenXPros · hello@tenxpros.com · Support: support@tenxpros.com",
  ].join("\n");

  return {
    subject: "Your TenXPros payment window has closed",
    html: layout({
      preheader: "Your payment window has closed. Please contact support before paying.",
      eyebrow: "Payment window closed",
      heading: "Your payment window has closed",
      bodyHtml,
    }),
    text,
  };
}
