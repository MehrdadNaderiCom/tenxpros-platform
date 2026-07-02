import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentPartner } from "@/lib/partner/auth";
import { resolvePartnerConfig } from "@/lib/partner/config-server";
import { countableSeats } from "@/lib/partner/commission";
import { pilotDayNumber, pilotEndDate } from "@/lib/partner/rules";
import { PARTNER_STATUS_LABELS, SCORECARD_DAY_LABELS } from "@/lib/partner/constants";
import { entryPayoutMinor, formatMoney } from "@/lib/partner/currency";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-shell";
import { StartHereCard } from "@/components/partner/start-here";
import { startReadiness } from "@/lib/partner/readiness";

export const dynamic = "force-dynamic";

export default async function PartnerDashboardPage() {
  const current = await getCurrentPartner();
  if (!current) redirect("/login");

  const partner = await prisma.partner.findUniqueOrThrow({
    where: { id: current.partner.id },
    include: {
      activationItems: true,
      academyBadge: true,
      scorecard: { orderBy: { day: "asc" } },
      commissions: { include: { closedDeal: true } },
      closedDeals: { include: { seats: true } },
      registeredAccounts: true,
    },
  });
  const cfg = await resolvePartnerConfig(partner.id);
  const payoutCurrency = cfg.currency;
  const now = new Date();

  const seats = partner.closedDeals.flatMap((d) => d.seats);
  const paidSeats = countableSeats(seats.map((s) => ({ count: s.count, status: s.status, disregardForTargets: partner.qualityFlagged })));
  // Net payable, converted to the payout currency.
  const sum = (status: "ACCRUED" | "PAYABLE" | "PAID" | "REVERSED") =>
    partner.commissions.filter((c) => c.status === status).reduce((t, c) => t + entryPayoutMinor(c, c.closedDeal, payoutCurrency), 0);

  const itemsDone = partner.activationItems.filter((i) => i.completed).length;
  const readiness = startReadiness({
    activationGatePassedAt: partner.activationGatePassedAt,
    hasAcademyBadge: Boolean(partner.academyBadge),
  });
  const pilotDay = partner.pilotStartDate ? pilotDayNumber(partner.pilotStartDate, now) : null;
  const pilotEnd = partner.pilotStartDate ? pilotEndDate(partner.pilotStartDate, cfg) : null;

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Welcome, ${partner.displayName}`}
        description="Your status, pilot progress, and the next step. Everything here is the single source of truth for the program."
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <p className="text-sm text-slate-500">Status</p>
          <Badge className="mt-3" status={partner.status === "TERMINATED" ? "NOT_COMPLETED" : "ACTIVE"}>
            {PARTNER_STATUS_LABELS[partner.status]}
          </Badge>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Active status</p>
          <p className="mt-3 font-semibold text-navy-900">{partner.activeStatus ? "Active" : "Inactive"}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Paid, collected seats</p>
          <p className="mt-3 text-2xl font-semibold text-navy-900">{paidSeats}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Open accounts</p>
          <p className="mt-3 text-2xl font-semibold text-navy-900">
            {partner.registeredAccounts.filter((a) => !a.lapsedAt).length}
          </p>
        </Card>
      </div>

      {/* Get started: Academy + onboarding, then start working */}
      {!readiness.ready ? (
        <StartHereCard
          academyComplete={readiness.academyComplete}
          onboardingComplete={readiness.onboardingComplete}
          itemsDone={itemsDone}
          itemsTotal={partner.activationItems.length}
        />
      ) : (
        <Card className="flex flex-col gap-4 border-navy-200 bg-navy-50 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold-800">You are activated</p>
            <h2 className="text-xl font-semibold text-navy-900">Register an opportunity</h2>
            <p className="mt-2 text-sm text-slate-600">
              Register each specific account before substantive contact. It is protected once confirmed on the panel.
            </p>
          </div>
          <ButtonLink href="/partner/deals">Register a deal</ButtonLink>
        </Card>
      )}

      {/* Commission totals */}
      <div className="grid gap-4 md:grid-cols-4">
        {(["ACCRUED", "PAYABLE", "PAID", "REVERSED"] as const).map((status) => (
          <Card key={status}>
            <p className="text-sm text-slate-500 capitalize">{status.toLowerCase()}</p>
            <p className="mt-2 text-xl font-semibold text-navy-900">{formatMoney(sum(status), payoutCurrency)}</p>
          </Card>
        ))}
      </div>

      {/* Pilot scorecard */}
      {pilotDay !== null ? (
        <Card>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-semibold text-navy-900">90-day pilot scorecard</h2>
            <p className="text-sm text-slate-500">
              Day {Math.max(1, pilotDay)} of {cfg.pilotDays}
              {pilotEnd ? ` · ends ${pilotEnd.toLocaleDateString()}` : ""}
            </p>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {partner.scorecard.map((c) => (
              <div key={c.id} className="rounded-md border border-neutral-200 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-navy-900">{SCORECARD_DAY_LABELS[c.day]}</p>
                  <Badge status={c.met ? "PASSED" : "PENDING"}>{c.met ? "Met" : "Pending"}</Badge>
                </div>
                <p className="mt-2 text-xs leading-5 text-slate-600">{c.requiredEvidence}</p>
              </div>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
