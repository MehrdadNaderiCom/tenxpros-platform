import { prisma } from "@/lib/prisma";
import {
  applicationCounts,
  participantCounts,
  certificationCounts,
  emailCounts,
  paymentSummary,
} from "@/lib/admin-metrics";
import { formatCurrency } from "@/lib/utils";
import { formatMoney, entryPayoutMinor } from "@/lib/partner/currency";
import {
  PARTNER_STATUS_LABELS,
  COMMISSION_STATUS_LABELS,
  DEAL_REG_STATUS_LABELS,
} from "@/lib/partner/constants";
import { applicationStatusLabel } from "@/lib/application-labels";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { PageHeader, EmptyState } from "@/components/shared/page-shell";
import { Bar, StackedBar, Ring } from "@/components/admin/dashboard-ui";
import { academyNarrationAttention } from "@/lib/academy/narration-release";

export const dynamic = "force-dynamic";

const PAYOUT_CURRENCY = "USD";

const humanize = (s: string) => s.toLowerCase().replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
const pctOf = (n: number, d: number) => (d > 0 ? (n / d) * 100 : 0);

// Color tokens (only Tailwind shades that exist in the palette).
const SEV = {
  red: { dot: "bg-red-500", accent: "border-l-red-500" },
  amber: { dot: "bg-amber-500", accent: "border-l-amber-500" },
  blue: { dot: "bg-blue-500", accent: "border-l-blue-500" },
} as const;
type Sev = keyof typeof SEV;

const PARTICIPANT_COLOR: Record<string, string> = {
  ONBOARDING: "bg-navy-500",
  DIAGNOSTIC_PENDING: "bg-navy-700",
  ACTIVE: "bg-emerald-500",
  CAPSTONE: "bg-amber-400",
  UNDER_REVIEW: "bg-amber-400",
  CERTIFIED: "bg-gold-500",
  CONDITIONALLY_CERTIFIED: "bg-amber-300",
  COMPLETED_NOT_CERTIFIED: "bg-slate-400",
  NOT_COMPLETED: "bg-red-400",
  PAUSED: "bg-slate-300",
  WITHDRAWN: "bg-neutral-400",
};
const DEAL_COLOR: Record<string, string> = {
  SUBMITTED: "bg-slate-400",
  CONFIRMED: "bg-emerald-500",
  DECLINED: "bg-red-400",
  LAPSED: "bg-neutral-300",
  WITHDRAWN: "bg-neutral-400",
};
const COMMISSION_COLOR: Record<string, string> = {
  ACCRUED: "bg-amber-500",
  PAYABLE: "bg-blue-500",
  PAID: "bg-emerald-500",
  REVERSED: "bg-neutral-400",
};
const METHOD_COLOR = ["bg-indigo-500", "bg-navy-600", "bg-emerald-500", "bg-amber-500", "bg-slate-400", "bg-neutral-400"];

