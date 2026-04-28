"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export async function saveOrgAction(formData: FormData) {
  const user = await requireUser();
  if (user.role !== "EMPLOYER") redirect("/dashboard");

  const org = await prisma.organizationProfile.findUnique({ where: { userId: user.id } });
  if (!org) redirect("/sign-up");

  const name = String(formData.get("name") ?? "").trim();
  if (!name) redirect(`/employer/organization?err=${encodeURIComponent("Name is required.")}`);

  await prisma.organizationProfile.update({
    where: { id: org.id },
    data: {
      name,
      website: String(formData.get("website") ?? "").trim() || null,
      industry: String(formData.get("industry") ?? "").trim() || null,
      size: String(formData.get("size") ?? "").trim() || null,
      location: String(formData.get("location") ?? "").trim() || null,
      description: String(formData.get("description") ?? "").trim() || null,
      contactEmail: String(formData.get("contactEmail") ?? "").trim() || null,
      contactName: String(formData.get("contactName") ?? "").trim() || null,
    },
  });

  revalidatePath("/employer/organization");
  revalidatePath("/employer/dashboard");
  redirect("/employer/organization?saved=1");
}
