"use client";

import type { DossierSectionStatus } from "@prisma/client";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { saveDossierSection, submitDossierSection } from "@/lib/actions/participant";
import { canParticipantEditDossierSection } from "@/lib/dossier";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/form-fields";

type SaveResult = {
  ok: boolean;
  savedAt?: string;
  status?: DossierSectionStatus;
};

export function DossierSectionEditor({
  sectionId,
  initialContent,
  initialStatus,
  initialSavedAt,
}: {
  sectionId: string;
  initialContent: string;
  initialStatus: DossierSectionStatus;
  initialSavedAt: string | null;
}) {
  const [content, setContent] = useState(initialContent);
  const [lastSavedContent, setLastSavedContent] = useState(initialContent);
  const [lastSavedAt, setLastSavedAt] = useState(initialSavedAt);
  const [status, setStatus] = useState<DossierSectionStatus>(initialStatus);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const saveInFlight = useRef(false);
  const debounceTimer = useRef<number | null>(null);

  const canEdit = canParticipantEditDossierSection(status);
  const isDirty = content !== lastSavedContent;

  const save = useCallback(
    async (reason: "manual" | "autosave" | "blur" = "manual") => {
      if (!canEdit || saveInFlight.current || !isDirty) return;
      saveInFlight.current = true;
      setMessage(reason === "manual" ? "Saving draft..." : "Autosaving...");

      try {
        const formData = new FormData();
        formData.set("sectionId", sectionId);
        formData.set("content", content);
        const result = (await saveDossierSection(formData)) as SaveResult;
        if (result.ok) {
          setLastSavedContent(content);
          setLastSavedAt(result.savedAt ?? new Date().toISOString());
          if (result.status) setStatus(result.status);
          setMessage(reason === "manual" ? "Draft saved." : "Autosaved.");
        }
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "This section could not be saved.");
      } finally {
        saveInFlight.current = false;
      }
    },
    [canEdit, content, isDirty, sectionId],
  );

  useEffect(() => {
    if (!canEdit) return undefined;
    const interval = window.setInterval(() => {
      void save("autosave");
    }, 30000);
    return () => window.clearInterval(interval);
  }, [canEdit, save]);

  useEffect(() => {
    return () => {
      if (debounceTimer.current) window.clearTimeout(debounceTimer.current);
    };
  }, []);

  function queueBlurSave() {
    if (!canEdit || !isDirty) return;
    if (debounceTimer.current) window.clearTimeout(debounceTimer.current);
    debounceTimer.current = window.setTimeout(() => {
      void save("blur");
    }, 800);
  }

  function handleSubmitForReview() {
    if (!canEdit) return;
    if (debounceTimer.current) window.clearTimeout(debounceTimer.current);
    startTransition(async () => {
      setMessage("Submitting for review...");
      try {
        const formData = new FormData();
        formData.set("sectionId", sectionId);
        formData.set("content", content);
        const result = (await submitDossierSection(formData)) as SaveResult;
        if (result.ok) {
          setLastSavedContent(content);
          setLastSavedAt(result.savedAt ?? new Date().toISOString());
          setStatus(result.status ?? "SUBMITTED");
          setMessage("This section is submitted for review.");
        }
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "This section could not be submitted.");
      }
    });
  }

  const lockedMessage =
    status === "SUBMITTED"
      ? "This section is submitted for review."
      : status === "APPROVED"
        ? "This section has been approved and is locked."
        : null;

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-slate-600">
        Last saved: {lastSavedAt ? new Date(lastSavedAt).toLocaleString() : "Not saved yet"}
      </div>
      {lockedMessage ? (
        <p className="rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-800">{lockedMessage}</p>
      ) : null}
      {message && !lockedMessage ? (
        <p className="rounded-md bg-neutral-50 px-3 py-2 text-sm text-slate-700">{message}</p>
      ) : null}
      <Textarea
        name="content"
        value={content}
        onBlur={queueBlurSave}
        onChange={(event) => setContent(event.target.value)}
        readOnly={!canEdit}
        aria-readonly={!canEdit}
        className="min-h-[420px]"
      />
      <div className="flex flex-wrap gap-3">
        <Button type="button" variant="secondary" disabled={!canEdit || isPending || saveInFlight.current || !isDirty} onClick={() => void save("manual")}>
          Save draft
        </Button>
        <Button type="button" disabled={!canEdit || isPending} onClick={handleSubmitForReview}>
          Submit for review
        </Button>
      </div>
    </div>
  );
}
