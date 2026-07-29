import type { Metadata } from "next";
import { SupportPage } from "@/components/marketing/support-page";

export const metadata: Metadata = {
  title: "پشتیبانی و ارتباط",
  description:
    "کانال‌های رسمی TenXPros ایران برای پشتیبانی فنی، درخواست عضویت، پرداخت، Office Hour و Zoom."
};

export default function Page() {
  return <SupportPage />;
}
