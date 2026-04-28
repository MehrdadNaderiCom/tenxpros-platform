"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { evidenceSchema } from "@/lib/validation";

export async function createEvidenceAction(formData: FormData) {
  const user = await requireUser();
  if (!user.professionalId) redirect("/sign-in");

  const parsed = evidenceSchema.safeParse({
    title: formData.get("title"),
    type: formData.get("type"),
    description: formData.get("description"),
    roleContext: formData.get("roleContext") ?? "",
    aiToolsUsed: formData.get("aiToolsUsed") ?? "",
    humanContribution: formData.get("humanContribution"),
    aiContribution: formData.get("aiContribution"),
    risksConsidered: formData.get("risksConsidered"),
    externalUrl: formData.get("externalUrl") ?? "",
    visibility: formData.get("visibility") ?? "REVIEWERS_ONLY",
  });
  if (!parsed.success) {
    redirect(`/evidence/new?err=${encodeURIComponent(parsed.error.errors[0]?.message ?? "Invalid input")}`);
  }
  const d = parsed.data;
  const tools = String(d.aiToolsUsed ?? "").split(",").map((s) => s.trim()).filter(Boolean);

  await prisma.evidenceArtifact.create({
    data: {
      professionalId: user.professionalId,
      title: d.title,
      type: d.type,
      description: d.description,
      roleContext: d.roleContext || null,
      aiToolsUsed: tools,
      humanContribution: d.humanContribution,
      aiContribution: d.aiContribution,
      risksConsidered: d.risksConsidered,
      externalUrl: d.externalUrl || null,
      visibility: d.visibility,
      status: "SUBMITTED",
    },
  });

  revalidatePath("/evidence");
  revalidatePath("/dashboard");
  redirect("/evidence");
}