export default async function AdminDashboardPage() {
  const now = new Date();
  const [
    appCounts,
    partCounts,
    certCounts,
    emailC,
    pay,
    qAppReview,
    qPayRecovery,
    qPayPending,
    qTickets,
    qModules,
    qDossiers,
    qPartnerApps,
    qDeals,
    qTenxops,
    partnerByStatus,
    dealByStatus,
    focusActive,
    payByMethod,
    commissionRows,
    events,
    qFuAwaiting,
    qFuReminded,
    qFuOverdue,
    qFuNotified,
    partnersAwaitingGate,
  ] = await Promise.all([
    applicationCounts(),
    participantCounts(),
    certificationCounts(),
    emailCounts(),
    paymentSummary(),
    prisma.application.count({ where: { status: { in: ["SUBMITTED", "UNDER_REVIEW"] } } }),
    prisma.paymentRecord.count({ where: { status: { in: ["FAILED", "CANCELLED"] } } }),
    prisma.paymentRecord.count({ where: { status: "PENDING" } }),
    prisma.ticket.count({ where: { status: { in: ["OPEN", "WAITING_RESPONSE"] } } }),
    prisma.participantModule.count({ where: { status: "SUBMITTED" } }),
    prisma.dossierSection.count({ where: { status: "SUBMITTED" } }),
    prisma.partnerApplication.count({ where: { status: { in: ["NEW", "UNDER_REVIEW"] } } }),
    prisma.dealRegistration.count({ where: { status: "SUBMITTED" } }),
    prisma.tenXOpsEngagement.count({ where: { status: "REQUESTED" } }),
    prisma.partner.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.dealRegistration.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.focusGrant.count({ where: { status: "ACTIVE" } }),
    prisma.paymentRecord.groupBy({ by: ["method"], _count: { _all: true } }),
    prisma.commissionEntry.findMany({
      select: {
        amountCents: true,
        reversedCents: true,
        currency: true,
        status: true,
        closedDeal: { select: { currency: true, conversionRate: true } },
      },
    }),
    prisma.siteEvent.findMany({ orderBy: { createdAt: "desc" }, take: 18 }),
    // Payment follow-up report buckets (INSTRUCTIONS_SENT and still unpaid).
    prisma.paymentRecord.count({ where: { status: "INSTRUCTIONS_SENT", paidAt: null, waivedAt: null, cancelledAt: null } }),
    prisma.paymentRecord.count({ where: { status: "INSTRUCTIONS_SENT", paidAt: null, waivedAt: null, cancelledAt: null, reminderSentAt: { not: null } } }),
    prisma.paymentRecord.count({ where: { status: "INSTRUCTIONS_SENT", paidAt: null, waivedAt: null, cancelledAt: null, dueAt: { lt: now } } }),
    prisma.paymentRecord.count({ where: { status: "INSTRUCTIONS_SENT", paidAt: null, waivedAt: null, cancelledAt: null, expiryNoticeSentAt: { not: null } } }),
    // Partners who finished every onboarding item but are not yet gate-confirmed.
    prisma.partner.findMany({
      where: { activationGatePassedAt: null, terminatedAt: null },
      select: { id: true, activationItems: { select: { completed: true } } },
    }),
  ]);
  const academyAudio =
    await academyNarrationAttention();
  const academyAudioAttention =
    academyAudio.attention.length;

  const qActivation = partnersAwaitingGate.filter(
    (p) => p.activationItems.length > 0 && p.activationItems.every((i) => i.completed),
  ).length;

  // ---- Pulse KPIs ----
  const activeParticipants =
    (partCounts.byKey.ONBOARDING ?? 0) +
    (partCounts.byKey.DIAGNOSTIC_PENDING ?? 0) +
    (partCounts.byKey.ACTIVE ?? 0) +
    (partCounts.byKey.CAPSTONE ?? 0) +
    (partCounts.byKey.UNDER_REVIEW ?? 0);
  const partnerStatusMap: Record<string, number> = {};
  for (const r of partnerByStatus) partnerStatusMap[r.status] = r._count._all;
  const activePartners =
    (partnerStatusMap.PILOT ?? 0) + (partnerStatusMap.TIER1 ?? 0) + (partnerStatusMap.TIER2 ?? 0) + (partnerStatusMap.TIER3 ?? 0);
  const certifiedCount = certCounts.byKey.CERTIFIED ?? 0;
  const certifiedRate = pctOf(certifiedCount, partCounts.total);

  // Commission liability (multi-currency safe) by status, in the payout currency.
  const liability: Record<string, number> = {};
  for (const e of commissionRows) {
    if (!e.closedDeal) continue;
    const minor = entryPayoutMinor(
      { amountCents: e.amountCents, reversedCents: e.reversedCents, currency: e.currency },
      { currency: e.closedDeal.currency, conversionRate: e.closedDeal.conversionRate },
      PAYOUT_CURRENCY,
    );
    liability[e.status] = (liability[e.status] ?? 0) + minor;
  }
  const payableLiability = (liability.ACCRUED ?? 0) + (liability.PAYABLE ?? 0);
  const liabilityTotalAbs = Object.values(liability).reduce((s, v) => s + Math.abs(v), 0);

  // ---- Action center ----
  const QUEUES: { label: string; count: number; href: string; weight: number; sev: Sev }[] = [
    {
      label: `Academy audio requires attention: ${academyAudioAttention} lessons changed after audio generation.`,
      count: academyAudioAttention,
      href: "/admin/academy/content",
      weight: 95,
      sev: "amber",
    },
    { label: "Payment recovery", count: qPayRecovery, href: "/admin/payments", weight: 100, sev: "red" },
    { label: "Support tickets", count: qTickets, href: "/admin/tickets", weight: 90, sev: "amber" },
    { label: "Applications to review", count: qAppReview, href: "/admin/applications", weight: 80, sev: "amber" },
    { label: "Partner activation", count: qActivation, href: "/admin/partners", weight: 78, sev: "amber" },
    { label: "Deal registrations", count: qDeals, href: "/admin/partners/deal-registrations", weight: 70, sev: "blue" },
    { label: "TenXOps decisions", count: qTenxops, href: "/admin/partners/deal-registrations", weight: 65, sev: "blue" },
    { label: "Module feedback", count: qModules, href: "/admin/modules", weight: 50, sev: "amber" },
    { label: "Dossier review", count: qDossiers, href: "/admin/dossiers", weight: 45, sev: "amber" },
    { label: "Partner vetting", count: qPartnerApps, href: "/admin/partners/applications", weight: 40, sev: "blue" },
  ];
  const active = QUEUES.filter((q) => q.count > 0).sort((a, b) => b.weight - a.weight || b.count - a.count);
  const cleared = QUEUES.filter((q) => q.count === 0);
  const totalWaiting = QUEUES.reduce((s, q) => s + q.count, 0);
  const biggest = active.slice().sort((a, b) => b.count - a.count)[0];

  // ---- Funnel + participant journey ----
  const FUNNEL = ["SUBMITTED", "UNDER_REVIEW", "ACCEPTED", "ENROLLED"];
  const DROPOFF = ["REVISE_AND_REAPPLY", "NOT_ACCEPTED"];
  const funnelMax = Math.max(1, ...FUNNEL.map((s) => appCounts.byKey[s] ?? 0));
  const participantOrder = [
    "ONBOARDING",
    "DIAGNOSTIC_PENDING",
    "ACTIVE",
    "CAPSTONE",
    "UNDER_REVIEW",
    "CERTIFIED",
    "CONDITIONALLY_CERTIFIED",
    "COMPLETED_NOT_CERTIFIED",
    "PAUSED",
    "WITHDRAWN",
    "NOT_COMPLETED",
  ].filter((s) => (partCounts.byKey[s] ?? 0) > 0);

  // ---- Partner roster + deals ----
  const rosterOrder = ["PILOT", "TIER1", "TIER2", "TIER3", "APPLICANT", "INACTIVE", "TERMINATED"].filter(
    (s) => (partnerStatusMap[s] ?? 0) > 0,
  );
  const rosterMax = Math.max(1, ...rosterOrder.map((s) => partnerStatusMap[s] ?? 0));
  const dealMap: Record<string, number> = {};
  for (const r of dealByStatus) dealMap[r.status] = r._count._all;
  const dealTotal = Object.values(dealMap).reduce((s, v) => s + v, 0);

  // ---- Payment method mix ----
  const methodTotal = payByMethod.reduce((s, r) => s + r._count._all, 0);

  // ---- Email health ----
  const emailSent = emailC.byKey.sent ?? 0;
  const emailFailed = emailC.byKey.error ?? 0;

  const kpis = [
    { label: "Revenue collected", value: formatCurrency(pay.collected, PAYOUT_CURRENCY), sub: `${formatCurrency(pay.outstanding, PAYOUT_CURRENCY)} outstanding` },
    { label: "Active participants", value: String(activeParticipants), sub: `${partCounts.total} total`, href: "/admin/participants" },
    { label: "Active partners", value: String(activePartners), sub: `${partnerStatusMap.APPLICANT ?? 0} applicants`, href: "/admin/partners" },
    { label: "Certified rate", value: `${Math.round(certifiedRate)}%`, sub: `${certifiedCount} certified`, href: "/admin/certifications" },
    { label: "Commission payable", value: formatMoney(payableLiability, PAYOUT_CURRENCY), sub: `${formatMoney(liability.PAID ?? 0, PAYOUT_CURRENCY)} paid to date` },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Mission Control" description="The whole of TenXPros at a glance: what needs you, the money, the pipeline, and the partner channel." />

      {/* 1. Pulse strip */}
      <Card className="bg-navy-900 text-white">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold-200">Platform pulse</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {kpis.map((k) => {
            const inner = (
              <>
                <p className="text-xs uppercase tracking-wide text-slate-300">{k.label}</p>
                <p className="mt-2 text-3xl font-semibold">{k.value}</p>
                <p className="mt-1 text-xs text-slate-400">{k.sub}</p>
              </>
            );
            return k.href ? (
              <a key={k.label} href={k.href} className="rounded-md border border-white/15 bg-white/10 p-4 transition hover:bg-white/15">
                {inner}
              </a>
            ) : (
              <div key={k.label} className="rounded-md border border-white/10 bg-white/5 p-4">
                {inner}
              </div>
            );
          })}
        </div>
      </Card>

      {/* 2. Action center */}
      <section>
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold text-navy-900">Action center</h2>
          <p className="text-sm text-slate-500">
            {active.length > 0 ? `${active.length} queue${active.length === 1 ? " needs" : "s need"} you · ${totalWaiting} item${totalWaiting === 1 ? "" : "s"} waiting` : "All queues clear"}
          </p>
        </div>
        {active.length === 0 ? (
          <EmptyState eyebrow="All clear" title="Nothing needs you right now." description="Every operator queue is empty. New applications, payments, reviews, tickets and partner requests will appear here the moment they arrive." />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {active.map((q, i) => (
              <a
                key={q.label}
                href={q.href}
                className={`flex flex-col justify-between rounded-md border border-l-2 border-neutral-200 bg-white p-4 transition hover:border-navy-300 hover:shadow-md ${SEV[q.sev].accent} ${i === 0 && active.length > 2 ? "sm:col-span-2" : ""}`}
              >
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 flex-none rounded-full ${SEV[q.sev].dot}`} aria-hidden="true" />
                  <span className="text-sm text-slate-600">{q.label}</span>
                </div>
                <p className="mt-3 text-3xl font-semibold text-navy-900">{q.count}</p>
              </a>
            ))}
          </div>
        )}
      </section>

      {/* 3. All-clear strip */}
      <Card className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-2">
          {cleared.length > 0 ? (
            cleared.map((q) => (
              <span key={q.label} className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                ✓ {q.label}
              </span>
            ))
          ) : (
            <span className="text-sm text-slate-500">Every queue has work, start at the top.</span>
          )}
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-wide text-slate-500">Total items waiting</p>
          <p className="text-2xl font-semibold text-navy-900">{totalWaiting}</p>
          {biggest ? <p className="text-xs text-slate-500">Biggest backlog: {biggest.label} ({biggest.count})</p> : null}
        </div>
      </Card>

      {/* 4. Money rail */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-navy-900">Money</h2>
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <p className="text-xs uppercase tracking-wide text-slate-500">Collected</p>
            <p className="mt-2 text-2xl font-semibold text-navy-900">{formatCurrency(pay.collected, PAYOUT_CURRENCY)}</p>
            <p className="mt-1 text-xs text-slate-500">across all paid records</p>
          </Card>
          <Card>
            <p className="text-xs uppercase tracking-wide text-slate-500">Outstanding AR</p>
            <p className={`mt-2 text-2xl font-semibold ${pay.outstanding > 0 ? "text-amber-700" : "text-navy-900"}`}>{formatCurrency(pay.outstanding, PAYOUT_CURRENCY)}</p>
            <p className="mt-1 text-xs text-slate-500">pending + instructions sent</p>
          </Card>
          <Card>
            <p className="text-xs uppercase tracking-wide text-slate-500">Refunded / waived</p>
            <p className="mt-2 text-2xl font-semibold text-navy-900">
              {formatCurrency((pay.byStatus.REFUNDED?.amount ?? 0) + (pay.byStatus.WAIVED?.amount ?? 0), PAYOUT_CURRENCY)}
            </p>
            <p className="mt-1 text-xs text-slate-500">{(pay.byStatus.REFUNDED?.count ?? 0) + (pay.byStatus.WAIVED?.count ?? 0)} records</p>
          </Card>
          <Card>
            <p className="text-xs uppercase tracking-wide text-slate-500">Commission liability</p>
            {liabilityTotalAbs > 0 ? (
              <div className="mt-3 space-y-2">
                {(["ACCRUED", "PAYABLE", "PAID", "REVERSED"] as const).map((s) =>
                  (liability[s] ?? 0) !== 0 ? (
                    <div key={s}>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-600">{COMMISSION_STATUS_LABELS[s]}</span>
                        <span className="font-medium text-navy-900">{formatMoney(liability[s] ?? 0, PAYOUT_CURRENCY)}</span>
                      </div>
                      <Bar pct={pctOf(Math.abs(liability[s] ?? 0), liabilityTotalAbs)} className={COMMISSION_COLOR[s]} />
                    </div>
                  ) : null,
                )}
              </div>
            ) : (
              <p className="mt-2 text-sm text-slate-400">No commissions yet.</p>
            )}
          </Card>
        </div>
        {methodTotal > 0 ? (
          <Card>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-navy-900">Payment method mix</p>
              <span className="text-xs text-slate-500">{methodTotal} records</span>
            </div>
            <div className="mt-3">
              <StackedBar segments={payByMethod.map((r, i) => ({ pct: pctOf(r._count._all, methodTotal), className: METHOD_COLOR[i % METHOD_COLOR.length] }))} />
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
                {payByMethod.map((r, i) => (
                  <span key={String(r.method)} className="inline-flex items-center gap-1.5">
                    <span className={`h-2 w-2 rounded-full ${METHOD_COLOR[i % METHOD_COLOR.length]}`} aria-hidden="true" />
                    {humanize(String(r.method ?? "Unspecified"))} · {r._count._all}
                  </span>
                ))}
              </div>
            </div>
          </Card>
        ) : null}

        {/* Payment follow-up: a read-only report. Reminders run automatically. */}
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-navy-900">Payment follow-up</p>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">Automated</span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Accepted applicants are reminded automatically (a reminder after 24 hours, a deadline notice at the due date).
            This is a report, not a queue. Select any number to see exactly who is in it.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {[
              { label: "Awaiting instructions", count: qPayPending, href: "/admin/payments?status=PENDING", tone: "text-navy-900" },
              { label: "Awaiting payment", count: qFuAwaiting, href: "/admin/payments?follow=awaiting", tone: "text-amber-700" },
              { label: "Reminded (24h)", count: qFuReminded, href: "/admin/payments?follow=reminded", tone: "text-amber-700" },
              { label: "Past deadline", count: qFuOverdue, href: "/admin/payments?follow=overdue", tone: "text-red-700" },
              { label: "Deadline notice sent", count: qFuNotified, href: "/admin/payments?follow=notified", tone: "text-slate-600" },
            ].map((m) => (
              <a key={m.label} href={m.href} className="rounded-md border border-neutral-200 bg-white p-3 transition hover:border-navy-300 hover:shadow-sm">
                <p className={`text-2xl font-semibold ${m.tone}`}>{m.count}</p>
                <p className="mt-1 text-xs text-slate-500">{m.label}</p>
              </a>
            ))}
          </div>
        </Card>
      </section>

      {/* 5. Funnel + participant journey */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-navy-900">Admissions to certified</h2>
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <p className="text-sm font-medium text-navy-900">Application funnel</p>
            <div className="mt-4 space-y-3">
              {FUNNEL.map((s) => (
                <div key={s} className="flex items-center gap-3">
                  <span className="w-28 flex-none text-xs text-slate-600">{applicationStatusLabel(s)}</span>
                  <div className="flex-1">
                    <Bar pct={pctOf(appCounts.byKey[s] ?? 0, funnelMax)} className="bg-navy-600" />
                  </div>
                  <span className="w-8 flex-none text-right text-sm font-semibold text-navy-900">{appCounts.byKey[s] ?? 0}</span>
                </div>
              ))}
              {DROPOFF.some((s) => (appCounts.byKey[s] ?? 0) > 0) ? (
                <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-neutral-100 pt-3 text-xs text-slate-500">
                  {DROPOFF.map((s) => (
                    <span key={s}>{applicationStatusLabel(s)}: {appCounts.byKey[s] ?? 0}</span>
                  ))}
                </div>
              ) : null}
            </div>
          </Card>
          <Card className="flex flex-col items-center justify-center text-center">
            <Ring pct={certifiedRate}>
              <span className="text-2xl font-semibold text-navy-900">{Math.round(certifiedRate)}%</span>
              <span className="text-[0.65rem] uppercase tracking-wide text-slate-500">certified</span>
            </Ring>
            <div className="mt-4 w-full space-y-1 text-xs">
              {(["CERTIFIED", "CONDITIONALLY_CERTIFIED", "COMPLETED_NOT_CERTIFIED", "NOT_COMPLETED"] as const).map((o) => (
                <div key={o} className="flex items-center justify-between">
                  <span className="text-slate-600">{humanize(o)}</span>
                  <span className="font-medium text-navy-900">{certCounts.byKey[o] ?? 0}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
        {participantOrder.length > 0 ? (
          <Card>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-navy-900">Participant journey</p>
              <span className="text-xs text-slate-500">{partCounts.total} total</span>
            </div>
            <div className="mt-3">
              <StackedBar
                segments={participantOrder.map((s) => ({ pct: pctOf(partCounts.byKey[s] ?? 0, partCounts.total), className: PARTICIPANT_COLOR[s] ?? "bg-neutral-300" }))}
              />
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
                {participantOrder.map((s) => (
                  <span key={s} className="inline-flex items-center gap-1.5">
                    <span className={`h-2 w-2 rounded-full ${PARTICIPANT_COLOR[s] ?? "bg-neutral-300"}`} aria-hidden="true" />
                    {humanize(s)} · {partCounts.byKey[s] ?? 0}
                  </span>
                ))}
              </div>
            </div>
          </Card>
        ) : null}
      </section>

      {/* 6. Partner program health */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-navy-900">Partner program</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="flex flex-col">
            <div className="flex items-baseline justify-between">
              <p className="text-sm font-medium text-navy-900">Partner roster</p>
              <span className="text-2xl font-semibold text-navy-900">{activePartners} <span className="text-xs font-normal text-slate-500">active</span></span>
            </div>
            {rosterOrder.length > 0 ? (
              <div className="mt-4 flex-1 space-y-2.5">
                {rosterOrder.map((s) => (
                  <div key={s} className="flex items-center gap-3">
                    <span className="w-24 flex-none text-xs text-slate-600">{PARTNER_STATUS_LABELS[s as keyof typeof PARTNER_STATUS_LABELS] ?? humanize(s)}</span>
                    <div className="flex-1">
                      <Bar pct={pctOf(partnerStatusMap[s] ?? 0, rosterMax)} className={s === "INACTIVE" || s === "TERMINATED" ? "bg-neutral-300" : "bg-navy-500"} />
                    </div>
                    <span className="w-8 flex-none text-right text-sm font-semibold text-navy-900">{partnerStatusMap[s] ?? 0}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 flex-1 text-sm text-slate-400">No partners yet. Approve a partner application to start the roster.</p>
            )}
            <div className="mt-4">
              <ButtonLink href="/admin/partners" variant="secondary" size="sm">Open partner roster</ButtonLink>
            </div>
          </Card>
          <Card className="flex flex-col">
            <p className="text-sm font-medium text-navy-900">Deal pipeline</p>
            {dealTotal > 0 ? (
              <div className="mt-4 flex-1">
                <StackedBar segments={Object.keys(dealMap).map((s) => ({ pct: pctOf(dealMap[s], dealTotal), className: DEAL_COLOR[s] ?? "bg-neutral-300" }))} />
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
                  {Object.keys(dealMap).map((s) => (
                    <span key={s} className="inline-flex items-center gap-1.5">
                      <span className={`h-2 w-2 rounded-full ${DEAL_COLOR[s] ?? "bg-neutral-300"}`} aria-hidden="true" />
                      {DEAL_REG_STATUS_LABELS[s as keyof typeof DEAL_REG_STATUS_LABELS] ?? humanize(s)} · {dealMap[s]}
                    </span>
                  ))}
                </div>
                {(dealMap.SUBMITTED ?? 0) > 0 ? (
                  <p className="mt-4 text-sm font-medium text-amber-700">{dealMap.SUBMITTED} awaiting confirmation</p>
                ) : null}
                <p className="mt-1 text-xs text-slate-500">{focusActive} active Tier 3 focus grant{focusActive === 1 ? "" : "s"}</p>
              </div>
            ) : (
              <p className="mt-3 flex-1 text-sm text-slate-400">No deal registrations yet.</p>
            )}
            <div className="mt-4">
              <ButtonLink href="/admin/partners/deal-registrations" variant="secondary" size="sm">Open deal pipeline</ButtonLink>
            </div>
          </Card>
        </div>
      </section>

      {/* 7. Activity + delivery health */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-navy-900">Live activity</h2>
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <p className="text-sm font-medium text-navy-900">Recent events</p>
            <div className="mt-3 divide-y divide-neutral-100">
              {events.map((e) => (
                <div key={e.id} className="flex items-center justify-between gap-3 py-2">
                  <span className="inline-flex items-center gap-2 text-sm text-slate-700">
                    <Badge>{humanize(e.eventType)}</Badge>
                  </span>
                  <span className="text-xs text-slate-500">{e.createdAt.toLocaleString()}</span>
                </div>
              ))}
              {events.length === 0 ? (
                <p className="py-6 text-sm text-slate-500">No recent events yet. Submissions, enrollments, reviews, tickets and certification decisions will appear here.</p>
              ) : null}
            </div>
          </Card>
          <Card className="flex flex-col">
            <p className="text-sm font-medium text-navy-900">Email delivery</p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Sent</p>
                <p className="mt-1 text-2xl font-semibold text-emerald-700">{emailSent}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Failed</p>
                <p className={`mt-1 text-2xl font-semibold ${emailFailed > 0 ? "text-red-600" : "text-navy-900"}`}>{emailFailed}</p>
              </div>
            </div>
            <div className="mt-3">
              <StackedBar
                segments={[
                  { pct: pctOf(emailSent, emailSent + emailFailed), className: "bg-emerald-500" },
                  { pct: pctOf(emailFailed, emailSent + emailFailed), className: "bg-red-500" },
                ]}
              />
            </div>
            {emailFailed > 0 ? (
              <a href="/admin/audit" className="mt-3 block rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-100">
                {emailFailed} email{emailFailed === 1 ? "" : "s"} failed to send, investigate
              </a>
            ) : (
              <p className="mt-3 text-xs text-slate-500">All recent sends delivered.</p>
            )}
          </Card>
        </div>
      </section>
    </div>
  );
}
