"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/authz";
import { advanceFollowup, nextFollowupDue } from "@/lib/marketing/followup";
import { ATTEMPT_KINDS, MARKETING_CHANNELS, PROSPECT_STAGES, WARMTH_OPTIONS } from "@/lib/marketing/constants";
import {
  buildCoachContext,
  DEFAULT_COACH_MODEL,
  getOperatorProfile,
  OPENROUTER_ERROR_SETTING,
  OPENROUTER_KEY_SETTING,
  OPENROUTER_MODEL_SETTING,
  OPERATOR_PROFILE_SETTING,
  recentAttemptSummaries,
  requestCoachAdvice,
} from "@/lib/marketing/ai-coach";
import { campaignMetrics, getActiveCampaign } from "@/lib/marketing/data";
import {
  buildAreaExtras,
  buildSuggestContext,
  type SuggestArea,
} from "@/lib/marketing/ai-suggest";
import { callOpenRouter } from "@/lib/marketing/ai-coach";

const CHANNEL_VALUES = MARKETING_CHANNELS.map((c) => c.value) as string[];
const STAGE_VALUES = PROSPECT_STAGES.map((s) => s.value) as string[];
const WARMTH_VALUES = WARMTH_OPTIONS.map((w) => w.value) as string[];

function text(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function intIn(formData: FormData, name: string, fallback: number, min: number, max: number): number {
  const raw = Number(text(formData, name));
  if (!Number.isInteger(raw) || raw < min || raw > max) return fallback;
  return raw;
}

function dateOf(formData: FormData, name: string): Date {
  const raw = text(formData, name);
  const date = new Date(`${raw}T00:00:00.000Z`);
  if (!raw || Number.isNaN(date.getTime())) throw new Error(`Enter a valid ${name}.`);
  return date;
}

function refresh() {
  for (const path of [
    "/admin/marketing",
    "/admin/marketing/prospects",
    "/admin/marketing/campaigns",
    "/admin/marketing/activity",
    "/admin/marketing/journal",
    "/admin/marketing/playbook",
    "/admin/marketing/settings",
  ]) {
    try {
      revalidatePath(path);
    } catch (error) {
      if (error instanceof Error && error.message.includes("static generation store missing")) continue;
      throw error;
    }
  }
}

async function audit(actorId: string, action: string, entity: string, entityId: string, changes?: object) {
  await prisma.auditLog.create({
    data: { actorId, actorRole: "ADMIN", action, entity, entityId, changes: changes ?? undefined },
  });
}

// ---------------------------------------------------------------------------
// Campaigns
// ---------------------------------------------------------------------------

export async function createCampaign(formData: FormData) {
  const admin = await requireSuperAdmin();
  const name = text(formData, "name");
  if (name.length < 2) throw new Error("Enter a campaign name.");
  const startDate = dateOf(formData, "startDate");
  const endDate = dateOf(formData, "endDate");
  if (endDate <= startDate) throw new Error("End date must be after the start date.");

  const anyActive = await prisma.marketingCampaign.findFirst({ where: { isActive: true } });
  const campaign = await prisma.marketingCampaign.create({
    data: {
      name,
      startDate,
      endDate,
      isActive: !anyActive,
      targetBreakEven: intIn(formData, "targetBreakEven", 2, 0, 1000),
      targetIdeal: intIn(formData, "targetIdeal", 3, 0, 1000),
      targetStretch: intIn(formData, "targetStretch", 5, 0, 1000),
      targetPipeline: intIn(formData, "targetPipeline", 30, 0, 100000),
      // Default channel set; quotas editable afterwards.
      channels: {
        create: [
          { channel: "linkedin", dailyMin: 5, dailyMax: 15, weeklyCap: 70 },
          { channel: "whatsapp", dailyMin: 3, dailyMax: 10, weeklyCap: 50 },
          { channel: "email", dailyMin: 5, dailyMax: 20, weeklyCap: 100 },
        ],
      },
    },
  });
  await audit(admin.id, "MARKETING_CAMPAIGN_CREATE", "MarketingCampaign", campaign.id, {
    after: { name, isActive: campaign.isActive },
  });
  refresh();
}

export async function updateCampaign(formData: FormData) {
  const admin = await requireSuperAdmin();
  const id = text(formData, "campaignId");
  const existing = await prisma.marketingCampaign.findUniqueOrThrow({ where: { id } });

  const data = {
    name: text(formData, "name") || existing.name,
    startDate: dateOf(formData, "startDate"),
    endDate: dateOf(formData, "endDate"),
    targetBreakEven: intIn(formData, "targetBreakEven", existing.targetBreakEven, 0, 1000),
    targetIdeal: intIn(formData, "targetIdeal", existing.targetIdeal, 0, 1000),
    targetStretch: intIn(formData, "targetStretch", existing.targetStretch, 0, 1000),
    targetPipeline: intIn(formData, "targetPipeline", existing.targetPipeline, 0, 100000),
    pivotMessagesThreshold: intIn(formData, "pivotMessagesThreshold", existing.pivotMessagesThreshold, 1, 100000),
    pivotCallsThreshold: intIn(formData, "pivotCallsThreshold", existing.pivotCallsThreshold, 1, 100000),
    offPlatformPaid: intIn(formData, "offPlatformPaid", existing.offPlatformPaid, 0, 100000),
    notes: text(formData, "notes") || null,
  };
  if (data.endDate <= data.startDate) throw new Error("End date must be after the start date.");

  await prisma.marketingCampaign.update({ where: { id }, data });
  await audit(admin.id, "MARKETING_CAMPAIGN_UPDATE", "MarketingCampaign", id, {
    before: { targets: [existing.targetBreakEven, existing.targetIdeal, existing.targetStretch] },
    after: { targets: [data.targetBreakEven, data.targetIdeal, data.targetStretch] },
  });
  refresh();
}

export async function activateCampaign(formData: FormData) {
  const admin = await requireSuperAdmin();
  const id = text(formData, "campaignId");
  await prisma.$transaction([
    prisma.marketingCampaign.updateMany({ data: { isActive: false } }),
    prisma.marketingCampaign.update({ where: { id }, data: { isActive: true } }),
  ]);
  await audit(admin.id, "MARKETING_CAMPAIGN_ACTIVATE", "MarketingCampaign", id);
  refresh();
}

export async function saveChannel(formData: FormData) {
  await requireSuperAdmin();
  const campaignId = text(formData, "campaignId");
  const channel = text(formData, "channel");
  if (!CHANNEL_VALUES.includes(channel)) throw new Error("Unknown channel.");
  const existing = await prisma.marketingChannel.findUnique({
    where: { campaignId_channel: { campaignId, channel } },
  });
  await prisma.marketingChannel.upsert({
    where: { campaignId_channel: { campaignId, channel } },
    // Invalid/cleared inputs fall back to the channel's current values, and
    // saving quotas never flips the enabled flag.
    update: {
      dailyMin: intIn(formData, "dailyMin", existing?.dailyMin ?? 5, 0, 1000),
      dailyMax: intIn(formData, "dailyMax", existing?.dailyMax ?? 15, 0, 1000),
      weeklyCap: intIn(formData, "weeklyCap", existing?.weeklyCap ?? 70, 0, 10000),
      postsPerDay: intIn(formData, "postsPerDay", existing?.postsPerDay ?? 0, 0, 100),
      engagePerDay: intIn(formData, "engagePerDay", existing?.engagePerDay ?? 0, 0, 1000),
      // The note input is always part of the form, so an empty value is an
      // intentional clear (no fallback to the old note).
      contentNote: text(formData, "contentNote") || null,
    },
    create: {
      campaignId,
      channel,
      dailyMin: intIn(formData, "dailyMin", 5, 0, 1000),
      dailyMax: intIn(formData, "dailyMax", 15, 0, 1000),
      weeklyCap: intIn(formData, "weeklyCap", 70, 0, 10000),
      postsPerDay: intIn(formData, "postsPerDay", 0, 0, 100),
      engagePerDay: intIn(formData, "engagePerDay", 0, 0, 1000),
      contentNote: text(formData, "contentNote") || null,
    },
  });
  refresh();
}

export async function removeChannel(formData: FormData) {
  const admin = await requireSuperAdmin();
  const id = text(formData, "channelId");
  const existing = await prisma.marketingChannel.findUnique({ where: { id } });
  if (!existing) {
    // Stale/double submit: already gone — nothing to do.
    refresh();
    return;
  }
  await prisma.marketingChannel.delete({ where: { id } });
  // Quotas + content plan land in the audit log so a misclick is recoverable.
  await audit(admin.id, "MARKETING_CHANNEL_DELETE", "MarketingChannel", id, {
    before: {
      channel: existing.channel,
      dailyMin: existing.dailyMin,
      dailyMax: existing.dailyMax,
      weeklyCap: existing.weeklyCap,
      postsPerDay: existing.postsPerDay,
      engagePerDay: existing.engagePerDay,
      contentNote: existing.contentNote,
    },
  });
  refresh();
}

// ---------------------------------------------------------------------------
// Prospects
// ---------------------------------------------------------------------------

const CONTACT_FIELDS = ["email", "linkedin", "whatsapp", "phone", "telegram", "instagram", "twitter"] as const;

function prospectData(formData: FormData) {
  const name = text(formData, "name");
  if (name.length < 2) throw new Error("Enter the prospect's name.");
  const warmth = text(formData, "warmth");
  if (!WARMTH_VALUES.includes(warmth)) throw new Error("Pick a warmth level.");
  const assets = formData
    .getAll("assetsSent")
    .filter((value): value is string => typeof value === "string" && value.length > 0);

  const contacts = Object.fromEntries(
    CONTACT_FIELDS.map((field) => [field, text(formData, field) || null]),
  ) as Record<(typeof CONTACT_FIELDS)[number], string | null>;

  // Quick-add support: a single channel + handle pair maps onto the matching
  // contact field, so a new contact needs just name + warmth + one handle.
  const quickChannel = text(formData, "quickChannel");
  const quickHandle = text(formData, "quickHandle");
  if (quickHandle && (CONTACT_FIELDS as readonly string[]).includes(quickChannel)) {
    contacts[quickChannel as (typeof CONTACT_FIELDS)[number]] = quickHandle;
  }

  return {
    assetsSent: assets.length > 0 ? assets.join(",") : null,
    name,
    context: text(formData, "context") || null,
    warmth: warmth as "WARM" | "REFERRAL" | "COLD_ENGAGED" | "COLD",
    pain: intIn(formData, "pain", 3, 1, 5),
    authority: intIn(formData, "authority", 3, 1, 5),
    icpFit: intIn(formData, "icpFit", 3, 1, 5),
    ...contacts,
    notes: text(formData, "notes") || null,
  };
}

export async function createProspect(formData: FormData) {
  await requireSuperAdmin();
  const campaignId = text(formData, "campaignId");
  await prisma.prospect.create({ data: { campaignId, ...prospectData(formData) } });
  refresh();
}

export async function updateProspect(formData: FormData) {
  await requireSuperAdmin();
  const id = text(formData, "prospectId");
  await prisma.prospect.update({ where: { id }, data: prospectData(formData) });
  refresh();
}

export async function deleteProspect(formData: FormData) {
  const admin = await requireSuperAdmin();
  const id = text(formData, "prospectId");
  const existing = await prisma.prospect.findUniqueOrThrow({ where: { id } });
  await prisma.prospect.delete({ where: { id } });
  await audit(admin.id, "MARKETING_PROSPECT_DELETE", "Prospect", id, { before: { name: existing.name } });
  refresh();
}

/**
 * Move a prospect to a new stage. Moving to APPROACHED for the first time
 * starts the follow-up cadence (FU1 due +3 days) and records the touch.
 */
export async function changeProspectStage(formData: FormData) {
  const admin = await requireSuperAdmin();
  const id = text(formData, "prospectId");
  const stage = text(formData, "stage");
  if (!STAGE_VALUES.includes(stage)) throw new Error("Unknown stage.");

  const existing = await prisma.prospect.findUniqueOrThrow({ where: { id } });
  const now = new Date();

  const data: Record<string, unknown> = { stage };
  if (stage === "APPROACHED") {
    // Entering APPROACHED (from LIST, a Move, or back from Lost) (re)schedules
    // the cadence from the step already completed, so no prospect can sit in
    // an "active but never due" dead end.
    const nextDue = nextFollowupDue(existing.followupStep, now);
    data.followupStatus = nextDue ? "ACTIVE" : "PARKED";
    data.followupNextDue = nextDue;
    if (existing.stage === "LIST") {
      await prisma.prospectTouch.create({
        data: { prospectId: id, type: "message", summary: "Initial approach sent" },
      });
    }
  }
  if (stage === "REPLIED") {
    // A reply pauses the automatic cadence; next touches are manual.
    data.followupNextDue = null;
    await prisma.prospectTouch.create({ data: { prospectId: id, type: "reply", summary: "Reply received" } });
  }
  if (stage === "PAID" || stage === "LOST" || stage === "DROPPED") {
    // Terminal stages end the reminder cadence — never nag a won or closed prospect.
    data.followupNextDue = null;
    data.followupStatus = stage === "PAID" ? "PARKED" : "DROPPED";
  }
  if (["REPLIED", "CALL_BOOKED", "CALL_HELD", "APPLIED"].includes(stage) && existing.followupStatus === "DROPPED") {
    // Reopening a previously-lost prospect puts them back in play (parked;
    // press Resume follow-ups to restart reminders).
    data.followupStatus = "PARKED";
  }
  if (stage === "LOST") data.lostReason = text(formData, "lostReason") || existing.lostReason || null;

  await prisma.prospect.update({ where: { id }, data });
  await audit(admin.id, "MARKETING_PROSPECT_STAGE", "Prospect", id, {
    before: { stage: existing.stage },
    after: { stage },
  });
  refresh();
}

/** Record that the due follow-up was sent; advances FU1→FU2→FU3→parked. */
export async function markFollowupSent(formData: FormData) {
  await requireSuperAdmin();
  const id = text(formData, "prospectId");
  const existing = await prisma.prospect.findUniqueOrThrow({ where: { id } });
  const now = new Date();
  const next = advanceFollowup(existing.followupStep, now);
  await prisma.$transaction([
    prisma.prospectTouch.create({
      data: { prospectId: id, type: "follow_up", summary: `FU${next.step} sent` },
    }),
    prisma.prospect.update({
      where: { id },
      data: {
        followupStep: next.step,
        followupNextDue: next.nextDue,
        followupStatus: next.parked ? "PARKED" : "ACTIVE",
      },
    }),
  ]);
  refresh();
}

export async function setFollowupStatus(formData: FormData) {
  await requireSuperAdmin();
  const id = text(formData, "prospectId");
  const status = text(formData, "status");
  if (!["ACTIVE", "PARKED", "DROPPED"].includes(status)) throw new Error("Unknown follow-up status.");
  const existing = await prisma.prospect.findUniqueOrThrow({ where: { id } });

  if (status === "ACTIVE") {
    // Resume: reschedule the next follow-up from today, continuing from the
    // step already completed. A finished cadence (3/3) stays parked.
    const nextDue = nextFollowupDue(existing.followupStep, new Date());
    await prisma.prospect.update({
      where: { id },
      data: nextDue
        ? { followupStatus: "ACTIVE", followupNextDue: nextDue, followupDropReason: null }
        : { followupStatus: "PARKED", followupNextDue: null },
    });
  } else {
    await prisma.prospect.update({
      where: { id },
      data: {
        followupStatus: status as "PARKED" | "DROPPED",
        followupDropReason: status === "DROPPED" ? text(formData, "reason") || null : null,
        followupNextDue: null,
      },
    });
  }
  refresh();
}

export async function recordTouch(formData: FormData) {
  await requireSuperAdmin();
  const prospectId = text(formData, "prospectId");
  const type = text(formData, "type") || "note";
  await prisma.prospectTouch.create({
    data: {
      prospectId,
      type,
      channel: text(formData, "channel") || null,
      summary: text(formData, "summary") || null,
    },
  });
  refresh();
}

/**
 * Link prospects to the live funnel: when a prospect's email matches a real
 * Application, store the link and move the stage forward to APPLIED (or PAID
 * once a PAID payment exists). Never moves a stage backwards.
 */
export async function syncProspectsWithFunnel(formData: FormData) {
  const admin = await requireSuperAdmin();
  const campaignId = text(formData, "campaignId");
  const prospects = await prisma.prospect.findMany({
    where: { campaignId, email: { not: null } },
  });
  let linked = 0;
  for (const prospect of prospects) {
    if (!prospect.email) continue;
    const application = await prisma.application.findFirst({
      where: { email: { equals: prospect.email, mode: "insensitive" } },
      include: { payments: { where: { status: "PAID" }, select: { id: true } } },
    });
    if (!application) continue;
    const paid = application.payments.length > 0 || application.status === "ENROLLED";
    const target = paid ? "PAID" : "APPLIED";
    const order = STAGE_VALUES.indexOf(target) > STAGE_VALUES.indexOf(prospect.stage);
    const advancing = order && prospect.stage !== "LOST" && prospect.stage !== "DROPPED";
    await prisma.prospect.update({
      where: { id: prospect.id },
      data: {
        applicationId: application.id,
        ...(advancing ? { stage: target as "APPLIED" | "PAID" } : {}),
        // A won prospect leaves the reminder cadence.
        ...(advancing && target === "PAID" ? { followupStatus: "PARKED", followupNextDue: null } : {}),
      },
    });
    linked += 1;
  }
  await audit(admin.id, "MARKETING_FUNNEL_SYNC", "MarketingCampaign", campaignId, { after: { linked } });
  refresh();
}

// ---------------------------------------------------------------------------
// Daily activity + templates
// ---------------------------------------------------------------------------

export async function logDailyActivity(formData: FormData) {
  await requireSuperAdmin();
  const campaignId = text(formData, "campaignId");
  const channel = text(formData, "channel");
  if (!CHANNEL_VALUES.includes(channel)) throw new Error("Unknown channel.");
  const date = dateOf(formData, "date");
  const counters = ["messages", "replies", "calls", "posts", "engagements"] as const;
  const limits: Record<(typeof counters)[number], number> = { messages: 10000, replies: 10000, calls: 10000, posts: 1000, engagements: 10000 };
  const submitted = Object.fromEntries(counters.map((k) => [k, intIn(formData, k, 0, 0, limits[k])])) as Record<(typeof counters)[number], number>;
  const notes = text(formData, "notes") || null;

  // Journal entries bump these counters in the background, so a Today form
  // rendered before the latest journal saves holds stale numbers. When the
  // form targets the day it was rendered for, apply the founder's EDITS as
  // deltas against what the form showed instead of overwriting blindly:
  // untouched fields then keep any journal increments that happened since.
  const baseDate = text(formData, "baseDate");
  const hasBaseline = counters.every((k) => formData.has(`base_${k}`));
  let data: Record<string, number | string | null> = { ...submitted, notes };
  if (hasBaseline && baseDate && text(formData, "date") === baseDate) {
    const existing = await prisma.marketingDailyLog.findUnique({
      where: { campaignId_date_channel: { campaignId, date, channel } },
    });
    data = { notes };
    for (const k of counters) {
      const base = intIn(formData, `base_${k}`, 0, 0, limits[k]);
      const delta = submitted[k] - base;
      data[k] = Math.max(0, Math.min(limits[k], (existing?.[k] ?? 0) + delta));
    }
  }
  await prisma.marketingDailyLog.upsert({
    where: { campaignId_date_channel: { campaignId, date, channel } },
    update: data,
    create: { campaignId, date, channel, ...data },
  });
  refresh();
}

// ---------------------------------------------------------------------------
// Journal (one row per real-world attempt)
// ---------------------------------------------------------------------------

const ATTEMPT_KIND_VALUES = ATTEMPT_KINDS.map((k) => k.value) as string[];

/** ProspectTouch type for each journal kind, so the prospect's history stays complete. */
const ATTEMPT_TOUCH_TYPE: Record<string, string> = {
  outreach: "message",
  follow_up: "follow_up",
  reply: "reply",
  conversation: "call",
};

/**
 * Save one journal entry and fan it out: bump today's daily-log counter for
 * that channel (so Today/Command stats update without double entry) and, when
 * a prospect is linked, record a touch on their history.
 */
export async function createAttempt(formData: FormData) {
  await requireSuperAdmin();
  const campaignId = text(formData, "campaignId");
  const kind = text(formData, "kind");
  if (!ATTEMPT_KIND_VALUES.includes(kind)) throw new Error("Pick what kind of attempt this was.");
  // Never throw for fixable input: production redacts server-action errors and
  // the founder's typed entry would be lost with it.
  const summary = text(formData, "summary") || "(no description)";
  const channelRaw = text(formData, "channel");
  const channel = CHANNEL_VALUES.includes(channelRaw) ? channelRaw : null;
  // A prospect deleted in another tab degrades to an unlinked entry (matches
  // the schema's onDelete: SetNull) instead of throwing the entry away.
  let prospectId = text(formData, "prospectId") || null;
  if (prospectId) {
    const prospect = await prisma.prospect.findUnique({ where: { id: prospectId }, select: { campaignId: true } });
    if (!prospect || prospect.campaignId !== campaignId) prospectId = null;
  }

  // Optional backdate (the form hides it behind a details toggle). Empty or
  // invalid means "now". A picked past day lands at 12:00 UTC so it groups
  // inside that UTC day everywhere; the auto +1 below follows the same day.
  let at: Date | undefined;
  const atRaw = text(formData, "at");
  if (atRaw) {
    const picked = new Date(`${atRaw}T12:00:00.000Z`);
    if (!Number.isNaN(picked.getTime()) && picked.getTime() <= Date.now()) at = picked;
  }

  await prisma.marketingAttempt.create({
    data: {
      campaignId,
      kind,
      channel,
      prospectId,
      summary,
      outcome: text(formData, "outcome") || null,
      minutes: intIn(formData, "minutes", 0, 0, 600),
      satisfaction: intIn(formData, "satisfaction", 3, 1, 5),
      learnings: text(formData, "learnings") || null,
      ...(at ? { at } : {}),
    },
  });

  // Auto-count: each kind maps to one daily-log counter (see ATTEMPT_KINDS),
  // bumped on the day the entry belongs to (today unless backdated).
  const counter = ATTEMPT_KINDS.find((k) => k.value === kind)?.counter ?? null;
  if (counter && channel) {
    const day = new Date(`${(at ?? new Date()).toISOString().slice(0, 10)}T00:00:00.000Z`);
    await prisma.marketingDailyLog.upsert({
      where: { campaignId_date_channel: { campaignId, date: day, channel } },
      update: { [counter]: { increment: 1 } },
      create: { campaignId, date: day, channel, [counter]: 1 },
    });
  }

  if (prospectId) {
    // The prospect can vanish between the check above and this insert; the
    // attempt is already saved, so a missing touch is not worth an error page.
    try {
      await prisma.prospectTouch.create({
        data: {
          prospectId,
          type: ATTEMPT_TOUCH_TYPE[kind] ?? "note",
          channel,
          summary: summary.slice(0, 200),
          ...(at ? { at } : {}),
        },
      });
    } catch {
      // Prospect deleted concurrently: keep the journal entry, skip the touch.
    }
  }
  refresh();
}

/**
 * Delete a journal entry and remove its auto-counted +1 from the daily log of
 * the day the entry belongs to (never below zero).
 */
export async function deleteAttempt(formData: FormData) {
  const admin = await requireSuperAdmin();
  const id = text(formData, "attemptId");
  const existing = await prisma.marketingAttempt.findUnique({ where: { id } });
  if (!existing) {
    refresh();
    return;
  }
  await prisma.marketingAttempt.delete({ where: { id } });
  const counter = ATTEMPT_KINDS.find((k) => k.value === existing.kind)?.counter ?? null;
  const entryDay = new Date(`${existing.at.toISOString().slice(0, 10)}T00:00:00.000Z`);
  if (counter && existing.channel) {
    const log = await prisma.marketingDailyLog.findUnique({
      where: { campaignId_date_channel: { campaignId: existing.campaignId, date: entryDay, channel: existing.channel } },
    });
    if (log && (log[counter as "messages"] ?? 0) > 0) {
      await prisma.marketingDailyLog.update({
        where: { id: log.id },
        data: { [counter]: { decrement: 1 } },
      });
    }
  }
  await audit(admin.id, "MARKETING_ATTEMPT_DELETE", "MarketingAttempt", id, {
    before: {
      kind: existing.kind,
      channel: existing.channel,
      summary: existing.summary,
      outcome: existing.outcome,
      at: existing.at.toISOString(),
    },
  });
  refresh();
}

async function assertCategoryExists(key: string) {
  const found = await prisma.marketingTemplateCategory.findUnique({ where: { key } });
  if (!found) throw new Error("That section no longer exists. Refresh the page and pick another.");
}

export async function updateTemplate(formData: FormData) {
  const admin = await requireSuperAdmin();
  const id = text(formData, "templateId");
  const title = text(formData, "title");
  const body = text(formData, "body");
  const category = text(formData, "category");
  if (!title || !body) throw new Error("Title and body are required.");
  const existing = await prisma.marketingTemplate.findUniqueOrThrow({ where: { id } });
  const nextCategory = category || existing.category;
  if (nextCategory !== existing.category) await assertCategoryExists(nextCategory);
  await prisma.marketingTemplate.update({
    where: { id },
    data: {
      title,
      body,
      category: nextCategory,
      sortOrder: intIn(formData, "sortOrder", existing.sortOrder, 0, 1000),
    },
  });
  // The previous body is kept in the audit log so an accidental overwrite of
  // hand-crafted copy is always recoverable.
  await audit(admin.id, "MARKETING_TEMPLATE_UPDATE", "MarketingTemplate", id, {
    before: { title: existing.title, category: existing.category, body: existing.body },
    after: { title, category: nextCategory },
  });
  refresh();
}

export async function createTemplate(formData: FormData) {
  const admin = await requireSuperAdmin();
  const title = text(formData, "title");
  const body = text(formData, "body");
  const category = text(formData, "category");
  if (!title || !body) throw new Error("Title and body are required.");
  if (!category) throw new Error("Pick a category.");
  await assertCategoryExists(category);
  const created = await prisma.marketingTemplate.create({
    data: {
      key: `tpl_${crypto.randomUUID().slice(0, 12)}`,
      category,
      title,
      body,
      sortOrder: intIn(formData, "sortOrder", 100, 0, 1000),
    },
  });
  await audit(admin.id, "MARKETING_TEMPLATE_CREATE", "MarketingTemplate", created.id, { after: { title, category } });
  refresh();
}

export async function deleteTemplate(formData: FormData) {
  const admin = await requireSuperAdmin();
  const id = text(formData, "templateId");
  const existing = await prisma.marketingTemplate.findUniqueOrThrow({ where: { id } });
  await prisma.marketingTemplate.delete({ where: { id } });
  // Full body recorded so deleted copy can be restored from the audit log.
  await audit(admin.id, "MARKETING_TEMPLATE_DELETE", "MarketingTemplate", id, {
    before: { title: existing.title, category: existing.category, body: existing.body },
  });
  refresh();
}

// ---------------------------------------------------------------------------
// Playbook categories
// ---------------------------------------------------------------------------

function slugify(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40) || "category";
}

