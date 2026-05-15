import { setActivePricingTier } from "@/lib/actions/admin";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-shell";

export default async function AdminPricingPage() {
  const tiers = await prisma.pricingTier.findMany({ orderBy: { price: "asc" } });
  return (
    <div className="space-y-8">
      <PageHeader title="Pricing" description="Manual charter tier activation. Full Stripe automation remains deferred." />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {tiers.map((tier) => (
          <Card key={tier.id} className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-navy-900">{tier.name}</h2>
              <Badge status={tier.isActive ? "ACCEPTED" : "SUBMITTED"}>{tier.isActive ? "Active" : "Closed"}</Badge>
            </div>
            <p className="text-2xl font-semibold">{formatCurrency(tier.price)}</p>
            <p className="text-sm text-slate-600">{tier.membersCount}/{tier.membersLimit} members</p>
            <form action={setActivePricingTier}>
              <input type="hidden" name="tierId" value={tier.id} />
              <Button type="submit" variant="secondary" disabled={tier.isActive}>Make active</Button>
            </form>
          </Card>
        ))}
      </div>
    </div>
  );
}
