"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export async function createRequestAction(formData: FormData) {
  const user = await requireUser();
  if (user.role !== "EMPLOYER") redirect("/dashboard");
  const org = await prisma.organizationProfile.findUnique({ where: { userId: user.id } });
  if (!org) redirect("/employer/organization");

  const kind = String(formData.get("kind") ?? "intro").slice(0, 32);
  const roleNeedId = String(formData.get("roleNeedId") ?? "") || null;
  const professionalId = String(formData.get("professionalId") ?? "") || null;
  const message = String(formData.get("message") ?? "").trim();

  if (!message) redirect("/employer/request?err=" + encodeURIComponent("Message is required."));

  await prisma.employerRequest.create({
    data: {
      organizationId: org.id,
      kind,
      roleNeedId,
      professionalId,
      message,
      status: "NEW",
    },
  });

  revalidatePath("/employer/dashboard");
  revalidatePath("/employer/request");
  redirect("/employer/request?saved=1");
}