export async function createPlaybookCategory(formData: FormData) {
  const admin = await requireSuperAdmin();
  const title = text(formData, "title");
  if (title.length < 2) throw new Error("Enter a category title.");
  let key = slugify(title);
  if (await prisma.marketingTemplateCategory.findUnique({ where: { key } })) {
    key = `${key}_${crypto.randomUUID().slice(0, 4)}`;
  }
  const created = await prisma.marketingTemplateCategory.create({
    data: {
      key,
      title,
      note: text(formData, "note") || null,
      sortOrder: intIn(formData, "sortOrder", 100, 0, 1000),
    },
  });
  await audit(admin.id, "MARKETING_CATEGORY_CREATE", "MarketingTemplateCategory", created.id, { after: { title, key } });
  refresh();
}

export async function updatePlaybookCategory(formData: FormData) {
  const admin = await requireSuperAdmin();
  const id = text(formData, "categoryId");
  const title = text(formData, "title");
  if (title.length < 2) throw new Error("Enter a category title.");
  const existing = await prisma.marketingTemplateCategory.findUniqueOrThrow({ where: { id } });
  await prisma.marketingTemplateCategory.update({
    where: { id },
    data: {
      title,
      note: text(formData, "note") || null,
      sortOrder: intIn(formData, "sortOrder", existing.sortOrder, 0, 1000),
    },
  });
  await audit(admin.id, "MARKETING_CATEGORY_UPDATE", "MarketingTemplateCategory", id, {
    before: { title: existing.title },
    after: { title },
  });
  refresh();
}

