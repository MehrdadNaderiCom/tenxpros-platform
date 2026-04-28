"use server";

import { redirect } from "next/navigation";
import { contactSchema } from "@/lib/validation";
import { prisma } from "@/lib/db";

export async function contactAction(formData: FormData) {
  const parsed = contactSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    organization: formData.get("organization"),
    intent: formData.get("intent") ?? "professional",
    message: formData.get("message"),
  });

  if (!parsed.success) {
    redirect(`/contact?sent=0&err=${encodeURIComponent(parsed.error.message.slice(0, 200))}`);
  }

  await prisma.auditLog.create({
    data: {
      action: "CONTACT_FORM",
      meta: parsed.data as unknown as object,
    },
  });

  redirect("/contact?sent=1");
}
