import type { Metadata } from "next";
import { FaqPage } from "@/components/marketing/faq-page";

export const metadata: Metadata = {
  title: "پرسش‌های متداول",
  description:
    "پاسخ‌های روشن درباره Founding Charter، شهریه، Office Hour، Coaching، نشست DBC، Dossier و Certification."
};

export default function Page() {
  return <FaqPage />;
}
