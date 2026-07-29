import type { Metadata } from "next";
import { PrivacyPageContent } from "@/components/marketing/policy-pages";

export const metadata: Metadata = {
  title: "حریم خصوصی",
  description:
    "سیاست TenXPros برای دریافت، استفاده، نگهداری و حفاظت از داده‌های متقاضیان، اعضا و Credentialها.",
};

export const dynamic = "force-dynamic";

export default function Page() {
  return <PrivacyPageContent />;
}
