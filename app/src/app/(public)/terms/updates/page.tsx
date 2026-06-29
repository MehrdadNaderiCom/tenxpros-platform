import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-shell";
import { Card } from "@/components/ui/card";
import { ANNUAL_VALIDITY, SURVIVAL_CLAUSES, buildTermsVersionSeed, currentTermsYear } from "@/lib/terms/annual";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Terms and rules updates",
  description:
    "How the TenXPros terms and rules are reviewed each calendar year, what survives year end, and the changelog and archive of versions.",
};

// Style the stored terms HTML with pure Tailwind (no typography plugin dependency).
const TERMS_HTML =
  "[&_h2]:mt-6 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-navy-900 [&_h2:first-child]:mt-0 [&_p]:mt-2 [&_p]:text-sm [&_p]:leading-7 [&_p]:text-slate-600 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5 [&_li]:text-sm [&_li]:leading-6 [&_li]:text-slate-600 [&_strong]:text-navy-900";

export default async function TermsUpdatesPage() {
  const versions = await prisma.termsVersion.findMany({
    where: { audience: "all" },
    orderBy: { year: "desc" },
  });

  // Always render something, even before the first version is seeded.
  const list =
    versions.length > 0
      ? versions.map((v) => ({ year: v.year, bodyHtml: v.bodyHtml, changelog: v.changelog, isCurrent: v.isCurrent }))
      : [(() => {
          const s = buildTermsVersionSeed(currentTermsYear());
          return { year: s.year, bodyHtml: s.bodyHtml, changelog: s.changelog, isCurrent: true };
        })()];

  const current = list.find((v) => v.isCurrent) ?? list[0];
  const archive = list.filter((v) => v.year !== current.year);

  return (
    <main className="mx-auto max-w-4xl space-y-10 px-6 py-16 md:px-8 md:py-24">
      <PageHeader
        title="Terms and rules updates"
        description={`The TenXPros terms and rules are reviewed each calendar year. The current version is for ${current.year}.`}
      />

      <Card className="space-y-3">
        <h2 className="text-xl font-semibold text-navy-900">How the annual validity works</h2>
        {ANNUAL_VALIDITY.map((p, i) => (
          <p key={i} className="text-sm leading-7 text-slate-600">{p}</p>
        ))}
      </Card>

      <Card className="space-y-4">
        <h2 className="text-xl font-semibold text-navy-900">What survives year end</h2>
        <p className="text-sm leading-6 text-slate-600">
          Renewing each year changes the commercial terms going forward. These obligations continue after the year ends
          and after a partnership ends.
        </p>
        <ul className="space-y-3">
          {SURVIVAL_CLAUSES.map((c) => (
            <li key={c.title} className="flex gap-2.5 text-sm leading-6 text-slate-600">
              <span className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-gold-500" aria-hidden="true" />
              <span><strong className="text-navy-900">{c.title}.</strong> {c.body}</span>
            </li>
          ))}
        </ul>
      </Card>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-navy-900">Current version, {current.year}</h2>
        <Card>
          <div className={TERMS_HTML} dangerouslySetInnerHTML={{ __html: current.bodyHtml }} />
          <div className="mt-6 border-t border-neutral-200 pt-5">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">What changed in {current.year}</h3>
            <div className={`${TERMS_HTML} mt-2`} dangerouslySetInnerHTML={{ __html: current.changelog }} />
          </div>
        </Card>
      </section>

      {archive.length > 0 ? (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-navy-900">Archive</h2>
          <div className="space-y-3">
            {archive.map((v) => (
              <Card key={v.year}>
                <h3 className="font-semibold text-navy-900">{v.year}</h3>
                <div className={`${TERMS_HTML} mt-2`} dangerouslySetInnerHTML={{ __html: v.changelog }} />
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      <p className="text-sm text-slate-600">
        For the full terms, see the{" "}
        <Link href="/terms" className="font-medium text-navy-900 hover:underline">site terms</Link> and the{" "}
        <Link href="/partners/terms" className="font-medium text-navy-900 hover:underline">Partner Program terms</Link>.
      </p>
    </main>
  );
}
