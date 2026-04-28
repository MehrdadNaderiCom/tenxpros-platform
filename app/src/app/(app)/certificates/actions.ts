"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { generatePublicCertificateId } from "@/lib/utils";
import type { CertificateLevel } from "@prisma/client";
import { evaluateLevel } from "@/lib/certification/eligibility";

export async function requestCertificateAction(level: CertificateLevel) {
  const user = await requireUser();
  if (!user.professionalId) redirect("/sign-in");

  // Compute eligibility server-side again (defence in depth).
  const [latestDiagnostic, taskCount, classifiedCount, evidenceCount, scenarioCount, lessonCount, certs] = await Promise.all([
    prisma.aIReadinessDiagnostic.findFirst({ where: { professionalId: user.professionalId }, orderBy: { createdAt: "desc" } }),
    prisma.professionalTask.count({ where: { professionalId: user.professionalId } }),
    prisma.taskAIClassification.count({ where: { task: { professionalId: user.professionalId } } }),
    prisma.evidenceArtifact.count({ where: { professionalId: user.professionalId } }),
    prisma.scenarioSubmission.count({ where: { professionalId: user.professionalId } }),
    prisma.lessonCompletion.count({ where: { professionalId: user.professionalId } }),
    prisma.certificate.findMany({ where: { professionalId: user.professionalId } }),
  ]);

  const e = evaluateLevel(level, {
    diagnosticCompleted: !!latestDiagnostic,
    basicLiteracyModulesCompleted: lessonCount >= 1 ? 1 : 0,
    rolePathModulesCompleted: lessonCount,
    advancedScenariosCompleted: scenarioCount,
    tasksMapped: taskCount,
    tasksClassified: classifiedCount,
    evidenceCount,
    scenariosCompleted: scenarioCount,
    workflowsBuilt: 0,
    outputQualityEvidence: evidenceCount > 0,
    riskAwarenessPassed: !!latestDiagnostic && (latestDiagnostic.riskAwareness ?? 0) >= 3,
    reviewerApproved: certs.some((c) => c.status === "ISSUED"),
    productivityImprovementEvidence: false,
    implementationDesignSubmitted: false,
    oversightDemonstrated: evidenceCount >= 2,
    teamAdoptionPlan: false,
    enablementMaterials: false,
    governanceScenario: false,
    guidedOthersEvidence: false,
    leadershipEvidence: false,
  });
  if (!e.ready) {
    redirect(`/certificates?err=${encodeURIComponent("Not all requirements are satisfied yet.")}`);
  }

  const existing = certs.find((c) => c.level === level && (c.status === "DRAFT" || c.status === "PENDING_REVIEW" || c.status === "ISSUED"));
  if (existing) {
    redirect(`/certificates?err=${encodeURIComponent("A certificate at this level already exists or is in review.")}`);
  }

  const cert = await prisma.certificate.create({
    data: {
      publicId: generatePublicCertificateId(),
      professionalId: user.professionalId,
      level,
      status: "PENDING_REVIEW",
    },
  });
  await prisma.certificateRequirement.createMany({
    data: e.checks.map((c) => ({ certificateId: cert.id, key: c.key, label: c.label, satisfied: c.satisfied })),
  });
  await prisma.auditLog.create({
    data: { actorId: user.id, action: "CERTIFICATE_REQUESTED", entityType: "Certificate", entityId: cert.id, meta: { level } },
  });

  revalidatePath("/certificates");
  revalidatePath("/dashboard");
  redirect("/certificates?saved=1");
}
