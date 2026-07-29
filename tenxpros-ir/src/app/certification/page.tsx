import type { Metadata } from "next";
import { CertificationPage } from "@/components/marketing/certification-page";

export const metadata: Metadata = {
  title: "Certification و Review Standard",
  description:
    "Professional Credential قابل Verification مبتنی بر Living AI Solution Dossier، سه Rank، Capstone Seal و هشت معیار عمومی Review."
};

export default function Page() {
  return <CertificationPage />;
}
