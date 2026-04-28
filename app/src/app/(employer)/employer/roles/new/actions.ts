"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import type { CertificateLevel, WorkMode } from "@prisma/client";

const VALID_LEVELS: CertificateLevel[] = [
  "L1_AI_READY", "L2_AI_ADOPTED", "L3_AI_AUGMENTED", "L4_AI_IMPLEMENTER", "L5_AI_LEADER",
];
const VALID_MODES: WorkMode[] = [
  "HUMAN_LED", "AI_ASSISTED", "RULES_BASED", "AUTOMATED", "AI_TOOL_CHAIN", "ESCALATE", "NOT_SUITABLE",
];

function splitList(value: FormDataEntryValue | null): string[] {
  return String(value ?? "").split(",").map((s) => s.trim()).filter(Boolean);
}

export async function createRoleAction(formData: FormData) {
  const user = await requireUser();
  if (user.role !== "EMPLOYER") redirect("/dashboard");
  const org = await prisma.organizationProfile.findUnique({ where: { userId: user.id } });
  if (!org) redirect("/employer/organization");

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  if (!title || !description) {
    redirect(`/employer/roles/new?err=${encodeURIComponent("Title and description are required.")}`);
  }
  const levelRaw = String(formData.get("minCertificateLevel") ?? "L1_AI_READY");
  const minCertificateLevel: CertificateLevel = VALID_LEVELS.includes(levelRaw as CertificateLevel)
    ? (levelRaw as CertificateLevel)
    : "L1_AI_READY";

  const aiWorkModes = splitList(formData.get("aiWorkModes"))
    .map((s) => s.toUpperCase() as WorkMode)
    .filter((m) => VALID_MODES.includes(m));

  await prisma.employerRoleNeed.create({
    data: {
      organizationId: org.id,
      title,
      description,
      industry: String(formData.get("industry") ?? "").trim() || null,
      location: String(formData.get("location") ?? "").trim() || null,
      engagementType: String(formData.get("engagementType") ?? "").trim() || null,
      budgetRange: String(formData.get("budgetRange") ?? "").trim() || null,
      skillsRequired: splitList(formData.get("skillsRequired")),
      aiWorkModes,
      minCertificateLevel,
      status: "OPEN",
    },
  });

  revalidatePath("/employer/roles");
  redirect("/employer/roles");
}
