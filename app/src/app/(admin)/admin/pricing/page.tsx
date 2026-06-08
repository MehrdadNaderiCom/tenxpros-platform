import { setActivePricingTier, updatePricingTier } from "@/lib/actions/admin";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/form-fields";
import { PageHeader } from "@/components/shared/page-shell";

export default async function AdminPricingPage() {
  const tiers = await prisma.pricingTier.findMany({ orderBy: { price: "asc" } });
  return (
    <div className="space-y-8">
      <PageHeader
        title="Pricing"
        description="Edit tier prices and capacity, and set the active charter window. The public /pricing page reads these values, so changes here update what visitors see."
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {tiers.map((tier) => (
          <Card key={tier.id} className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-navy-900">{tier.name}</h2>
              <Badge status={tier.isActive ? "ACCEPTED" : "SUBMITTED"}>{tier.isActive ? "Active" : "Closed"}</Badge>
            </div>
            <p className="text-2xl font-semibold">{formatCurrency(tier.price)}</p>
            <p className="text-sm text-slate-600">
              {tier.membersCount}/{tier.membersLimit} members
            </p>

            <form action={updatePricingTier} className="space-y-3 border-t border-neutral-200 pt-4">
              <input type="hidden" name="tierId" value={tier.id} />
              <Field label="Price (USD, whole number)">
                <Input name="price" type="number" min={1} step={1} defaultValue={tier.price} required />
              </Field>
              <Field label="Member limit">
                <Input
                  name="membersLimit"
                  type="number"
                  min={1}
                  step={1}
                  defaultValue={tier.membersLimit}
                  required
                />
              </Field>
              <Button type="submit" variant="secondary" className="w-full">
                Save price &amp; capacity
              </Button>
            </form>

            <form action={setActivePricingTier}>
              <input type="hidden" name="tierId" value={tier.id} />
              <Button type="submit" className="w-full" disabled={tier.isActive}>
                Make active
              </Button>
            </form>
          </Card>
        ))}
      </div>
    </div>
  );
}
