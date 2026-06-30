import type { Metadata } from "next";
import {
  CertHero,
  CertSignals,
  CertCriteria,
  CertOutcomes,
  CertMilestones,
  CertDossier,
  CertReviewMechanics,
  CertVerification,
  CertPath,
  CertFaq,
  CertFinalCta,
} from "@/components/marketing/certification-instrument";

export const metadata: Metadata = {
  title: "Certification, Earned, not attended",
  description:
    "TenXPros certification is earned when your Living AI Solution Dossier meets an explicit, public review standard, reviewed evidence, three honest outcomes, and a verifiable credential. Not a university degree or accreditation.",
};

export default function CertificationPage() {
  return (
    <main className="bg-[#070B14] text-slate-300">
      {/* 1 Hero · 2 Signals · 3 Criteria · 4 Outcomes · 5 Milestones/ranks/seal · 6 Dossier · 7 Review mechanics · 8 Verification · 9 Path · 10 FAQ · 11 Final CTA */}
      <CertHero />
      <CertSignals />
      <CertCriteria />
      <CertOutcomes />
      <CertMilestones />
      <CertDossier />
      <CertReviewMechanics />
      <CertVerification />
      <CertPath />
      <CertFaq />
      <CertFinalCta />
    </main>
  );
}
