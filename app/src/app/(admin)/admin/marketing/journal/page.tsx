import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Select, Textarea } from "@/components/ui/form-fields";
import { HintField } from "@/components/ui/hint-field";
import { EmptyState, PageHeader } from "@/components/shared/page-shell";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { prisma } from "@/lib/prisma";
import { getActiveCampaign } from "@/lib/marketing/data";
import {
  ATTEMPT_KINDS,
  ATTEMPT_METRICS,
  ATTEMPT_VARIANTS,
  attemptKindLabel,
  attemptVariantLabel,
  channelLabel,
  MARKETING_CHANNELS,
  SATISFACTION_OPTIONS,
  type AttemptKindValue,
} from "@/lib/marketing/constants";
import { AttemptKindFields } from "@/components/admin/attempt-kind-fields";
import {
  addAttemptUpdate,
  createAttempt,
  deleteAttempt,
  deleteAttemptUpdate,
  updateAttempt,
  updateAttemptUpdate,
} from "@/lib/actions/marketing";

function utcDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** "+45m", "+3h 20m", "+2d 5h": time between the attempt and a follow-up. */
function elapsedLabel(from: Date, to: Date): string {
  const mins = Math.max(0, Math.round((to.getTime() - from.getTime()) / 60_000));
  if (mins < 60) return `+${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return mins % 60 ? `+${hours}h ${mins % 60}m` : `+${hours}h`;
  return `+${Math.floor(hours / 24)}d ${hours % 24}h`;
}

/** 1-5 self-rating as a compact colored chip. */
function RatingChip({ value }: { value: number }) {
  const tone =
    value >= 4
      ? "bg-emerald-50 text-emerald-700"
      : value === 3
        ? "bg-neutral-100 text-slate-600"
        : "bg-amber-50 text-amber-700";
  return <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${tone}`}>{value}/5</span>;
}

type ProspectOption = { id: string; name: string };

type AttemptRow = {
  id: string;
  kind: string;
  variant: string | null;
  channel: string | null;
  summary: string;
  outcome: string | null;
  minutes: number;
  satisfaction: number;
  learnings: string | null;
  at: Date;
  prospect: ProspectOption | null;
};

/** Plain serializable copies of the registries for the client island. */
const KIND_OPTIONS = ATTEMPT_KINDS.map((k) => ({ value: k.value, label: k.label }));
const VARIANT_OPTIONS = Object.fromEntries(
  Object.entries(ATTEMPT_VARIANTS).map(([kind, v]) => [
    kind,
    { label: v.label, hint: v.hint, options: v.options.map((o) => ({ ...o })) },
  ]),
);
const KIND_HINT =
  "Pick the closest match; it decides which of the day's counters gets +1. 'Deep conversation' is a real back-and-forth thread (WhatsApp/DM) or a call.";

/** Snapshot numbers stored on a follow-up, rendered as compact chips. */
function MetricChips({ kind, metrics }: { kind: string; metrics: unknown }) {
  if (!metrics || typeof metrics !== "object" || Array.isArray(metrics)) return null;
  const defs = ATTEMPT_METRICS[kind as AttemptKindValue] ?? [];
  const filled = defs
    .map((def) => ({ def, value: (metrics as Record<string, unknown>)[def.key] }))
    .filter((entry): entry is { def: (typeof defs)[number]; value: number } => typeof entry.value === "number");
  if (!filled.length) return null;
  return (
    <span className="inline-flex flex-wrap gap-1 align-middle">
      {filled.map(({ def, value }) => (
        <span key={def.key} className="rounded bg-neutral-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600">
          {def.label} {value.toLocaleString("en-US")}
        </span>
      ))}
    </span>
  );
}

/**
 * The shared field set for logging and editing an attempt. Without `attempt`
 * it renders create defaults and hides the date behind a details toggle
 * (backdating is the exception); with `attempt` everything is prefilled and
 * the date is a normal field.
 */
