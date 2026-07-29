import type { Metadata } from "next";
import { PartnerTermsPageContent } from "@/components/marketing/partner-terms-page";

export const metadata: Metadata = {
  title: "شرایط Partner Program",
  description:
    "شرایط عمومی Partner Program نسخه ایران، شامل Pilot، Activation، Opportunity Protection، Tierها، Commission و Continuity.",
};

export const dynamic = "force-dynamic";

export default function Page() {
  return <PartnerTermsPageContent />;
}
