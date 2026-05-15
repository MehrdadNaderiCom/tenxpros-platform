import type { Metadata } from "next";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form-fields";

export const metadata: Metadata = {
  title: "Login",
};

export default function LoginPage({
  searchParams,
}: {
  searchParams?: { callbackUrl?: string; error?: string };
}) {
  const callbackUrl = searchParams?.callbackUrl ?? "/portal";

  async function login(formData: FormData) {
    "use server";
    try {
      await signIn("credentials", {
        email: String(formData.get("email") ?? ""),
        password: String(formData.get("password") ?? ""),
        redirectTo: String(formData.get("callbackUrl") ?? "/portal"),
      });
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
        <Button className="w-full" type="submit">
          Sign in
        </Button>
      </form>
    </Card>
  );
}
