import type { Metadata } from "next";
import { RefundPageContent } from "@/components/marketing/policy-pages";

export const metadata: Metadata = {
  title: "سیاست بازپرداخت",
  description:
    "چارچوب بررسی بازپرداخت برای Founding Charter و خدماتی که ظرفیت حرفه‌ای مشخصی رزرو می‌کنند.",
};

export const dynamic = "force-dynamic";

export default function Page() {
  return <RefundPageContent />;
}
