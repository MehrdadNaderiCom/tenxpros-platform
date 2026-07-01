import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentPartner } from "@/lib/partner/auth";
import { resolvePartnerConfig } from "@/lib/partner/config-server";
import { accountLapseState } from "@/lib/partner/rules";
import {
  ACCOUNT_ACTIVITY_KIND_LABELS,
  ACCOUNT_STAGE_BADGE,
  ACCOUNT_STAGE_LABELS,
  OFFERING_LABELS,
} from "@/lib/partner/constants";
import { AccountPipelineControls } from "@/components/portal/account-pipeline-controls";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-shell";

export const dynamic = "force-dynamic";

function lapseLine(daysUntilLapse: number | null, lapsed: boolean): { text: string; status: string } {
  if (daysUntilLapse === null) return { text: "No update recorded yet", status: "PENDING" };
  if (lapsed) return { text: `Lapsed ${Math.abs(daysUntilLapse)} days ago, add an update`, status: "NOT_COMPLETED" };
  if (daysUntilLapse <= 7) return { text: `Lapses in ${daysUntilLapse} days, keep it moving`, status: "WAITING_RESPONSE" };
  return { text: `Fresh, lapses in ${daysUntilLapse} days`, status: "ACTIVE" };
}

export default async function PartnerAccountDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const current = await getCurrentPartner();
  if (!current) redirect("/login");

  const account = await prisma.registeredAccount.findFirst({
    where: { id, partnerId: current.partner.id },
    include: {
      activities: { orderBy: { createdAt: "desc" } },
      closedDeals: { select: { id: true } },
      dealRegistration: { select: { id: true } },
    },
  });
  if (!account) notFound();

  const cfg = await resolvePartnerConfig(current.partner.id);
  const lapse = accountLapseState(account.lastMeaningfulUpdateAt, current.partner.tier, new Date(), cfg);
  const lapseInfo = lapseLine(lapse.daysUntilLapse, lapse.lapsed);

  return (
    <div className="space-y-8">
      <PageHeader
        title={account.legalEntity}
        description={`${account.country}${account.businessUnit ? `, ${account.businessUnit}` : ""}`}
      />

      <Card className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Badge status={ACCOUNT_STAGE_BADGE[account.stage]}>{ACCOUNT_STAGE_LABELS[account.stage]}</Badge>
          <Badge status={lapseInfo.status}>{lapseInfo.text}</Badge>
        </div>
        <div className="grid gap-4 text-sm md:grid-cols-2">
          <div>
            <p className="text-slate-500">Offering</p>
            <p className="font-medium text-navy-900">{OFFERING_LABELS[account.offering]}</p>
          </div>
          <div>
            <p className="text-slate-500">Confirmed scope</p>
            <p className="font-medium text-navy-900">{account.scope}</p>
          </div>
          <div>
            <p className="text-slate-500">Protected until</p>
            <p className="font-medium text-navy-900">{account.protectionExpiresAt?.toLocaleDateString() ?? "-"}</p>
          </div>
          <div>
            <p className="text-slate-500">Last meaningful update</p>
            <p className="font-medium text-navy-900">{account.lastMeaningfulUpdateAt?.toLocaleDateString() ?? "-"}</p>
          </div>
          <div>
            <p className="text-slate-500">Closed deals</p>
            <p className="font-medium text-navy-900">{account.closedDeals.length}</p>
          </div>
          <div>
            <p className="text-slate-500">Quiet window</p>
            <p className="font-medium text-navy-900">{lapse.lapseWindowDays} days</p>
          </div>
        </div>
      </Card>

      {current.preview ? (
        <Card>
          <p className="text-sm text-slate-600">
            You are viewing this account read-only. Stage moves and activity logging are available to the partner.
          </p>
        </Card>
      ) : (
        <AccountPipelineControls accountId={account.id} currentStage={account.stage} />
      )}

      <Card className="space-y-4">
        <h2 className="text-lg font-semibold text-navy-900">Activity history</h2>
        {account.activities.length === 0 ? (
          <p className="text-sm text-slate-500">No activity yet. Log your first update above.</p>
        ) : (
          <ol className="space-y-3">
            {account.activities.map((a) => (
              <li key={a.id} className="rounded-lg border border-neutral-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-navy-900">
                    {ACCOUNT_ACTIVITY_KIND_LABELS[a.kind] ?? a.kind}
                    {a.stageAfter ? ` (${ACCOUNT_STAGE_LABELS[a.stageAfter]})` : ""}
                  </span>
                  <span className="text-xs text-slate-500">{a.createdAt.toLocaleString()}</span>
                </div>
                <p className="mt-2 text-sm text-slate-700">{a.note}</p>
              </li>
            ))}
          </ol>
        )}
      </Card>

      <p className="text-sm">
        <Link href="/partner/accounts" className="text-navy-700 hover:underline">
          Back to all accounts
        </Link>
      </p>
    </div>
  );
}
