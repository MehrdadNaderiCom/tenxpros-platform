import type { Metadata } from "next";
import { ProgramPage } from "@/components/marketing/program-page";

export const metadata: Metadata = {
  title: "TenX Method و مسیر ۱۲ هفته‌ای",
  description:
    "جزئیات چهار فاز و یازده ماژول برنامه TenXPros برای ساخت Living AI Solution Dossier.",
};

export default function Page() {
  return <ProgramPage />;
}
