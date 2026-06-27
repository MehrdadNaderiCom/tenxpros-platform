import { resolveGlobalConfig } from "@/lib/partner/config-server";
import { updateProgramConfig } from "@/lib/actions/partner-admin";
import { PartnerConfigFields } from "@/components/admin/partner-config-fields";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-shell";

export const dynamic = "force-dynamic";

export default async function PartnerConfigPage() {
  const effective = await resolveGlobalConfig();

  return (
    <div className="space-y-8">
      <PageHeader
        title="Program Configuration"
        description="Global defaults for every commercial number. Rates and caps are in basis points (100 bp = 1%); money is in cents. Per-partner overrides live on each partner's page."
      />
      <Card>
        <form action={updateProgramConfig} className="space-y-8">
          <PartnerConfigFields mode="global" effective={effective} />
          <div className="border-t border-neutral-200 pt-6">
            <Button type="submit">Save global configuration</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
