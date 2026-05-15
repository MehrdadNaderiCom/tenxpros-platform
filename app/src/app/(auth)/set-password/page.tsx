import { redirect } from "next/navigation";
import { setParticipantPassword } from "@/lib/actions/applications";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/form-fields";

export default function SetPasswordPage({
  searchParams,
}: {
  searchParams?: { email?: string; token?: string; error?: string };
}) {
  async function setPassword(formData: FormData) {
    "use server";
    const result = await setParticipantPassword(formData);
    if (!result.ok) {
      redirect(
        `/set-password?email=${encodeURIComponent(String(formData.get("email") ?? ""))}&token=${encodeURIComponent(String(formData.get("token") ?? ""))}&error=${encodeURIComponent(result.message ?? "Password setup failed.")}`,
      );
    }
    redirect("/login?setup=complete");
  }

  return (
    <Card className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold text-navy-900">Set your password</h1>
        <p className="text-sm text-slate-600">Create your participant login password.</p>
      </div>
      {searchParams?.error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{searchParams.error}</p>
      ) : null}
      <form action={setPassword} className="space-y-4">
        <input type="hidden" name="email" value={searchParams?.email ?? ""} />
        <input type="hidden" name="token" value={searchParams?.token ?? ""} />
        <Field label="Password">
          <Input name="password" type="password" autoComplete="new-password" required />
        </Field>
        <Field label="Confirm password">
          <Input name="confirmPassword" type="password" autoComplete="new-password" required />
        </Field>
        <Button className="w-full" type="submit">
          Set password
        </Button>
      </form>
    </Card>
  );
}
