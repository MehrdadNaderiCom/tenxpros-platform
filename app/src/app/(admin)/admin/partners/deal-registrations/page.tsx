import Link from "next/link";
import type { DealMessage } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  confirmDealRegistration,
  declineDealRegistration,
  decideTenXOpsEngagement,
  postDealMessageAdmin,
  requestDealRevision,
} from "@/lib/actions/partner-admin";
import { DEAL_REG_STATUS_LABELS, OFFERING_LABELS } from "@/lib/partner/constants";
import { companyNewnessState, normalizeDomain, normalizeEntityName, similarName, type NewnessState } from "@/lib/partner/commission";
import { resolvePartnerConfig } from "@/lib/partner/config-server";
import { addBusinessDays } from "@/lib/partner/rules";
import { DealThread } from "@/components/portal/deal-thread";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, THead, Th, TBody, TR, Td } from "@/components/ui/table";
import { Input, Select, Textarea } from "@/components/ui/form-fields";
import { PageHeader } from "@/components/shared/page-shell";

export const dynamic = "force-dynamic";

type Claim = {
  function: string;
  contactName: string | null;
  relationshipDescription: string | null;
  introDescription: string | null;
  involvementStatement: string | null;
  warmRelationshipAttested: boolean;
};

type AdminDeal = {
  id: string;
  legalEntity: string;
  domain: string | null;
  country: string;
  businessUnit: string | null;
  offering: keyof typeof OFFERING_LABELS;
  productLine: string;
  estSeats: number | null;
  estValueCents: number | null;
  contactName: string | null;
  contactTitle: string | null;
  status: string;
  justification: string;
  widerScopeRequested: string | null;
  submittedAt: Date;
  partner: { id: string; displayName: string; tier: string };
  messages: DealMessage[];
  functionClaims: Claim[];
};

/** Everything the admin needs to actually decide, computed server-side. */
type DealInsight = {
  newness: NewnessState | null;
  seatThreshold: number;
  likelyClassification: string;
  nearMatches: string[];
  decisionDueAt: Date;
};

const CLAIM_LABELS: Record<string, string> = {
  BASIC_INTRO: "Basic Introduction (introduce and step away)",
  ORIGINATION: "Origination (meetings and follow-up)",
  CLOSING: "Closing (drives to signature and start)",
  DELIVERY: "Delivery or Coaching",
};

