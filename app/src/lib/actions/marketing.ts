"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/authz";
import { advanceFollowup, nextFollowupDue } from "@/lib/marketing/followup";
import { MARKETING_CHANNELS, PROSPECT_STAGES, WARMTH_OPTIONS } from "@/lib/marketing/constants";

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
    "/admin/marketing/playbook",
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
    },
    create: {
      campaignId,
      channel,
      dailyMin: intIn(formData, "dailyMin", 5, 0, 1000),
      dailyMax: intIn(formData, "dailyMax", 15, 0, 1000),
      weeklyCap: intIn(formData, "weeklyCap", 70, 0, 10000),
    },
  });
  refresh();
}

export async function removeChannel(formData: FormData) {
  await requireSuperAdmin();
  const id = text(formData, "channelId");
  await prisma.marketingChannel.delete({ where: { id } });
  refresh();
}

// ---------------------------------------------------------------------------
// Prospects
// ---------------------------------------------------------------------------

function prospectData(formData: FormData) {
  const name = text(formData, "name");
  if (name.length < 2) throw new Error("Enter the prospect's name.");
  const warmth = text(formData, "warmth");
  if (!WARMTH_VALUES.includes(warmth)) throw new Error("Pick a warmth level.");
  const assets = formData
    .getAll("assetsSent")
    .filter((value): value is string => typeof value === "string" && value.length > 0);
  return {
    assetsSent: assets.length > 0 ? assets.join(",") : null,
    name,
    context: text(formData, "context") || null,
    warmth: warmth as "WARM" | "REFERRAL" | "COLD_ENGAGED" | "COLD",
    pain: intIn(formData, "pain", 3, 1, 5),
    authority: intIn(formData, "authority", 3, 1, 5),
    icpFit: intIn(formData, "icpFit", 3, 1, 5),
    email: text(formData, "email") || null,
    linkedin: text(formData, "linkedin") || null,
    whatsapp: text(formData, "whatsapp") || null,
    phone: text(formData, "phone") || null,
    telegram: text(formData, "telegram") || null,
    instagram: text(formData, "instagram") || null,
    twitter: text(formData, "twitter") || null,
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
  if (stage === "APPROACHED" && existing.stage === "LIST") {
    data.followupStatus = "ACTIVE";
    data.followupStep = 0;
    data.followupNextDue = nextFollowupDue(0, now);
    await prisma.prospectTouch.create({
      data: { prospectId: id, type: "message", summary: "Initial approach sent" },
    });
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
  const data = {
    messages: intIn(formData, "messages", 0, 0, 10000),
    replies: intIn(formData, "replies", 0, 0, 10000),
    calls: intIn(formData, "calls", 0, 0, 10000),
    notes: text(formData, "notes") || null,
  };
  await prisma.marketingDailyLog.upsert({
    where: { campaignId_date_channel: { campaignId, date, channel } },
    update: data,
    create: { campaignId, date, channel, ...data },
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
