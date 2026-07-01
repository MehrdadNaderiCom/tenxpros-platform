"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { postDealMessage } from "@/lib/actions/partner-portal";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/form-fields";

export function DealMessageForm({ dealId }: { dealId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("dealRegistrationId", dealId);
      fd.set("body", body);
      const result = await postDealMessage(fd);
      if (!result?.ok) {
        setError(result?.message ?? "Could not post the message.");
        return;
      }
      setBody("");
      router.refresh();
    });
  };

  return (
    <div className="space-y-3">
      {error ? (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Write a reply to the company about this opportunity."
        rows={3}
      />
      <Button type="button" onClick={submit} disabled={isPending || body.trim().length < 2}>
        {isPending ? "Sending…" : "Post message"}
      </Button>
    </div>
  );
}
