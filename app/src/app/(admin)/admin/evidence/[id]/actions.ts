"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import type { EvidenceStatus, ReviewDecision } from "@prisma/client";

export async function reviewEvidenceAction(evidenceId: string, formData: FormData) {
  const user = await requireAdmin();
  const decision = String(formData.get("decision") ?? "APPROVED") as ReviewDecision;
  const notes = String(formData.get("notes") ?? "").slice(0, 4000) || null;

  const nextStatus: EvidenceStatus =
    decision === "APPROVED" ? "APPROVED"
    : decision === "REJECTED" ? "REJECTED"
    : decision === "NEEDS_REVISION" ? "NEEDS_REVISION"
    : "UNDER_REVIEW";

  await prisma.$transaction([
    prisma.evidenceReview.create({
      data: { evidenceId, reviewerId: user.id, decision, notes },
    }),
    prisma.evidenceArtifact.update({
      where: { id: evidenceId },
      data: { status: nextStatus },
    }),
    prisma.auditLog.create({
      data: { actorId: user.id, action: "EVIDENCE_REVIEWED", entityType: "EvidenceArtifact", entityId: evidenceId, meta: { decision, notes } },
    }),
  ]);

  revalidatePath(`/admin/evidence/${evidenceId}`);
  revalidatePath(`/admin/evidence`);
  redirect(`/admin/evidence/${evidenceId}?saved=1`);
}