/** One actionable opportunity: details, decision facts, thread, and every admin control. */
function AdminDealCard({ reg, insight }: { reg: AdminDeal; insight: DealInsight }) {
  const scopeDefault = `${reg.legalEntity}, ${reg.country}${reg.businessUnit ? `, ${reg.businessUnit}` : ""}, ${OFFERING_LABELS[reg.offering]}`;
  return (
    <div className="rounded-lg border border-neutral-200 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-navy-900">
            {reg.legalEntity}{" "}
            <span className="text-sm font-normal text-slate-500">
              , {reg.country}{reg.businessUnit ? `, ${reg.businessUnit}` : ""}
            </span>
          </p>
          <p className="text-xs text-slate-500">
            <Link href={`/admin/partners/${reg.partner.id}`} className="hover:underline">
              {reg.partner.displayName}
            </Link>
            {" , "}
            {reg.partner.tier} , {OFFERING_LABELS[reg.offering]} , {reg.productLine}
            {reg.contactName ? ` , contact ${reg.contactName}${reg.contactTitle ? ` (${reg.contactTitle})` : ""}` : ""}
          </p>
        </div>
        <div className="text-right">
          <Badge status={reg.status === "NEEDS_REVISION" ? "REVISE" : "WAITING_RESPONSE"}>
            {reg.status === "NEEDS_REVISION" ? "Awaiting revision" : `Submitted ${reg.submittedAt.toLocaleDateString()}`}
          </Badge>
          <p className="mt-1 text-xs text-slate-500">Decision due {insight.decisionDueAt.toLocaleDateString()}</p>
        </div>
      </div>

      {/* The decision facts: domain, live newness, seats vs threshold, likely classification. */}
      <div className="mt-3 grid gap-2 rounded-md border border-neutral-200 bg-neutral-50 p-3 text-sm md:grid-cols-2">
        <p className="text-slate-700">
          <span className="font-medium">Domain:</span> {reg.domain ?? "none recorded"}
          {insight.newness ? (
            <span className={insight.newness === "EXISTING" ? " text-amber-700" : " text-emerald-700"}>
              {" "}({insight.newness.toLowerCase()} to us)
            </span>
          ) : null}
        </p>
        <p className="text-slate-700">
          <span className="font-medium">Estimated seats:</span> {reg.estSeats ?? "not given"} against a {insight.seatThreshold}-seat Strong threshold
          {reg.estValueCents != null ? ` , estimated value ${(reg.estValueCents / 100).toLocaleString()} USD` : ""}
        </p>
        <p className="text-slate-700 md:col-span-2">
          <span className="font-medium">Likely classification:</span> {insight.likelyClassification}
          <span className="text-xs text-slate-500"> (binding classification happens on paid-collected seats at commission time)</span>
        </p>
        {insight.nearMatches.length > 0 ? (
          <div className="md:col-span-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-amber-800">
            <p className="text-xs font-semibold uppercase tracking-wide">Possible existing relationship</p>
            <ul className="mt-1 list-inside list-disc text-xs">
              {insight.nearMatches.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      {/* The claimed functions with their evidence. */}
      {reg.functionClaims.length > 0 ? (
        <div className="mt-3 space-y-2">
          {reg.functionClaims.map((c) => (
            <div key={c.function} className="rounded-md border border-neutral-200 p-3 text-sm">
              <p className="font-medium text-navy-900">{CLAIM_LABELS[c.function] ?? c.function}</p>
              {c.function === "BASIC_INTRO" ? (
                <div className="mt-1 space-y-1 text-slate-700">
                  <p><span className="font-medium">Contact:</span> {c.contactName || "not given"}</p>
                  <p><span className="font-medium">Relationship:</span> {c.relationshipDescription || "not described"}</p>
                  <p><span className="font-medium">How introduced:</span> {c.introDescription || "not described"}</p>
                  <p className={c.warmRelationshipAttested ? "text-emerald-700" : "text-red-700"}>
                    {c.warmRelationshipAttested ? "Warm relationship attested." : "Warm relationship NOT attested."}
                  </p>
                </div>
              ) : (
                <p className="mt-1 text-slate-700">{c.involvementStatement || "No involvement statement given."}</p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-xs text-amber-700">No function claims recorded on this registration.</p>
      )}

      <p className="mt-3 text-sm text-slate-700">
        <span className="font-medium">Case:</span> {reg.justification}
      </p>
      {reg.widerScopeRequested ? (
        <p className="mt-1 text-sm text-slate-600">
          <span className="font-medium">Wider scope:</span> {reg.widerScopeRequested}
        </p>
      ) : null}

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <form action={confirmDealRegistration} className="space-y-2">
          <input type="hidden" name="dealRegistrationId" value={reg.id} />
          <label className="block space-y-1">
            <span className="text-xs font-medium text-slate-600">Confirmed scope</span>
            <Input name="confirmedScope" defaultValue={scopeDefault} />
          </label>
          <div className="flex flex-wrap items-end gap-2">
            <label className="space-y-1">
              <span className="text-xs font-medium text-slate-600">Classification</span>
              <Select name="classificationDecision" defaultValue="OBJECTIVE" className="h-9 w-56">
                <option value="OBJECTIVE">Objective (engine decides)</option>
                <option value="EXISTING">Force existing company (stricter)</option>
              </Select>
            </label>
            <label className="flex-1 space-y-1">
              <span className="text-xs font-medium text-slate-600">Reason (required when forcing)</span>
              <Input name="classificationReason" placeholder="e.g. same company as acme.com under a new domain" />
            </label>
            <Button type="submit" size="sm">Confirm</Button>
          </div>
        </form>
        <form action={declineDealRegistration} className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="dealRegistrationId" value={reg.id} />
          <label className="flex-1 space-y-1">
            <span className="text-xs font-medium text-slate-600">Decline reason</span>
            <Input name="declineReason" placeholder="e.g. House Account / already held" />
          </label>
          <Button type="submit" size="sm" variant="danger">Decline</Button>
        </form>
      </div>

      <form action={requestDealRevision} className="mt-3 space-y-1">
        <span className="text-xs font-medium text-slate-600">Ask the partner to revise (emails them and opens the thread)</span>
        <div className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="dealRegistrationId" value={reg.id} />
          <Textarea name="feedback" rows={2} className="flex-1" placeholder="What needs to change before you can confirm this." />
          <Button type="submit" size="sm" variant="secondary">Request revision</Button>
        </div>
      </form>

      <div className="mt-4 space-y-3 border-t border-neutral-100 pt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Conversation</p>
        <DealThread messages={reg.messages} />
        <form action={postDealMessageAdmin} className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="dealRegistrationId" value={reg.id} />
          <Textarea name="body" rows={2} className="flex-1" placeholder="Post a message to the partner." />
          <Button type="submit" size="sm" variant="secondary">Send message</Button>
        </form>
      </div>
    </div>
  );
}

export default async function DealRegistrationsPage() {
  const dealInclude = {
    partner: { select: { id: true, displayName: true, tier: true } },
    messages: { orderBy: { createdAt: "asc" } as const },
    functionClaims: true,
  };
  const [submitted, needsRevision, recent, engagements, houseAccounts, liveAccounts] = await Promise.all([
    prisma.dealRegistration.findMany({
      where: { status: "SUBMITTED" },
      orderBy: { submittedAt: "asc" },
      include: dealInclude,
    }),
    prisma.dealRegistration.findMany({
      where: { status: "NEEDS_REVISION" },
      orderBy: { revisionRequestedAt: "desc" },
      include: dealInclude,
    }),
    prisma.dealRegistration.findMany({
      where: { status: { notIn: ["SUBMITTED", "NEEDS_REVISION"] } },
      orderBy: { decidedAt: "desc" },
      take: 25,
      include: { partner: { select: { displayName: true } } },
    }),
    prisma.tenXOpsEngagement.findMany({
      where: { status: "REQUESTED" },
      orderBy: { createdAt: "asc" },
      include: { partner: { select: { id: true, displayName: true } } },
    }),
    prisma.houseAccount.findMany({ select: { entityName: true, domain: true } }),
    prisma.registeredAccount.findMany({
      where: { lapsedAt: null },
      select: { legalEntity: true, country: true, domain: true, partner: { select: { displayName: true } } },
    }),
  ]);

  // Compute the decision facts for every pending registration, server-side.
  const now = new Date();
  const pending = [...submitted, ...needsRevision];
  const insights = new Map<string, DealInsight>();
  for (const reg of pending) {
    const cfg = await resolvePartnerConfig(reg.partner.id);
    const domainNorm = normalizeDomain(reg.domain);
    let newness: NewnessState | null = null;
    if (domainNorm) {
      const priorDeals = await prisma.closedDeal.findMany({
        where: { domain: { equals: domainNorm, mode: "insensitive" } },
        select: { signedAt: true, paymentClearedAt: true },
      });
      newness = priorDeals.length === 0 ? "NEW" : companyNewnessState(priorDeals, now, cfg);
    }
    const isB2c = reg.offering === "B2C_CHARTER";
    const seatThreshold = isB2c ? cfg.strongSeatThresholdB2c : cfg.strongSeatThresholdB2b;
    const meetsSeats = reg.estSeats != null && reg.estSeats >= seatThreshold;
    const likelyClassification = isB2c
      ? meetsSeats
        ? `Likely Strong: ${reg.estSeats} estimated seats meets the ${seatThreshold}-seat B2C threshold (seats only; the domain plays no role on B2C).`
        : `Likely Qualified: ${reg.estSeats ?? "no"} estimated seats, below the ${seatThreshold}-seat B2C threshold.`
      : !domainNorm
        ? "Likely Qualified: no domain recorded, so the Strong rate is not available."
        : newness === "EXISTING"
          ? "Likely Qualified: the domain is existing to us, so Strong is not available."
          : meetsSeats
            ? `Likely Strong: ${newness?.toLowerCase()} domain and ${reg.estSeats} estimated seats meets the ${seatThreshold}-seat B2B threshold.`
            : `Likely Qualified rate with new-company standing kept: ${newness?.toLowerCase()} domain but ${reg.estSeats ?? "no"} estimated seats, below the ${seatThreshold}-seat B2B threshold.`;

    // Near matches: normalized name similarity or related domains, soft warnings only.
    const nameNorm = normalizeEntityName(reg.legalEntity);
    const nearMatches: string[] = [];
    for (const h of houseAccounts) {
      const hName = normalizeEntityName(h.entityName);
      const hDomain = normalizeDomain(h.domain);
      if (similarName(nameNorm, hName) || (domainNorm && hDomain && (hDomain.includes(domainNorm) || domainNorm.includes(hDomain)))) {
        nearMatches.push(`House Account: ${h.entityName}${h.domain ? ` (${h.domain})` : ""}`);
      }
    }
    for (const a of liveAccounts) {
      const aName = normalizeEntityName(a.legalEntity);
      const aDomain = normalizeDomain(a.domain);
      if (similarName(nameNorm, aName) || (domainNorm && aDomain && (aDomain.includes(domainNorm) || domainNorm.includes(aDomain)))) {
        nearMatches.push(`Registered account: ${a.legalEntity} (${a.country}, partner ${a.partner.displayName})`);
      }
    }
    insights.set(reg.id, {
      newness,
      seatThreshold,
      likelyClassification,
      nearMatches: [...new Set(nearMatches)].slice(0, 6),
      decisionDueAt: addBusinessDays(reg.submittedAt, cfg.dealConfirmationWindowBusinessDays),
    });
  }
  const insightFor = (id: string): DealInsight =>
    insights.get(id) ?? {
      newness: null,
      seatThreshold: 0,
      likelyClassification: "",
      nearMatches: [],
      decisionDueAt: now,
    };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Deal Registrations"
        description="Confirm or decline on the panel, or ask the partner to revise. Every card shows the decision facts: the domain and its live newness, the estimated seats against the Strong threshold, the claimed functions with their evidence, and any possible existing relationship. Confirmation creates a protected Registered Account; House Accounts and entities already held by another partner are blocked automatically, by normalized name and by domain."
      />

      <Card>
        <h2 className="text-lg font-semibold text-navy-900">Awaiting Panel Confirmation ({submitted.length})</h2>
        <div className="mt-4 space-y-4">
          {submitted.map((reg) => (
            <AdminDealCard key={reg.id} reg={reg as AdminDeal} insight={insightFor(reg.id)} />
          ))}
          {submitted.length === 0 ? <p className="text-sm text-slate-500">Nothing awaiting confirmation.</p> : null}
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-navy-900">Awaiting partner revision ({needsRevision.length})</h2>
        <p className="mt-1 text-sm text-slate-600">
          You asked these partners to revise. They return to the confirmation queue once resubmitted. You can keep the
          conversation going below.
        </p>
        <div className="mt-4 space-y-4">
          {needsRevision.map((reg) => (
            <AdminDealCard key={reg.id} reg={reg as AdminDeal} insight={insightFor(reg.id)} />
          ))}
          {needsRevision.length === 0 ? <p className="text-sm text-slate-500">Nothing awaiting revision.</p> : null}
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-navy-900">TenXOps engagement requests ({engagements.length})</h2>
        <div className="mt-4 space-y-3">
          {engagements.map((e) => (
            <div key={e.id} className="rounded-lg border border-neutral-200 p-4">
              <p className="font-semibold text-navy-900">{e.organisation}</p>
              <p className="text-xs text-slate-500">
                <Link href={`/admin/partners/${e.partner.id}`} className="hover:underline">{e.partner.displayName}</Link>
              </p>
              <p className="mt-2 text-sm text-slate-700">{e.justification}</p>
              <div className="mt-3 flex gap-2">
                <form action={decideTenXOpsEngagement}>
                  <input type="hidden" name="engagementId" value={e.id} />
                  <input type="hidden" name="decision" value="CONFIRM" />
                  <Button type="submit" size="sm">Confirm</Button>
                </form>
                <form action={decideTenXOpsEngagement}>
                  <input type="hidden" name="engagementId" value={e.id} />
                  <input type="hidden" name="decision" value="DECLINE" />
                  <Button type="submit" size="sm" variant="danger">Decline</Button>
                </form>
              </div>
            </div>
          ))}
          {engagements.length === 0 ? <p className="text-sm text-slate-500">No engagement requests.</p> : null}
        </div>
      </Card>

      <Table minWidth="min-w-[720px]">
        <THead>
          <Th>Account</Th>
          <Th>Partner</Th>
          <Th>Status</Th>
          <Th>Decided</Th>
        </THead>
        <TBody>
          {recent.map((reg) => (
            <TR key={reg.id}>
              <Td className="text-slate-800">{reg.legalEntity}</Td>
              <Td className="text-slate-600">{reg.partner.displayName}</Td>
              <Td>
                <Badge status={reg.status === "CONFIRMED" ? "APPROVED" : "NOT_COMPLETED"}>{DEAL_REG_STATUS_LABELS[reg.status]}</Badge>
              </Td>
              <Td className="text-slate-600">{reg.decidedAt?.toLocaleDateString() ?? "-"}</Td>
            </TR>
          ))}
        </TBody>
      </Table>
    </div>
  );
}
