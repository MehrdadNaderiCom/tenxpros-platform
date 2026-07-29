"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireCurrentAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  allProgramModulesCompleted,
  DOSSIER_SECTIONS,
  dossierSectionIsComplete,
  isLearningMemberStatus,
} from "@/lib/learning";
import { requireLearningMember } from "@/lib/learning-access";
import {
  dossierReviewSchema,
  dossierSectionSchema,
} from "@/lib/learning-validation";

class DossierWorkflowError extends Error {
  constructor(readonly result: string) {
    super(result);
    this.name = "DossierWorkflowError";
  }
}

function memberRedirect(result: string): never {
  redirect(`/portal/dossier?result=${encodeURIComponent(result)}`);
}

function adminListRedirect(result: string): never {
  redirect(`/admin/dossiers?result=${encodeURIComponent(result)}`);
}

function adminDetailRedirect(dossierId: string, result: string): never {
  redirect(
    `/admin/dossiers/${encodeURIComponent(dossierId)}?result=${encodeURIComponent(result)}`,
  );
}

function sectionsAreReady(
  sections: Array<{ sectionNumber: number; content: string }>,
) {
  if (sections.length !== DOSSIER_SECTIONS.length) return false;
  const byNumber = new Map(
    sections.map((section) => [section.sectionNumber, section.content]),
  );
  return DOSSIER_SECTIONS.every((definition) =>
    dossierSectionIsComplete(byNumber.get(definition.number)),
  );
}

export async function saveDossierSectionAction(formData: FormData) {
  const member = await requireLearningMember();
  const parsed = dossierSectionSchema.safeParse({
    sectionNumber: formData.get("sectionNumber"),
    content: formData.get("content"),
    evidenceUrl: formData.get("evidenceUrl"),
  });
  if (!parsed.success) memberRedirect("invalid");

  try {
    await db.$transaction(
      async (transaction) => {
        let dossier = await transaction.dossier.findUnique({
          where: { memberId: member.id },
          select: { id: true, status: true },
        });

        if (!dossier) {
          dossier = await transaction.dossier.create({
            data: {
              memberId: member.id,
              sections: {
                create: DOSSIER_SECTIONS.map((section) => ({
                  sectionNumber: section.number,
                  content: "",
                })),
              },
            },
            select: { id: true, status: true },
          });
        }

        if (
          dossier.status !== "DRAFT" &&
          dossier.status !== "CHANGES_REQUESTED"
        ) {
          throw new DossierWorkflowError("locked");
        }

        await transaction.dossierSection.update({
          where: {
            dossierId_sectionNumber: {
              dossierId: dossier.id,
              sectionNumber: parsed.data.sectionNumber,
            },
          },
          data: {
            content: parsed.data.content,
            evidenceUrl: parsed.data.evidenceUrl ?? null,
          },
        });
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 5_000,
        timeout: 10_000,
      },
    );
  } catch (error) {
    if (error instanceof DossierWorkflowError) {
      memberRedirect(error.result);
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2034" || error.code === "P2002")
    ) {
      memberRedirect("retry");
    }
    console.error("Dossier section persistence failed", error);
    memberRedirect("error");
  }

  revalidatePath("/portal/dossier");
  revalidatePath("/portal/certification");
  revalidatePath("/admin/dossiers");
  memberRedirect("saved");
}

