"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { diagnosticSchema } from "@/lib/validation";
import type { CertificateLevel } from "@prisma/client";

function score(values: number[]): number {
  // 8 dimensions, each 0-5 → normalize to 0-100
  const sum = values.reduce((a, b) => a + b, 0);
  return Math.round((sum / (values.length * 5)) * 100);
}

function recommendCertificate(s: number): CertificateLevel {
  if (s >= 75) return "L3_AI_AUGMENTED";
  if (s >= 55) return "L2_AI_ADOPTED";
  return "L1_AI_READY";
}

function buildReport(input: {
  aiLiteracy: number; toolFamiliarity: number; prompting: number; automationAwareness: number;
  riskAwareness: number; outputEvaluation: number; roleSpecificUse: number; englishComm: number;
  jobSearchStatus: string; dailyTasks: string; painPoints: string; targetOutcomes: string;
  computedScore: number;
}) {
  const strengths: string[] = [];
  const gaps: string[] = [];
  const recommendedTracks: string[] = [];
  const recommendedWorkflows: string[] = [];
  const recommendedArtifacts: string[] = [];

  const tag = (label: string, val: number) => (val >= 4 ? strengths.push(label) : val <= 2 ? gaps.push(label) : null);
  tag("AI literacy", input.aiLiteracy);
  tag("Tool familiarity", input.toolFamiliarity);
  tag("Prompting", input.prompting);
  tag("Automation awareness", input.automationAwareness);
  tag("Risk & privacy awareness", input.riskAwareness);
  tag("Output evaluation", input.outputEvaluation);
  tag("Role-specific use", input.roleSpecificUse);
  tag("Professional communication", input.englishComm);

  if (input.aiLiteracy <= 2) recommendedTracks.push("AI Literacy for Professionals");
  if (input.prompting <= 3) recommendedTracks.push("Personal AI Productivity");
  if (input.riskAwareness <= 3) recommendedTracks.push("AI Risk, Privacy, and Responsible Use");
  if (input.outputEvaluation <= 3) recommendedTracks.push("AI Output Evaluation and Quality Control");
  if (input.automationAwareness <= 3) recommendedTracks.push("AI Workflow Design");
  if (input.roleSpecificUse <= 3) recommendedTracks.push("Role-specific AI Adoption (pick your role)");
  if (input.englishComm <= 3) recommendedTracks.push("AI for Professional English and Communication");
  if (/job|search|interview|switch/i.test(input.jobSearchStatus)) recommendedTracks.push("AI for Job Search and Career Growth");

  recommendedWorkflows.push("Pick one weekly task and rebuild it as an AI-assisted workflow with a documented review step.");
  recommendedWorkflows.push("Run a Personal Task Radar pass: classify five recurring tasks by work mode.");
  if (input.outputEvaluation <= 3) recommendedWorkflows.push("Add a 3-point output evaluation checklist to every AI-assisted artifact.");

  recommendedArtifacts.push("A before/after artifact showing AI-augmented work with a decision log.");
  recommendedArtifacts.push("A risk control note for one confidential task you would not delegate to AI.");

  const summary =
    `Your AI readiness score is ${input.computedScore}/100. ` +
    (input.computedScore >= 75
      ? "You're operating at a specialist level. The next step is showing measurable improvements and designing tool chains."
      : input.computedScore >= 55
        ? "You're a solid practitioner. Build repeatable workflows in your role and capture evidence."
        : "You have a working baseline. Lock in literacy, risk awareness and a first repeatable workflow.") +
    " Use the recommended tracks below to fill the highest-leverage gaps.";

  return {
    summary,
    strengths: strengths.length ? strengths : ["You showed up and did the diagnostic — that already separates you."],
    gaps: gaps.length ? gaps : ["No major gaps; focus on evidence quality."],
    recommendedTracks,
    recommendedCertificate: recommendCertificate(input.computedScore),
    recommendedWorkflows,
    recommendedArtifacts,
  };
}

export async function saveDiagnosticAction(formData: FormData) {
  const user = await requireUser();
  if (!user.professionalId) redirect("/sign-in");

  const parsed = diagnosticSchema.safeParse({
    aiLiteracy: formData.get("aiLiteracy"),
    toolFamiliarity: formData.get("toolFamiliarity"),
    prompting: formData.get("prompting"),
    automationAwareness: formData.get("automationAwareness"),
    riskAwareness: formData.get("riskAwareness"),
    outputEvaluation: formData.get("outputEvaluation"),
    roleSpecificUse: formData.get("roleSpecificUse"),
    englishComm: formData.get("englishComm"),
    jobSearchStatus: formData.get("jobSearchStatus"),
    dailyTasks: formData.get("dailyTasks"),
    painPoints: formData.get("painPoints"),
    targetOutcomes: formData.get("targetOutcomes"),
  });

  if (!parsed.success) {
    redirect(`/diagnostic?err=${encodeURIComponent(parsed.error.errors[0]?.message ?? "Invalid input")}`);
  }
  const d = parsed.data;
  const computedScore = score([
    d.aiLiteracy, d.toolFamiliarity, d.prompting, d.automationAwareness,
    d.riskAwareness, d.outputEvaluation, d.roleSpecificUse, d.englishComm,
  ]);

  const diagnostic = await prisma.aIReadinessDiagnostic.create({
    data: {
      professionalId: user.professionalId,
      aiLiteracy: d.aiLiteracy,
      toolFamiliarity: d.toolFamiliarity,
      prompting: d.prompting,
      automationAwareness: d.automationAwareness,
      riskAwareness: d.riskAwareness,
      outputEvaluation: d.outputEvaluation,
      roleSpecificUse: d.roleSpecificUse,
      englishComm: d.englishComm,
      jobSearchStatus: d.jobSearchStatus,
      dailyTasks: d.dailyTasks,
      painPoints: d.painPoints,
      targetOutcomes: d.targetOutcomes,
      computedScore,
    },
  });

  const report = buildReport({ ...d, computedScore });

  await prisma.aIReadinessReport.create({
    data: {
      diagnosticId: diagnostic.id,
      professionalId: user.professionalId,
      summary: report.summary,
      strengths: report.strengths,
      gaps: report.gaps,
      recommendedTracks: report.recommendedTracks,
      recommendedCertificate: report.recommendedCertificate,
      recommendedWorkflows: report.recommendedWorkflows,
      recommendedArtifacts: report.recommendedArtifacts,
      generatedByAI: false,
    },
  });

  await prisma.professionalProfile.update({
    where: { id: user.professionalId },
    data: { readinessScore: computedScore },
  });

  revalidatePath("/diagnostic");
  revalidatePath("/dashboard");
  redirect("/diagnostic?saved=1");
}
