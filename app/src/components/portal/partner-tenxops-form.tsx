"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { requestTenXOpsEngagement } from "@/lib/actions/partner-portal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Select, Textarea } from "@/components/ui/form-fields";
import { Field } from "@/components/ui/form-field";

export function PartnerTenXOpsForm({ accounts }: { accounts: { id: string; legalEntity: string }[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  // Controlled so a server validation error preserves what the partner typed.
  const [accountId, setAccountId] = useState("");
  const [organisation, setOrganisation] = useState("");
  const [justification, setJustification] = useState("");

  if (accounts.length === 0) {
    return (
      <Card className="border-neutral-200">
        <p className="text-sm text-slate-600">
          You can request a TenXOps engagement for an account you coach once you hold a confirmed Registered Account.
        </p>
      </Card>
    );
  }

  const onSubmit = (formData: FormData) => {
    setError(null);
    setDone(false);
    startTransition(async () => {
      const result = await requestTenXOpsEngagement(formData);
      if (!result?.ok) {
        setError(result?.message ?? "Could not submit the request.");
        return;
      }
      setDone(true);
      setAccountId("");
      setOrganisation("");
      setJustification("");
      router.refresh();
    });
  };

  return (
    <Card>
      <h2 className="text-lg font-semibold text-navy-900">Request a TenXOps engagement</h2>
      <p className="mt-1 text-sm text-slate-600">
        If you coach an account, you may request to open a TenXOps engagement case for that organisation, subject to
        Panel Confirmation.
      </p>
      <form action={onSubmit} className="mt-5 space-y-5">
        {error ? <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
        {done ? <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Request submitted — pending Panel Confirmation.</p> : null}
        <Field label="Account you coach">
          <Select name="registeredAccountId" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            <option value="" disabled>
              Select an account
            </option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.legalEntity}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Organisation">
          <Input name="organisation" value={organisation} onChange={(e) => setOrganisation(e.target.value)} placeholder="e.g. Global Bank Ltd" />
        </Field>
        <Field label="The case for an engagement" description="Describe the coaching relationship and why a full organisational engagement is the right next step.">
          <Textarea name="justification" value={justification} onChange={(e) => setJustification(e.target.value)} placeholder="For example: I have coached three of their teams; the COO wants a structured org-wide AI adoption programme." />
        </Field>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Submitting…" : "Request engagement"}
        </Button>
      </form>
    </Card>
  );
}
