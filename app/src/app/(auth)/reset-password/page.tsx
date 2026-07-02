import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { setParticipantPassword } from "@/lib/actions/applications";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/form-fields";

export const metadata: Metadata = {
  title: "Reset password",
};

export default function ResetPasswordPage({
  searchParams,
}: {
  searchParams?: { email?: string; token?: string; error?: string };
}) {
  const email = searchParams?.email ?? "";
  const token = searchParams?.token ?? "";

  // Guard against a link that lost its parameters: send the person back to
  // request a fresh one rather than showing a broken form.
  if (!email || !token) {
    return (
      <Card className="space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold text-navy-900">This reset link is incomplete</h1>
          <p className="text-sm text-slate-600">
            The link may have been copied incorrectly or is missing information. Request a new one
            to continue.
          </p>
        </div>
        <p className="text-center text-sm text-slate-600">
          <Link href="/forgot-password" className="font-medium text-navy-900">
            Request a new reset link
          </Link>
        </p>
      </Card>
    );
  }

  async function resetPassword(formData: FormData) {
    "use server";
    const result = await setParticipantPassword(formData);
    if (!result.ok) {
      redirect(
        `/reset-password?email=${encodeURIComponent(String(formData.get("email") ?? ""))}&token=${encodeURIComponent(String(formData.get("token") ?? ""))}&error=${encodeURIComponent(result.message ?? "Password reset failed.")}`,
      );
    }
    redirect("/login?reset=complete");
  }

  return (
    <Card className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold text-navy-900">Reset your password</h1>
        <p className="text-sm text-slate-600">Choose a new password for your account.</p>
      </div>
      {searchParams?.error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{searchParams.error}</p>
      ) : null}
      <form action={resetPassword} className="space-y-4">
        <input type="hidden" name="email" value={email} />
        <input type="hidden" name="token" value={token} />
        <Field label="New password">
          <Input name="password" type="password" autoComplete="new-password" required />
        </Field>
        <Field label="Confirm new password">
          <Input name="confirmPassword" type="password" autoComplete="new-password" required />
        </Field>
        <Button className="w-full" type="submit">
          Reset password
        </Button>
      </form>
    </Card>
  );
}
