import type { Metadata } from "next";
import { MarketingShell } from "@/components/marketing/marketing-ui";
import { HowItWorksPageContent } from "@/components/marketing/supplemental-pages";

export const metadata: Metadata = {
  title: "فرایند پذیرش تا Certification",
  description:
    "مسیر درخواست، پذیرش، پرداخت، Onboarding Diagnostic، برنامه ۱۲ هفته‌ای، Dossier و Certification."
};

export default function Page() {
  return (
    <MarketingShell>
      <HowItWorksPageContent />
    </MarketingShell>
  );
}
