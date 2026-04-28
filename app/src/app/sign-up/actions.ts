"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { signUpSchema } from "@/lib/validation";
import { slugify } from "@/lib/utils";

function uniquify(base: string) {
  return `${base}-${Math.random().toString(36).slice(2, 6)}`;
}

export async function signUpAction(formData: FormData) {
  const parsed = signUpSchema.safeParse({
    email: String(formData.get("email") ?? "").toLowerCase().trim(),
    password: formData.get("password"),
    name: formData.get("name"),
    intent: formData.get("intent") ?? "professional",
  });

  if (!parsed.success) {
    redirect(`/sign-up?err=${encodeURIComponent(parsed.error.errors[0]?.message ?? "Invalid input")}`);
  }
  const { email, password, name, intent } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    redirect(`/sign-up?err=${encodeURIComponent("An account with this email already exists.")}`);
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      email,
      name,
      passwordHash,
      role: intent === "employer" ? "EMPLOYER" : "PROFESSIONAL",
    },
  });

  if (intent === "employer") {
    await prisma.organizationProfile.create({
      data: {
        userId: user.id,
        name: `${name}'s Organization`,
        slug: uniquify(slugify(name) || "org"),
      },
    });
  } else {
    const baseSlug = slugify(name) || "pro";
    let slug = baseSlug;
    while (await prisma.professionalProfile.findUnique({ where: { slug } })) {
      slug = uniquify(baseSlug);
    }
    await prisma.professionalProfile.create({
      data: { userId: user.id, slug, headline: "Becoming AI-adopted", visibility: "PRIVATE" },
    });
  }

  const h = headers();
  await createSession(user.id, {
    userAgent: h.get("user-agent") ?? undefined,
    ip: h.get("x-forwarded-for") ?? undefined,
  });

  redirect(intent === "employer" ? "/employer/dashboard" : "/dashboard");
}
