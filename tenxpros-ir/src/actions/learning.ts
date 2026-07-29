"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireCurrentAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  diagnosticOverallScore,
  type DiagnosticScores,
} from "@/lib/learning";
import { requireLearningMember } from "@/lib/learning-access";
import {
  diagnosticReviewSchema,
  diagnosticSubmissionSchema,
  moduleProgressSchema,
} from "@/lib/learning-validation";

class LearningWorkflowError extends Error {
  constructor(readonly result: string) {
    super(result);
    this.name = "LearningWorkflowError";
  }
}

function diagnosticRedirect(result: string): never {
  redirect(`/portal/diagnostic?result=${encodeURIComponent(result)}`);
}

function programRedirect(result: string): never {
  redirect(`/portal/program?result=${encodeURIComponent(result)}`);
}

function adminDiagnosticRedirect(result: string): never {
  redirect(`/admin/diagnostics?result=${encodeURIComponent(result)}`);
}

function diagnosticScoresFromSubmission(
  data: {
    strategyScore?: number;
    workflowScore?: number;
    dataScore?: number;
    deliveryScore?: number;
    governanceScore?: number;
  },
): DiagnosticScores | null {
  const values = [
    data.strategyScore,
    data.workflowScore,
    data.dataScore,
    data.deliveryScore,
    data.governanceScore,
  ];
  if (values.some((value) => value === undefined)) return null;
  return {
    strategyScore: data.strategyScore as number,
    workflowScore: data.workflowScore as number,
    dataScore: data.dataScore as number,
    deliveryScore: data.deliveryScore as number,
    governanceScore: data.governanceScore as number,
  };
}

export async function saveDiagnosticAction(formData: FormData) {
  const member = await requireLearningMember();
  const parsed = diagnosticSubmissionSchema.safeParse({
    intent: formData.get("intent"),
    strategyScore: formData.get("strategyScore"),
    workflowScore: formData.get("workflowScore"),
    dataScore: formData.get("dataScore"),
    deliveryScore: formData.get("deliveryScore"),
    governanceScore: formData.get("governanceScore"),
    primaryGoal: formData.get("primaryGoal"),
    coreChallenge: formData.get("coreChallenge"),
    evidenceContext: formData.get("evidenceContext"),
  });
  if (!parsed.success) diagnosticRedirect("invalid");

  const scores = diagnosticScoresFromSubmission(parsed.data);
  if (parsed.data.intent === "submit" && !scores) {
    diagnosticRedirect("invalid");
  }

  try {
    await db.$transaction(
      async (transaction) => {
        const existing = await transaction.diagnostic.findUnique({
          where: { memberId: member.id },
          select: { id: true, status: true },
        });
        if (existing && existing.status !== "IN_PROGRESS") {
          throw new LearningWorkflowError("locked");
        }

        const submitted = parsed.data.intent === "submit";
        const data = {
          strategyScore: parsed.data.strategyScore ?? null,
          workflowScore: parsed.data.workflowScore ?? null,
          dataScore: parsed.data.dataScore ?? null,
          deliveryScore: parsed.data.deliveryScore ?? null,
          governanceScore: parsed.data.governanceScore ?? null,
          primaryGoal: parsed.data.primaryGoal ?? null,
          coreChallenge: parsed.data.coreChallenge ?? null,
          evidenceContext: parsed.data.evidenceContext ?? null,
          overallScore:
            submitted && scores ? diagnosticOverallScore(scores) : null,
          status: submitted ? ("SUBMITTED" as const) : ("IN_PROGRESS" as const),
          submittedAt: submitted ? new Date() : null,
        };

        if (existing) {
          await transaction.diagnostic.update({
            where: { id: existing.id },
            data,
          });
        } else {
          await transaction.diagnostic.create({
            data: { ...data, memberId: member.id },
          });
        }
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 5_000,
        timeout: 10_000,
      },
    );
  } catch (error) {
    if (error instanceof LearningWorkflowError) {
      diagnosticRedirect(error.result);
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034"
    ) {
      diagnosticRedirect("retry");
    }
    console.error("Diagnostic persistence failed", error);
    diagnosticRedirect("error");
  }

  revalidatePath("/portal/diagnostic");
  revalidatePath("/portal/certification");
  revalidatePath("/admin/diagnostics");
  revalidatePath("/admin/certifications");
  diagnosticRedirect(parsed.data.intent === "submit" ? "submitted" : "saved");
}

