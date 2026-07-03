import { prisma } from "@/lib/prisma";
import {
  ACADEMY_EVENT_KINDS,
  VIEW_THROTTLE_SECONDS,
  beatCredit,
  clampScrollPct,
  type AcademyEventKind,
} from "./telemetry-core";

export {
  ACADEMY_EVENT_KINDS,
  BEAT_INTERVAL_SECONDS,
  BEAT_MAX_CREDIT_SECONDS,
  VIEW_THROTTLE_SECONDS,
  beatCredit,
  clampScrollPct,
  formatDuration,
  type AcademyEventKind,
} from "./telemetry-core";

/**
 * Academy engagement telemetry writers. Two paths:
 *  - Aggregates (AcademyEngagement): reading and audio seconds, views, scroll
 *    depth, first and last activity. Fed by a visibility-aware client heartbeat
 *    whose credit is CLAMPED server-side (see beatCredit in telemetry-core), so
 *    an idle tab, a stalled clock, or a replayed request can never inflate time.
 *  - Events (AcademyEvent): an append-only behavior log written server-side
 *    inside the real actions wherever possible, so it is tamper resistant.
 *
 * Telemetry must NEVER break the partner-facing flow: every write here is
 * wrapped and swallowed on failure. Losing a data point is acceptable; failing
 * a lesson, an exercise, or an exam because analytics hiccuped is not.
 */

/**
 * Append one behavior event. Unknown kinds are dropped (closed set), and any
 * database failure is swallowed: telemetry never throws into the caller.
 */
export async function recordAcademyEvent(input: {
  partnerId: string;
  kind: AcademyEventKind;
  moduleId?: string | null;
  meta?: Record<string, unknown>;
}): Promise<void> {
  try {
    if (!ACADEMY_EVENT_KINDS.includes(input.kind)) return;
    await prisma.academyEvent.create({
      data: {
        partnerId: input.partnerId,
        moduleId: input.moduleId ?? null,
        kind: input.kind,
        meta: (input.meta ?? undefined) as object | undefined,
      },
    });
  } catch {
    // Swallowed by design: analytics must never break the flow.
  }
}

/**
 * Record one module page view: bump the view counter, stamp first and last
 * activity, and log the MODULE_OPENED event. Failures are swallowed.
 */
export async function recordModuleView(partnerId: string, moduleId: string): Promise<void> {
  try {
    const now = new Date();
    const existing = await prisma.academyEngagement.findUnique({
      where: { partnerId_moduleId: { partnerId, moduleId } },
      select: { lastViewAt: true },
    });

    if (!existing) {
      // First contact: a racing concurrent create loses on the unique key and is
      // swallowed, so even parallel first visits count exactly once.
      await prisma.academyEngagement.create({
        data: { partnerId, moduleId, lessonViews: 1, firstViewedAt: now, lastActivityAt: now, lastViewAt: now },
      });
      await recordAcademyEvent({ partnerId, kind: "MODULE_OPENED", moduleId });
      return;
    }

    // Throttle window: a reload loop within the window does not count again.
    if (existing.lastViewAt && now.getTime() - existing.lastViewAt.getTime() < VIEW_THROTTLE_SECONDS * 1000) return;
    // Compare-and-set on the view anchor: of N concurrent requests, only the one
    // that still sees the anchor it read may count the view and append the event,
    // so scripted parallel spam cannot inflate the counter or flood the log.
    const swapped = await prisma.academyEngagement.updateMany({
      where: { partnerId, moduleId, lastViewAt: existing.lastViewAt },
      data: { lessonViews: { increment: 1 }, lastActivityAt: now, lastViewAt: now },
    });
    if (swapped.count === 0) return;
    await recordAcademyEvent({ partnerId, kind: "MODULE_OPENED", moduleId });
  } catch {
    // Swallowed by design.
  }
}

/**
 * Apply one reading heartbeat: credit clamped reading seconds (and clamped
 * audio seconds actually played since the last beat), raise the max scroll
 * depth, and move the anchor. Failures are swallowed.
 */
export async function applyLessonBeat(input: {
  partnerId: string;
  moduleId: string;
  scrollPct?: number;
  audioSecondsDelta?: number;
}): Promise<void> {
  try {
    const now = new Date();
    const existing = await prisma.academyEngagement.findUnique({
      where: { partnerId_moduleId: { partnerId: input.partnerId, moduleId: input.moduleId } },
      select: { lastBeatAt: true, maxScrollPct: true },
    });
    const scroll = clampScrollPct(input.scrollPct ?? 0);

    if (!existing) {
      // First contact: create the row with a fresh anchor and zero credit. A racing
      // concurrent create loses on the unique key and is swallowed (no credit).
      await prisma.academyEngagement.create({
        data: {
          partnerId: input.partnerId,
          moduleId: input.moduleId,
          firstViewedAt: now,
          lastActivityAt: now,
          lastBeatAt: now,
          maxScrollPct: scroll,
        },
      });
      return;
    }

    const credit = beatCredit(existing.lastBeatAt, now);
    // Audio can only have played during the same observed window.
    const audioDelta = Math.min(Math.max(0, Math.floor(input.audioSecondsDelta ?? 0)), credit === 0 ? 0 : credit);
    // Compare-and-set on the anchor: only the ONE beat that still sees the anchor it
    // read may credit this window. Concurrent or replayed beats (parallel requests, a
    // second tab) read the same anchor, lose the swap, and credit nothing, so no beat
    // pattern can ever credit more than real elapsed time.
    const swapped = await prisma.academyEngagement.updateMany({
      where: {
        partnerId: input.partnerId,
        moduleId: input.moduleId,
        lastBeatAt: existing.lastBeatAt,
      },
      data: {
        readSeconds: { increment: credit },
        audioSeconds: { increment: audioDelta },
        maxScrollPct: Math.max(existing.maxScrollPct, scroll),
        lastActivityAt: now,
        lastBeatAt: now,
      },
    });
    if (swapped.count === 0) return; // Another beat claimed this window.
  } catch {
    // Swallowed by design.
  }
}
