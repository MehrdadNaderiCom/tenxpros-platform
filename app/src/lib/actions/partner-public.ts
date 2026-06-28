"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { absoluteUrl } from "@/lib/utils";
import { superAdminEmail } from "@/lib/authz";
import { partnerApplicationSchema, partnerDocumentFileError } from "@/lib/validations/partner";
import { isPdfMagic } from "@/lib/validations/application";
import { safeSendEmail } from "@/lib/services/email";
import {
  partnerApplicationNotifyAdminEmail,
  partnerApplicationReceivedEmail,
} from "@/lib/email/templates";
import { recordAudit } from "@/lib/partner/audit";
import { safeRevalidatePath } from "@/lib/partner/revalidate";

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const RATE_LIMIT_MAX = 3; // max submissions per IP per window

async function clientIpHash(): Promise<string | null> {
  try {
    const h = await headers();
    const fwd = h.get("x-forwarded-for") ?? h.get("x-real-ip") ?? "";
    const ip = fwd.split(",")[0]?.trim();
    if (!ip) return null;
    const salt = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? "tenxpros";
    return createHash("sha256").update(`${ip}:${salt}`).digest("hex");
  } catch {
    return null;
  }
}

type Result = { ok: boolean; message?: string; id?: string };

/**
 * Public Partner Program application. Spam-guarded with a honeypot field and a
 * lightweight per-IP + per-email rate limit, validated server-side with Zod.
 */
export async function submitPartnerApplication(formData: FormData): Promise<Result> {
  // Honeypot: a hidden field real users never fill. If set, pretend success.
  const honeypot = String(formData.get("companyWebsite") ?? "").trim();
  if (honeypot.length > 0) return { ok: true };

  const text = (name: string) => {
    const v = formData.get(name);
    return typeof v === "string" ? v : "";
  };
  const optional = (name: string) => {
    const v = text(name);
    return v.length > 0 ? v : undefined;
  };

  const parsed = partnerApplicationSchema.safeParse({
    fullName: text("fullName"),
    email: text("email"),
    phone: text("phone"),
    country: text("country"),
    region: optional("region"),
    linkedinUrl: text("linkedinUrl"),
    background: text("background"),
    audience: text("audience"),
    targetMarkets: text("targetMarkets"),
    accountJustification: text("accountJustification"),
    heardFrom: optional("heardFrom"),
    consentNoEquity: text("consentNoEquity") === "true" || text("consentNoEquity") === "on",
    utmSource: optional("utmSource"),
    utmMedium: optional("utmMedium"),
    utmCampaign: optional("utmCampaign"),
    referrerUrl: optional("referrerUrl"),
    landingPage: optional("landingPage"),
  });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Please check the form and try again." };
  }
  const data = parsed.data;
  const ipHash = await clientIpHash();

  // Per-IP rate limit (best-effort; DB-backed so it survives restarts).
  if (ipHash) {
    const recent = await prisma.partnerApplication.count({
      where: { ipHash, createdAt: { gte: new Date(Date.now() - RATE_LIMIT_WINDOW_MS) } },
    });
    if (recent >= RATE_LIMIT_MAX) {
      return { ok: false, message: "Too many submissions. Please try again later." };
    }
  }

  // One active application per email.
  const existing = await prisma.partnerApplication.findFirst({
    where: { email: data.email, status: { in: ["NEW", "UNDER_REVIEW"] } },
    select: { id: true },
  });
  if (existing) {
    return {
      ok: false,
      message: "An application with this email is already under review. We will be in touch.",
    };
  }

  // Optional resume / cover letter: PDF only, validated by type, size and the
  // "%PDF-" magic bytes. Buffers are built before the write so the create and
  // its documents happen together in one transaction.
  const docInputs = [
    { kind: "RESUME" as const, field: "resume", label: "Resume" },
    { kind: "COVER_LETTER" as const, field: "coverLetter", label: "Cover letter" },
  ];
  const documents: Array<{
    kind: "RESUME" | "COVER_LETTER";
    filename: string;
    mimeType: string;
    size: number;
    data: Buffer;
  }> = [];
  for (const d of docInputs) {
    const entry = formData.get(d.field);
    const file = entry instanceof File && entry.size > 0 ? entry : null;
    if (!file) continue;
    const fileError = partnerDocumentFileError({ type: file.type, size: file.size }, d.label);
    if (fileError) return { ok: false, message: fileError };
    const buffer = Buffer.from(await file.arrayBuffer());
    if (!isPdfMagic(new Uint8Array(buffer.subarray(0, 8)))) {
      return { ok: false, message: `${d.label} must be a valid PDF file.` };
    }
    documents.push({
      kind: d.kind,
      filename: file.name || `${d.field}.pdf`,
      mimeType: "application/pdf",
      size: buffer.length,
      data: buffer,
    });
  }

  const application = await prisma.$transaction(async (tx) => {
    const created = await tx.partnerApplication.create({
      data: {
        fullName: data.fullName,
        email: data.email,
        phone: data.phone || null,
        country: data.country,
        region: data.region || null,
        linkedinUrl: data.linkedinUrl || null,
        background: data.background,
        audience: data.audience,
        targetMarkets: data.targetMarkets,
        accountJustification: data.accountJustification,
        heardFrom: data.heardFrom || null,
        consentNoEquity: data.consentNoEquity,
        utmSource: data.utmSource || null,
        utmMedium: data.utmMedium || null,
        utmCampaign: data.utmCampaign || null,
        referrerUrl: data.referrerUrl || null,
        landingPage: data.landingPage || null,
        ipHash,
      },
    });
    for (const doc of documents) {
      await tx.partnerApplicationDocument.create({ data: { applicationId: created.id, ...doc } });
    }
    return created;
  });

  await prisma.siteEvent.create({
    data: {
      eventType: "PARTNER_APPLICATION_SUBMITTED",
      eventData: { applicationId: application.id, audience: data.audience },
      url: data.landingPage,
      referrer: data.referrerUrl,
      ipHash,
    },
  });

  await recordAudit({
    action: "PARTNER_APPLICATION_SUBMITTED",
    entity: "PartnerApplication",
    entityId: application.id,
    after: { email: data.email, country: data.country, audience: data.audience },
  });

  // Applicant acknowledgement + owner notification (never block on email).
  const ack = partnerApplicationReceivedEmail({ fullName: application.fullName, applicationId: application.id });
  await safeSendEmail({ to: application.email, subject: ack.subject, template: "partner_application_received", text: ack.text, html: ack.html });

  const notify = partnerApplicationNotifyAdminEmail({
    fullName: application.fullName,
    email: application.email,
    country: application.country,
    audience: application.audience,
    applicationId: application.id,
    adminUrl: absoluteUrl(`/admin/partners/applications/${application.id}`),
    attachments: documents.map((doc) => (doc.kind === "RESUME" ? "Resume" : "Cover letter")),
  });
  await safeSendEmail({ to: superAdminEmail(), subject: notify.subject, template: "partner_application_notify", text: notify.text, html: notify.html });

  safeRevalidatePath("/admin/partners/applications");
  return { ok: true, id: application.id };
}
