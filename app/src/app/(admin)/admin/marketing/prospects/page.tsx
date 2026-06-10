import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/form-fields";
import { EmptyState, PageHeader } from "@/components/shared/page-shell";
import { getActiveCampaign } from "@/lib/marketing/data";
import {
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

function ContactChips({ p }: { p: Record<string, string | null> }) {
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
  if (present.length === 0) return <span className="text-xs text-slate-400">No contacts</span>;
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

function ProspectEditor({
  campaignId,
  prospect,
}: {
  campaignId: string;
  prospect?: {
    id: string;
    name: string;
    context: string | null;
    warmth: string;
    pain: number;
    authority: number;
    icpFit: number;
    email: string | null;
    linkedin: string | null;
    whatsapp: string | null;
    phone: string | null;
    telegram: string | null;
    instagram: string | null;
    twitter: string | null;
    notes: string | null;
  };
}) {
  return (
    <form action={prospect ? updateProspect : createProspect} className="grid gap-3 md:grid-cols-4">
      {prospect ? (
        <input type="hidden" name="prospectId" value={prospect.id} />
      ) : (
        <input type="hidden" name="campaignId" value={campaignId} />
      )}
      <Field label="Name">
        <Input name="name" defaultValue={prospect?.name ?? ""} required />
      </Field>
      <Field label="Context (industry/role, no names)">
        <Input name="context" defaultValue={prospect?.context ?? ""} placeholder="Ops director, logistics" />
      </Field>
      <Field label="Warmth">
        <Select name="warmth" defaultValue={prospect?.warmth ?? "COLD"}>
          {WARMTH_OPTIONS.map((w) => (
            <option key={w.value} value={w.value}>
              {w.label} (x{w.weight})
            </option>
          ))}
        </Select>
      </Field>
      <div className="grid grid-cols-3 gap-2">
        <Field label="Pain 1-5">
          <Input name="pain" type="number" min={1} max={5} defaultValue={prospect?.pain ?? 3} />
        </Field>
        <Field label="Authority">
          <Input name="authority" type="number" min={1} max={5} defaultValue={prospect?.authority ?? 3} />
        </Field>
        <Field label="ICP fit">
          <Input name="icpFit" type="number" min={1} max={5} defaultValue={prospect?.icpFit ?? 3} />
        </Field>
      </div>
      <Field label="Email">
        <Input name="email" type="email" defaultValue={prospect?.email ?? ""} placeholder="links to real applications" />
      </Field>
      <Field label="LinkedIn">
        <Input name="linkedin" defaultValue={prospect?.linkedin ?? ""} />
      </Field>
      <Field label="WhatsApp">
        <Input name="whatsapp" defaultValue={prospect?.whatsapp ?? ""} />
      </Field>
      <Field label="Phone">
        <Input name="phone" defaultValue={prospect?.phone ?? ""} />
      </Field>
      <Field label="Telegram">
        <Input name="telegram" defaultValue={prospect?.telegram ?? ""} />
      </Field>
      <Field label="Instagram">
        <Input name="instagram" defaultValue={prospect?.instagram ?? ""} />
      </Field>
      <Field label="X (Twitter)">
        <Input name="twitter" defaultValue={prospect?.twitter ?? ""} />
      </Field>
      <div className="md:col-span-3">
        <Field label="Notes">
          <Textarea name="notes" className="min-h-12" defaultValue={prospect?.notes ?? ""} />
        </Field>
      </div>
      <div className="flex items-end">
        <Button type="submit" variant="secondary">
          {prospect ? "Save prospect" : "Add prospect"}
        </Button>
      </div>
    </form>
  );
}

export default async function ProspectsPage({ searchParams }: { searchParams: { stage?: string } }) {
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

  const stageFilter = PROSPECT_STAGES.some((s) => s.value === searchParams.stage) ? searchParams.stage : undefined;
  const prospects = await prisma.prospect.findMany({
    where: { campaignId: campaign.id, ...(stageFilter ? { stage: stageFilter as never } : {}) },
    include: { touches: { orderBy: { at: "desc" }, take: 3 } },
    orderBy: { updatedAt: "desc" },
  });
  const now = new Date();
  const sorted = prospects
    .map((p) => ({ ...p, score: prospectScore(p), due: p.followupStatus === "ACTIVE" && isFollowupDue(p.followupNextDue, now) }))
    .sort((a, b) => Number(b.due) - Number(a.due) || b.score - a.score);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Prospects"
        description={`${campaign.name} · sorted by follow-up urgency, then score (warmth x (pain + authority + ICP)).`}
      />
      <Link href="/admin/marketing" className="text-sm font-medium text-navy-600 hover:underline">
        ← Back to Command
      </Link>

      <Card className="space-y-3">
        <h2 className="text-base font-semibold text-navy-900">Add prospect</h2>
        <ProspectEditor campaignId={campaign.id} />
      </Card>

      <div className="flex flex-wrap gap-2">
        <Link
          href="/admin/marketing/prospects"
          className={!stageFilter ? "rounded-full bg-navy-900 px-3 py-1 text-xs font-semibold text-white" : "rounded-full border border-neutral-300 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-neutral-50"}
        >
          All
        </Link>
        {PROSPECT_STAGES.map((s) => (
          <Link
            key={s.value}
            href={`/admin/marketing/prospects?stage=${s.value}`}
            className={stageFilter === s.value ? "rounded-full bg-navy-900 px-3 py-1 text-xs font-semibold text-white" : "rounded-full border border-neutral-300 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-neutral-50"}
          >
            {s.label}
          </Link>
        ))}
      </div>

      <div className="space-y-3">
        {sorted.map((p) => (
          <Card key={p.id} className={`space-y-3 ${p.due ? "border-l-4 border-l-amber-500" : ""}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-semibold text-navy-900">{p.name}</h3>
                  <Badge status={STAGE_BADGE[p.stage] ?? "SUBMITTED"}>{stageLabel(p.stage)}</Badge>
                  <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-600">
                    score {p.score}
                  </span>
                  <span className="text-xs text-slate-400">{warmthLabel(p.warmth)}</span>
                  {p.applicationId ? (
                    <Link href={`/admin/applications/${p.applicationId}`} className="text-xs font-medium text-navy-600 hover:underline">
                      View application →
                    </Link>
                  ) : null}
                </div>
                {p.context ? <p className="mt-0.5 text-sm text-slate-600">{p.context}</p> : null}
                <div className="mt-1.5">
                  <ContactChips p={p as never} />
                </div>
              </div>

              <div className="flex flex-col items-end gap-2">
                <form action={changeProspectStage} className="flex items-center gap-2">
                  <input type="hidden" name="prospectId" value={p.id} />
                  <Select name="stage" defaultValue={p.stage} className="h-9 w-40 text-xs">
                    {PROSPECT_STAGES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </Select>
                  <Button type="submit" variant="secondary" className="px-2.5 py-1.5 text-xs">
                    Move
                  </Button>
                </form>
                <div className="flex items-center gap-2 text-xs">
                  {p.followupStatus === "ACTIVE" && p.followupNextDue ? (
                    <span className={p.due ? "font-semibold text-amber-700" : "text-slate-500"}>
                      {nextFollowupLabel(p.followupStep) ?? "FU"} {p.due ? "due today" : `on ${p.followupNextDue.toISOString().slice(0, 10)}`}
                    </span>
                  ) : (
                    <span className="text-slate-400">
                      follow-up: {p.followupStatus.toLowerCase()}
                      {p.followupStatus === "PARKED" ? " (3/3 done)" : ""}
                    </span>
                  )}
                  {p.followupStatus === "ACTIVE" && p.stage !== "LIST" ? (
                    <form action={markFollowupSent}>
                      <input type="hidden" name="prospectId" value={p.id} />
                      <Button type="submit" variant="secondary" className="px-2 py-1 text-[11px]">
                        FU sent
                      </Button>
                    </form>
                  ) : null}
                  <form action={setFollowupStatus}>
                    <input type="hidden" name="prospectId" value={p.id} />
                    <input type="hidden" name="status" value={p.followupStatus === "ACTIVE" ? "PARKED" : "ACTIVE"} />
                    <Button type="submit" variant="secondary" className="px-2 py-1 text-[11px]">
                      {p.followupStatus === "ACTIVE" ? "Park" : "Resume"}
                    </Button>
                  </form>
                </div>
              </div>
            </div>

            {p.touches.length > 0 ? (
              <p className="text-xs text-slate-500">
                Last touches:{" "}
                {p.touches.map((t) => `${t.type}${t.summary ? ` (${t.summary})` : ""} ${t.at.toISOString().slice(0, 10)}`).join(" · ")}
              </p>
            ) : null}

            <details className="rounded-md border border-neutral-200 p-3">
              <summary className="cursor-pointer text-xs font-medium text-slate-600">Edit details / log touch / delete</summary>
              <div className="mt-3 space-y-4">
                <ProspectEditor campaignId={campaign.id} prospect={p} />
                <form action={recordTouch} className="flex flex-wrap items-end gap-3 border-t border-neutral-100 pt-3">
                  <input type="hidden" name="prospectId" value={p.id} />
                  <Field label="Log a touch">
                    <Select name="type" defaultValue="note" className="w-40">
                      <option value="message">Message sent</option>
                      <option value="reply">Reply received</option>
                      <option value="call">Call / voice</option>
                      <option value="asset">Asset shared</option>
                      <option value="note">Note</option>
                    </Select>
                  </Field>
                  <Field label="Summary">
                    <Input name="summary" placeholder="What happened?" />
                  </Field>
                  <Button type="submit" variant="secondary">
                    Log
                  </Button>
                  <Button type="submit" formAction={deleteProspect} variant="danger" className="ml-auto">
                    Delete prospect
                  </Button>
                </form>
              </div>
            </details>
          </Card>
        ))}
        {sorted.length === 0 ? (
          <p className="text-sm text-slate-500">No prospects{stageFilter ? ` in ${stageLabel(stageFilter)}` : ""} yet.</p>
        ) : null}
      </div>
    </div>
  );
}
