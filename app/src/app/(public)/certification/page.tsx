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
  CERTIFICATION_FAQS,
} from "@/components/marketing/certification-instrument";
import { JsonLd } from "@/components/seo/json-ld";
import { buildFaqStructuredData, buildPublicMetadata } from "@/lib/seo";

export const metadata = buildPublicMetadata({
  title: "Certification, Earned, not attended",
  description:
    "TenXPros certification is earned through reviewed evidence produced during the 100-day journey, with an explicit public standard, three honest outcomes, and a verifiable credential.",
  path: "/certification",
});

export default function CertificationPage() {
  return (
    <main className="bg-[#070B14] text-slate-300">
      <JsonLd data={buildFaqStructuredData("/certification", CERTIFICATION_FAQS)} />
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
