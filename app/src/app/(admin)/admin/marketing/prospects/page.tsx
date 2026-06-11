import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Select, Textarea } from "@/components/ui/form-fields";
import { HintField } from "@/components/ui/hint-field";
import { InfoTip } from "@/components/ui/form-field";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { EmptyState, PageHeader } from "@/components/shared/page-shell";
import { getActiveCampaign } from "@/lib/marketing/data";
import {
  ASSET_OPTIONS,
  MARKETING_CHANNELS,
  PROSPECT_STAGES,
  WARMTH_OPTIONS,
  prospectScore,
  stageLabel,
  warmthLabel,
} from "@/lib/marketing/constants";
import { isFollowupDue, nextFollowupLabel } from "@/lib/marketing/followup";
import { prisma } from "@/lib/prisma";
import {
  changeProspectStage,
  createProspect,
  deleteProspect,
  markFollowupSent,
  recordTouch,
  setFollowupStatus,
  updateProspect,
} from "@/lib/actions/marketing";
import { AiSuggestCard } from "@/components/admin/ai-suggest-card";

const STAGE_BADGE: Record<string, string> = {
  LIST: "SUBMITTED",
  APPROACHED: "UNDER_REVIEW",
  REPLIED: "REVISED",
  CALL_BOOKED: "UNLOCKED",
  CALL_HELD: "ONBOARDING",
  APPLIED: "IN_PROGRESS",
  PAID: "ACCEPTED",
  LOST: "NOT_COMPLETED",
  DROPPED: "CLOSED",
};

// The one obvious "what happened next" per stage: label + target stage.
const NEXT_STEP: Record<string, { label: string; stage: string } | undefined> = {
  LIST: { label: "Approached ✓", stage: "APPROACHED" },
  APPROACHED: { label: "They replied", stage: "REPLIED" },
  REPLIED: { label: "Convo planned", stage: "CALL_BOOKED" },
  CALL_BOOKED: { label: "Convo held", stage: "CALL_HELD" },
  CALL_HELD: { label: "Applied", stage: "APPLIED" },
  APPLIED: { label: "Paid 🎉", stage: "PAID" },
};

const VIEWS = [
  { key: "today", label: "Today" },
  { key: "approach", label: "To approach" },
  { key: "waiting", label: "Waiting on them" },
  { key: "talking", label: "In conversation" },
  { key: "won", label: "Won" },
  { key: "closed", label: "Closed" },
  { key: "all", label: "All" },
] as const;

const TIPS = {
  quickName: "Just the name is enough to capture someone. Add details later from the row's Edit.",
  quickWarmth: "How they know you — it multiplies the priority score. Warm x4, Referral x3, Cold engaged x2, Cold x1.",
  quickChannel: "Where you'll reach them. The handle is saved on the matching contact field.",
  quickHandle: "Their handle/address on that channel (e.g. the LinkedIn URL, phone number, or email).",
  quickContext: "Optional but powerful: role + industry makes your first line personal.",
  name: "First name is enough if that's all you have.",
  context: "Their role and industry WITHOUT confidential details, e.g. 'Ops director, logistics scale-up'.",
  warmth: "How they know you. Warm (x4) > Referral (x3) > Cold engaged (x2) > Cold (x1).",
  pain: "1-5: how badly do they have the AI-adoption problem? 5 = actively struggling and says so.",
  authority: "1-5: can they decide AND pay $997 themselves? 5 = owns the budget.",
  icp: "1-5: ideal-customer fit and case-study value.",
  email: "The key for automation: if they apply with this email, funnel sync links them and advances the stage.",
  contacts: "Fill only the channels you can actually reach them on.",
  assets: "Which trust assets you've already shared. Lead with the Sample Dossier.",
  notes: "Conversation notes, objections heard, what to mention next time.",
  stageMove:
    "Free move to any stage. LIST → APPROACHED starts the follow-up cadence (FU1 +3d, FU2 +7d, FU3 +7d); a reply pauses it; Paid/Lost/Dropped end it. When marking Lost, log the reason as a touch note.",
  fuSent:
    "Press after you actually send the due follow-up; schedules the next step. After FU3 the prospect parks. Then write it in the Journal so today's numbers update.",
  parkResume:
    "Park = stop reminders but keep them. Resume reactivates and schedules the next follow-up from today (a finished 3/3 cadence stays parked).",
  touch:
    "A quick note on this person's history. For the full story (time spent, outcome, self-rating) log it in the Journal page instead - linked entries land here automatically.",
};