export async function reviewDiagnosticAction(formData: FormData) {
  const admin = await requireCurrentAdmin();
  const parsed = diagnosticReviewSchema.safeParse({
    diagnosticId: formData.get("diagnosticId"),
    reviewerNote: formData.get("reviewerNote"),
  });
  if (!parsed.success) adminDiagnosticRedirect("invalid");

  const reviewed = await db.diagnostic.updateMany({
    where: {
      id: parsed.data.diagnosticId,
      status: "SUBMITTED",
      reviewedAt: null,
    },
    data: {
      status: "REVIEWED",
      reviewerNote: parsed.data.reviewerNote,
      reviewedAt: new Date(),
      reviewedById: admin.id,
    },
  });
  if (reviewed.count !== 1) adminDiagnosticRedirect("stale");

  revalidatePath("/admin/diagnostics");
  revalidatePath("/admin/certifications");
  revalidatePath("/portal/diagnostic");
  revalidatePath("/portal/certification");
  adminDiagnosticRedirect("reviewed");
}

export async function saveModuleProgressAction(formData: FormData) {
  const member = await requireLearningMember();
  const parsed = moduleProgressSchema.safeParse({
    moduleNumber: formData.get("moduleNumber"),
    intent: formData.get("intent"),
    reflection: formData.get("reflection"),
    evidenceUrl: formData.get("evidenceUrl"),
  });
  if (!parsed.success) programRedirect("invalid");

  try {
    await db.$transaction(
      async (transaction) => {
        const diagnostic = await transaction.diagnostic.findUnique({
          where: { memberId: member.id },
          select: { status: true },
        });
        if (diagnostic?.status !== "REVIEWED") {
          throw new LearningWorkflowError("diagnostic_required");
        }

        const existing = await transaction.programModuleProgress.findUnique({
          where: {
            memberId_moduleNumber: {
              memberId: member.id,
              moduleNumber: parsed.data.moduleNumber,
            },
          },
          select: { id: true, status: true },
        });
        if (existing?.status === "COMPLETED") {
          throw new LearningWorkflowError("locked");
        }

        if (parsed.data.moduleNumber > 1) {
          const previous =
            await transaction.programModuleProgress.findUnique({
              where: {
                memberId_moduleNumber: {
                  memberId: member.id,
                  moduleNumber: parsed.data.moduleNumber - 1,
                },
              },
              select: { status: true },
            });
          if (previous?.status !== "COMPLETED") {
            throw new LearningWorkflowError("sequence");
          }
        }

        const completed = parsed.data.intent === "complete";
        const data = {
          reflection: parsed.data.reflection ?? null,
          evidenceUrl: parsed.data.evidenceUrl ?? null,
          status: completed ? ("COMPLETED" as const) : ("IN_PROGRESS" as const),
          completedAt: completed ? new Date() : null,
        };

        if (existing) {
          await transaction.programModuleProgress.update({
            where: { id: existing.id },
            data,
          });
        } else {
          await transaction.programModuleProgress.create({
            data: {
              ...data,
              memberId: member.id,
              moduleNumber: parsed.data.moduleNumber,
            },
          });
        }
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 5_000,
        timeout: 10_000,
      },
    );
  } catch (error) {
    if (error instanceof LearningWorkflowError) {
      programRedirect(error.result);
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034"
    ) {
      programRedirect("retry");
    }
    console.error("Module progress persistence failed", error);
    programRedirect("error");
  }

  revalidatePath("/portal/program");
  revalidatePath("/portal/certification");
  revalidatePath("/admin/certifications");
  programRedirect(parsed.data.intent === "complete" ? "completed" : "saved");
}
