import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentPartner } from "@/lib/partner/auth";
import { DEAL_REG_STATUS_LABELS, OFFERING_LABELS } from "@/lib/partner/constants";
import { DealMessageForm } from "@/components/portal/deal-message-form";
import { DealResubmitForm } from "@/components/portal/deal-resubmit-form";
import { DealThread } from "@/components/portal/deal-thread";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { PageHeader } from "@/components/shared/page-shell";

export const dynamic = "force-dynamic";

const STATUS_BADGE: Record<string, string> = {
  SUBMITTED: "WAITING_RESPONSE",
  CONFIRMED: "APPROVED",
  DECLINED: "NOT_COMPLETED",
  LAPSED: "CLOSED",
  WITHDRAWN: "CLOSED",
  NEEDS_REVISION: "REVISE",
};

export default async function PartnerDealDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const current = await getCurrentPartner();
  if (!current) redirect("/login");

  const reg = await prisma.dealRegistration.findFirst({
    where: { id, partnerId: current.partner.id },
    include: { messages: { orderBy: { createdAt: "asc" } }, functionClaims: true },
  });
  if (!reg) notFound();

  const needsRevision = reg.status === "NEEDS_REVISION";

  return (
    <div className="space-y-8">
      <PageHeader
        title={reg.legalEntity}
        description={`${reg.country}${reg.businessUnit ? `, ${reg.businessUnit}` : ""}`}
      />

      <Card className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Badge status={STATUS_BADGE[reg.status]}>{DEAL_REG_STATUS_LABELS[reg.status]}</Badge>
          <span className="text-xs text-slate-500">Submitted {reg.submittedAt.toLocaleDateString()}</span>
        </div>
        <div className="grid gap-4 text-sm md:grid-cols-2">
          <div>
            <p className="text-slate-500">Offering</p>
            <p className="font-medium text-navy-900">{OFFERING_LABELS[reg.offering]}</p>
          </div>
          <div>
            <p className="text-slate-500">Confirmed scope</p>
            <p className="font-medium text-navy-900">{reg.confirmedScope ?? "-"}</p>
          </div>
          {reg.declineReason ? (
            <div className="md:col-span-2">
              <p className="text-slate-500">Decline reason</p>
              <p className="font-medium text-navy-900">{reg.declineReason}</p>
            </div>
          ) : null}
          <div className="md:col-span-2">
            <p className="text-slate-500">Your case</p>
            <p className="text-slate-700">{reg.justification}</p>
          </div>
        </div>
      </Card>

      {needsRevision && !current.preview ? (
        <Card className="space-y-4 border-amber-200">
          <Alert tone="warning" title="The company asked you to revise this opportunity">
            Read the thread below, then edit the details and resubmit. It returns to Panel Confirmation once you resubmit.
          </Alert>
          <DealResubmitForm
            deal={{
              dealRegistrationId: reg.id,
              offering: reg.offering,
              legalEntity: reg.legalEntity,
              domain: reg.domain ?? undefined,
              country: reg.country,
              businessUnit: reg.businessUnit ?? undefined,
              contactName: reg.contactName ?? undefined,
              contactTitle: reg.contactTitle ?? undefined,
              estSeats: reg.estSeats != null ? String(reg.estSeats) : undefined,
              estValueUsd: reg.estValueCents != null ? String(reg.estValueCents / 100) : undefined,
              functionsIntended: reg.functionsIntended as ("BASIC_INTRO" | "ORIGINATION" | "CLOSING" | "DELIVERY")[],
              // Prefill the stored per-function evidence, so resubmitting never wipes it.
              introContactName: reg.functionClaims.find((c) => c.function === "BASIC_INTRO")?.contactName ?? undefined,
              introRelationship: reg.functionClaims.find((c) => c.function === "BASIC_INTRO")?.relationshipDescription ?? undefined,
              introHow: reg.functionClaims.find((c) => c.function === "BASIC_INTRO")?.introDescription ?? undefined,
              introWarmAttested: reg.functionClaims.find((c) => c.function === "BASIC_INTRO")?.warmRelationshipAttested ?? undefined,
              originationInvolvement: reg.functionClaims.find((c) => c.function === "ORIGINATION")?.involvementStatement ?? undefined,
              closingPlan: reg.functionClaims.find((c) => c.function === "CLOSING")?.involvementStatement ?? undefined,
              deliveryScope: reg.functionClaims.find((c) => c.function === "DELIVERY")?.involvementStatement ?? undefined,
              justification: reg.justification,
              widerScopeRequested: reg.widerScopeRequested ?? undefined,
              note: undefined,
            }}
          />
        </Card>
      ) : null}

      <Card className="space-y-4">
        <h2 className="text-lg font-semibold text-navy-900">Conversation</h2>
        <DealThread messages={reg.messages} />
        {current.preview ? (
          <p className="text-sm text-slate-500">You are viewing read-only. The partner can reply here.</p>
        ) : (
          <DealMessageForm dealId={reg.id} />
        )}
      </Card>

      <p className="text-sm">
        <Link href="/partner/deals" className="text-navy-700 hover:underline">
          Back to all opportunities
        </Link>
      </p>
    </div>
  );
}