// ---------------------------------------------------------------------------
// AI coach (OpenRouter)
// ---------------------------------------------------------------------------

/** Save the OpenRouter key/model. The key is write-only: never read back into a form. */
export async function saveCoachSettings(formData: FormData) {
  const admin = await requireSuperAdmin();
  const apiKey = text(formData, "apiKey");
  const model = text(formData, "model") || DEFAULT_COACH_MODEL;

  const upsert = (key: string, value: string, label: string) =>
    prisma.adminSetting.upsert({
      where: { key },
      update: { value, updatedBy: admin.id },
      create: { key, value, category: "FEATURE_FLAGS", label, updatedBy: admin.id },
    });

  await upsert(OPENROUTER_MODEL_SETTING, model, "AI coach model (OpenRouter id)");
  // An empty key field means "keep the existing key" so saving the model alone is safe.
  if (apiKey) await upsert(OPENROUTER_KEY_SETTING, apiKey, "OpenRouter API key (AI coach)");
  await audit(admin.id, "MARKETING_COACH_SETTINGS", "AdminSetting", OPENROUTER_MODEL_SETTING, {
    after: { model, keyUpdated: Boolean(apiKey) },
  });
  refresh();
}

/**
 * Save the operator profile (how the founder works: channels, no-calls,
 * time budget). Sent with every AI request. Empty text reverts to the
 * built-in default.
 */
