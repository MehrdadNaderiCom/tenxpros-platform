import type { Metadata } from "next";
import { TermsPageContent } from "@/components/marketing/policy-pages";

export const metadata: Metadata = {
  title: "شرایط استفاده",
  description:
    "شرایط درخواست، پذیرش، پرداخت، Office Hour، Coaching، Dossier و Certification در TenXPros ایران.",
};

export const dynamic = "force-dynamic";

export default function Page() {
  return <TermsPageContent />;
}
