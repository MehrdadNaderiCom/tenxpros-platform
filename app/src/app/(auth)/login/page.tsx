import type { Metadata } from "next";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/form-fields";
import { SubmitButton } from "./submit-button";

export const metadata: Metadata = {
  title: "Login",
};

export default function LoginPage({
  searchParams,
}: {
  searchParams?: { callbackUrl?: string; error?: string };
}) {
  // Default empty: when there's no explicit in-app callback, route by role below.
  const callbackUrl = searchParams?.callbackUrl ?? "";

  async function login(formData: FormData) {
    "use server";
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    const requested = String(formData.get("callbackUrl") ?? "");

    // Route by role: ADMIN -> /admin, PARTNER -> /partner (the Partner Panel),
    // everyone else -> /portal. An explicit in-app callbackUrl is honored only
    // when it suits the user's role, so an approved partner is never bounced into
    // /portal (which middleware blocks for the PARTNER role) and loops at /login.
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { role: true },
    });
    const role = user?.role;
    const home = role === "ADMIN" ? "/admin" : role === "PARTNER" ? "/partner" : "/portal";

    const wanted =
      requested.startsWith("/") && !requested.startsWith("/login") ? requested : "";
    const inArea = (path: string, area: string) => path === area || path.startsWith(`${area}/`);
    let destination = wanted || home;
    if (role === "PARTNER" && !inArea(destination, "/partner")) destination = "/partner";
    if (role !== "ADMIN" && inArea(destination, "/admin")) destination = home;
    if (role !== "PARTNER" && inArea(destination, "/partner")) destination = home;

    try {
      await signIn("credentials", { email, password, redirectTo: destination });
    } catch (error) {
      if (error instanceof AuthError) {
        redirect("/login?error=CredentialsSignin");
      }
      throw error;
    }
  }

  return (
    <Card className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold text-navy-900">Login</h1>
        <p className="text-sm text-slate-600">Access the participant or admin workspace.</p>
      </div>
      {searchParams?.error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          The email or password was not recognized.
        </p>
      ) : null}
      <form action={login} className="space-y-4">
        <input type="hidden" name="callbackUrl" value={callbackUrl} />
        <Field label="Email">
          <Input name="email" type="email" autoComplete="email" required />
        </Field>
        <Field label="Password">
          <Input name="password" type="password" autoComplete="current-password" required />
        </Field>
        <SubmitButton />
      </form>
    </Card>
  );
}
