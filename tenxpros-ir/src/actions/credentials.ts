"use server";

import { randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireCurrentAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  CERTIFICATION_TITLE,
  credentialPrerequisiteFailure,
} from "@/lib/learning";
import {
  credentialIssueSchema,
  credentialRevokeSchema,
} from "@/lib/learning-validation";

class CredentialWorkflowError extends Error {
  constructor(readonly result: string) {
    super(result);
    this.name = "CredentialWorkflowError";
  }
}

function certificationRedirect(result: string): never {
  redirect(`/admin/certifications?result=${encodeURIComponent(result)}`);
}

function createCredentialCode(issuedAt: Date) {
  return `DBC-IR-${issuedAt.getUTCFullYear()}-${randomBytes(6)
    .toString("hex")
    .toUpperCase()}`;
}

function revalidateCredentialViews(input: {
  credentialId?: string;
  code?: string;
}) {
  revalidatePath("/admin/certifications");
  revalidatePath("/portal/certification");
  revalidatePath("/directory");
  if (input.code) revalidatePath(`/verify/${input.code}`);
  if (input.credentialId) {
    revalidatePath(`/certificate/${input.credentialId}`);
  }
}

export async function issueCredentialAction(formData: FormData) {
  const admin = await requireCurrentAdmin();
  const parsed = credentialIssueSchema.safeParse({
    dossierId: formData.get("dossierId"),
  });
  if (!parsed.success) certificationRedirect("invalid");

  let issuedCredential: { id: string; code: string } | null = null;

  try {
    issuedCredential = await db.$transaction(
      async (transaction) => {
        const dossier = await transaction.dossier.findUnique({
          where: { id: parsed.data.dossierId },
          select: {
            id: true,
            status: true,
            approvedAt: true,
            credential: { select: { id: true } },
            member: {
              select: {
                id: true,
                fullName: true,
                membershipStatus: true,
                diagnostic: { select: { status: true } },
                programModuleProgress: {
                  where: { status: "COMPLETED" },
                  select: { moduleNumber: true },
                },
              },
            },
          },
        });

        if (!dossier) {
          throw new CredentialWorkflowError("dossier_required");
        }
        if (dossier.credential) {
          throw new CredentialWorkflowError("already_issued");
        }
        const prerequisiteFailure = credentialPrerequisiteFailure({
          dossierStatus: dossier.status,
          dossierApprovedAt: dossier.approvedAt,
          membershipStatus: dossier.member.membershipStatus,
          diagnosticStatus: dossier.member.diagnostic?.status,
          completedModuleNumbers: dossier.member.programModuleProgress.map(
            (module) => module.moduleNumber,
          ),
        });
        if (prerequisiteFailure) {
          throw new CredentialWorkflowError(prerequisiteFailure);
        }

        const issuedAt = new Date();
        const credential = await transaction.credential.create({
          data: {
            code: createCredentialCode(issuedAt),
            recipientName: dossier.member.fullName,
            certificationTitle: CERTIFICATION_TITLE,
            issuedAt,
            status: "ISSUED",
            memberId: dossier.member.id,
            dossierId: dossier.id,
            issuedById: admin.id,
          },
          select: { id: true, code: true },
        });

        await transaction.user.update({
          where: { id: dossier.member.id },
          data: { membershipStatus: "GRADUATED" },
        });
        await transaction.application.updateMany({
          where: {
            userId: dossier.member.id,
            status: "ACTIVE",
          },
          data: {
            status: "GRADUATED",
            graduatedAt: issuedAt,
          },
        });

        return credential;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 5_000,
        timeout: 10_000,
      },
    );
  } catch (error) {
    if (error instanceof CredentialWorkflowError) {
      certificationRedirect(error.result);
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2002" || error.code === "P2034")
    ) {
      certificationRedirect("retry");
    }
    console.error("Credential issuance failed", error);
    certificationRedirect("error");
  }

  if (!issuedCredential) certificationRedirect("error");
  revalidateCredentialViews({
    credentialId: issuedCredential.id,
    code: issuedCredential.code,
  });
  certificationRedirect("issued");
}

export async function revokeCredentialAction(formData: FormData) {
  await requireCurrentAdmin();
  const parsed = credentialRevokeSchema.safeParse({
    credentialId: formData.get("credentialId"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) certificationRedirect("invalid_revocation");

  let revokedCredential: { id: string; code: string } | null = null;

  try {
    revokedCredential = await db.$transaction(
      async (transaction) => {
        const credential = await transaction.credential.findUnique({
          where: { id: parsed.data.credentialId },
          select: { id: true, code: true, status: true, revokedAt: true },
        });
        if (
          !credential ||
          credential.status !== "ISSUED" ||
          credential.revokedAt
        ) {
          throw new CredentialWorkflowError("stale");
        }

        const claimed = await transaction.credential.updateMany({
          where: {
            id: credential.id,
            status: "ISSUED",
            revokedAt: null,
          },
          data: {
            status: "REVOKED",
            revokedAt: new Date(),
            revocationReason: parsed.data.reason,
          },
        });
        if (claimed.count !== 1) {
          throw new CredentialWorkflowError("stale");
        }

        return { id: credential.id, code: credential.code };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 5_000,
        timeout: 10_000,
      },
    );
  } catch (error) {
    if (error instanceof CredentialWorkflowError) {
      certificationRedirect(error.result);
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034"
    ) {
      certificationRedirect("retry");
    }
    console.error("Credential revocation failed", error);
    certificationRedirect("error");
  }

  if (!revokedCredential) certificationRedirect("error");
  revalidateCredentialViews({
    credentialId: revokedCredential.id,
    code: revokedCredential.code,
  });
  certificationRedirect("revoked");
}