export async function submitDossierAction() {
  const member = await requireLearningMember();

  try {
    await db.$transaction(
      async (transaction) => {
        const dossier = await transaction.dossier.findUnique({
          where: { memberId: member.id },
          include: {
            sections: {
              select: { sectionNumber: true, content: true },
            },
          },
        });
        if (!dossier) throw new DossierWorkflowError("incomplete");
        if (
          dossier.status !== "DRAFT" &&
          dossier.status !== "CHANGES_REQUESTED"
        ) {
          throw new DossierWorkflowError("locked");
        }

        const [diagnostic, completedModules] = await Promise.all([
          transaction.diagnostic.findUnique({
            where: { memberId: member.id },
            select: { status: true },
          }),
          transaction.programModuleProgress.findMany({
            where: {
              memberId: member.id,
              status: "COMPLETED",
            },
            select: { moduleNumber: true },
          }),
        ]);
        if (diagnostic?.status !== "REVIEWED") {
          throw new DossierWorkflowError("diagnostic_required");
        }
        if (
          !allProgramModulesCompleted(
            completedModules.map((module) => module.moduleNumber),
          )
        ) {
          throw new DossierWorkflowError("modules_required");
        }
        if (!sectionsAreReady(dossier.sections)) {
          throw new DossierWorkflowError("incomplete");
        }

        const submitted = await transaction.dossier.updateMany({
          where: {
            id: dossier.id,
            status: { in: ["DRAFT", "CHANGES_REQUESTED"] },
          },
          data: {
            status: "SUBMITTED",
            submittedAt: new Date(),
            approvedAt: null,
          },
        });
        if (submitted.count !== 1) {
          throw new DossierWorkflowError("retry");
        }
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 5_000,
        timeout: 10_000,
      },
    );
  } catch (error) {
    if (error instanceof DossierWorkflowError) {
      memberRedirect(error.result);
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034"
    ) {
      memberRedirect("retry");
    }
    console.error("Dossier submission failed", error);
    memberRedirect("error");
  }

  revalidatePath("/portal/dossier");
  revalidatePath("/portal/certification");
  revalidatePath("/admin/dossiers");
  revalidatePath("/admin/certifications");
  memberRedirect("submitted");
}

export async function reviewDossierAction(formData: FormData) {
  const admin = await requireCurrentAdmin();
  const parsed = dossierReviewSchema.safeParse({
    dossierId: formData.get("dossierId"),
    decision: formData.get("decision"),
    note: formData.get("note"),
  });
  if (!parsed.success) {
    const dossierId = String(formData.get("dossierId") ?? "");
    if (/^c[a-z0-9]{20,}$/i.test(dossierId)) {
      adminDetailRedirect(dossierId, "invalid");
    }
    adminListRedirect("invalid");
  }

  try {
    await db.$transaction(
      async (transaction) => {
        const dossier = await transaction.dossier.findUnique({
          where: { id: parsed.data.dossierId },
          include: {
            member: {
              select: { membershipStatus: true },
            },
            sections: {
              select: { sectionNumber: true, content: true },
            },
          },
        });
        if (!dossier || dossier.status !== "SUBMITTED") {
          throw new DossierWorkflowError("stale");
        }
        if (!isLearningMemberStatus(dossier.member.membershipStatus)) {
          throw new DossierWorkflowError("member_ineligible");
        }
        if (!sectionsAreReady(dossier.sections)) {
          throw new DossierWorkflowError("incomplete");
        }

        const approved = parsed.data.decision === "approve";
        const claimed = await transaction.dossier.updateMany({
          where: { id: dossier.id, status: "SUBMITTED" },
          data: {
            status: approved ? "APPROVED" : "CHANGES_REQUESTED",
            approvedAt: approved ? new Date() : null,
          },
        });
        if (claimed.count !== 1) {
          throw new DossierWorkflowError("stale");
        }

        await transaction.dossierReview.create({
          data: {
            dossierId: dossier.id,
            reviewerId: admin.id,
            decision: approved ? "APPROVE" : "REQUEST_CHANGES",
            note: parsed.data.note ?? null,
          },
        });
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 5_000,
        timeout: 10_000,
      },
    );
  } catch (error) {
    if (error instanceof DossierWorkflowError) {
      adminDetailRedirect(parsed.data.dossierId, error.result);
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034"
    ) {
      adminDetailRedirect(parsed.data.dossierId, "retry");
    }
    console.error("Dossier review failed", error);
    adminDetailRedirect(parsed.data.dossierId, "error");
  }

  revalidatePath("/admin/dossiers");
  revalidatePath(`/admin/dossiers/${parsed.data.dossierId}`);
  revalidatePath("/admin/certifications");
  revalidatePath("/portal/dossier");
  revalidatePath("/portal/certification");
  adminDetailRedirect(
    parsed.data.dossierId,
    parsed.data.decision === "approve" ? "approved" : "changes_requested",
  );
}