export async function saveOperatorProfile(formData: FormData) {
  const admin = await requireSuperAdmin();
  const profile = text(formData, "profile").slice(0, 4000);
  if (!profile) {
    await prisma.adminSetting.deleteMany({ where: { key: OPERATOR_PROFILE_SETTING } });
  } else {
    await prisma.adminSetting.upsert({
      where: { key: OPERATOR_PROFILE_SETTING },
      update: { value: profile, updatedBy: admin.id },
      create: {
        key: OPERATOR_PROFILE_SETTING,
        value: profile,
        category: "FEATURE_FLAGS",
        label: "Marketing: how I work (AI operator profile)",
        updatedBy: admin.id,
      },
    });
  }
  await audit(admin.id, "MARKETING_OPERATOR_PROFILE", "AdminSetting", OPERATOR_PROFILE_SETTING, {
    after: { reverted: !profile, length: profile.length },
  });
  refresh();
}

async function setCoachError(adminId: string, message: string | null) {
  if (message === null) {
    await prisma.adminSetting.deleteMany({ where: { key: OPENROUTER_ERROR_SETTING } });
    return;
  }
  await prisma.adminSetting.upsert({
    where: { key: OPENROUTER_ERROR_SETTING },
    update: { value: message, updatedBy: adminId },
    create: {
      key: OPENROUTER_ERROR_SETTING,
      value: message,
      category: "FEATURE_FLAGS",
      label: "AI coach: last error",
      updatedBy: adminId,
    },
  });
}

