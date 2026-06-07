import type { Metadata } from "next";
import {
  CertHero,
  CertSignals,
  CertNot,
  CertCriteria,
  CertOutcomes,
  CertDossier,
  CertVerification,
  CertPath,
  CertFaq,
  CertFinalCta,
} from "@/components/marketing/certification-instrument";

export const metadata: Metadata = {
  title: "Certification — Earned, not attended",
  description:
    "TenXPros certification is earned when your Living AI Solution Dossier meets an explicit, public review standard — reviewed evidence, three honest outcomes, and a verifiable credential. Not a university degree or accreditation.",
};

export default function CertificationPage() {
  return (
    <main className="bg-[#070B14] text-slate-300">
      {/* 1 Hero · 2 What it signals · 3 What it is not · 4 Criteria · 5 Outcomes · 6 Dossier · 7 Verification · 8 Path · 9 FAQ · 10 Final CTA */}
      <CertHero />
      <CertSignals />
      <CertNot />
      <CertCriteria />
      <CertOutcomes />
      <CertDossier />
      <CertVerification />
      <CertPath />
      <CertFaq />
      <CertFinalCta />
    </main>
  );
}
