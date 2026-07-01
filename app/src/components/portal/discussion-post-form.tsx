"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitDiscussionPost } from "@/lib/actions/discussions";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/form-fields";
import { Field } from "@/components/ui/form-field";

export function DiscussionPostForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = () => {
    setError(null);
    setDone(false);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("title", title);
      if (category.trim()) fd.set("category", category.trim());
      fd.set("body", body);
      const result = await submitDiscussionPost(fd);
      if (!result?.ok) {
        setError(result?.message ?? "Could not submit your post.");
        return;
      }
      setDone(true);
      setTitle("");
      setCategory("");
      setBody("");
      router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      {error ? <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      {done ? (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Submitted. It publishes under your name once the company reviews it.
        </p>
      ) : null}
      <Field label="Title">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. How I opened a hospital account" />
      </Field>
      <Field label="Topic" optional>
        <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Prospecting, Delivery, Objections" />
      </Field>
      <Field label="Your experience" description="Write what happened and what others can learn. Only publish real, honest experience.">
        <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={6} />
      </Field>
      <Button type="button" onClick={submit} disabled={isPending}>
        {isPending ? "Submitting…" : "Submit for review"}
      </Button>
    </div>
  );
}