/**
 * Ask the LLM coach: builds the live campaign context, calls OpenRouter, and
 * stores the advice. Expected failures (bad key, bad model id, timeout,
 * provider error) are persisted and shown inline on the Command page instead
 * of throwing — production redacts server-action errors, so a throw would
 * surface as an unreadable full-page error.
 */
export async function askAiCoach(formData: FormData) {
  const admin = await requireSuperAdmin();
  const campaignId = text(formData, "campaignId");
  const campaign = await getActiveCampaign();
  if (!campaign || campaign.id !== campaignId) {
    await setCoachError(admin.id, "The active campaign changed. Reload the page and ask again.");
    refresh();
    return;
  }

  const keyRow = await prisma.adminSetting.findUnique({ where: { key: OPENROUTER_KEY_SETTING } });
  const apiKey = keyRow?.value.trim();
  if (!apiKey) {
    await setCoachError(admin.id, "Paste your OpenRouter API key in the AI coach settings first.");
    refresh();
    return;
  }
  const modelRow = await prisma.adminSetting.findUnique({ where: { key: OPENROUTER_MODEL_SETTING } });
  const model = modelRow?.value.trim() || DEFAULT_COACH_MODEL;

  try {
    const metrics = await campaignMetrics(campaign);
    const [{ profile }, journal] = await Promise.all([getOperatorProfile(), recentAttemptSummaries(campaign.id)]);
    const advice = await requestCoachAdvice(apiKey, model, buildCoachContext(campaign, metrics, journal), profile);
    await prisma.marketingCoachAdvice.create({ data: { campaignId, model, advice } });
    // Keep a bounded history: the latest 20 advice entries per campaign.
    const keep = await prisma.marketingCoachAdvice.findMany({
      where: { campaignId },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true },
    });
    await prisma.marketingCoachAdvice.deleteMany({
      where: { campaignId, id: { notIn: keep.map((k) => k.id) } },
    });
    await setCoachError(admin.id, null);
  } catch (error) {
    await setCoachError(admin.id, error instanceof Error ? error.message : "The AI coach failed. Try again.");
  }
  refresh();
}

