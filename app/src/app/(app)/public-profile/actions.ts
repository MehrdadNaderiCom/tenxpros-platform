"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export async function savePublicProfileAction(formData: FormData) {
  const user = await requireUser();
  if (!user.professionalId) redirect("/sign-in");

  const headline = String(formData.get("headline") ?? "").slice(0, 200) || null;
  const bio = String(formData.get("bio") ?? "").slice(0, 4000) || null;
  const showCertificates = formData.get("showCertificates") === "on";
  const showEvidence = formData.get("showEvidence") === "on";
  const showSkills = formData.get("showSkills") === "on";

  const profile = await prisma.professionalProfile.findUnique({ where: { id: user.professionalId } });
  if (!profile) redirect("/sign-in");

  await prisma.publicProfile.upsert({
    where: { professionalId: user.professionalId },
    create: {
      professionalId: user.professionalId,
      slug: profile.slug,
      headline,
      bio,
      showCertificates,
      showEvidence,
      showSkills,
    },
    update: { headline, bio, showCertificates, showEvidence, showSkills },
  });

  revalidatePath("/public-profile");
  revalidatePath(`/pros/${profile.slug}`);
  redirect("/public-profile?saved=1");
}
