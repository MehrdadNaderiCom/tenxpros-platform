import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { resolvePartnerConfig } from "@/lib/partner/config-server";
import { pickConfigFields, type EffectiveConfig } from "@/lib/partner/config";
import { countableSeats, deriveFunctionRate, type DerivedRate } from "@/lib/partner/commission";
import {
  ACCOUNT_ACTIVITY_KIND_LABELS,
  ACCOUNT_STAGE_BADGE,
  ACCOUNT_STAGE_LABELS,
  COMMISSION_STATUS_LABELS,
  OFFERING_LABELS,
  PARTNER_FUNCTION_LABELS,
  PARTNER_STATUS_LABELS,
  PARTNER_TIER_LABELS,
  SCORECARD_DAY_LABELS,
  SEAT_STATUS_LABELS,
  formatBp,
  formatCents,
} from "@/lib/partner/constants";
import { accountLapseState, addMonths, withinOriginationWindow } from "@/lib/partner/rules";
import { countNewCompanyDomainsRolling } from "@/lib/partner/growth";
import { auth } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/authz";
import {
  addQualityFlag,
  applyRefund,
  confirmActivationGate,
  deletePartner,
  forceDeletePartner,
  endFocus,
  grantFocus,
  recomputeDealCommissions,
  recordClosedDeal,
  recordSeats,
  setPartnerStatus,
  setPartnerTier,
  setScorecardCheckpoint,
  updatePartnerProfileAdmin,
  upsertPartnerConfigOverride,
} from "@/lib/actions/partner-admin";
import { COMMON_CURRENCIES, convertMinor, entryPayoutMinor, formatMoney } from "@/lib/partner/currency";
import { PartnerConfigFields } from "@/components/admin/partner-config-fields";
import { AddCommissionLineForm } from "@/components/admin/add-commission-line-form";
import { ConfirmSubmit } from "@/components/admin/confirm-submit";
import { ForceDeleteButton } from "@/components/admin/force-delete-button";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/form-fields";
import { CountrySelect } from "@/components/ui/country-select";
import { PageHeader } from "@/components/shared/page-shell";

export const dynamic = "force-dynamic";

const FUNCTION_VALUES = [
  "BASIC_INTRO",
  "QUALIFIED_ORIGINATION",
  "STRONG_ORIGINATION",
  "CLOSING",
  "DELIVERY",
  "OVERRIDE",
  "FOCUS_BONUS",
  "GROWTH_BONUS",
] as const;

