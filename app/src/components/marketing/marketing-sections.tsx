import { ArrowRight, Award, CheckCircle2, FileText, Gauge, ShieldCheck } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { modules, pricingTiers, dossierSections, badgeCatalog } from "@/lib/program-data";
import { formatCurrency } from "@/lib/utils";

export function MarketingHero() {
  return (
    <section className="bg-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-16 md:grid-cols-[1.05fr_0.95fr] md:px-8 md:py-24">
        <div className="flex flex-col justify-center space-y-7">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gold-800">
            Certified AI adoption for professionals
          </p>
          <div className="space-y-5">
            <h1 className="text-4xl font-semibold leading-tight tracking-normal text-navy-900 md:text-6xl">
              Become the professional who can frame, design, and defend AI adoption.
            </h1>
            <p className="max-w-2xl text-lg leading-relaxed text-slate-600">
              TenXPros is a selective 12-week program for professionals who need practical AI
              capability, responsible judgment, and a Living AI Solution Dossier they can use in
              real work.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/apply" size="lg">
              Apply for Founding Charter
              <ArrowRight className="ml-2 h-4 w-4" />
            </ButtonLink>
            <ButtonLink href="/program" variant="secondary" size="lg">
              View program
            </ButtonLink>
          </div>
          <div className="grid gap-3 text-sm text-slate-700 sm:grid-cols-3">
            {["12 weeks", "11 modules", "1 Dossier"].map((item) => (
              <div key={item} className="rounded-md border border-neutral-200 bg-neutral-50 px-4 py-3">
                {item}
              </div>
            ))}
          </div>
        </div>
        <div className="min-h-[520px] rounded-lg border border-neutral-200 bg-neutral-50 p-5 shadow-sm">
          <div className="h-full rounded-md bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between border-b border-neutral-200 pb-4">
              <div>
                <p className="text-sm font-semibold text-navy-900">Living AI Solution Dossier</p>
                <p className="text-xs text-slate-500">Evidence-backed professional output</p>
              </div>
              <Badge status="IN_PROGRESS">IN PROGRESS</Badge>
            </div>
            <div className="mt-5 grid gap-3">
              {dossierSections.slice(0, 6).map(([, label], index) => (
                <div
                  key={label}
                  className="flex items-center justify-between rounded-md border border-neutral-200 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900">{label}</p>
                    <p className="text-xs text-slate-500">Section {index + 1}</p>
                  </div>
                  <span className="h-2 w-20 rounded-full bg-navy-100">
                    <span className="block h-2 rounded-full bg-navy-900" style={{ width: `${45 + index * 7}%` }} />
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-5 grid grid-cols-3 gap-3">
              {["Frame", "Design", "Prove"].map((label) => (
                <div key={label} className="rounded-md bg-navy-50 p-4 text-center">
                  <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
                  <p className="mt-1 text-lg font-semibold text-navy-900">Ready</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function JourneySteps() {
  const steps = [
    ["Apply", "A selective application captures context, problem fit, commitment, and confidentiality consent."],
    ["Diagnose", "The diagnostic intake turns your work context into customization dimensions."],
    ["Build", "Eleven modules create practical artifacts and progressively assemble the Dossier."],
    ["Certify", "A section-level review and capstone decision determine the credential outcome."],
  ];

  return (
    <section className="mx-auto max-w-7xl px-6 py-16 md:px-8 md:py-24">
      <div className="max-w-3xl space-y-4">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gold-800">Journey</p>
        <h2 className="text-3xl font-semibold tracking-normal text-navy-900">From applicant to Certified TenXPro.</h2>
        <p className="text-slate-600">
          The experience is async-first, coached, and anchored in a real professional problem.
        </p>
      </div>
      <div className="mt-10 grid gap-4 md:grid-cols-4">
        {steps.map(([title, description], index) => (
          <Card key={title} className="space-y-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-navy-900 text-sm font-semibold text-white">
              {index + 1}
            </span>
            <h3 className="text-xl font-semibold text-navy-900">{title}</h3>
            <p className="text-sm leading-6 text-slate-600">{description}</p>
          </Card>
        ))}
      </div>
    </section>
  );
}

export function ModuleGrid() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {modules.map((module) => (
        <Card key={module.number} className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                Module {module.number} · {module.phase}
              </p>
              <h3 className="mt-2 text-xl font-semibold text-navy-900">{module.title}</h3>
            </div>
            <Badge>{module.badgeName}</Badge>
          </div>
          <p className="text-sm font-medium text-slate-800">{module.coreQuestion}</p>
          <p className="text-sm leading-6 text-slate-600">{module.description}</p>
        </Card>
      ))}
    </div>
  );
}

export function DossierSectionGrid() {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {dossierSections.map(([, label], index) => (
        <div key={label} className="rounded-md border border-neutral-200 bg-white p-4">
          <p className="text-sm font-semibold text-gold-800">Section {index + 1}</p>
          <p className="mt-1 font-medium text-navy-900">{label}</p>
        </div>
      ))}
    </div>
  );
}

export function PricingGrid() {
  return (
    <div className="grid gap-4 lg:grid-cols-5">
      {pricingTiers.map((tier) => (
        <Card key={tier.name} className={tier.isActive ? "border-navy-900 ring-2 ring-navy-900/10" : ""}>
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xl font-semibold text-navy-900">{tier.name}</h3>
              <Badge status={tier.isActive ? "ACCEPTED" : "SUBMITTED"}>
                {tier.isActive ? "Open" : "Preview"}
              </Badge>
            </div>
            <p className="text-3xl font-semibold text-slate-900">{formatCurrency(tier.price)}</p>
            <p className="text-sm text-slate-600">Member capacity: {tier.membersLimit}</p>
            <ul className="space-y-2 text-sm text-slate-600">
              {tier.benefits.map((benefit) => (
                <li key={benefit} className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" />
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
            {tier.isActive ? (
              <ButtonLink href="/apply" className="w-full">
                Apply
              </ButtonLink>
            ) : (
              <button
                className="h-11 w-full rounded-md border border-neutral-300 text-sm font-medium text-slate-500"
                disabled
              >
                Opens after prior tier closes
              </button>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}

export function BadgeGallery() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {badgeCatalog.map((badge) => (
        <div key={badge.slug} className="rounded-md border border-neutral-200 bg-white p-4">
          <div className="flex items-start gap-3">
            <Award className="mt-1 h-5 w-5 text-gold-800" />
            <div>
              <p className="font-medium text-navy-900">{badge.name}</p>
              <p className="mt-1 text-sm leading-6 text-slate-600">{badge.description}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export const proofCards = [
  [ShieldCheck, "Responsible boundaries", "Confidentiality, risk, ethics, and accountability are built into the work."],
  [FileText, "Defensible output", "The Dossier gives participants a living artifact, not a generic certificate."],
  [Gauge, "Practical adoption", "The program is built around one real problem, real constraints, and real evidence."],
] as const;
