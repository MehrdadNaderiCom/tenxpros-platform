"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export async function completeLessonAction(lessonId: string, trackSlug: string, lessonSlug: string) {
  const user = await requireUser();
  if (!user.professionalId) redirect("/sign-in");

  await prisma.lessonCompletion.upsert({
    where: { lessonId_professionalId: { lessonId, professionalId: user.professionalId } },
    create: { lessonId, professionalId: user.professionalId },
    update: { completedAt: new Date() },
  });

  revalidatePath(`/learning/${trackSlug}/${lessonSlug}`);
  revalidatePath(`/learning/${trackSlug}`);
  revalidatePath("/dashboard");
}
