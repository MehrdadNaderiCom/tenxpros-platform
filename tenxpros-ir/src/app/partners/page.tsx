import type { Metadata } from "next";
import { MarketingShell } from "@/components/marketing/marketing-ui";
import { PartnerPageContent } from "@/components/marketing/partner-page";

export const metadata: Metadata = {
  title: "Partner Program",
  description:
    "Partner Program نسخه ایران با 90-Day Pilot، Activation Gate، ثبت و حفاظت مکتوب Opportunity و مسیر سه‌سطحی رشد.",
};

export default function Page() {
  return (
    <MarketingShell>
      <PartnerPageContent />
    </MarketingShell>
  );
}
