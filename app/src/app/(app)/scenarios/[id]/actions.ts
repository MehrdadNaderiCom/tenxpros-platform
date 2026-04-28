"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { scenarioSubmissionSchema } from "@/lib/validation";

export async function submitScenarioAction(scenarioId: string, formData: FormData) {
  const user = await requireUser();
  if (!user.professionalId) redirect("/sign-in");

  const parsed = scenarioSubmissionSchema.safeParse({
    scenarioId,
    humanSteps: formData.get("humanSteps"),
    aiSteps: formData.get("aiSteps"),
    toolsUsed: formData.get("toolsUsed") ?? "",
    promptOutline: formData.get("promptOutline"),
    riskControls: formData.get("riskControls"),
    reviewProcess: formData.get("reviewProcess"),
    finalOutput: formData.get("finalOutput"),
    workModeChoice: formData.get("workModeChoice"),
    workModeReason: formData.get("workModeReason"),
  });

  if (!parsed.success) {
    redirect(`/scenarios/${scenarioId}?err=${encodeURIComponent(parsed.error.errors[0]?.message ?? "Invalid input")}`);
  }
  const d = parsed.data;
  const tools = String(d.toolsUsed ?? "").split(",").map((s) => s.trim()).filter(Boolean);

  await prisma.scenarioSubmission.create({
    data: {
      scenarioId,
      professionalId: user.professionalId,
      humanSteps: d.humanSteps,
      aiSteps: d.aiSteps,
      toolsUsed: tools,
      promptOutline: d.promptOutline,
      riskControls: d.riskControls,
      reviewProcess: d.reviewProcess,
      finalOutput: d.finalOutput,
      workModeChoice: d.workModeChoice,
      workModeReason: d.workModeReason,
      status: "SUBMITTED",
    },
  });

  revalidatePath(`/scenarios/${scenarioId}`);
  revalidatePath("/dashboard");
  redirect(`/scenarios/${scenarioId}?saved=1`);
}