/**
 * Per-area AI suggestion (channels / activity / prospects / playbook).
 * Failures are stored as status="error" rows so the message renders inline —
 * production redacts thrown server-action errors.
 */
export async function askAiSuggestion(formData: FormData) {
  await requireSuperAdmin();
  const campaignId = text(formData, "campaignId");
  const area = text(formData, "area") as SuggestArea;
  if (!["channels", "activity", "prospects", "playbook"].includes(area)) throw new Error("Unknown area.");

  const campaign = await getActiveCampaign();
  if (!campaign) {
    refresh();
    return;
  }
  if (campaign.id !== campaignId) {
    // Stale tab: store the message inline (production redacts thrown errors).
    await prisma.marketingAiSuggestion.create({
      data: {
        campaignId: campaign.id,
        area,
        model: "-",
        status: "error",
        content: "The active campaign changed. This suggestion now targets the new active campaign; ask again.",
      },
    });
    refresh();
    return;
  }

  const keyRow = await prisma.adminSetting.findUnique({ where: { key: OPENROUTER_KEY_SETTING } });
  const apiKey = keyRow?.value.trim();
  const modelRow = await prisma.adminSetting.findUnique({ where: { key: OPENROUTER_MODEL_SETTING } });
  const model = modelRow?.value.trim() || DEFAULT_COACH_MODEL;

  let status = "ok";
  let content = "";
  if (!apiKey) {
    status = "error";
    content = "Paste your OpenRouter API key in the AI coach settings on the Command page first.";
  } else {
    try {
      const metrics = await campaignMetrics(campaign);
      const [extras, { profile }, journal] = await Promise.all([
        buildAreaExtras(area, metrics),
        getOperatorProfile(),
        recentAttemptSummaries(campaign.id),
      ]);
      const { system, user } = buildSuggestContext(area, campaign, metrics, { ...extras, journal }, profile);
      content = await callOpenRouter(apiKey, model, system, user);
    } catch (error) {
      status = "error";
      content = error instanceof Error ? error.message : "The AI suggestion failed. Try again.";
    }
  }

  await prisma.marketingAiSuggestion.create({ data: { campaignId, area, model, status, content } });
  // Bounded history: keep the latest 10 per area.
  const keep = await prisma.marketingAiSuggestion.findMany({
    where: { campaignId, area },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { id: true },
  });
  await prisma.marketingAiSuggestion.deleteMany({
    where: { campaignId, area, id: { notIn: keep.map((k) => k.id) } },
  });
  refresh();
}

export async function deletePlaybookCategory(formData: FormData) {
  const admin = await requireSuperAdmin();
  const id = text(formData, "categoryId");
  // Count + delete run in one transaction so a concurrent "move item into this
  // section" cannot slip between the check and the delete.
  const existing = await prisma.$transaction(async (tx) => {
    const category = await tx.marketingTemplateCategory.findUniqueOrThrow({ where: { id } });
    const inUse = await tx.marketingTemplate.count({ where: { category: category.key } });
    if (inUse > 0) {
      throw new Error(`Cannot delete "${category.title}": ${inUse} template(s) still use it. Move or delete them first.`);
    }
    await tx.marketingTemplateCategory.delete({ where: { id } });
    return category;
  });
  await audit(admin.id, "MARKETING_CATEGORY_DELETE", "MarketingTemplateCategory", id, {
    before: { title: existing.title, key: existing.key },
  });
  refresh();
}
