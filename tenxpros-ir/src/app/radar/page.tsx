import type { Metadata } from "next";
import { MarketingShell } from "@/components/marketing/marketing-ui";
import { RadarPageContent } from "@/components/marketing/supplemental-pages";

export const metadata: Metadata = {
  title: "TenXPro Radar",
  description:
    "سرویس آینده سیگنال‌ها و تحلیل‌های منتخب AI، ویژه Certified Alumni.",
};

export default function Page() {
  return (
    <MarketingShell>
      <RadarPageContent />
    </MarketingShell>
  );
}
