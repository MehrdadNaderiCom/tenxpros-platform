"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { taskSchema } from "@/lib/validation";
import { classifyTask } from "@/lib/tasks/classifier";

export async function createTaskAction(formData: FormData) {
  const user = await requireUser();
  if (!user.professionalId) redirect("/sign-in");

  const parsed = taskSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    roleContext: formData.get("roleContext") ?? "",
    frequency: formData.get("frequency") ?? "WEEKLY",
    businessValue: formData.get("businessValue"),
    complexity: formData.get("complexity"),
    riskLevel: formData.get("riskLevel") ?? "LOW",
    confidentiality: formData.get("confidentiality") ?? "INTERNAL",
    humanJudgment: formData.get("humanJudgment"),
    aiSuitability: formData.get("aiSuitability"),
    automationPotential: formData.get("automationPotential"),
    notes: formData.get("notes") ?? "",
  });

  if (!parsed.success) {
    redirect(`/tasks/new?err=${encodeURIComponent(parsed.error.errors[0]?.message ?? "Invalid input")}`);
  }
  const t = parsed.data;
  const classification = classifyTask({
    businessValue: t.businessValue,
    complexity: t.complexity,
    humanJudgment: t.humanJudgment,
    aiSuitability: t.aiSuitability,
    automationPotential: t.automationPotential,
    riskLevel: t.riskLevel,
    confidentiality: t.confidentiality,
  });

  const task = await prisma.professionalTask.create({
    data: {
      professionalId: user.professionalId,
      title: t.title,
      description: t.description,
      roleContext: t.roleContext || null,
      frequency: t.frequency,
      businessValue: t.businessValue,
      complexity: t.complexity,
      riskLevel: t.riskLevel,
      confidentiality: t.confidentiality,
      humanJudgment: t.humanJudgment,
      aiSuitability: t.aiSuitability,
      automationPotential: t.automationPotential,
      recommendedMode: classification.mode,
      notes: t.notes || null,
    },
  });

  await prisma.taskAIClassification.create({
    data: {
      taskId: task.id,
      mode: classification.mode,
      rationale: classification.rationale,
      generatedByAI: false,
    },
  });

  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  redirect("/tasks");
}