type ProspectRow = Awaited<ReturnType<typeof loadProspects>>[number];

async function loadProspects(campaignId: string) {
  const prospects = await prisma.prospect.findMany({
    where: { campaignId },
    include: { touches: { orderBy: { at: "desc" }, take: 3 } },
    orderBy: { updatedAt: "desc" },
  });
  const now = new Date();
  return prospects.map((p) => ({
    ...p,
    score: prospectScore(p),
    due: p.followupStatus === "ACTIVE" && !["LIST", "PAID", "LOST", "DROPPED"].includes(p.stage) && isFollowupDue(p.followupNextDue, now),
  }));
}

function ProspectEditor({ campaignId, prospect }: { campaignId: string; prospect?: ProspectRow }) {
  const sentAssets = new Set((prospect?.assetsSent ?? "").split(",").filter(Boolean));
  return (
    <form action={prospect ? updateProspect : createProspect} className="grid gap-3 md:grid-cols-4">
      {prospect ? (
        <input type="hidden" name="prospectId" value={prospect.id} />
      ) : (
        <input type="hidden" name="campaignId" value={campaignId} />
      )}
      <HintField label="Name" hint={TIPS.name}>
        <Input name="name" defaultValue={prospect?.name ?? ""} required />
      </HintField>
      <HintField label="Context (role/industry)" hint={TIPS.context}>
        <Input name="context" defaultValue={prospect?.context ?? ""} placeholder="Ops director, logistics" />
      </HintField>
      <HintField label="Warmth" hint={TIPS.warmth}>
        <Select name="warmth" defaultValue={prospect?.warmth ?? "COLD"}>
          {WARMTH_OPTIONS.map((w) => (
            <option key={w.value} value={w.value}>
              {w.label} (x{w.weight})
            </option>
          ))}
        </Select>
      </HintField>
      <div className="grid grid-cols-3 gap-2">
        <HintField label="Pain" hint={TIPS.pain}>
          <Input name="pain" type="number" min={1} max={5} defaultValue={prospect?.pain ?? 3} />
        </HintField>
        <HintField label="Authority" hint={TIPS.authority}>
          <Input name="authority" type="number" min={1} max={5} defaultValue={prospect?.authority ?? 3} />
        </HintField>
        <HintField label="ICP fit" hint={TIPS.icp}>
          <Input name="icpFit" type="number" min={1} max={5} defaultValue={prospect?.icpFit ?? 3} />
        </HintField>
      </div>
      <HintField label="Email" hint={TIPS.email}>
        <Input name="email" type="email" defaultValue={prospect?.email ?? ""} />
      </HintField>
      <HintField label="LinkedIn" hint={TIPS.contacts}>
        <Input name="linkedin" defaultValue={prospect?.linkedin ?? ""} />
      </HintField>
      <HintField label="WhatsApp" hint={TIPS.contacts}>
        <Input name="whatsapp" defaultValue={prospect?.whatsapp ?? ""} />
      </HintField>
      <HintField label="Phone" hint={TIPS.contacts}>
        <Input name="phone" defaultValue={prospect?.phone ?? ""} />
      </HintField>
      <HintField label="Telegram" hint={TIPS.contacts}>
        <Input name="telegram" defaultValue={prospect?.telegram ?? ""} />
      </HintField>
      <HintField label="Instagram" hint={TIPS.contacts}>
        <Input name="instagram" defaultValue={prospect?.instagram ?? ""} />
      </HintField>
      <HintField label="X (Twitter)" hint={TIPS.contacts}>
        <Input name="twitter" defaultValue={prospect?.twitter ?? ""} />
      </HintField>
      <HintField label="Assets shared" hint={TIPS.assets}>
        <span className="flex h-11 flex-wrap items-center gap-3">
          {ASSET_OPTIONS.map((asset) => (
            <label key={asset.value} className="flex items-center gap-1.5 text-xs text-slate-700">
              <input type="checkbox" name="assetsSent" value={asset.value} defaultChecked={sentAssets.has(asset.value)} />
              {asset.label}
            </label>
          ))}
        </span>
      </HintField>
      <div className="md:col-span-3">
        <HintField label="Notes" hint={TIPS.notes}>
          <Textarea name="notes" className="min-h-12" defaultValue={prospect?.notes ?? ""} />
        </HintField>
      </div>
      <div className="flex items-end">
        <Button type="submit" variant="secondary">
          {prospect ? "Save prospect" : "Add prospect"}
        </Button>
      </div>
    </form>
  );
}

