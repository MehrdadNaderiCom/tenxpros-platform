"use client";

import { useCallback, useEffect, useRef } from "react";
import type {
  AcademyAudioResumePayload,
  AcademyReadingResumePayload,
} from "@/lib/academy/resume-contract";

type EnvelopeKeys =
  | "clientId"
  | "clientSeq"
  | "expectedRevision";

export type AcademyReadingResumePosition = Omit<
  AcademyReadingResumePayload,
  EnvelopeKeys
>;
export type AcademyAudioResumePosition = Omit<
  AcademyAudioResumePayload,
  EnvelopeKeys
>;
export type AcademyResumePosition =
  | AcademyReadingResumePosition
  | AcademyAudioResumePosition;

type SaveResponse = {
  revision?: unknown;
  code?: unknown;
};

/**
 * Small fire-and-forget writer shared by the reading and audio clients. Each
 * mounted lane owns a fresh UUID and increasing sequence. This means a final
 * keepalive flush can safely overtake an older request without moving the
 * server bookmark backwards.
 */
export function useAcademyResumeSaver(input: {
  endpoint: string;
  initialRevision: number;
  enabled: boolean;
  onSourceInvalidated?: () => void;
}) {
  const revisionRef = useRef(input.initialRevision);
  const clientIdRef = useRef<string | null>(null);
  const clientSeqRef = useRef(0);
  const latestPositionRef =
    useRef<AcademyResumePosition | null>(null);
  const invalidatedRef = useRef(input.onSourceInvalidated);
  invalidatedRef.current = input.onSourceInvalidated;

  useEffect(() => {
    revisionRef.current = input.initialRevision;
    clientIdRef.current = null;
    clientSeqRef.current = 0;
  }, [input.endpoint, input.initialRevision]);

  const save = useCallback(
    (
      position: AcademyResumePosition,
      options?: { keepalive?: boolean },
    ) => {
      if (!input.enabled) return;
      latestPositionRef.current = position;
      if (!clientIdRef.current) {
        clientIdRef.current = window.crypto.randomUUID();
      }

      const dispatch = async (
        checkpoint: AcademyResumePosition,
        retryCount: number,
      ): Promise<void> => {
        const clientSeq = ++clientSeqRef.current;
        const payload = {
          ...checkpoint,
          clientId: clientIdRef.current!,
          clientSeq,
          expectedRevision: revisionRef.current,
        };
        try {
          const response = await fetch(input.endpoint, {
            method: "POST",
            credentials: "same-origin",
            cache: "no-store",
            keepalive: options?.keepalive ?? false,
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          });
          let body: SaveResponse = {};
          try {
            body = (await response.json()) as SaveResponse;
          } catch {
            /* a retry on the next checkpoint is enough */
          }
          if (
            typeof body.revision === "number" &&
            Number.isInteger(body.revision)
          ) {
            revisionRef.current = Math.max(
              revisionRef.current,
              body.revision,
            );
          }
          if (
            response.status === 409 &&
            (body.code === "content_changed" ||
              body.code === "source_changed" ||
              body.code === "source_unavailable")
          ) {
            invalidatedRef.current?.();
            return;
          }
          if (
            response.status === 409 &&
            retryCount < 1 &&
            typeof body.revision === "number" &&
            Number.isInteger(body.revision) &&
            latestPositionRef.current
          ) {
            // Another tab advanced the lane after this page rendered. Retry the
            // newest local checkpoint, not the original request: two conflicts
            // arriving out of order can then never restore an older position.
            await dispatch(
              latestPositionRef.current,
              retryCount + 1,
            );
          }
        } catch {
          // Bookmark persistence must never interrupt reading or playback. The
          // next scheduled checkpoint (and pagehide flush) retries naturally.
        }
      };
      void dispatch(position, 0);
    },
    [input.enabled, input.endpoint],
  );

  return save;
}
