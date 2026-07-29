import type { Metadata } from "next";
import { HomePage } from "@/components/marketing/home-page";

export const metadata: Metadata = {
  title: "رهبری AI Adoption برای حرفه‌ای‌های باتجربه",
  description:
    "برنامه گزینشی ۱۲ هفته‌ای TenXPros برای ساختن Living AI Solution Dossier ارزیابی‌شده و Professional Credential قابل Verification."
};

export default function Page() {
  return <HomePage />;
}
