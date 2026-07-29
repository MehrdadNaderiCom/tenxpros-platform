import type { Metadata } from "next";
import { MarketingShell } from "@/components/marketing/marketing-ui";
import { TermsUpdatesPageContent } from "@/components/marketing/terms-version-pages";

export const metadata: Metadata = {
  title: "تغییرات شرایط استفاده",
  description:
    "Version History شرایط استفاده TenXPros ایران و دسترسی به Snapshot نسخه‌های پذیرفته‌شده.",
};

export default function Page() {
  return (
    <MarketingShell>
      <TermsUpdatesPageContent />
    </MarketingShell>
  );
}
