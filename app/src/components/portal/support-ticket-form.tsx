"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitSupportTicket } from "@/lib/actions/support";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/form-fields";
import { Field } from "@/components/ui/form-field";

export function SupportTicketForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = () => {
    setError(null);
    setDone(false);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("subject", subject);
      fd.set("body", body);
      const result = await submitSupportTicket(fd);
      if (!result?.ok) {
        setError(result?.message ?? "Could not send your report.");
        return;
      }
      setDone(true);
      setSubject("");
      setBody("");
      router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      {error ? <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      {done ? (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Sent. We received your report and will be in touch.
        </p>
      ) : null}
      <Field label="Subject">
        <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. I cannot submit a deal registration" />
      </Field>
      <Field label="What is happening" description="Describe the problem, what you expected, and any steps to reproduce it.">
        <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5} />
      </Field>
      <Button type="button" onClick={submit} disabled={isPending}>
        {isPending ? "Sending…" : "Send report"}
      </Button>
    </div>
  );
}
