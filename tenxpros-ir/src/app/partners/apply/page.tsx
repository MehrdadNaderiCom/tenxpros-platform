import type { Metadata } from "next";
import { MarketingShell } from "@/components/marketing/marketing-ui";
import { PartnerApplyPageContent } from "@/components/marketing/partner-apply-page";

export const metadata: Metadata = {
  title: "درخواست Partner Program",
  description:
    "ارسال شفاف درخواست TenXPros Partner Program از طریق ایمیل و آشنایی با فرایند Review، Pilot نود روزه و Activation Gate.",
};

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <MarketingShell>
      <PartnerApplyPageContent />
    </MarketingShell>
  );
}