function ContactChips({ p }: { p: ProspectRow }) {
  const entries: Array<[string, string | null]> = [
    ["Email", p.email],
    ["LinkedIn", p.linkedin],
    ["WhatsApp", p.whatsapp],
    ["Phone", p.phone],
    ["Telegram", p.telegram],
    ["Instagram", p.instagram],
    ["X", p.twitter],
  ];
  const present = entries.filter(([, value]) => value);
  if (present.length === 0) return <span className="text-xs text-slate-400">No contacts yet</span>;
  return (
    <span className="flex flex-wrap gap-1.5">
      {present.map(([label, value]) => (
        <span key={label} className="rounded border border-neutral-200 bg-white px-1.5 py-0.5 text-[11px] text-slate-600">
          <span className="text-slate-400">{label}:</span> {value}
        </span>
      ))}
    </span>
  );
}

/** One compact, action-first row. The primary button is the obvious next step. */
function ProspectRowCard({ p, campaignId }: { p: ProspectRow; campaignId: string }) {
  const next = NEXT_STEP[p.stage];
  return (
    <Card className={`space-y-2 p-3 ${p.due ? "border-l-4 border-l-amber-500" : ""}`}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        {/* Identity */}
        <div className="min-w-44 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-navy-900">{p.name}</span>
            <Badge status={STAGE_BADGE[p.stage] ?? "SUBMITTED"}>{stageLabel(p.stage)}</Badge>
            <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-600" title="warmth x (pain + authority + ICP)">
              {p.score}
            </span>
            {p.applicationId ? (
              <Link href={`/admin/applications/${p.applicationId}`} className="text-[11px] font-medium text-navy-600 hover:underline">
                application →
              </Link>
            ) : null}
          </div>
          <p className="mt-0.5 text-xs text-slate-500">
            {p.context ? `${p.context} · ` : ""}
            {warmthLabel(p.warmth)}
            {p.followupStatus === "ACTIVE" && p.followupNextDue ? (
              <span className={p.due ? " font-semibold text-amber-700" : ""}>
                {" · "}
                {nextFollowupLabel(p.followupStep) ?? "FU"} {p.due ? "due today" : `on ${p.followupNextDue.toISOString().slice(0, 10)}`}
              </span>
            ) : p.followupStatus === "ACTIVE" && !["LIST", "PAID", "LOST", "DROPPED"].includes(p.stage) ? (
              " · cadence paused (replied)"
            ) : null}
          </p>
        </div>

        {/* Primary actions */}
        <div className="flex flex-wrap items-center gap-1.5">
          {p.due ? (
            <form action={markFollowupSent}>
              <input type="hidden" name="prospectId" value={p.id} />
              <Button type="submit" className="h-8 px-3 text-xs">
                FU sent ✓
              </Button>
            </form>
          ) : null}
          {next ? (
            <form action={changeProspectStage}>
              <input type="hidden" name="prospectId" value={p.id} />
              <input type="hidden" name="stage" value={next.stage} />
              <Button type="submit" variant={p.due ? "secondary" : "primary"} className="h-8 px-3 text-xs">
                {next.label}
              </Button>
            </form>
          ) : null}
          {!["PAID", "LOST", "DROPPED"].includes(p.stage) ? (
            <form action={changeProspectStage}>
              <input type="hidden" name="prospectId" value={p.id} />
              <input type="hidden" name="stage" value="LOST" />
              <ConfirmButton
                action={changeProspectStage}
                message={`Mark "${p.name}" as lost? Reminders stop; you can reopen them later with Move.`}
                className="rounded-md px-2 py-1.5 text-xs font-medium text-slate-500 hover:bg-neutral-100"
              >
                Lost
              </ConfirmButton>
            </form>
          ) : null}
        </div>
      </div>

      <details>
        <summary className="cursor-pointer text-[11px] font-medium text-slate-400 hover:text-slate-600">
          Details · edit · move · touches
        </summary>
        <div className="mt-3 space-y-4 border-t border-neutral-100 pt-3">
          <ContactChips p={p} />
          {p.touches.length > 0 ? (
            <p className="text-xs text-slate-500">
              Last touches:{" "}
              {p.touches.map((t) => `${t.type}${t.summary ? ` (${t.summary})` : ""} ${t.at.toISOString().slice(0, 10)}`).join(" · ")}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            <form action={changeProspectStage} className="flex items-center gap-2">
              <input type="hidden" name="prospectId" value={p.id} />
              <Select name="stage" defaultValue={p.stage} className="h-9 w-40 text-xs">
                {PROSPECT_STAGES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </Select>
              <Button type="submit" variant="secondary" className="h-8 px-2.5 text-xs">
                Move
              </Button>
              <InfoTip label="About stages" text={TIPS.stageMove} />
            </form>
            <form action={setFollowupStatus} className="flex items-center gap-1">
              <input type="hidden" name="prospectId" value={p.id} />
              <input type="hidden" name="status" value={p.followupStatus === "ACTIVE" ? "PARKED" : "ACTIVE"} />
              <Button type="submit" variant="secondary" className="h-8 px-2 text-xs">
                {p.followupStatus === "ACTIVE" ? "Park follow-ups" : "Resume follow-ups"}
              </Button>
              <InfoTip label="About park/resume" text={TIPS.parkResume} />
            </form>
          </div>

          <ProspectEditor campaignId={campaignId} prospect={p} />

          <form action={recordTouch} className="flex flex-wrap items-end gap-3 border-t border-neutral-100 pt-3">
            <input type="hidden" name="prospectId" value={p.id} />
            <HintField label="Log a touch" hint={TIPS.touch}>
              <Select name="type" defaultValue="note" className="w-40">
                <option value="message">Message sent</option>
                <option value="reply">Reply received</option>
                <option value="call">Conversation / call</option>
                <option value="asset">Asset shared</option>
                <option value="note">Note</option>
              </Select>
            </HintField>
            <HintField label="Summary" hint="One line: what was said or what happened.">
              <Input name="summary" placeholder="What happened?" />
            </HintField>
            <Button type="submit" variant="secondary">
              Log
            </Button>
            <ConfirmButton
              action={deleteProspect}
              message={`Delete prospect "${p.name}"? Their touch history goes with them.`}
              className="ml-auto rounded-md border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              Delete
            </ConfirmButton>
          </form>
        </div>
      </details>
    </Card>
  );
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ProspectsPage({
  searchParams,
}: {
  searchParams: { view?: string | string[]; stage?: string | string[] };
}) {
  const campaign = await getActiveCampaign();
  if (!campaign) {
    return (
      <div className="space-y-8">
        <PageHeader title="Prospects" description="Outreach pipeline." />
        <EmptyState
          eyebrow="No active campaign"
          title="Create a campaign first."
          description="Prospects live inside a campaign with its goals and quotas."
          actionLabel="Open Campaigns"
          actionHref="/admin/marketing/campaigns"
        />
      </div>
    );
  }

  const all = await loadProspects(campaign.id);
  const stageParam = first(searchParams.stage);
  const stageFilter = PROSPECT_STAGES.some((s) => s.value === stageParam) ? stageParam : undefined;
  const viewParam = first(searchParams.view);
  const view = stageFilter ? "all" : VIEWS.some((v) => v.key === viewParam) ? (viewParam as (typeof VIEWS)[number]["key"]) : "today";

  const byScore = (a: ProspectRow, b: ProspectRow) => b.score - a.score;
  const queues: Record<string, ProspectRow[]> = {
    today: [...all.filter((p) => p.due), ...all.filter((p) => p.stage === "LIST").sort(byScore)],
    approach: all.filter((p) => p.stage === "LIST").sort(byScore),
    waiting: all.filter((p) => p.stage === "APPROACHED" && !p.due),
    talking: all.filter((p) => ["REPLIED", "CALL_BOOKED", "CALL_HELD"].includes(p.stage)),
    won: all.filter((p) => ["APPLIED", "PAID"].includes(p.stage)),
    closed: all.filter((p) => ["LOST", "DROPPED"].includes(p.stage)),
    all: [...all].sort((a, b) => Number(b.due) - Number(a.due) || b.score - a.score),
  };
  const rows = stageFilter ? all.filter((p) => p.stage === stageFilter) : queues[view];

  const stageCounts = all.reduce<Record<string, number>>((acc, p) => {
    acc[p.stage] = (acc[p.stage] ?? 0) + 1;
    return acc;
  }, {});
  const dueCount = all.filter((p) => p.due).length;

  const viewCount: Record<string, number> = {
    today: queues.today.length,
    approach: queues.approach.length,
    waiting: queues.waiting.length,
    talking: queues.talking.length,
    won: queues.won.length,
    closed: queues.closed.length,
    all: all.length,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Prospects"
        description={`${campaign.name} · capture fast, then work the queues. The highlighted button on each row is the next step.`}
      />
      <Link href="/admin/marketing" className="text-sm font-medium text-navy-600 hover:underline">
        ← Back to Command
      </Link>

      {/* Quick add */}
      <Card className="space-y-2">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-navy-900">
          Quick add
          <InfoTip label="About quick add" text="Capture a contact in seconds: name, how they know you, and one handle. Everything else can be added later from the row." />
        </h2>
        <form action={createProspect} className="grid items-end gap-3 md:grid-cols-6">
          <input type="hidden" name="campaignId" value={campaign.id} />
          <HintField label="Name" hint={TIPS.quickName}>
            <Input name="name" placeholder="Sara K." minLength={2} required />
          </HintField>
          <HintField label="Warmth" hint={TIPS.quickWarmth}>
            <Select name="warmth" defaultValue="COLD">
              {WARMTH_OPTIONS.map((w) => (
                <option key={w.value} value={w.value}>
                  {w.label}
                </option>
              ))}
            </Select>
          </HintField>
          <HintField label="Channel" hint={TIPS.quickChannel}>
            <Select name="quickChannel" defaultValue="linkedin">
              {MARKETING_CHANNELS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Select>
          </HintField>
          <HintField label="Handle / address" hint={TIPS.quickHandle}>
            <Input name="quickHandle" placeholder="linkedin.com/in/… or +44…" />
          </HintField>
          <HintField label="Context" hint={TIPS.quickContext}>
            <Input name="context" placeholder="HR lead, fintech" />
          </HintField>
          <Button type="submit">Add</Button>
        </form>
      </Card>

      <AiSuggestCard
        campaignId={campaign.id}
        area="prospects"
        hint="Reads your live pipeline (stages, scores, cadence state, notes) and names the 5 prospects to act on right now, with a suggested angle for each — plus who to stop chasing."
      />

      {/* Pipeline bar */}
      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-1 text-xs">
          {PROSPECT_STAGES.filter((s) => !["LOST", "DROPPED"].includes(s.value)).map((s, i, arr) => (
            <span key={s.value} className="flex items-center gap-1">
              <Link
                href={`/admin/marketing/prospects?stage=${s.value}`}
                className={`rounded-md px-2 py-1 transition hover:bg-navy-50 ${stageFilter === s.value ? "bg-navy-900 text-white hover:bg-navy-900" : "text-slate-700"}`}
              >
                {s.label} <span className="font-semibold">{stageCounts[s.value] ?? 0}</span>
              </Link>
              {i < arr.length - 1 ? <span className="text-slate-300">→</span> : null}
            </span>
          ))}
          <span className="mx-1 text-slate-300">|</span>
          {["LOST", "DROPPED"].map((s) => (
            <Link
              key={s}
              href={`/admin/marketing/prospects?stage=${s}`}
              className={`rounded-md px-2 py-1 text-slate-400 transition hover:bg-neutral-50 ${stageFilter === s ? "bg-navy-900 text-white hover:bg-navy-900" : ""}`}
            >
              {stageLabel(s)} {stageCounts[s] ?? 0}
            </Link>
          ))}
        </div>
      </Card>

      {/* Work queues */}
      <div className="flex flex-wrap gap-2">
        {VIEWS.map((v) => (
          <Link
            key={v.key}
            href={`/admin/marketing/prospects?view=${v.key}`}
            className={
              view === v.key && !stageFilter
                ? "rounded-full bg-navy-900 px-3 py-1 text-xs font-semibold text-white"
                : "rounded-full border border-neutral-300 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-neutral-50"
            }
          >
            {v.label} ({viewCount[v.key]})
            {v.key === "today" && dueCount > 0 ? <span className="ml-1 rounded-full bg-amber-500 px-1.5 text-[10px] text-white">{dueCount} due</span> : null}
          </Link>
        ))}
      </div>

      {/* Rows */}
      <div className="space-y-2">
        {view === "today" && !stageFilter && rows.length > 0 ? (
          <p className="text-xs text-slate-500">
            {dueCount > 0 ? `${dueCount} follow-up${dueCount === 1 ? "" : "s"} due first, then the highest-scored contacts to approach.` : "No follow-ups due — approach the highest-scored contacts below."}
          </p>
        ) : null}
        {rows.map((p) => (
          <ProspectRowCard key={p.id} p={p} campaignId={campaign.id} />
        ))}
        {rows.length === 0 ? (
          <Card className="p-6 text-center text-sm text-slate-500">
            {view === "today" && !stageFilter
              ? "All clear. Nothing due and nobody waiting — add new contacts above."
              : "Nothing here yet."}
          </Card>
        ) : null}
      </div>
    </div>
  );
}
