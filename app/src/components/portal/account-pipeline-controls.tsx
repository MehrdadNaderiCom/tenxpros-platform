"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { advanceAccountStage, logAccountActivity } from "@/lib/actions/partner-portal";
import {
  ACCOUNT_ACTIVITY_KINDS,
  ACCOUNT_ACTIVITY_KIND_LABELS,
  ACCOUNT_STAGE_LABELS,
  ACCOUNT_STAGE_ORDER,
} from "@/lib/partner/constants";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, Textarea } from "@/components/ui/form-fields";
import { Field } from "@/components/ui/form-field";
import type { AccountStage } from "@prisma/client";

function Notice({ error, done, doneText }: { error: string | null; done: boolean; doneText: string }) {
  if (error) {
    return (
      <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
        {error}
      </p>
    );
  }
  if (done) {
    return <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{doneText}</p>;
  }
  return null;
}

export function AccountPipelineControls({
  accountId,
  currentStage,
}: {
  accountId: string;
  currentStage: AccountStage;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [stage, setStage] = useState<AccountStage>(currentStage);
  const [stageNote, setStageNote] = useState("");
  const [stageError, setStageError] = useState<string | null>(null);
  const [stageDone, setStageDone] = useState(false);

  const [kind, setKind] = useState<string>(ACCOUNT_ACTIVITY_KINDS[0]);
  const [activityNote, setActivityNote] = useState("");
  const [activityError, setActivityError] = useState<string | null>(null);
  const [activityDone, setActivityDone] = useState(false);

  const submitStage = () => {
    setStageError(null);
    setStageDone(false);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("registeredAccountId", accountId);
      fd.set("stage", stage);
      if (stageNote.trim()) fd.set("note", stageNote.trim());
      const result = await advanceAccountStage(fd);
      if (!result?.ok) {
        setStageError(result?.message ?? "Could not move the stage.");
        return;
      }
      setStageDone(true);
      setStageNote("");
      router.refresh();
    });
  };

  const submitActivity = () => {
    setActivityError(null);
    setActivityDone(false);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("registeredAccountId", accountId);
      fd.set("kind", kind);
      fd.set("note", activityNote);
      const result = await logAccountActivity(fd);
      if (!result?.ok) {
        setActivityError(result?.message ?? "Could not log the activity.");
        return;
      }
      setActivityDone(true);
      setActivityNote("");
      router.refresh();
    });
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-navy-900">Move the stage</h2>
          <p className="mt-1 text-sm text-slate-600">
            Advancing a stage counts as a meaningful update and keeps the account&apos;s protection from lapsing.
          </p>
        </div>
        <Notice error={stageError} done={stageDone} doneText="Stage updated." />
        <Field label="Stage">
          <Select value={stage} onChange={(e) => setStage(e.target.value as AccountStage)}>
            {ACCOUNT_STAGE_ORDER.map((s) => (
              <option key={s} value={s}>
                {ACCOUNT_STAGE_LABELS[s]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="What changed" optional>
          <Textarea
            value={stageNote}
            onChange={(e) => setStageNote(e.target.value)}
            placeholder="Optional. For example: had the intro call, they asked for a proposal."
            rows={2}
          />
        </Field>
        <Button type="button" onClick={submitStage} disabled={isPending || stage === currentStage}>
          {isPending ? "Saving…" : "Update stage"}
        </Button>
      </Card>

      <Card className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-navy-900">Log an activity</h2>
          <p className="mt-1 text-sm text-slate-600">
            Record meetings, next steps, and responses. Each entry refreshes the account and builds its history.
          </p>
        </div>
        <Notice error={activityError} done={activityDone} doneText="Activity logged." />
        <Field label="Type">
          <Select value={kind} onChange={(e) => setKind(e.target.value)}>
            {ACCOUNT_ACTIVITY_KINDS.map((k) => (
              <option key={k} value={k}>
                {ACCOUNT_ACTIVITY_KIND_LABELS[k]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Note">
          <Textarea
            value={activityNote}
            onChange={(e) => setActivityNote(e.target.value)}
            placeholder="For example: met the CHRO, agreed to send a scoped proposal by Friday."
            rows={3}
          />
        </Field>
        <Button type="button" onClick={submitActivity} disabled={isPending}>
          {isPending ? "Saving…" : "Log activity"}
        </Button>
      </Card>
    </div>
  );
}
