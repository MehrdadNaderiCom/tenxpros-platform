import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentPartner } from "@/lib/partner/auth";
import { setActivationItem } from "@/lib/actions/partner-portal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-shell";

export const dynamic = "force-dynamic";

export default async function PartnerOnboardingPage() {
  const current = await getCurrentPartner();
  if (!current) redirect("/login");

  const partner = await prisma.partner.findUniqueOrThrow({
    where: { id: current.partner.id },
    include: { activationItems: { orderBy: { createdAt: "asc" } } },
  });
  const gatePassed = Boolean(partner.activationGatePassedAt);
  const allDone = partner.activationItems.every((i) => i.completed);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Activation Gate"
        description="Complete every step before any outreach using the TenXPros name. The company confirms your gate on the panel once these are done."
      />

      <Card className={gatePassed ? "border-emerald-200 bg-emerald-50" : "border-neutral-200"}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-navy-900">Gate status</p>
            <p className="mt-1 text-sm text-slate-600">
              {gatePassed
                ? "Confirmed on the panel, you may register and pursue opportunities."
                : allDone
                  ? "All steps complete. Awaiting the company's Panel Confirmation."
                  : "Complete the steps below."}
            </p>
          </div>
          <Badge status={gatePassed ? "APPROVED" : allDone ? "WAITING_RESPONSE" : "PENDING"}>
            {gatePassed ? "Confirmed" : allDone ? "Awaiting confirmation" : "In progress"}
          </Badge>
        </div>
      </Card>

      <div className="space-y-3">
        {partner.activationItems.map((item) => (
          <Card key={item.id} className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <Badge status={item.completed ? "PASSED" : "LOCKED"}>{item.completed ? "Done" : "To do"}</Badge>
              <p className="text-sm leading-6 text-slate-700">{item.label}</p>
            </div>
            <form action={setActivationItem}>
              <input type="hidden" name="key" value={item.key} />
              <input type="hidden" name="completed" value={item.completed ? "false" : "true"} />
              <Button type="submit" variant={item.completed ? "ghost" : "secondary"} size="sm" disabled={gatePassed}>
                {item.completed ? "Undo" : "Mark done"}
              </Button>
            </form>
          </Card>
        ))}
      </div>
    </div>
  );
}
