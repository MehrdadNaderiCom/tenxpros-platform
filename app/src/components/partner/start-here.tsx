import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

/**
 * Start-work guidance shown until a partner is ready (Academy complete AND
 * onboarding complete). Two surfaces:
 *   - StartHereBanner: a slim reminder rendered on every partner page.
 *   - StartHereCard: the detailed two-step card on the dashboard.
 * Both are presentational; readiness is decided by lib/partner/readiness.
 */

/** Slim, panel-wide reminder. Rendered by the partner layout until ready. */
export function StartHereBanner({
  academyComplete,
  onboardingComplete,
}: {
  academyComplete: boolean;
  onboardingComplete: boolean;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-800">Finish setup to start working</p>
        <p className="mt-0.5 text-sm text-slate-700">
          Complete the Academy and your onboarding to unlock registering opportunities.
        </p>
      </div>
      <div className="flex gap-2">
        <ButtonLink href="/partner/academy" size="sm" variant={academyComplete ? "ghost" : "secondary"}>
          {academyComplete ? "Academy done" : "Go to Academy"}
        </ButtonLink>
        <ButtonLink href="/partner/onboarding" size="sm" variant={onboardingComplete ? "ghost" : "secondary"}>
          {onboardingComplete ? "Onboarding done" : "Go to onboarding"}
        </ButtonLink>
      </div>
    </div>
  );
}

function Step({
  n,
  title,
  body,
  done,
  href,
  cta,
}: {
  n: number;
  title: string;
  body: string;
  done: boolean;
  href: string;
  cta: string;
}) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center text-sm font-semibold text-navy-900">
          <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-navy-900 text-xs font-semibold text-white">
            {n}
          </span>
          {title}
        </p>
        <Badge status={done ? "PASSED" : "PENDING"}>{done ? "Done" : "To do"}</Badge>
      </div>
      <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
      <div className="mt-3">
        <ButtonLink href={href} size="sm" variant={done ? "ghost" : "secondary"}>
          {done ? "Review" : cta}
        </ButtonLink>
      </div>
    </div>
  );
}

/** The detailed two-step "Get started" card on the dashboard, until ready. */
export function StartHereCard({
  academyComplete,
  onboardingComplete,
  itemsDone,
  itemsTotal,
}: {
  academyComplete: boolean;
  onboardingComplete: boolean;
  itemsDone: number;
  itemsTotal: number;
}) {
  return (
    <Card className="border-amber-200 bg-amber-50">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-800">Get started</p>
      <h2 className="mt-1 text-xl font-semibold text-navy-900">Two steps before you can register opportunities</h2>
      <p className="mt-1 text-sm text-slate-600">
        Complete both and your access to start working opens automatically. There is nothing extra to ask for.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Step
          n={1}
          title="Complete the Academy"
          done={academyComplete}
          body="Work through every module and pass the comprehensive final exam to earn your certificate."
          href="/partner/academy"
          cta="Open the Academy"
        />
        <Step
          n={2}
          title="Complete onboarding"
          done={onboardingComplete}
          body={`Finish the Activation Gate (${itemsDone} of ${itemsTotal} steps done), then the company confirms it on the panel.`}
          href="/partner/onboarding"
          cta="Open onboarding"
        />
      </div>
    </Card>
  );
}
