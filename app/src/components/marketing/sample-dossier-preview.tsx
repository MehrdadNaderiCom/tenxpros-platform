import { ArrowUpRight, FileText } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

/**
 * SampleDossierPreview
 * --------------------------------------------------------------------------
 * A narrow, reusable marketing block that previews the standalone, illustrative
 * sample dossier proof asset. Pure presentational server component, it renders
 * static links to the public assets under /samples and changes no app logic.
 *
 * Public assets (served from app/public/samples):
 *   - /samples/tenxpros-sample-dossier-excerpt.pdf   (primary preview)
 *   - /samples/tenxpros-sample-dossier-excerpt.html  (HTML preview)
 *   - /samples/tenxpros-sample-dossier-cover.png     (cover image)
 *   - /samples/tenxpros-sample-dossier-snapshot.png  (supporting thumbnail)
 *   - /samples/tenxpros-sample-dossier-assets-rubric.png (supporting thumbnail)
 */

const PDF_URL = "/samples/tenxpros-sample-dossier-excerpt.pdf";
const HTML_URL = "/samples/tenxpros-sample-dossier-excerpt.html";
const COVER_URL = "/samples/tenxpros-sample-dossier-cover.png";
const SNAPSHOT_URL = "/samples/tenxpros-sample-dossier-snapshot.png";
const ASSETS_URL = "/samples/tenxpros-sample-dossier-assets-rubric.png";

const COVER_ALT =
  "Illustrative TenXPros Living AI Solution Dossier cover for fictional participant Maya R.";

const DISCLAIMER =
  "Illustrative sample. Fictional participant. No real client data. Review labels are illustrative, not a certification decision.";

export type SampleDossierVariant = "home" | "dossier" | "pricing" | "apply";

type VariantCopy = {
  eyebrow: string;
  headline: string;
  body: string;
  primaryCta: string;
  secondaryCta?: string;
};

const COPY: Record<SampleDossierVariant, VariantCopy> = {
  home: {
    eyebrow: "Proof asset",
    headline: "See what “reviewed work” looks like.",
    body:
      "Preview an illustrative Living AI Solution Dossier, the artifact at the center of TenXPros. It shows the structure, reviewer notes, evidence gaps, and review standard behind the credential.",
    primaryCta: "Preview a sample dossier",
  },
  dossier: {
    eyebrow: "Illustrative sample",
    headline: "Preview the artifact the program is named for.",
    body:
      "This fictional sample shows how one professional problem becomes a structured, reviewed Living AI Solution Dossier. You’ll see the 12-section structure, the Eight Assets Map, reviewer annotations, the intentional evidence gap, and the rubric mapping.",
    primaryCta: "Preview the full sample",
    secondaryCta: "Open HTML preview",
  },
  pricing: {
    eyebrow: "See the standard",
    headline: "Not sure what you’re paying for? Preview the work.",
    body:
      "You’re not buying a video course. You’re earning a reviewed professional asset built around your own real problem. The sample dossier shows the standard before you apply.",
    primaryCta: "Preview a sample dossier",
  },
  apply: {
    eyebrow: "Before you apply",
    headline: "Want to see where this leads?",
    body:
      "Preview an illustrative sample dossier before you apply. Your application starts with the one real problem you would carry through to an artifact like this.",
    primaryCta: "Preview a sample dossier",
  },
};

function PrimaryCta({ label }: { label: string }) {
  return (
    <ButtonLink href={PDF_URL} size="lg" target="_blank" rel="noopener noreferrer">
      <FileText className="mr-2 h-4 w-4" aria-hidden="true" />
      {label}
    </ButtonLink>
  );
}

function SecondaryCta({ label }: { label: string }) {
  return (
    <ButtonLink
      href={HTML_URL}
      variant="secondary"
      size="lg"
      target="_blank"
      rel="noopener noreferrer"
    >
      {label}
      <ArrowUpRight className="ml-2 h-4 w-4" aria-hidden="true" />
    </ButtonLink>
  );
}

function Disclaimer() {
  return <p className="text-xs leading-5 text-slate-500">{DISCLAIMER}</p>;
}

export function SampleDossierPreview({ variant }: { variant: SampleDossierVariant }) {
  const copy = COPY[variant];
  const compact = variant === "pricing" || variant === "apply";

  if (compact) {
    return (
      <Card className="grid gap-6 sm:grid-cols-[136px_1fr] sm:items-center">
        <a
          href={PDF_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="block justify-self-center rounded-md focus:outline-none focus:ring-2 focus:ring-navy-500 focus:ring-offset-2 sm:justify-self-start"
        >
          <img
            src={COVER_URL}
            alt={COVER_ALT}
            width={1680}
            height={2376}
            loading="lazy"
            className="h-auto w-[120px] rounded-md border border-neutral-200 shadow-sm transition hover:shadow-md sm:w-[136px]"
          />
        </a>
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold-800">
            {copy.eyebrow}
          </p>
          <h2 className="text-xl font-semibold text-navy-900">{copy.headline}</h2>
          <p className="text-sm leading-6 text-slate-600">{copy.body}</p>
          <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center">
            <PrimaryCta label={copy.primaryCta} />
            {copy.secondaryCta ? <SecondaryCta label={copy.secondaryCta} /> : null}
          </div>
          <Disclaimer />
        </div>
      </Card>
    );
  }

  return (
    <Card className="grid gap-8 md:grid-cols-[0.82fr_1.18fr] md:items-center">
      <a
        href={PDF_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="group block justify-self-center rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-500 focus:ring-offset-2"
        aria-label={`${copy.primaryCta} (opens PDF in a new tab)`}
      >
        <img
          src={COVER_URL}
          alt={COVER_ALT}
          width={1680}
          height={2376}
          loading="lazy"
          className="h-auto w-full max-w-[320px] rounded-lg border border-neutral-200 shadow-md transition group-hover:shadow-lg"
        />
      </a>
      <div className="space-y-4">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gold-800">
          {copy.eyebrow}
        </p>
        <h2 className="text-3xl font-semibold leading-tight text-navy-900">{copy.headline}</h2>
        <p className="text-base leading-relaxed text-slate-600">{copy.body}</p>

        {variant === "dossier" ? (
          <div className="grid grid-cols-2 gap-3 pt-1">
            <SampleThumb href={PDF_URL} src={SNAPSHOT_URL} label="Executive Snapshot" />
            <SampleThumb href={PDF_URL} src={ASSETS_URL} label="Eight Assets Map & Rubric" />
          </div>
        ) : null}

        <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center">
          <PrimaryCta label={copy.primaryCta} />
          {copy.secondaryCta ? <SecondaryCta label={copy.secondaryCta} /> : null}
        </div>
        <Disclaimer />
      </div>
    </Card>
  );
}

function SampleThumb({ href, src, label }: { href: string; src: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group rounded-md border border-neutral-200 bg-neutral-50 p-2 transition hover:shadow-md focus:outline-none focus:ring-2 focus:ring-navy-500 focus:ring-offset-2"
    >
      <img
        src={src}
        alt={`Illustrative sample dossier, ${label} page (fictional participant Maya R.)`}
        width={1000}
        height={1415}
        loading="lazy"
        className="h-auto w-full rounded-sm border border-neutral-200"
      />
      <span className="mt-2 block text-xs font-medium text-slate-600">{label}</span>
    </a>
  );
}
