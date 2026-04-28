"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { profileSchema } from "@/lib/validation";

function splitList(value: string | null | undefined): string[] {
  return String(value ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function saveProfileAction(formData: FormData) {
  const user = await requireUser();
  if (!user.professionalId) redirect("/sign-in");

  const parsed = profileSchema.safeParse({
    headline: formData.get("headline") ?? "",
    currentRole: formData.get("currentRole") ?? "",
    targetRole: formData.get("targetRole") ?? "",
    industry: formData.get("industry") ?? "",
    location: formData.get("location") ?? "",
    remotePreference: formData.get("remotePreference") ?? "",
    languages: formData.get("languages") ?? "",
    skills: formData.get("skills") ?? "",
    tools: formData.get("tools") ?? "",
    aiToolsUsed: formData.get("aiToolsUsed") ?? "",
    careerGoals: formData.get("careerGoals") ?? "",
    resumeUrl: formData.get("resumeUrl") ?? "",
    linkedinUrl: formData.get("linkedinUrl") ?? "",
    githubUrl: formData.get("githubUrl") ?? "",
    websiteUrl: formData.get("websiteUrl") ?? "",
    visibility: formData.get("visibility") ?? "PRIVATE",
  });

  if (!parsed.success) {
    redirect(`/profile?err=${encodeURIComponent(parsed.error.errors[0]?.message ?? "Invalid input")}`);
  }
  const data = parsed.data;

  await prisma.professionalProfile.update({
    where: { id: user.professionalId },
    data: {
      headline: data.headline || null,
      currentRole: data.currentRole || null,
      targetRole: data.targetRole || null,
      industry: data.industry || null,
      location: data.location || null,
      remotePreference: data.remotePreference || null,
      languages: splitList(data.languages),
      skills: splitList(data.skills),
      tools: splitList(data.tools),
      aiToolsUsed: splitList(data.aiToolsUsed),
      careerGoals: data.careerGoals || null,
      resumeUrl: data.resumeUrl || null,
      linkedinUrl: data.linkedinUrl || null,
      githubUrl: data.githubUrl || null,
      websiteUrl: data.websiteUrl || null,
      visibility: data.visibility,
    },
  });

  revalidatePath("/profile");
  revalidatePath("/dashboard");
  redirect("/profile?saved=1");
}
