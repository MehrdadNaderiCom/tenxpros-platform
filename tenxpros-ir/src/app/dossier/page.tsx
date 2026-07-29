import type { Metadata } from "next";
import { DossierPage } from "@/components/marketing/dossier-page";

export const metadata: Metadata = {
  title: "Living AI Solution Dossier",
  description:
    "ساختار پرونده حرفه‌ای و معیارهای Review که پشتوانه Certification در TenXPros است.",
};

export default function Page() {
  return <DossierPage />;
}
