"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { signInSchema } from "@/lib/validation";

export async function signInAction(formData: FormData) {
  const parsed = signInSchema.safeParse({
    email: String(formData.get("email") ?? "").toLowerCase().trim(),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    redirect(`/sign-in?err=${encodeURIComponent("Please enter a valid email and password.")}`);
  }
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { email },
    include: { professional: { select: { id: true } }, organization: { select: { id: true } } },
  });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    redirect(`/sign-in?err=${encodeURIComponent("Invalid email or password.")}`);
  }

  const h = headers();
  await createSession(user.id, {
    userAgent: h.get("user-agent") ?? undefined,
    ip: h.get("x-forwarded-for") ?? undefined,
  });

  if (user.role === "ADMIN") redirect("/admin");
  if (user.role === "EMPLOYER" || user.organization) redirect("/employer/dashboard");
  redirect("/dashboard");
}