function AttemptFields({
  prospects,
  attempt,
  today,
}: {
  prospects: ProspectOption[];
  attempt?: AttemptRow;
  today: string;
}) {
  // An entry can stay linked to someone who has since been won or closed;
  // keep that prospect selectable when editing.
  const options =
    attempt?.prospect && !prospects.some((p) => p.id === attempt.prospect!.id)
      ? [attempt.prospect, ...prospects]
      : prospects;
  return (
    <>
      <div className="grid gap-3 md:grid-cols-3">
        <AttemptKindFields
          kinds={KIND_OPTIONS}
          kindHint={KIND_HINT}
          variants={VARIANT_OPTIONS}
          defaultKind={attempt?.kind ?? "outreach"}
          defaultVariant={attempt?.variant}
        />
        <HintField
          label="Channel"
          hint="Where it happened. Needed for the +1 on the day's stats; pick 'No channel' only for off-channel work like research."
        >
          <Select name="channel" defaultValue={attempt ? (attempt.channel ?? "") : "linkedin"}>
            <option value="">No channel</option>
            {MARKETING_CHANNELS.map((channel) => (
              <option key={channel.value} value={channel.value}>
                {channel.label}
              </option>
            ))}
          </Select>
        </HintField>
        <HintField
          label="Prospect (optional)"
          hint="Link the entry to a person and it lands on their history in Prospects too. Leave empty for posts, engagement blocks, or general work."
        >
          <Select name="prospectId" defaultValue={attempt?.prospect?.id ?? ""}>
            <option value="">Nobody specific</option>
            {options.map((prospect) => (
              <option key={prospect.id} value={prospect.id}>
                {prospect.name}
              </option>
            ))}
          </Select>
        </HintField>
      </div>
      <HintField
        label="What did you do?"
        hint="One or two sentences: to whom, how, with what message or content. Example: 'Commented on Sara's AI-adoption post, then sent a connection request referencing it.'"
      >
        <Input
          name="summary"
          required
          minLength={3}
          defaultValue={attempt?.summary ?? ""}
          placeholder="e.g. Sent Ali a WhatsApp voice note about the Sample Dossier"
        />
      </HintField>
      <div className="grid gap-3 md:grid-cols-3">
        <HintField
          label="What happened?"
          hint="The result so far: 'no reply yet', 'they asked for the price', 'post got 6 comments'. Come back and edit when things change."
        >
          <Input
            name="outcome"
            defaultValue={attempt?.outcome ?? ""}
            placeholder="e.g. Accepted the request, no reply yet"
          />
        </HintField>
        <HintField label="Minutes spent" hint="Rough time it took, in minutes. Lets you see where your 2 daily hours really go.">
          <Input name="minutes" type="number" min={0} max={600} defaultValue={attempt?.minutes ?? 10} />
        </HintField>
        <HintField
          label="How did it go? (1-5)"
          hint="Your gut rating of the attempt itself, not the outcome. The AI coach reads low ratings to find what to fix."
        >
          <Select name="satisfaction" defaultValue={String(attempt?.satisfaction ?? 3)}>
            {SATISFACTION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </HintField>
      </div>
      <HintField
        label="Weak points / lessons (optional)"
        hint="What felt off and what you'd try differently: 'opener too long', 'should have led with their post, not my product'. Gold for the AI coach."
      >
        <Textarea
          name="learnings"
          className="min-h-20"
          defaultValue={attempt?.learnings ?? ""}
          placeholder="e.g. My first line was generic; next time reference their latest post"
        />
      </HintField>
      {attempt ? (
        <div className="max-w-52">
          <HintField
            label="Date"
            hint="Moving the date also moves the entry's auto +1 to that day's numbers. The time of day is kept when the date is unchanged."
          >
            <Input name="at" type="date" defaultValue={utcDay(attempt.at)} max={today} />
          </HintField>
        </div>
      ) : (
        /* Backdating is the exception, so it stays folded away; an empty
           date means the entry is stamped now. */
        <details className="text-xs">
          <summary className="cursor-pointer select-none text-slate-500 hover:text-slate-700">
            Logging something from an earlier day? Set the date (otherwise it saves as now)
          </summary>
          <div className="mt-2 max-w-52">
            <HintField
              label="Date"
              hint="Leave empty for today (the default). Pick a past date only when catching up; the auto +1 then lands on that day's numbers."
            >
              <Input name="at" type="date" max={today} />
            </HintField>
          </div>
        </details>
      )}
    </>
  );
}

export default async function MarketingJournalPage() {
  const campaign = await getActiveCampaign();
  if (!campaign) {
    return (
      <div className="space-y-8">
        <PageHeader title="Journal" description="One entry per real attempt: who, how, what happened, how it felt." />
        <EmptyState
          eyebrow="No active campaign"
          title="Create a campaign first."
          description="Journal entries belong to the active campaign."
          actionLabel="Open Campaigns"
          actionHref="/admin/marketing/campaigns"
        />
      </div>
    );
  }

  const today = utcDay(new Date());
  const weekAgo = new Date(Date.now() - 7 * 86_400_000);
  const [attempts, prospects] = await Promise.all([
    prisma.marketingAttempt.findMany({
      where: { campaignId: campaign.id },
      orderBy: { at: "desc" },
      take: 60,
      include: {
        prospect: { select: { id: true, name: true } },
        // id (cuid) as a tiebreaker keeps same-minute updates in entry order.
        updates: { orderBy: [{ at: "asc" }, { id: "asc" }] },
      },
    }),
    prisma.prospect.findMany({
      where: { campaignId: campaign.id, stage: { notIn: ["PAID", "LOST", "DROPPED"] } },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const week = attempts.filter((a) => a.at >= weekAgo);
  const weekMinutes = week.reduce((sum, a) => sum + a.minutes, 0);
  const weekAvg = week.length ? week.reduce((sum, a) => sum + a.satisfaction, 0) / week.length : 0;
  const weekWeak = week.filter((a) => a.satisfaction <= 2).length;

  // Group the list by UTC day so it reads as a diary.
  const byDay = new Map<string, typeof attempts>();
  for (const attempt of attempts) {
    const day = utcDay(attempt.at);
    const list = byDay.get(day) ?? [];
    list.push(attempt);
    byDay.set(day, list);
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Journal"
        description={`${campaign.name} · one entry per real attempt: who, how, what happened, how long, and how it felt. Saving an entry also updates that day's stats - no double entry.`}
      />
      <Link href="/admin/marketing" className="text-sm font-medium text-navy-600 hover:underline">
        ← Back to Command
      </Link>

      <Card className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-navy-900">Log an attempt</h2>
          <p className="mt-1 text-xs text-slate-500">
            Saving automatically adds +1 to the day's numbers for that channel (a post bumps Posts, outreach bumps
            Messages, …) and records a touch on the linked prospect. Stage moves still happen in{" "}
            <Link href="/admin/marketing/prospects" className="text-navy-600 hover:underline">
              Prospects
            </Link>
            .
          </p>
        </div>
        <form action={createAttempt} className="space-y-3">
          <input type="hidden" name="campaignId" value={campaign.id} />
          <AttemptFields prospects={prospects} today={today} />
          <Button type="submit">Save attempt</Button>
        </form>
      </Card>

      <Card className="space-y-1">
        <h2 className="text-sm font-semibold text-navy-900">This week</h2>
        <p className="text-sm text-slate-600">
          {week.length} attempt{week.length === 1 ? "" : "s"} · {weekMinutes} min total · avg rating{" "}
          {week.length ? weekAvg.toFixed(1) : "—"}/5
          {weekWeak > 0 ? ` · ${weekWeak} rated 2 or lower - worth a look below` : ""}
        </p>
        <p className="text-xs text-slate-500">
          The AI coach and every "suggest" button read your latest entries (outcomes, ratings, lessons), so the more
          honest the journal, the sharper the advice.
        </p>
      </Card>

      <div className="space-y-6">
        {attempts.length === 0 ? (
          <Card>
            <p className="text-sm text-slate-500">
              No entries yet. Log your first attempt above - even "read 10 ICP posts, 15 min" counts.
            </p>
          </Card>
        ) : (
          [...byDay.entries()].map(([day, list]) => (
            <Card key={day} className="space-y-3">
              <h2 className="text-sm font-semibold text-navy-900">{day}</h2>
              <div className="divide-y divide-neutral-100">
                {list.map((attempt) => (
                  <div key={attempt.id} className="space-y-1 py-3 first:pt-0 last:pb-0">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="rounded-full bg-navy-50 px-2 py-0.5 font-semibold text-navy-700">
                        {attemptKindLabel(attempt.kind)}
                      </span>
                      {attempt.variant ? (
                        <span className="rounded-full border border-navy-100 px-2 py-0.5 font-medium text-navy-600">
                          {attemptVariantLabel(attempt.kind, attempt.variant)}
                        </span>
                      ) : null}
                      {attempt.channel ? <span className="text-slate-500">{channelLabel(attempt.channel)}</span> : null}
                      {attempt.prospect ? (
                        <span className="font-medium text-navy-900">{attempt.prospect.name}</span>
                      ) : null}
                      <RatingChip value={attempt.satisfaction} />
                      {attempt.minutes > 0 ? <span className="text-slate-400">{attempt.minutes} min</span> : null}
                    </div>
                    <p className="text-sm text-slate-700">{attempt.summary}</p>
                    {attempt.outcome ? (
                      <p className="text-sm text-slate-600">
                        <span className="font-medium text-navy-900">Result:</span> {attempt.outcome}
                      </p>
                    ) : null}
                    {attempt.learnings ? (
                      <p className="text-xs italic text-slate-500">Lesson: {attempt.learnings}</p>
                    ) : null}

                    {/* Follow-up thread: the original entry stays untouched;
                        each update documents what happened, stamped with the
                        time elapsed since the attempt. */}
                    {attempt.updates.length > 0 ? (
                      <div className="mt-1 space-y-1 border-l-2 border-navy-100 pl-3">
                        {attempt.updates.map((update) => {
                          const updateMetrics =
                            update.metrics && typeof update.metrics === "object" && !Array.isArray(update.metrics)
                              ? (update.metrics as Record<string, unknown>)
                              : {};
                          return (
                            /* Click a follow-up line to open its editor: every
                               value (numbers, note, timestamp) can be fixed. */
                            <details key={update.id} className="text-sm">
                              <summary className="flex cursor-pointer list-none items-baseline gap-2 rounded px-1 -mx-1 transition hover:bg-navy-50/60 [&::-webkit-details-marker]:hidden">
                                <span
                                  className="flex-none rounded bg-navy-50 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-navy-700"
                                  title={update.at.toISOString().replace("T", " ").slice(0, 16) + " UTC"}
                                >
                                  {elapsedLabel(attempt.at, update.at)}
                                </span>
                                <span className="min-w-0 space-x-1.5 text-slate-700">
                                  <MetricChips kind={attempt.kind} metrics={update.metrics} />
                                  {update.note ? <span>{update.note}</span> : null}
                                </span>
                                <span className="flex-none text-xs font-medium text-navy-500">edit ✎</span>
                              </summary>
                              <div className="mt-2 flex flex-wrap items-start gap-3 rounded-md border border-neutral-200 bg-neutral-50/60 p-3">
                                <form action={updateAttemptUpdate} className="min-w-0 grow space-y-2">
                                  <input type="hidden" name="updateId" value={update.id} />
                                  {(ATTEMPT_METRICS[attempt.kind as AttemptKindValue] ?? []).length > 0 ? (
                                    <div className="grid grid-cols-3 items-end gap-2 md:grid-cols-6">
                                      {(ATTEMPT_METRICS[attempt.kind as AttemptKindValue] ?? []).map((metric) => (
                                        <HintField key={metric.key} label={metric.label} hint={metric.hint}>
                                          <Input
                                            name={`m_${metric.key}`}
                                            type="number"
                                            min={0}
                                            max={10_000_000}
                                            defaultValue={
                                              typeof updateMetrics[metric.key] === "number"
                                                ? (updateMetrics[metric.key] as number)
                                                : ""
                                            }
                                            className="h-9 text-sm"
                                          />
                                        </HintField>
                                      ))}
                                    </div>
                                  ) : null}
                                  <div className="grid items-end gap-2 md:grid-cols-[1fr_auto_auto]">
                                    <HintField
                                      label="Note"
                                      hint={
                                        (ATTEMPT_METRICS[attempt.kind as AttemptKindValue] ?? []).length
                                          ? "The free-text part of this follow-up. Emptying it is fine as long as at least one number stays filled."
                                          : "The text of this follow-up. Clearing it and saving keeps the old text (only the time can change alone); use Delete to remove the entry."
                                      }
                                    >
                                      <Input name="note" maxLength={500} defaultValue={update.note} className="h-9 text-sm" />
                                    </HintField>
                                    <HintField
                                      label="When (UTC)"
                                      hint="The moment this follow-up happened, in UTC. The +elapsed label is computed from it; it must stay between the attempt and now."
                                    >
                                      <Input
                                        name="at"
                                        type="datetime-local"
                                        defaultValue={update.at.toISOString().slice(0, 16)}
                                        min={attempt.at.toISOString().slice(0, 16)}
                                        className="h-9 text-sm"
                                      />
                                    </HintField>
                                    <Button type="submit" variant="secondary" className="h-9 px-3 text-xs">
                                      Save
                                    </Button>
                                  </div>
                                </form>
                                <form className="pt-6">
                                  <input type="hidden" name="updateId" value={update.id} />
                                  <ConfirmButton
                                    action={deleteAttemptUpdate}
                                    message="Remove this follow-up note from the thread?"
                                    className="rounded-md border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/40"
                                  >
                                    Delete
                                  </ConfirmButton>
                                </form>
                              </div>
                            </details>
                          );
                        })}
                      </div>
                    ) : null}
                    <form action={addAttemptUpdate} className="max-w-3xl space-y-2 pt-1">
                      <input type="hidden" name="attemptId" value={attempt.id} />
                      {(ATTEMPT_METRICS[attempt.kind as AttemptKindValue] ?? []).length > 0 ? (
                        <div className="grid grid-cols-3 items-end gap-2 md:grid-cols-6">
                          {(ATTEMPT_METRICS[attempt.kind as AttemptKindValue] ?? []).map((metric) => (
                            <HintField key={metric.key} label={metric.label} hint={metric.hint}>
                              <Input name={`m_${metric.key}`} type="number" min={0} max={10_000_000} className="h-9 text-sm" />
                            </HintField>
                          ))}
                        </div>
                      ) : null}
                      <div className="flex items-end gap-2">
                        <div className="grow">
                          <HintField
                            label="Follow-up"
                            hint="What happened after this attempt? Saved with a timestamp and shown as +time since the attempt; the AI coach reads the trend. Numbers above are totals at this moment; fill any subset, the note is optional with them."
                          >
                            <Input
                              name="note"
                              maxLength={500}
                              placeholder="e.g. 14 GORILLA comments, 3 DMs started"
                              className="h-9 text-sm"
                            />
                          </HintField>
                        </div>
                        <Button type="submit" variant="secondary" className="h-9 flex-none px-3 text-xs">
                          Add update
                        </Button>
                      </div>
                    </form>

                    <div className="flex items-center gap-3 pt-1">
                      <details className="min-w-0 grow">
                        <summary className="inline cursor-pointer select-none text-xs font-medium text-navy-600 hover:underline">
                          Edit
                        </summary>
                        <form action={updateAttempt} className="mt-3 space-y-3 rounded-md border border-neutral-200 bg-neutral-50/60 p-3">
                          <input type="hidden" name="attemptId" value={attempt.id} />
                          <AttemptFields prospects={prospects} attempt={attempt} today={today} />
                          <Button type="submit" variant="secondary">
                            Save changes
                          </Button>
                        </form>
                      </details>
                      <form>
                        <input type="hidden" name="attemptId" value={attempt.id} />
                        <ConfirmButton
                          action={deleteAttempt}
                          message="Delete this journal entry? Its auto-counted +1 on that day's numbers is removed too."
                          className="rounded-md px-2 py-1 text-xs font-medium text-red-600 transition hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/40"
                        >
                          Delete
                        </ConfirmButton>
                      </form>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
