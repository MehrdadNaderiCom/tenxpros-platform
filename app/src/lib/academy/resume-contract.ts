import { z } from "zod";

const MAX_SIGNED_INT_32 = 2_147_483_647;
const MAX_BLOCK_INDEX = 100_000;
const MAX_AUDIO_SECONDS = 86_400;

const resumeEnvelopeShape = {
  clientId: z.string().uuid(),
  clientSeq: z.number().int().min(1).max(MAX_SIGNED_INT_32),
  expectedRevision: z.number().int().min(0).max(MAX_SIGNED_INT_32),
} as const;

export const academyResumeEnvelopeSchema = z
  .object(resumeEnvelopeShape)
  .strict();

export const academyReadingResumePayloadSchema = z
  .object({
    ...resumeEnvelopeShape,
    kind: z.literal("reading"),
    contentKey: z.string().regex(/^[a-f0-9]{64}$/),
    blockKey: z
      .string()
      .min(1)
      .max(96)
      .regex(/^[a-z0-9:_-]+$/)
      .nullable(),
    blockIndex: z.number().int().min(0).max(MAX_BLOCK_INDEX).nullable(),
    offsetRatio: z.number().finite().min(0).max(1),
    progressPct: z.number().finite().min(0).max(100),
  })
  .strict();

export const academyAudioResumePayloadSchema = z
  .object({
    ...resumeEnvelopeShape,
    kind: z.literal("audio"),
    resumeKey: z.string().regex(/^[a-f0-9]{64}$/),
    voiceId: z
      .string()
      .min(1)
      .max(128)
      .regex(/^[A-Za-z0-9_-]+$/),
    positionSeconds: z.number().finite().min(0).max(MAX_AUDIO_SECONDS),
    durationSeconds: z
      .number()
      .finite()
      .positive()
      .max(MAX_AUDIO_SECONDS),
  })
  .strict();

export const academyResumePayloadSchema = z.discriminatedUnion("kind", [
  academyReadingResumePayloadSchema,
  academyAudioResumePayloadSchema,
]);

export type AcademyResumeEnvelope = z.infer<
  typeof academyResumeEnvelopeSchema
>;
export type AcademyReadingResumePayload = z.infer<
  typeof academyReadingResumePayloadSchema
>;
export type AcademyAudioResumePayload = z.infer<
  typeof academyAudioResumePayloadSchema
>;
export type AcademyResumePayload = z.infer<typeof academyResumePayloadSchema>;

export type AcademyResumeStoredState = {
  revision: number;
  clientId: string | null;
  clientSeq: number;
};

export type AcademyResumeCasDecision = "accept" | "duplicate" | "conflict";

/**
 * Decides whether an incoming checkpoint may replace the persisted one.
 *
 * A browser client can advance its own sequence without a round trip. A
 * different tab or device must first have observed the exact stored revision,
 * preventing a stale checkpoint from silently overwriting newer progress.
 */
export function decideAcademyResumeCas(
  stored: AcademyResumeStoredState,
  incoming: AcademyResumeEnvelope,
): AcademyResumeCasDecision {
  if (stored.clientId === incoming.clientId) {
    return incoming.clientSeq > stored.clientSeq ? "accept" : "duplicate";
  }

  return incoming.expectedRevision === stored.revision ? "accept" : "conflict";
}
