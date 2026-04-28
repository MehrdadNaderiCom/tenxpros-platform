"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export async function issueCertificateAction(certificateId: string, formData: FormData) {
  const user = await requireAdmin();
  const roleFocus = String(formData.get("roleFocus") ?? "").slice(0, 120) || null;
  const evidenceSummary = String(formData.get("evidenceSummary") ?? "").slice(0, 2000) || null;
  const rawScore = String(formData.get("assessmentScore") ?? "").trim();
  const assessmentScore = rawScore === "" ? null : Math.max(0, Math.min(100, parseInt(rawScore, 10) || 0));

  await prisma.certificate.update({
    where: { id: certificateId },
    data: {
      status: "ISSUED",
      roleFocus,
      evidenceSummary,
      assessmentScore,
      issuedAt: new Date(),
      issuedByReviewerId: user.id,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365 * 2),
    },
  });
  await prisma.auditLog.create({
    data: { actorId: user.id, action: "CERTIFICATE_ISSUED", entityType: "Certificate", entityId: certificateId },
  });

  revalidatePath(`/admin/certifications`);
  revalidatePath(`/admin/certifications/${certificateId}`);
  redirect(`/admin/certifications/${certificateId}?saved=1`);
}

export async function revokeCertificateAction(certificateId: string, formData: FormData) {
  const user = await requireAdmin();
  const reason = String(formData.get("reason") ?? "").slice(0, 500);
  if (!reason) {
    redirect(`/admin/certifications/${certificateId}?err=${encodeURIComponent("Reason is required.")}`);
  }

  await prisma.certificate.update({
    where: { id: certificateId },
    data: { status: "REVOKED", revocationReason: reason },
  });
  await prisma.auditLog.create({
    data: { actorId: user.id, action: "CERTIFICATE_REVOKED", entityType: "Certificate", entityId: certificateId, meta: { reason } },
  });

  revalidatePath(`/admin/certifications`);
  revalidatePath(`/admin/certifications/${certificateId}`);
  redirect(`/admin/certifications/${certificateId}?saved=1`);
}
