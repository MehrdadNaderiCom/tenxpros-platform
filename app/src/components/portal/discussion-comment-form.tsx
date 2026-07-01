"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { postDiscussionComment } from "@/lib/actions/discussions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/form-fields";

export function DiscussionCommentForm({ postId }: { postId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("postId", postId);
      fd.set("body", body);
      const result = await postDiscussionComment(fd);
      if (!result?.ok) {
        setError(result?.message ?? "Could not post the comment.");
        return;
      }
      setBody("");
      router.refresh();
    });
  };

  return (
    <div className="space-y-3">
      {error ? <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} placeholder="Add a thoughtful comment." />
      <Button type="button" onClick={submit} disabled={isPending || body.trim().length < 2}>
        {isPending ? "Posting…" : "Post comment"}
      </Button>
    </div>
  );
}