export default async function AdminPartnerDetailPage({ params }: { params: { id: string } }) {
  const partner = await prisma.partner.findUnique({
    where: { id: params.id },
    include: {
      application: true,
      scorecard: { orderBy: { day: "asc" } },
      registeredAccounts: {
        orderBy: { createdAt: "desc" },
        include: { activities: { orderBy: { createdAt: "desc" }, take: 5 } },
      },
      closedDeals: { orderBy: { createdAt: "desc" }, include: { seats: true, commissions: true, registeredAccount: true } },
      commissions: true,
      focusGrants: { orderBy: { grantedAt: "desc" } },
      qualityFlags: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!partner) notFound();

  // Superadmin-only controls (cross-partner attribution, weighted split). The server
  // action enforces this too; the flag just decides whether to show the controls.
  const session = await auth();
  const superAdmin = isSuperAdmin(session?.user?.email);
  const partnerOptions: [string, string][] = superAdmin
    ? (await prisma.partner.findMany({ select: { id: true, displayName: true }, orderBy: { displayName: "asc" } })).map(
        (p) => [p.id, p.displayName] as [string, string],
      )
    : [];

  const effective = await resolvePartnerConfig(partner.id);
  const overrideRowRaw = await prisma.partnerConfig.findUnique({ where: { partnerId: partner.id } });
  const overrideRow = overrideRowRaw ? pickConfigFields(overrideRowRaw as unknown as EffectiveConfig) : {};

  const seats = partner.closedDeals.flatMap((d) => d.seats);
  const paidSeats = countableSeats(seats.map((s) => ({ count: s.count, status: s.status, disregardForTargets: partner.qualityFlagged })));

  // Context for the commission add-line rate preview (the server re-derives on save).
  // The Growth Bonus preview uses the SAME domain-based counter the server uses, so it
  // never shows 0% where a bonus would actually be paid.
  const nowForRates = new Date();
  const newB2bOrgsRolling12 = await countNewCompanyDomainsRolling(partner.id, nowForRates, effective);
  const FUNCTION_OPTIONS: [string, string][] = FUNCTION_VALUES.map((f) => [f, PARTNER_FUNCTION_LABELS[f]]);
  const ratesForDeal = (deal: (typeof partner.closedDeals)[number]): Record<string, DerivedRate> => {
    // Origination and Delivery are shown separately in the form (server-derived and a
    // single configured rate); the rest are derived from config for the preview.
    const ctx = {
      dealKind: deal.dealType as "B2C" | "B2B",
      cfg: effective,
      openRateBp: deal.originationRateBpAtOpen ?? 0,
      withinOriginationWindow: deal.originationWindowStart
        ? withinOriginationWindow(deal.originationWindowStart, nowForRates, effective)
        : false,
      activeStatus: partner.activeStatus,
      newB2bOrgsRolling12,
      tier: partner.tier,
    };
    const map: Record<string, DerivedRate> = {};
    for (const f of FUNCTION_VALUES) map[f] = deriveFunctionRate(f, ctx);
    return map;
  };

  const payoutCurrency = effective.currency;
  // Net payable, converted to the payout currency, summed by status.
  const lines = partner.closedDeals.flatMap((d) => d.commissions.map((c) => ({ c, d })));
  const payoutTotal = (status: string) =>
    lines
      .filter(({ c }) => c.status === status)
      .reduce((t, { c, d }) => t + entryPayoutMinor(c, d, payoutCurrency), 0);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageHeader title={partner.displayName} description={partner.contactEmail} />
        <div className="flex items-center gap-2">
          <ButtonLink
            href={`/admin/impersonate/partner/${partner.id}`}
            target="_blank"
            rel="noopener noreferrer"
            variant="secondary"
            size="sm"
          >
            Open panel (read-only)
          </ButtonLink>
          <Badge status={partner.status === "TERMINATED" ? "NOT_COMPLETED" : "ACTIVE"}>{PARTNER_STATUS_LABELS[partner.status]}</Badge>
          <Badge status="ENROLLED">{partner.tier}</Badge>
        </div>
      </div>

      {/* Snapshot */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card><p className="text-sm text-slate-500">Active status</p><p className="mt-2 font-semibold text-navy-900">{partner.activeStatus ? "Active" : "Inactive"}</p></Card>
        <Card><p className="text-sm text-slate-500">Activation gate</p><p className="mt-2 font-semibold text-navy-900">{partner.activationGatePassedAt ? "Confirmed" : "Not confirmed"}</p></Card>
        <Card><p className="text-sm text-slate-500">Paid seats</p><p className="mt-2 text-xl font-semibold text-navy-900">{paidSeats}</p></Card>
        <Card><p className="text-sm text-slate-500">Commission paid (net)</p><p className="mt-2 text-xl font-semibold text-navy-900">{formatMoney(payoutTotal("PAID"), payoutCurrency)}</p></Card>
      </div>

      {/* Registered accounts & pipeline (read-only; the partner drives their own pipeline) */}
      <Card className="space-y-4">
        <h2 className="text-lg font-semibold text-navy-900">Registered accounts &amp; pipeline</h2>
        {partner.registeredAccounts.length === 0 ? (
          <p className="text-sm text-slate-500">No confirmed accounts yet.</p>
        ) : (
          <div className="space-y-4">
            {partner.registeredAccounts.map((a) => {
              const lapse = accountLapseState(a.lastMeaningfulUpdateAt, partner.tier, new Date(), effective);
              const lapseText =
                lapse.daysUntilLapse === null
                  ? "No update yet"
                  : lapse.lapsed
                    ? `Lapsed ${Math.abs(lapse.daysUntilLapse)}d ago`
                    : `Lapses in ${lapse.daysUntilLapse}d`;
              return (
                <div key={a.id} className="rounded-lg border border-neutral-200 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold text-navy-900">{a.legalEntity}</p>
                      <p className="text-xs text-slate-500">{a.country}{a.businessUnit ? `, ${a.businessUnit}` : ""} , {OFFERING_LABELS[a.offering]}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge status={ACCOUNT_STAGE_BADGE[a.stage]}>{ACCOUNT_STAGE_LABELS[a.stage]}</Badge>
                      <Badge status={lapse.lapsed ? "NOT_COMPLETED" : "ACTIVE"}>{lapseText}</Badge>
                    </div>
                  </div>
                  {a.activities.length > 0 ? (
                    <ul className="mt-3 space-y-1 text-xs text-slate-600">
                      {a.activities.map((act) => (
                        <li key={act.id}>
                          <span className="font-medium text-slate-700">{ACCOUNT_ACTIVITY_KIND_LABELS[act.kind] ?? act.kind}</span>
                          {": "}
                          {act.note}
                          <span className="text-slate-400"> ({act.createdAt.toLocaleDateString()})</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-xs text-slate-400">No activity logged yet.</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Edit profile */}
      <Card>
        <h2 className="text-lg font-semibold text-navy-900">Edit profile</h2>
        <form action={updatePartnerProfileAdmin} className="mt-4 grid gap-3 md:grid-cols-3">
          <input type="hidden" name="partnerId" value={partner.id} />
          <label className="space-y-1">
            <span className="text-xs font-medium text-slate-600">Display name</span>
            <Input name="displayName" defaultValue={partner.displayName} />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium text-slate-600">Contact email</span>
            <Input name="contactEmail" type="email" defaultValue={partner.contactEmail} />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium text-slate-600">Country</span>
            <CountrySelect name="country" defaultValue={partner.country ?? ""} />
          </label>
          <div className="md:col-span-3">
            <Button type="submit" size="sm">Save profile</Button>
          </div>
        </form>
      </Card>

      {/* Lifecycle actions */}
      <Card className="space-y-4">
        <h2 className="text-lg font-semibold text-navy-900">Lifecycle &amp; Panel Confirmations</h2>
        <p className="text-xs text-slate-500">
          Eligibility (necessary, not sufficient, promotion is your Panel Confirmation): {paidSeats}/{effective.tier2SeatThreshold} paid seats toward Tier 2
          {partner.tier !== "TIER1" ? ` · Tier 3 needs ${effective.tier3FocusSeatThreshold} paid focus seats in one industry/region` : ""}.
        </p>
        <div className="flex flex-wrap items-end gap-x-6 gap-y-4">
          {!partner.activationGatePassedAt ? (
            <form action={confirmActivationGate} className="space-y-1">
              <input type="hidden" name="partnerId" value={partner.id} />
              <span className="block text-xs font-medium text-slate-600">Activation gate</span>
              <Button type="submit" size="md">Confirm Activation Gate</Button>
            </form>
          ) : null}
          <form action={setPartnerTier} className="flex items-end gap-2">
            <input type="hidden" name="partnerId" value={partner.id} />
            <label className="space-y-1">
              <span className="block text-xs font-medium text-slate-600">Set tier</span>
              <Select name="tier" defaultValue={partner.tier} className="w-32">
                <option value="TIER1">Tier 1</option>
                <option value="TIER2">Tier 2</option>
                <option value="TIER3">Tier 3</option>
              </Select>
            </label>
            <Button type="submit" size="md" variant="secondary">Apply tier</Button>
          </form>
        </div>
        <p className="text-xs text-slate-500">
          To pause, end, or delete this partnership, see “Pause, end, or delete this partner” at the bottom of the page.
        </p>
      </Card>

      {/* Scorecard */}
      <Card>
        <h2 className="text-lg font-semibold text-navy-900">Pilot scorecard</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {partner.scorecard.map((c) => (
            <div key={c.id} className="rounded-md border border-neutral-200 p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-navy-900">{SCORECARD_DAY_LABELS[c.day]}</p>
                <Badge status={c.met ? "PASSED" : "PENDING"}>{c.met ? "Met" : "Pending"}</Badge>
              </div>
              <p className="mt-1 text-xs text-slate-600">{c.requiredEvidence}</p>
              <form action={setScorecardCheckpoint} className="mt-3 flex items-center gap-2">
                <input type="hidden" name="checkpointId" value={c.id} />
                <input type="hidden" name="met" value={c.met ? "false" : "true"} />
                <Input name="reviewerNote" placeholder="Note" className="h-9 flex-1 min-w-0 text-xs" defaultValue={c.reviewerNote ?? ""} />
                <Button type="submit" size="sm" variant={c.met ? "ghost" : "secondary"}>{c.met ? "Unset" : "Mark met"}</Button>
              </form>
            </div>
          ))}
        </div>
      </Card>

      {/* Record a closed deal */}
      <Card>
        <h2 className="text-lg font-semibold text-navy-900">Record a closed deal</h2>
        <form action={recordClosedDeal} className="mt-4 grid gap-3 md:grid-cols-3">
          <input type="hidden" name="partnerId" value={partner.id} />
          <label className="space-y-1"><span className="text-xs font-medium text-slate-600">Deal type</span>
            <Select name="dealType" defaultValue="B2B"><option value="B2B">B2B</option><option value="B2C">B2C</option></Select>
          </label>
          <label className="space-y-1"><span className="text-xs font-medium text-slate-600">Product line</span>
            <Select name="productLine" defaultValue="TENXPROS"><option value="TENXPROS">TenXPros</option><option value="TENXOPS">TenXOps</option></Select>
          </label>
          <label className="space-y-1"><span className="text-xs font-medium text-slate-600">Net receipts (customer currency)</span>
            <Input name="netReceipts" type="number" step="0.01" min={0} placeholder="20000" />
          </label>
          <label className="space-y-1"><span className="text-xs font-medium text-slate-600">Currency</span>
            <Input name="currency" list="currency-options" defaultValue={payoutCurrency} placeholder="USD" />
          </label>
          <label className="space-y-1"><span className="text-xs font-medium text-slate-600">Rate → payout ({payoutCurrency})</span>
            <Input name="conversionRate" type="number" step="0.000001" min={0} defaultValue={1} placeholder="1 if same currency" />
          </label>
          <datalist id="currency-options">{COMMON_CURRENCIES.map((c) => <option key={c} value={c} />)}</datalist>
          <label className="space-y-1"><span className="text-xs font-medium text-slate-600">Registered account</span>
            <Select name="registeredAccountId" defaultValue="">
              <option value="">none</option>
              {partner.registeredAccounts.map((a) => <option key={a.id} value={a.id}>{a.legalEntity}</option>)}
            </Select>
          </label>
          <label className="space-y-1"><span className="text-xs font-medium text-slate-600">Company domain</span>
            <Input name="domain" placeholder="acme.com (drives newness / origination)" />
          </label>
          <label className="space-y-1"><span className="text-xs font-medium text-slate-600">Signed at</span><Input name="signedAt" type="date" /></label>
          <label className="space-y-1"><span className="text-xs font-medium text-slate-600">Delivered at</span><Input name="deliveredAt" type="date" /></label>
          <label className="space-y-1"><span className="text-xs font-medium text-slate-600">Payment cleared at</span><Input name="paymentClearedAt" type="date" /></label>
          <label className="space-y-1"><span className="text-xs font-medium text-slate-600">Industry / region</span><Input name="industryOrRegion" placeholder="optional" /></label>
          <label className="flex items-end gap-2 text-sm text-slate-700"><input type="checkbox" name="isMajorNewEngagement" className="h-4 w-4" /> Major new engagement</label>
          <div className="md:col-span-3"><Button type="submit" size="sm">Record deal</Button></div>
        </form>
      </Card>

      {/* Closed deals */}
      <Card>
        <h2 className="text-lg font-semibold text-navy-900">Closed deals &amp; commissions</h2>
        <div className="mt-4 space-y-5">
          {partner.closedDeals.map((deal) => (
            <div key={deal.id} className="rounded-lg border border-neutral-200 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-navy-900">
                  {deal.registeredAccount?.legalEntity ?? "Direct"} · {deal.dealType} · {formatCents(deal.netReceiptsCents, deal.currency)}
                  {deal.currency !== payoutCurrency ? (
                    <span className="ml-1 text-xs font-normal text-slate-500">
                      (≈ {formatMoney(convertMinor(deal.netReceiptsCents, deal.conversionRate ?? 1, deal.currency, payoutCurrency), payoutCurrency)} @ {deal.conversionRate ?? 1})
                    </span>
                  ) : null}
                </p>
                <span className="text-xs text-slate-500">
                  {deal.deliveredAt ? "delivered" : "not delivered"} · {deal.paymentClearedAt ? "cleared" : "not cleared"}
                </span>
              </div>

              {/* Seats */}
              <p className="mt-2 text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Seats</p>
              <div className="text-sm text-slate-600">
                {deal.seats.map((s) => (
                  <span key={s.id} className="mr-3">{s.count} × {SEAT_STATUS_LABELS[s.status]}</span>
                ))}
                {deal.seats.length === 0 ? <span>None recorded.</span> : null}
              </div>
              <form action={recordSeats} className="mt-2 flex flex-wrap items-end gap-2">
                <input type="hidden" name="closedDealId" value={deal.id} />
                <Input name="count" type="number" min={1} defaultValue={1} className="h-8 w-20" />
                <Select name="status" defaultValue="PAID_COLLECTED" className="h-8 w-44">
                  <option value="PAID_COLLECTED">Paid &amp; collected</option>
                  <option value="PENDING">Pending</option>
                  <option value="REFUNDED">Refunded</option>
                  <option value="CANCELLED">Cancelled</option>
                </Select>
                <Button type="submit" size="sm" variant="ghost">Add seats</Button>
              </form>

              {/* Commission lines */}
              <p className="mt-3 text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Commission lines</p>
              <div className="mt-1 overflow-x-auto">
              <table className="w-full min-w-[360px] text-sm">
                <tbody>
                  {deal.commissions.map((c) => (
                    <tr key={c.id} className="border-b border-neutral-100">
                      <td className="py-1 pr-2">{PARTNER_FUNCTION_LABELS[c.function]}{c.isFlat ? <span className="ml-1 text-xs text-slate-400">(fixed)</span> : null}</td>
                      <td className="py-1 pr-2 text-slate-500">{c.isFlat ? "Flat" : formatBp(c.rateBp)}</td>
                      <td className="py-1 pr-2 font-medium text-navy-900">
                        {formatCents(c.amountCents - c.reversedCents, c.currency)}
                        {c.reversedCents > 0 ? <span className="ml-1 text-xs text-amber-700">(-{formatCents(c.reversedCents, c.currency)})</span> : null}
                      </td>
                      <td className="py-1"><Badge status={c.status === "PAID" ? "PAID" : c.status === "REVERSED" ? "NOT_COMPLETED" : "PENDING"}>{COMMISSION_STATUS_LABELS[c.status]}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
              <AddCommissionLineForm
                closedDealId={deal.id}
                currency={deal.currency}
                dealKind={deal.dealType as "B2C" | "B2B"}
                rates={ratesForDeal(deal)}
                deliverySingleRateBp={effective.deliveryPercentBp}
                functionOptions={FUNCTION_OPTIONS}
                isSuperAdmin={superAdmin}
                dealOwnerId={partner.id}
                partnerOptions={partnerOptions}
              />
              <div className="mt-2 flex flex-wrap items-end gap-2">
                <form action={recomputeDealCommissions}>
                  <input type="hidden" name="closedDealId" value={deal.id} />
                  <Button type="submit" size="sm" variant="secondary">Recompute (apply cap + payable)</Button>
                </form>
                <form action={applyRefund} className="flex items-end gap-2">
                  <input type="hidden" name="closedDealId" value={deal.id} />
                  <Select name="type" defaultValue="REFUND" className="h-8 w-28">
                    <option value="REFUND">Refund</option>
                    <option value="CHARGEBACK">Chargeback</option>
                    <option value="CANCELLATION">Cancellation</option>
                    <option value="CREDIT">Credit</option>
                    <option value="REVERSAL">Reversal</option>
                  </Select>
                  <Input name="amount" type="number" step="0.01" min={0} placeholder={deal.currency} className="h-8 w-24" />
                  <Input name="seatsRefunded" type="number" min={0} placeholder="seats" className="h-8 w-16" />
                  <Button type="submit" size="sm" variant="danger">Apply</Button>
                </form>
              </div>
            </div>
          ))}
          {partner.closedDeals.length === 0 ? <p className="text-sm text-slate-500">No closed deals recorded.</p> : null}
        </div>
      </Card>

      {/* Focus + quality */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <h2 className="text-lg font-semibold text-navy-900">Tier 3 focus</h2>
          {partner.focusGrants.length ? (
            <ul className="mt-2 space-y-1 text-sm text-slate-600">
              {partner.focusGrants.map((g) => (
                <li key={g.id} className="flex items-center justify-between gap-2">
                  <span>{g.industryOrRegion}, {g.status}, {formatBp(g.currentBonusBp)} bonus, expires {g.expiresAt.toLocaleDateString()}</span>
                  {g.status === "ACTIVE" ? (
                    <form action={endFocus}>
                      <input type="hidden" name="focusGrantId" value={g.id} />
                      <input type="hidden" name="status" value="LAPSED" />
                      <Button type="submit" size="sm" variant="ghost">End</Button>
                    </form>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : <p className="mt-2 text-sm text-slate-500">No focus granted.</p>}
          <form action={grantFocus} className="mt-3 flex items-center gap-2">
            <input type="hidden" name="partnerId" value={partner.id} />
            <Input name="industryOrRegion" placeholder="Industry or region" className="h-9 flex-1 min-w-0" />
            <Button type="submit" size="sm" variant="secondary" disabled={partner.tier !== "TIER3"}>Grant focus</Button>
          </form>
          {partner.tier !== "TIER3" ? <p className="mt-1 text-xs text-slate-400">Partner must be Tier 3 to hold a focus.</p> : null}
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-navy-900">Quality flags</h2>
          {partner.qualityFlags.length ? (
            <ul className="mt-2 space-y-1 text-sm text-slate-600">
              {partner.qualityFlags.map((q) => (
                <li key={q.id}>{q.reason}{q.disregardForTargets ? ", disregarded for targets" : ""}</li>
              ))}
            </ul>
          ) : <p className="mt-2 text-sm text-slate-500">No flags.</p>}
          <form action={addQualityFlag} className="mt-3 space-y-2">
            <input type="hidden" name="partnerId" value={partner.id} />
            <Input name="reason" placeholder="Reason" className="h-9" />
            <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" name="disregardForTargets" className="h-4 w-4" /> Disregard affected sales for targets/bonuses</label>
            <div><Button type="submit" size="sm" variant="secondary">Add flag</Button></div>
          </form>
        </Card>
      </div>

      {/* Per-partner config override editor */}
      <Card>
        <h2 className="text-lg font-semibold text-navy-900">Per-partner configuration overrides</h2>
        <p className="mt-1 text-sm text-slate-600">
          Leave a field blank to inherit the global default (shown as the placeholder). Any value here overrides the
          default for this partner only.
        </p>
        <form action={upsertPartnerConfigOverride} className="mt-5 space-y-8">
          <input type="hidden" name="partnerId" value={partner.id} />
          <PartnerConfigFields mode="override" effective={effective} overrideRow={overrideRow} />
          <div className="border-t border-neutral-200 pt-6">
            <Button type="submit">Save overrides</Button>
          </div>
        </form>
      </Card>

      {/* Pause, end, or delete */}
      <Card className="space-y-0 border-amber-200">
        <div className="pb-1">
          <h2 className="text-lg font-semibold text-navy-900">Pause, end, or delete this partner</h2>
          <p className="mt-1 text-sm text-slate-600">
            Current status: <span className="font-medium text-navy-900">{PARTNER_STATUS_LABELS[partner.status]}</span>
            {partner.activeStatus ? " · active" : " · not active"}.
          </p>
        </div>

        {/* Pause / reactivate (temporary archive) */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-200 py-4">
          <div className="max-w-md">
            <p className="text-sm font-medium text-navy-900">Pause collaboration</p>
            <p className="text-xs text-slate-500">
              Temporarily stop the partnership. All records are kept and you can reactivate at any time.
            </p>
          </div>
          {partner.activeStatus ? (
            <form action={setPartnerStatus}>
              <input type="hidden" name="partnerId" value={partner.id} />
              <input type="hidden" name="action" value="DEACTIVATE" />
              <Button type="submit" size="sm" variant="secondary">Pause (archive)</Button>
            </form>
          ) : (
            <form action={setPartnerStatus}>
              <input type="hidden" name="partnerId" value={partner.id} />
              <input type="hidden" name="action" value="ACTIVATE" />
              <Button type="submit" size="sm" variant="secondary">Reactivate</Button>
            </form>
          )}
        </div>

        {/* End collaboration (permanent archive / terminate) */}
        <div className="flex flex-wrap items-end justify-between gap-3 border-t border-neutral-200 py-4">
          <div className="max-w-md">
            <p className="text-sm font-medium text-navy-900">End collaboration</p>
            <p className="text-xs text-slate-500">
              Permanently end the partnership. All deals, commissions and history are kept for the audit trail. You can
              still reactivate later if needed.
            </p>
          </div>
          {partner.status === "TERMINATED" ? (
            <span className="text-xs font-medium text-slate-500">Already ended.</span>
          ) : (
            <form action={setPartnerStatus} className="flex items-end gap-2">
              <input type="hidden" name="partnerId" value={partner.id} />
              <input type="hidden" name="action" value="TERMINATE" />
              <Input name="reason" placeholder="Reason (optional)" className="h-9 w-48" />
              <Button type="submit" size="sm" variant="danger">End collaboration</Button>
            </form>
          )}
        </div>

        {/* Delete permanently */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-200 pt-4">
          <div className="max-w-md">
            <p className="text-sm font-medium text-red-700">Delete permanently</p>
            <p className="text-xs text-slate-500">
              Remove the partner and its pilot, scorecard, registrations and config. The linked sign-in account is reset.
              This cannot be undone.
            </p>
          </div>
          {partner.closedDeals.length > 0 || partner.commissions.length > 0 ? (
            <div className="max-w-sm space-y-3">
              <p className="text-xs text-slate-500">
                Normal delete is blocked because there is financial history (closed deals or commissions). Prefer
                “End collaboration” above, which keeps the records. If you must remove everything, force delete will also
                erase the financial history.
              </p>
              <form>
                <input type="hidden" name="partnerId" value={partner.id} />
                <ForceDeleteButton action={forceDeletePartner} name={partner.displayName} />
              </form>
            </div>
          ) : (
            <ConfirmSubmit
              action={deletePartner}
              hidden={{ partnerId: partner.id }}
              message={`Permanently delete partner "${partner.displayName}"? This cannot be undone.`}
              label="Delete partner"
            />
          )}
        </div>
      </Card>
    </div>
  );
}
