import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requestPasswordReset } from "@/lib/actions/auth-reset";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/form-fields";

export const metadata: Metadata = {
  title: "Forgot password",
};

export default function ForgotPasswordPage({
  searchParams,
}: {
  searchParams?: { sent?: string };
}) {
  async function submit(formData: FormData) {
    "use server";
    await requestPasswordReset(formData);
    // Always land on the same neutral confirmation, whether or not the email
    // matched an account, so the form never reveals which addresses are registered.
    redirect("/forgot-password?sent=1");
  }

  if (searchParams?.sent) {
    return (
      <Card className="space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold text-navy-900">Check your email</h1>
          <p className="text-sm text-slate-600">
            If an account exists for that email, we have sent a link to reset your password. The
            link is valid for one hour and can be used once.
          </p>
        </div>
        <p className="text-center text-sm text-slate-600">
          <Link href="/login" className="font-medium text-navy-900">
            Back to login
          </Link>
        </p>
      </Card>
    );
  }

  return (
    <Card className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold text-navy-900">Forgot your password?</h1>
        <p className="text-sm text-slate-600">
          Enter the email you use to sign in and we will send you a link to reset it.
        </p>
      </div>
      <form action={submit} className="space-y-4">
        <Field label="Email">
          <Input name="email" type="email" autoComplete="email" required />
        </Field>
        <Button className="w-full" type="submit">
          Send reset link
        </Button>
      </form>
      <p className="text-center text-sm text-slate-600">
        Remembered it?{" "}
        <Link href="/login" className="font-medium text-navy-900">
          Back to login
        </Link>
      </p>
    </Card>
  );
}
