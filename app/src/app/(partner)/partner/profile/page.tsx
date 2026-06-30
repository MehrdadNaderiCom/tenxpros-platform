import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentPartner } from "@/lib/partner/auth";
import { updatePartnerProfile } from "@/lib/actions/partner-portal";
import { PARTNER_TIER_LABELS, TIER_RECOGNITION } from "@/lib/partner/constants";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/form-fields";
import { Field } from "@/components/ui/form-field";
import { CountrySelect } from "@/components/ui/country-select";
import { PageHeader } from "@/components/shared/page-shell";

export const dynamic = "force-dynamic";

export default async function PartnerProfilePage() {
  const current = await getCurrentPartner();
  if (!current) redirect("/login");
  const partner = await prisma.partner.findUniqueOrThrow({ where: { id: current.partner.id } });

  return (
    <div className="space-y-8">
      <PageHeader title="Profile & recognition" description="Your display details and the credential you hold while in good standing." />

      <Card>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold-800">Current recognition</p>
        <h2 className="mt-2 text-lg font-semibold text-navy-900">
          {partner.recognitionTitle ?? PARTNER_TIER_LABELS[partner.tier]}
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">{TIER_RECOGNITION[partner.tier].credential}</p>
      </Card>

      <Card>
        <form
          action={async (formData) => {
            "use server";
            await updatePartnerProfile(formData);
          }}
          className="space-y-5"
        >
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Display name">
              <Input name="displayName" defaultValue={partner.displayName} />
            </Field>
            <Field label="Contact email">
              <Input name="contactEmail" type="email" defaultValue={partner.contactEmail} />
            </Field>
            <Field label="Country" optional>
              <CountrySelect name="country" defaultValue={partner.country ?? ""} />
            </Field>
          </div>
          <Button type="submit">Save profile</Button>
        </form>
      </Card>
    </div>
  );
}
