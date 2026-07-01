"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitSpecialDealRequest } from "@/lib/actions/partner-portal";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/form-fields";
import { Field } from "@/components/ui/form-field";

type DealOption = { id: string; label: string };

export function SpecialDealModal({
  deals = [],
  triggerLabel = "Request a special arrangement",
  triggerVariant = "secondary",
}: {
  deals?: DealOption[];
  triggerLabel?: string;
  triggerVariant?: "primary" | "secondary" | "ghost" | "danger";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [context, setContext] = useState("");
  const [dealId, setDealId] = useState("");
  const [items, setItems] = useState<string[]>([""]);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setTitle("");
    setContext("");
    setDealId("");
    setItems([""]);
    setError(null);
  };

  const setItem = (i: number, value: string) => setItems((prev) => prev.map((v, idx) => (idx === i ? value : v)));
  const addItem = () => setItems((prev) => [...prev, ""]);
  const removeItem = (i: number) => setItems((prev) => (prev.length <= 1 ? prev : prev.filter((_, idx) => idx !== i)));

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("title", title);
      fd.set("context", context);
      if (dealId) fd.set("dealRegistrationId", dealId);
      for (const it of items) {
        if (it.trim()) fd.append("items", it.trim());
      }
      const result = await submitSpecialDealRequest(fd);
      if (!result?.ok) {
        setError(result?.message ?? "Could not submit the request.");
        return;
      }
      setOpen(false);
      reset();
      router.refresh();
    });
  };

  return (
    <>
      <Button type="button" variant={triggerVariant} onClick={() => setOpen(true)}>
        {triggerLabel}
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Request a special arrangement"
        description="Ask for something beyond the standard contract. List each out-of-rule detail separately so the company can decide on each one."
        className="max-w-2xl"
        footer={
          <>
            <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="button" size="sm" onClick={submit} disabled={isPending}>
              {isPending ? "Submitting…" : "Submit request"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {error ? (
            <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}
          <Field label="Title">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Multi-country rollout for one client" />
          </Field>
          <Field label="Context" description="What is the situation, and why does the standard contract not fit.">
            <Textarea value={context} onChange={(e) => setContext(e.target.value)} rows={3} />
          </Field>
          {deals.length > 0 ? (
            <Field label="Link to an opportunity" optional>
              <Select value={dealId} onChange={(e) => setDealId(e.target.value)}>
                <option value="">Not linked to a specific opportunity</option>
                {deals.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.label}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}
          <div className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Out-of-rule details</span>
            {items.map((it, i) => (
              <div key={i} className="flex items-start gap-2">
                <Textarea
                  value={it}
                  onChange={(e) => setItem(i, e.target.value)}
                  rows={2}
                  className="flex-1"
                  placeholder={`Detail ${i + 1}, for example: a higher origination rate for the first two closes.`}
                />
                <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(i)} disabled={items.length <= 1}>
                  Remove
                </Button>
              </div>
            ))}
            <Button type="button" variant="ghost" size="sm" onClick={addItem}>
              Add another detail
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
