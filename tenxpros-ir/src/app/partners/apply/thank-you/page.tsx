import type { Metadata } from "next";
import { MarketingShell } from "@/components/marketing/marketing-ui";
import { PartnerApplyThankYouPageContent } from "@/components/marketing/partner-apply-page";

export const metadata: Metadata = {
  title: "مرحله بعد درخواست Partner",
  description:
    "راهنمای کنترل ارسال ایمیل درخواست Partner Program و آشنایی با مرحله Review.",
  robots: {
    index: false,
    follow: true,
  },
};

export default function Page() {
  return (
    <MarketingShell>
      <PartnerApplyThankYouPageContent />
    </MarketingShell>
  );
}
